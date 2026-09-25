package skin

import (
	"bytes"
	"crypto"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"image"
	"image/color"
	"image/png"
	"io"
	"net/http"
	"strings"
	"testing"

	"udeos/launcher/internal/profile"
)

func skinPNG(t *testing.T, h int, slim bool) []byte {
	img := image.NewNRGBA(image.Rect(0, 0, 64, h))
	for y := 0; y < h; y++ {
		for x := 0; x < 64; x++ {
			img.Set(x, y, color.NRGBA{uint8(x * 4), uint8(y * 4), 90, 255})
		}
	}
	if slim {
		for y := 20; y < 32; y++ {
			img.Set(54, y, color.NRGBA{})
			img.Set(55, y, color.NRGBA{})
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		t.Fatal(err)
	}
	return buf.Bytes()
}

func TestNormalize(t *testing.T) {
	pic, model, err := Normalize(skinPNG(t, 32, false))
	if err != nil || model != Classic {
		t.Fatalf("legacy skin: %v %s", err, model)
	}
	img, _ := png.Decode(bytes.NewReader(pic))
	if img.Bounds().Dy() != 64 {
		t.Fatalf("legacy skin not converted to 64×64")
	}
	// The left leg's front (20,52) is the right leg's front (4,20) mirrored: x 4..7 → 23..20.
	if img.At(23, 52) != img.At(4, 20) || img.At(20, 52) != img.At(7, 20) {
		t.Fatalf("left leg is not the mirrored right leg")
	}
	if _, model, _ := Normalize(skinPNG(t, 64, true)); model != Slim {
		t.Fatalf("slim skin detected as %s", model)
	}
	for _, bad := range [][]byte{[]byte("not a png"), skinPNG(t, 48, false)} {
		if _, _, err := Normalize(bad); err == nil {
			t.Fatalf("accepted a bad skin")
		}
	}
}

func TestLibrary(t *testing.T) {
	lib, err := Open(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	s, err := lib.Save("", "  Knight ", Slim, skinPNG(t, 64, true))
	if err != nil || s.Name != "Knight" || s.ID == "" {
		t.Fatalf("save: %v %+v", err, s)
	}
	if _, err := lib.Save("", "x", "wide", skinPNG(t, 64, false)); err == nil {
		t.Fatal("accepted an unknown model")
	}
	if err := lib.Equip("Steve", s.ID); err != nil {
		t.Fatal(err)
	}
	if got, pic, ok := lib.Equipped("Steve"); !ok || got.ID != s.ID || len(pic) == 0 {
		t.Fatal("equipped skin not found")
	}
	if err := lib.Delete(s.ID); err != nil {
		t.Fatal(err)
	}
	if _, _, ok := lib.Equipped("Steve"); ok {
		t.Fatal("a deleted skin is still worn")
	}
}

// The game's whole path: metadata → hasJoined (signed textures) → the
// texture address → the picture; lookups by UUID and by name.
func TestServer(t *testing.T) {
	lib, _ := Open(t.TempDir())
	s, _ := lib.Save("", "Knight", Slim, skinPNG(t, 64, true))
	_ = lib.Equip("Alex_1", s.ID)
	srv, err := Start(lib, func() []string { return []string{"Alex_1", "Other"} })
	if err != nil {
		t.Fatal(err)
	}
	get := func(path string) (int, []byte) {
		res, err := http.Get(srv.URL + path)
		if err != nil {
			t.Fatal(err)
		}
		defer res.Body.Close()
		body, _ := io.ReadAll(res.Body)
		return res.StatusCode, body
	}

	var meta struct{ SignaturePublickey string }
	_, body := get("/")
	_ = json.Unmarshal(body, &meta)
	block, _ := pem.Decode([]byte(meta.SignaturePublickey))
	pub, err := x509.ParsePKIXPublicKey(block.Bytes)
	if err != nil {
		t.Fatalf("metadata key: %v", err)
	}

	var prof struct {
		ID, Name   string
		Properties []struct{ Name, Value, Signature string }
	}
	code, body := get("/sessionserver/session/minecraft/hasJoined?username=Alex_1&serverId=x")
	_ = json.Unmarshal(body, &prof)
	if code != 200 || prof.ID != strings.ReplaceAll(profile.OfflineUUID("Alex_1"), "-", "") || len(prof.Properties) != 1 {
		t.Fatalf("hasJoined: %d %s", code, body)
	}
	p := prof.Properties[0]
	sig, _ := base64.StdEncoding.DecodeString(p.Signature)
	h := sha1.Sum([]byte(p.Value))
	if err := rsa.VerifyPKCS1v15(pub.(*rsa.PublicKey), crypto.SHA1, h[:], sig); err != nil {
		t.Fatalf("textures signature: %v", err)
	}
	var tex struct {
		Textures struct {
			SKIN struct {
				URL      string
				Metadata struct{ Model string }
			}
		}
	}
	raw, _ := base64.StdEncoding.DecodeString(p.Value)
	_ = json.Unmarshal(raw, &tex)
	if tex.Textures.SKIN.Metadata.Model != "slim" {
		t.Fatalf("slim model missing: %s", raw)
	}
	code, pic := get(strings.TrimPrefix(tex.Textures.SKIN.URL, srv.URL))
	want, _ := lib.PNG(s.ID)
	if code != 200 || !bytes.Equal(pic, want) {
		t.Fatalf("texture: %d", code)
	}
	if code, _ := get(strings.TrimPrefix(tex.Textures.SKIN.URL, srv.URL) + "0"); code != 404 {
		t.Fatalf("texture with a wrong hash: %d", code)
	}

	// A local profile without a skin, a stranger by name, a stranger by UUID.
	if _, body := get("/sessionserver/session/minecraft/profile/" + strings.ReplaceAll(profile.OfflineUUID("Other"), "-", "")); !strings.Contains(string(body), `"properties":[]`) {
		t.Fatalf("profile without skin: %s", body)
	}
	lib.Default = skinPNG(t, 64, false)
	if _, body := get("/sessionserver/session/minecraft/profile/" + strings.ReplaceAll(profile.OfflineUUID("Other"), "-", "")); !strings.Contains(string(body), `"name":"textures"`) {
		t.Fatalf("a profile without a skin does not wear the default: %s", body)
	}
	if _, body := get("/sessionserver/session/minecraft/hasJoined?username=Friend&serverId=x"); strings.Contains(string(body), "textures") {
		t.Fatalf("a stranger wears the default: %s", body)
	}
	if code, _ := get("/sessionserver/session/minecraft/hasJoined?username=Friend&serverId=x"); code != 200 {
		t.Fatalf("a stranger cannot join: %d", code)
	}
	if code, _ := get("/sessionserver/session/minecraft/profile/" + strings.ReplaceAll(profile.OfflineUUID("Friend"), "-", "")); code != 204 {
		t.Fatalf("unknown UUID: %d", code)
	}
	req, _ := http.NewRequest("GET", srv.URL+"/", nil)
	req.Host = "evil.example:25585"
	if res, err := http.DefaultClient.Do(req); err != nil || res.StatusCode != 403 {
		t.Fatalf("a foreign Host header was served: %v", err)
	}
	res, err := http.Post(srv.URL+"/api/profiles/minecraft", "application/json", strings.NewReader(`["Friend","bad name"]`))
	if err != nil {
		t.Fatal(err)
	}
	body, _ = io.ReadAll(res.Body)
	res.Body.Close()
	if !strings.Contains(string(body), `"name":"Friend"`) || strings.Contains(string(body), "bad name") {
		t.Fatalf("names: %s", body)
	}
}
