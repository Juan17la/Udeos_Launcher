package tunnel

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"strconv"
	"sync"
	"testing"
	"time"
)

func TestAnswerMatchesBore(t *testing.T) {
	// Computed with Python: hmac(sha256(b"hunter2").digest(), uuid.bytes, sha256).
	got, err := Answer("hunter2", "6f1c2b8e-3d4a-4f5b-9c6d-7e8f90a1b2c3")
	if err != nil || got != "51602bdb0ff94cbadfac160749d7ec3bb37df14eb8d3d562757f0c5c42800d83" {
		t.Fatalf("Answer = %q, %v", got, err)
	}
}

func TestAddr(t *testing.T) {
	for in, want := range map[string]string{"": "bore.pub:7835", "relay.example.com": "relay.example.com:7835", "10.0.0.2:9000": "10.0.0.2:9000"} {
		if got := Addr(in); got != want {
			t.Errorf("Addr(%q) = %q, want %q", in, got, want)
		}
	}
}

// fakeRelay behaves like `bore server --secret`: control port, a challenge
// on every connection, Hello → a public listener, heartbeats, and one
// Connection(id) per player, claimed with Accept(id) on a new connection.
type fakeRelay struct {
	t      *testing.T
	ctl    net.Listener
	secret string
	mu     sync.Mutex
	taken  map[int]bool
	wait   map[string]net.Conn // player connections not accepted yet
	n      int
}

func newFakeRelay(t *testing.T, secret string) *fakeRelay {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	f := &fakeRelay{t: t, ctl: ln, secret: secret, taken: map[int]bool{}, wait: map[string]net.Conn{}}
	go func() {
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			go f.handle(c)
		}
	}()
	t.Cleanup(func() { ln.Close() })
	return f
}

func (f *fakeRelay) write(c net.Conn, v any) {
	raw, _ := json.Marshal(v)
	c.Write(append(raw, 0))
}

func (f *fakeRelay) read(r *bufio.Reader) (map[string]json.RawMessage, error) {
	frame, err := r.ReadBytes(0)
	if err != nil {
		return nil, err
	}
	var m map[string]json.RawMessage
	return m, json.Unmarshal(bytes.TrimSuffix(frame, []byte{0}), &m)
}

func (f *fakeRelay) handle(c net.Conn) {
	r := bufio.NewReader(c)
	if f.secret != "" {
		challenge := "6f1c2b8e-3d4a-4f5b-9c6d-7e8f90a1b2c3"
		f.write(c, map[string]string{"Challenge": challenge})
		m, err := f.read(r)
		want, _ := Answer(f.secret, challenge)
		if err != nil || string(m["Authenticate"]) != strconv.Quote(want) {
			c.Close()
			return
		}
	}
	m, err := f.read(r)
	if err != nil {
		c.Close()
		return
	}
	if raw, ok := m["Accept"]; ok {
		var id string
		_ = json.Unmarshal(raw, &id)
		f.mu.Lock()
		player := f.wait[id]
		delete(f.wait, id)
		f.mu.Unlock()
		if player == nil {
			c.Close()
			return
		}
		go func() { io.Copy(player, r); player.Close() }()
		io.Copy(c, player)
		c.Close()
		return
	}
	var port int
	_ = json.Unmarshal(m["Hello"], &port)
	f.mu.Lock()
	inUse := f.taken[port]
	f.mu.Unlock()
	if inUse {
		f.write(c, map[string]string{"Error": "port already in use"})
		c.Close()
		return
	}
	pub, err := net.Listen("tcp", "127.0.0.1:"+strconv.Itoa(port))
	if err != nil {
		f.write(c, map[string]string{"Error": "failed to bind to port"})
		c.Close()
		return
	}
	got := pub.Addr().(*net.TCPAddr).Port
	f.mu.Lock()
	f.taken[got] = true
	f.mu.Unlock()
	f.write(c, map[string]int{"Hello": got})
	stop := make(chan struct{})
	go func() { // the control connection closing ends the registration
		io.Copy(io.Discard, r)
		close(stop)
		pub.Close()
		f.mu.Lock()
		delete(f.taken, got)
		f.mu.Unlock()
	}()
	go func() {
		for {
			select {
			case <-stop:
				return
			case <-time.After(50 * time.Millisecond):
				c.Write([]byte("\"Heartbeat\"\x00"))
			}
		}
	}()
	for {
		player, err := pub.Accept()
		if err != nil {
			return
		}
		f.mu.Lock()
		f.n++
		id := fmt.Sprintf("00000000-0000-4000-8000-%012d", f.n)
		f.wait[id] = player
		f.mu.Unlock()
		f.write(c, map[string]string{"Connection": id})
	}
}

func echoServer(t *testing.T) string {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { ln.Close() })
	go func() {
		for {
			c, err := ln.Accept()
			if err != nil {
				return
			}
			go func() { io.Copy(c, c); c.Close() }()
		}
	}()
	return ln.Addr().String()
}

func roundTrip(t *testing.T, port int, msg string) {
	t.Helper()
	c, err := net.DialTimeout("tcp", "127.0.0.1:"+strconv.Itoa(port), time.Second)
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	c.SetDeadline(time.Now().Add(3 * time.Second))
	c.Write([]byte(msg))
	buf := make([]byte, len(msg))
	if _, err := io.ReadFull(c, buf); err != nil || string(buf) != msg {
		t.Fatalf("echo through the relay = %q, %v", buf, err)
	}
}

func TestTunnelForwardsPlayers(t *testing.T) {
	relay := newFakeRelay(t, "hunter2")
	local := echoServer(t)
	tun, err := Open(context.Background(), relay.ctl.Addr().String(), "hunter2", 0, local)
	if err != nil {
		t.Fatal(err)
	}
	if tun.Port == 0 {
		t.Fatal("no public port")
	}
	// Two players at once, and heartbeats flowing meanwhile.
	var wg sync.WaitGroup
	for i := 0; i < 2; i++ {
		wg.Add(1)
		go func(i int) { defer wg.Done(); roundTrip(t, tun.Port, fmt.Sprintf("hello from player %d", i)) }(i)
	}
	wg.Wait()

	// The same port again is refused while it is ours; after Close it is free.
	if _, err := Open(context.Background(), relay.ctl.Addr().String(), "hunter2", tun.Port, local); err == nil || err.Error() != "the relay refused: port already in use" {
		t.Fatalf("second Hello on a taken port: %v", err)
	}
	player, _ := net.Dial("tcp", "127.0.0.1:"+strconv.Itoa(tun.Port))
	player.Write([]byte("x"))
	time.Sleep(100 * time.Millisecond)
	if err := tun.Close(); err != nil {
		t.Fatal(err)
	}
	if tun.Err() != nil {
		t.Fatalf("Err after Close = %v", tun.Err())
	}
	player.SetReadDeadline(time.Now().Add(2 * time.Second))
	io.ReadFull(player, make([]byte, 1)) // the echo of "x"
	if _, err := player.Read(make([]byte, 1)); err == nil {
		t.Fatal("player still connected after Close")
	}
	time.Sleep(100 * time.Millisecond)
	again, err := Open(context.Background(), relay.ctl.Addr().String(), "hunter2", tun.Port, local)
	if err != nil {
		t.Fatalf("port not free after Close: %v", err)
	}
	roundTrip(t, again.Port, "back again")
	again.Close()
}

func TestTunnelWrongOrMissingSecret(t *testing.T) {
	relay := newFakeRelay(t, "hunter2")
	if _, err := Open(context.Background(), relay.ctl.Addr().String(), "", 0, "127.0.0.1:1"); err == nil || err.Error() != "this relay needs a secret" {
		t.Fatalf("no secret: %v", err)
	}
	if _, err := Open(context.Background(), relay.ctl.Addr().String(), "wrong", 0, "127.0.0.1:1"); err == nil {
		t.Fatal("wrong secret accepted")
	}
}

// A player must stay connected long after the handshake: its deadlines
// must not outlive it (they once cut every player ~10 s after joining).
func TestPlayerOutlivesHandshakeTimeout(t *testing.T) {
	old := timeout
	timeout = 200 * time.Millisecond
	t.Cleanup(func() { timeout = old })
	relay := newFakeRelay(t, "hunter2")
	tun, err := Open(context.Background(), relay.ctl.Addr().String(), "hunter2", 0, echoServer(t))
	if err != nil {
		t.Fatal(err)
	}
	defer tun.Close()
	c, err := net.Dial("tcp", "127.0.0.1:"+strconv.Itoa(tun.Port))
	if err != nil {
		t.Fatal(err)
	}
	defer c.Close()
	for i := 0; i < 3; i++ {
		time.Sleep(3 * timeout)
		c.SetDeadline(time.Now().Add(time.Second))
		msg := fmt.Sprintf("tick %d", i)
		c.Write([]byte(msg))
		buf := make([]byte, len(msg))
		if _, err := io.ReadFull(c, buf); err != nil || string(buf) != msg {
			t.Fatalf("after %v the player got %q, %v", time.Duration(i+1)*3*timeout, buf, err)
		}
	}
}
