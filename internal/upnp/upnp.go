// Package upnp asks the home router to forward a TCP port to this computer
// (UPnP Internet Gateway Device), so players outside the local network can
// reach a server. Plain stdlib: SSDP discovery plus two SOAP calls.
package upnp

import (
	"bufio"
	"bytes"
	"context"
	"encoding/xml"
	"errors"
	"fmt"
	"html"
	"io"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"
)

// ErrNoRouter means no router answered: UPnP is off, or the network has none.
var ErrNoRouter = errors.New("the router did not answer: turn on UPnP in its settings, or forward the port by hand")

// ErrShared means the router itself sits behind another network (CGNAT, a
// second router): the mapping exists but the internet still cannot reach it.
var ErrShared = errors.New("your router has no public address (shared connection / CGNAT): ask your provider for a public IP, or use a tunnel such as playit.gg")

type gateway struct{ control, service, localIP string }

var (
	mu     sync.Mutex
	cached *gateway
)

// Map forwards TCP port to this computer and returns the router's public IP.
// The mapping has no lease: call Unmap when the server stops.
func Map(ctx context.Context, port int, desc string) (string, error) {
	g, err := find(ctx)
	if err != nil {
		return "", err
	}
	p := strconv.Itoa(port)
	if _, err := g.soap(ctx, "AddPortMapping", "NewRemoteHost", "", "NewExternalPort", p, "NewProtocol", "TCP",
		"NewInternalPort", p, "NewInternalClient", g.localIP, "NewEnabled", "1",
		"NewPortMappingDescription", desc, "NewLeaseDuration", "0"); err != nil {
		return "", err
	}
	body, err := g.soap(ctx, "GetExternalIPAddress")
	if err != nil {
		return "", err
	}
	var ip net.IP
	if m := externalRe.FindStringSubmatch(body); m != nil {
		ip = net.ParseIP(strings.TrimSpace(m[1]))
	}
	if ip == nil {
		return "", errors.New("the router did not say its public address")
	}
	if ip.IsPrivate() || shared.Contains(ip) || ip.IsUnspecified() {
		return ip.String(), ErrShared
	}
	return ip.String(), nil
}

// Unmap removes the forwarding Map added.
func Unmap(ctx context.Context, port int) error {
	g, err := find(ctx)
	if err != nil {
		return err
	}
	_, err = g.soap(ctx, "DeletePortMapping", "NewRemoteHost", "", "NewExternalPort", strconv.Itoa(port), "NewProtocol", "TCP")
	return err
}

// LocalIP is this computer's address on the local network ("" when offline).
func LocalIP() string {
	c, err := net.Dial("udp4", "192.0.2.1:9") // no packet is sent; it only picks the outgoing interface
	if err != nil {
		return ""
	}
	defer c.Close()
	return c.LocalAddr().(*net.UDPAddr).IP.String()
}

var (
	externalRe   = regexp.MustCompile(`<NewExternalIPAddress>([^<]*)<`)
	faultRe      = regexp.MustCompile(`<errorDescription>([^<]*)<`)
	_, shared, _ = net.ParseCIDR("100.64.0.0/10")
)

// find returns the router, discovering it once per run.
func find(ctx context.Context) (*gateway, error) {
	mu.Lock()
	defer mu.Unlock()
	if cached != nil {
		return cached, nil
	}
	conn, err := net.ListenPacket("udp4", ":0")
	if err != nil {
		return nil, err
	}
	defer conn.Close()
	dst := &net.UDPAddr{IP: net.IPv4(239, 255, 255, 250), Port: 1900}
	for _, v := range []string{"1", "2"} {
		msg := "M-SEARCH * HTTP/1.1\r\nHOST: 239.255.255.250:1900\r\nMAN: \"ssdp:discover\"\r\nMX: 2\r\nST: urn:schemas-upnp-org:device:InternetGatewayDevice:" + v + "\r\n\r\n"
		if _, err := conn.WriteTo([]byte(msg), dst); err != nil {
			return nil, ErrNoRouter
		}
	}
	_ = conn.SetDeadline(time.Now().Add(3 * time.Second))
	buf := make([]byte, 4096)
	for {
		n, _, err := conn.ReadFrom(buf)
		if err != nil {
			return nil, ErrNoRouter
		}
		res, err := http.ReadResponse(bufio.NewReader(bytes.NewReader(buf[:n])), nil)
		if err != nil || res.Header.Get("Location") == "" {
			continue
		}
		if g, err := describe(ctx, res.Header.Get("Location")); err == nil {
			cached = g
			return g, nil
		}
	}
}

type device struct {
	Services []struct {
		Type    string `xml:"serviceType"`
		Control string `xml:"controlURL"`
	} `xml:"serviceList>service"`
	Devices []device `xml:"deviceList>device"`
}

// describe reads the router's description and finds its WAN connection service.
func describe(ctx context.Context, location string) (*gateway, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, location, nil)
	if err != nil {
		return nil, err
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	var root struct {
		URLBase string `xml:"URLBase"`
		Device  device `xml:"device"`
	}
	if err := xml.NewDecoder(res.Body).Decode(&root); err != nil {
		return nil, err
	}
	base, err := url.Parse(location)
	if err != nil {
		return nil, err
	}
	if root.URLBase != "" {
		if b, err := url.Parse(root.URLBase); err == nil {
			base = b
		}
	}
	stack := []device{root.Device}
	for len(stack) > 0 {
		d := stack[len(stack)-1]
		stack = append(stack[:len(stack)-1], d.Devices...)
		for _, s := range d.Services {
			if strings.Contains(s.Type, ":WANIPConnection:") || strings.Contains(s.Type, ":WANPPPConnection:") {
				ctl, err := base.Parse(s.Control)
				if err != nil {
					return nil, err
				}
				port := ctl.Port()
				if port == "" {
					port = "80"
				}
				// The address the router sees us from is where it must forward to.
				c, err := net.Dial("udp4", net.JoinHostPort(ctl.Hostname(), port))
				if err != nil {
					return nil, err
				}
				local := c.LocalAddr().(*net.UDPAddr).IP.String()
				c.Close()
				return &gateway{control: ctl.String(), service: s.Type, localIP: local}, nil
			}
		}
	}
	return nil, errors.New("the router has no internet connection service")
}

// soap calls one action with name/value argument pairs and returns the reply body.
func (g *gateway) soap(ctx context.Context, action string, args ...string) (string, error) {
	var b strings.Builder
	fmt.Fprintf(&b, `<?xml version="1.0"?><s:Envelope xmlns:s="http://schemas.xmlsoap.org/soap/envelope/" s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/"><s:Body><u:%s xmlns:u="%s">`, action, g.service)
	for i := 0; i+1 < len(args); i += 2 {
		fmt.Fprintf(&b, "<%s>%s</%s>", args[i], html.EscapeString(args[i+1]), args[i])
	}
	fmt.Fprintf(&b, "</u:%s></s:Body></s:Envelope>", action)
	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, g.control, strings.NewReader(b.String()))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", `text/xml; charset="utf-8"`)
	req.Header.Set("SOAPAction", `"`+g.service+"#"+action+`"`)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(res.Body)
	if res.StatusCode != http.StatusOK {
		reason := res.Status
		if m := faultRe.FindSubmatch(body); m != nil {
			reason = string(m[1])
		}
		return "", fmt.Errorf("the router refused to open the port (%s)", reason)
	}
	return string(body), nil
}
