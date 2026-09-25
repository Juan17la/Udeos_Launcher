package upnp

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// A fake router: its description nests the WAN service two devices deep and
// gives a relative control URL, like most real ones.
func TestDescribeAndMap(t *testing.T) {
	var calls []string
	var srv *httptest.Server
	srv = httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.URL.Path {
		case "/desc.xml":
			io.WriteString(w, `<root><device><deviceList><device><deviceList><device><serviceList><service>
<serviceType>urn:schemas-upnp-org:service:WANIPConnection:1</serviceType><controlURL>/ctl</controlURL>
</service></serviceList></device></deviceList></device></deviceList></device></root>`)
		case "/ctl":
			body, _ := io.ReadAll(r.Body)
			calls = append(calls, r.Header.Get("SOAPAction"))
			if strings.Contains(r.Header.Get("SOAPAction"), "AddPortMapping") && !strings.Contains(string(body), "<NewExternalPort>25565</NewExternalPort>") {
				w.WriteHeader(500)
				io.WriteString(w, `<errorDescription>bad port</errorDescription>`)
				return
			}
			io.WriteString(w, `<NewExternalIPAddress>100.70.1.2</NewExternalIPAddress>`)
		}
	}))
	defer srv.Close()

	g, err := describe(context.Background(), srv.URL+"/desc.xml")
	if err != nil {
		t.Fatal(err)
	}
	if g.control != srv.URL+"/ctl" || g.localIP != "127.0.0.1" {
		t.Fatalf("gateway = %+v", g)
	}
	cached = g
	defer func() { cached = nil }()
	ip, err := Map(context.Background(), 25565, "test")
	if ip != "100.70.1.2" || !errors.Is(err, ErrShared) { // 100.64/10 is carrier-grade NAT
		t.Fatalf("Map = %q, %v", ip, err)
	}
	if _, err := Map(context.Background(), 1, "test"); err == nil || !strings.Contains(err.Error(), "bad port") {
		t.Fatalf("refusal not reported: %v", err)
	}
	if len(calls) < 3 || !strings.HasSuffix(calls[0], `#AddPortMapping"`) {
		t.Fatalf("calls = %v", calls)
	}
}
