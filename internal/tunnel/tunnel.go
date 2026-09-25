// Package tunnel puts a local TCP port on a public relay that speaks the
// bore protocol (github.com/ekzhang/bore): the relay listens on a public
// port and hands every player who connects to it over a new connection
// that we dial out, so no router setup is needed and CGNAT does not matter.
// bore.pub is a free public relay; anyone can run their own ("bore server").
//
// Wire format: JSON messages ended by a 0 byte on TCP port 7835.
package tunnel

import (
	"bufio"
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"strings"
	"sync"
	"time"
)

// DefaultRelay is the free public bore relay.
const DefaultRelay = "bore.pub"

// ControlPort is where bore relays take control and accept connections.
const ControlPort = "7835"

// timeout bounds each handshake step (a var so tests can shorten it);
// heartbeatTimeout is how long a silent relay is trusted (bore sends a
// heartbeat every 500 ms).
var timeout = 10 * time.Second

const heartbeatTimeout = 30 * time.Second

// Tunnel is an open relay registration.
type Tunnel struct {
	// Port is the public port on the relay: players connect to relay:Port.
	Port int

	addr, secret, local string
	ctrl                net.Conn
	done                chan struct{}
	err                 error

	mu    sync.Mutex
	conns map[net.Conn]bool // live player connections, closed with the tunnel
}

// Addr returns relay "host[:port]" as host:port (port 7835 when missing).
func Addr(relay string) string {
	if relay == "" {
		relay = DefaultRelay
	}
	if _, _, err := net.SplitHostPort(relay); err == nil {
		return relay
	}
	return net.JoinHostPort(strings.Trim(relay, "[]"), ControlPort)
}

// Open registers local (host:port) on the relay, asking for public port
// (0 = any). It returns once the relay has answered; players are then
// forwarded until Close or until the relay drops us (see Done).
func Open(ctx context.Context, relay, secret string, port int, local string) (*Tunnel, error) {
	t := &Tunnel{addr: Addr(relay), secret: secret, local: local, done: make(chan struct{}), conns: map[net.Conn]bool{}}
	conn, r, err := t.dial(ctx)
	if err != nil {
		return nil, err
	}
	if err := send(conn, "Hello", port); err != nil {
		conn.Close()
		return nil, err
	}
	kind, body, err := recv(conn, r, timeout)
	if err == nil && kind == "Hello" {
		err = json.Unmarshal(body, &t.Port)
	} else if err == nil {
		err = unexpected(kind, body)
	}
	if err != nil {
		conn.Close()
		return nil, err
	}
	t.ctrl = conn
	go t.listen(r)
	return t, nil
}

// Done is closed when the relay connection ends; Err says why.
func (t *Tunnel) Done() <-chan struct{} { return t.done }

// Err is why the tunnel ended (nil after Close).
func (t *Tunnel) Err() error {
	<-t.done
	return t.err
}

// Close unregisters from the relay and cuts every forwarded player.
func (t *Tunnel) Close() error {
	err := t.ctrl.Close()
	<-t.done
	t.mu.Lock()
	for c := range t.conns {
		c.Close()
	}
	t.mu.Unlock()
	return err
}

func (t *Tunnel) listen(r *bufio.Reader) {
	defer close(t.done)
	// A relay that went silent still holds our port while this socket is
	// open: close it so the reconnect can get the same port back.
	defer t.ctrl.Close()
	for {
		kind, body, err := recv(t.ctrl, r, heartbeatTimeout)
		if err != nil {
			if !errors.Is(err, net.ErrClosed) {
				t.err = fmt.Errorf("lost the relay: %w", err)
			}
			return
		}
		switch kind {
		case "Heartbeat":
		case "Connection":
			go t.forward(body)
		case "Error":
			t.err = unexpected(kind, body)
			return
		}
	}
}

// forward answers one player: a new connection to the relay claims it
// (Accept with the id the relay sent), then bytes flow both ways.
func (t *Tunnel) forward(id json.RawMessage) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	remote, r, err := t.dial(ctx)
	if err != nil {
		return
	}
	if err := send(remote, "Accept", id); err != nil {
		remote.Close()
		return
	}
	var d net.Dialer
	local, err := d.DialContext(ctx, "tcp", t.local)
	if err != nil {
		remote.Close()
		return
	}
	if !t.track(remote, local) {
		return
	}
	// r may already hold bytes read past the handshake: read from it, not remote.
	go func() { _, _ = io.Copy(local, r); local.Close(); remote.Close() }()
	_, _ = io.Copy(remote, local)
	remote.Close()
	local.Close()
	t.mu.Lock()
	delete(t.conns, remote)
	delete(t.conns, local)
	t.mu.Unlock()
}

// track registers a player's two connections, or closes them when the
// tunnel is already gone.
func (t *Tunnel) track(conns ...net.Conn) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	select {
	case <-t.done:
		for _, c := range conns {
			c.Close()
		}
		return false
	default:
	}
	for _, c := range conns {
		t.conns[c] = true
	}
	return true
}

// dial connects to the relay and answers its challenge when it has a secret.
func (t *Tunnel) dial(ctx context.Context) (net.Conn, *bufio.Reader, error) {
	var d net.Dialer
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	conn, err := d.DialContext(ctx, "tcp", t.addr)
	if err != nil {
		return nil, nil, fmt.Errorf("could not reach the relay %s: %w", t.addr, err)
	}
	r := bufio.NewReader(conn)
	if t.secret == "" {
		return conn, r, nil
	}
	kind, body, err := recv(conn, r, timeout)
	if err == nil && kind != "Challenge" {
		err = unexpected(kind, body)
	}
	var challenge string
	if err == nil {
		err = json.Unmarshal(body, &challenge)
	}
	if err == nil {
		var tag string
		if tag, err = Answer(t.secret, challenge); err == nil {
			err = send(conn, "Authenticate", tag)
		}
	}
	if err != nil {
		conn.Close()
		return nil, nil, err
	}
	return conn, r, nil
}

// Answer is bore's reply to a challenge: hex HMAC-SHA256 of the challenge
// UUID's 16 bytes, keyed with SHA-256 of the secret.
func Answer(secret, challenge string) (string, error) {
	raw, err := hex.DecodeString(strings.ReplaceAll(challenge, "-", ""))
	if err != nil || len(raw) != 16 {
		return "", errors.New("the relay sent a bad challenge")
	}
	key := sha256.Sum256([]byte(secret))
	mac := hmac.New(sha256.New, key[:])
	mac.Write(raw)
	return hex.EncodeToString(mac.Sum(nil)), nil
}

// send writes {"<kind>": value} and the 0 terminator. The deadline is
// cleared afterwards: an Accept connection goes on to carry the player, and
// a deadline left on it cut every player ~10 s after joining.
func send(conn net.Conn, kind string, value any) error {
	raw, err := json.Marshal(map[string]any{kind: value})
	if err != nil {
		return err
	}
	_ = conn.SetWriteDeadline(time.Now().Add(timeout))
	_, err = conn.Write(append(raw, 0))
	_ = conn.SetWriteDeadline(time.Time{})
	return err
}

// recv reads one message: "Heartbeat" (a bare JSON string) or {"<kind>": body}.
func recv(conn net.Conn, r *bufio.Reader, wait time.Duration) (string, json.RawMessage, error) {
	_ = conn.SetReadDeadline(time.Now().Add(wait))
	frame, err := r.ReadBytes(0)
	_ = conn.SetReadDeadline(time.Time{})
	if err != nil {
		return "", nil, err
	}
	frame = bytes.TrimSuffix(frame, []byte{0})
	var unit string
	if json.Unmarshal(frame, &unit) == nil {
		return unit, nil, nil
	}
	var msg map[string]json.RawMessage
	if err := json.Unmarshal(frame, &msg); err != nil || len(msg) != 1 {
		return "", nil, fmt.Errorf("the relay sent something unexpected: %.60s", frame)
	}
	for k, v := range msg {
		return k, v, nil
	}
	return "", nil, nil
}

// unexpected turns a message that was not the one wanted into an error.
func unexpected(kind string, body json.RawMessage) error {
	switch kind {
	case "Error":
		var s string
		_ = json.Unmarshal(body, &s)
		return fmt.Errorf("the relay refused: %s", s)
	case "Challenge":
		return errors.New("this relay needs a secret")
	}
	return fmt.Errorf("the relay sent %q instead of an answer", kind)
}
