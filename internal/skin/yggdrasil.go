package skin

import (
	"context"
	"crypto"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/x509"
	_ "embed"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"net"
	"net/http"
	"path/filepath"
	"slices"
	"strings"
	"time"

	"udeos/launcher/internal/download"
	"udeos/launcher/internal/profile"
)

// keyPEM signs the textures the server hands out. It is the same key in
// every copy of the launcher on purpose: a friend's game must trust the
// skins a Udeos server sends, and the only thing it vouches for is "this
// picture belongs to this offline name", which offline mode lets anyone
// claim anyway.
//
//go:embed key.pem
var keyPEM []byte

// Port is where the skin server listens when it is free. Texture addresses
// carry the picture itself (see textures), so the same port on a friend's
// computer answers them too.
const Port = 25585

// Server is a Yggdrasil-compatible API (the protocol Mojang's session
// servers speak, as authlib-injector expects it) on 127.0.0.1. It knows the
// launcher's own profiles and the skin each wears; any other valid name is
// a player without a skin, with the offline UUID vanilla gives it. Joining
// always succeeds: a server that asks it is exactly as open as offline mode.
type Server struct {
	URL     string
	lib     *Library
	players func() []string
	key     *rsa.PrivateKey
	meta    []byte
}

// Start listens on Port (any free port when it is taken) and serves until
// the launcher exits. players returns the launcher's nicknames.
func Start(lib *Library, players func() []string) (*Server, error) {
	block, _ := pem.Decode(keyPEM)
	if block == nil {
		return nil, fmt.Errorf("skin server: bad key")
	}
	k, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, fmt.Errorf("skin server: %w", err)
	}
	key, ok := k.(*rsa.PrivateKey)
	if !ok {
		return nil, fmt.Errorf("skin server: the key is not RSA")
	}
	pub, err := x509.MarshalPKIXPublicKey(&key.PublicKey)
	if err != nil {
		return nil, fmt.Errorf("skin server: %w", err)
	}
	ln, err := net.Listen("tcp", fmt.Sprintf("127.0.0.1:%d", Port))
	if err != nil {
		if ln, err = net.Listen("tcp", "127.0.0.1:0"); err != nil {
			return nil, fmt.Errorf("skin server: %w", err)
		}
	}
	s := &Server{URL: "http://" + ln.Addr().String(), lib: lib, players: players, key: key}
	s.meta, _ = json.Marshal(map[string]any{
		"meta":               map[string]any{"serverName": "Udeos Launcher", "implementationName": "Udeos Launcher", "implementationVersion": "1", "feature.non_email_login": true},
		"skinDomains":        []string{"127.0.0.1", "localhost"},
		"signaturePublickey": string(pem.EncodeToMemory(&pem.Block{Type: "PUBLIC KEY", Bytes: pub})),
	})

	mux := http.NewServeMux()
	mux.HandleFunc("GET /{$}", func(w http.ResponseWriter, _ *http.Request) { s.json(w, s.meta) })
	mux.HandleFunc("POST /api/profiles/minecraft", s.names)
	mux.HandleFunc("GET /sessionserver/session/minecraft/hasJoined", s.hasJoined)
	mux.HandleFunc("POST /sessionserver/session/minecraft/join", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })
	mux.HandleFunc("GET /sessionserver/session/minecraft/profile/{uuid}", s.profileByID)
	mux.HandleFunc("GET /textures/{data}/{hash}", s.texture)
	// Only callers that name this computer: a web page reaching 127.0.0.1
	// through a rebinding DNS name sends its own host and is refused.
	local := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if h, _, _ := net.SplitHostPort(r.Host); h != "127.0.0.1" && h != "localhost" {
			http.Error(w, "forbidden", http.StatusForbidden)
			return
		}
		mux.ServeHTTP(w, r)
	})
	srv := &http.Server{Handler: local, ReadHeaderTimeout: 10 * time.Second}
	go srv.Serve(ln) //nolint:errcheck // lives as long as the launcher
	return s, nil
}

// authlib-injector (github.com/yushijinhun/authlib-injector, AGPL-3.0) is
// downloaded on first use, not shipped with the launcher.
const (
	agentVersion = "1.2.8"
	agentURL     = "https://authlib-injector.yushi.moe/artifact/56/authlib-injector-1.2.8.jar"
	agentSHA1    = "0e0e66d8a4f91a26f33b9c09f5cdffce4a11f0b8"
	agentSize    = 349681
)

// Agent downloads authlib-injector once (into libraries/) and returns the
// JVM flag that points a game or a server at s instead of Mojang.
func (s *Server) Agent(ctx context.Context, libraries string) ([]string, error) {
	path := filepath.Join(libraries, "moe", "yushi", "authlib-injector", agentVersion, "authlib-injector-"+agentVersion+".jar")
	task := download.Task{URL: agentURL, Path: path, SHA1: agentSHA1, Size: agentSize}
	if err := download.NewPool(nil).Run(ctx, "authlib-injector", []download.Task{task}); err != nil {
		return nil, fmt.Errorf("authlib-injector: %w", err)
	}
	return []string{"-javaagent:" + path + "=" + s.URL}, nil
}

func (s *Server) json(w http.ResponseWriter, body []byte) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	_, _ = w.Write(body)
}

// profileJSON is what Mojang returns for a player: undashed id, name, and,
// for the launcher's own profiles, the signed textures property (the skin
// from the library, else the Default one).
func (s *Server) profileJSON(name string) []byte {
	id := strings.ReplaceAll(profile.OfflineUUID(name), "-", "")
	props := []map[string]string{}
	if slices.Contains(s.players(), name) {
		if sk, pic, ok := s.lib.Equipped(name); ok {
			props = append(props, s.textures(id, name, sk.Model, pic))
		} else if s.lib.Default != nil {
			props = append(props, s.textures(id, name, Classic, s.lib.Default))
		}
	}
	raw, _ := json.Marshal(map[string]any{"id": id, "name": name, "properties": props})
	return raw
}

// textures builds the signed "textures" property. The texture address
// carries the picture itself (base64url) and its SHA-256, which the game
// uses as the cache name: any Udeos launcher can answer it, not only the
// one that made it.
func (s *Server) textures(id, name, model string, pic []byte) map[string]string {
	sum := sha256.Sum256(pic)
	skin := map[string]any{"url": s.URL + "/textures/" + base64.RawURLEncoding.EncodeToString(pic) + "/" + hex.EncodeToString(sum[:])}
	if model == Slim {
		skin["metadata"] = map[string]string{"model": "slim"}
	}
	raw, _ := json.Marshal(map[string]any{"timestamp": time.Now().UnixMilli(), "profileId": id, "profileName": name, "textures": map[string]any{"SKIN": skin}})
	value := base64.StdEncoding.EncodeToString(raw)
	h := sha1.Sum([]byte(value))
	sig, _ := rsa.SignPKCS1v15(nil, s.key, crypto.SHA1, h[:])
	return map[string]string{"name": "textures", "value": value, "signature": base64.StdEncoding.EncodeToString(sig)}
}

// names answers the name → UUID lookup (whitelist and op commands on a
// server, player heads, very old versions' skins).
func (s *Server) names(w http.ResponseWriter, r *http.Request) {
	var names []string
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, 64<<10)).Decode(&names); err != nil {
		http.Error(w, "bad request", http.StatusBadRequest)
		return
	}
	out := []map[string]string{}
	for _, n := range names {
		if profile.ValidNickname(n) {
			out = append(out, map[string]string{"id": strings.ReplaceAll(profile.OfflineUUID(n), "-", ""), "name": n})
		}
	}
	raw, _ := json.Marshal(out)
	s.json(w, raw)
}

// hasJoined is what a server asks when a player joins in online mode.
func (s *Server) hasJoined(w http.ResponseWriter, r *http.Request) {
	name := r.URL.Query().Get("username")
	if !profile.ValidNickname(name) {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	s.json(w, s.profileJSON(name))
}

// profileByID is how the game fetches a player's skin; only the launcher's
// own profiles can be found by UUID.
func (s *Server) profileByID(w http.ResponseWriter, r *http.Request) {
	want := strings.ToLower(strings.ReplaceAll(r.PathValue("uuid"), "-", ""))
	for _, n := range s.players() {
		if strings.ReplaceAll(profile.OfflineUUID(n), "-", "") == want {
			s.json(w, s.profileJSON(n))
			return
		}
	}
	w.WriteHeader(http.StatusNoContent)
}

// texture serves the picture carried in its own address, once it checks
// out: the hash matches (the game caches by it) and it is a skin.
func (s *Server) texture(w http.ResponseWriter, r *http.Request) {
	pic, err := base64.RawURLEncoding.DecodeString(r.PathValue("data"))
	sum := sha256.Sum256(pic)
	if err != nil || hex.EncodeToString(sum[:]) != r.PathValue("hash") {
		http.NotFound(w, r)
		return
	}
	if _, _, err := Normalize(pic); err != nil {
		http.NotFound(w, r)
		return
	}
	w.Header().Set("Content-Type", "image/png")
	w.Header().Set("Cache-Control", "max-age=31536000, immutable")
	_, _ = w.Write(pic)
}
