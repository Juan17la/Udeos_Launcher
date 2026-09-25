// Package skin keeps the player's skin library and gets the skins into the
// game without an account: a tiny Yggdrasil-compatible server on 127.0.0.1
// (yggdrasil.go) answers the game's profile and texture requests, and
// authlib-injector, a Java agent (agent.go), points the game at it.
package skin

import (
	"bytes"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"image"
	"image/draw"
	"image/png"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"
	"time"
	"unicode/utf8"
)

// Models: the arm width Minecraft draws the skin with (4 or 3 pixels).
const (
	Classic = "classic"
	Slim    = "slim"
)

// MaxName is the longest skin name.
const MaxName = 32

// Skin is one entry of the library; its picture is <dir>/<id>.png.
type Skin struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Model     string    `json:"model"` // Classic | Slim
	CreatedAt time.Time `json:"createdAt"`
}

// Library is every skin the player saved, shared by all launcher profiles,
// plus which one each profile (nickname) wears.
type Library struct {
	// Default is the classic skin worn by profiles that chose none (Steve,
	// set by the app); nil leaves it to Minecraft's own default.
	Default []byte

	dir  string
	mu   sync.Mutex
	data libraryFile
}

type libraryFile struct {
	Skins    []Skin            `json:"skins"`
	Equipped map[string]string `json:"equipped"` // nickname → skin id
}

// Open reads <dir>/library.json (an empty library when there is none).
func Open(dir string) (*Library, error) {
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return nil, err
	}
	l := &Library{dir: dir}
	raw, err := os.ReadFile(l.file())
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}
	if len(raw) > 0 {
		if err := json.Unmarshal(raw, &l.data); err != nil {
			return nil, err
		}
	}
	if l.data.Equipped == nil {
		l.data.Equipped = map[string]string{}
	}
	return l, nil
}

func (l *Library) file() string             { return filepath.Join(l.dir, "library.json") }
func (l *Library) pngPath(id string) string { return filepath.Join(l.dir, filepath.Base(id)+".png") }

// List returns the skins, newest first, and the skin each nickname wears.
func (l *Library) List() ([]Skin, map[string]string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	skins := slices.Clone(l.data.Skins)
	slices.SortStableFunc(skins, func(a, b Skin) int { return b.CreatedAt.Compare(a.CreatedAt) })
	eq := map[string]string{}
	for k, v := range l.data.Equipped {
		eq[k] = v
	}
	return skins, eq
}

// PNG returns a skin's picture.
func (l *Library) PNG(id string) ([]byte, error) { return os.ReadFile(l.pngPath(id)) }

// Save stores a new skin (id "") or replaces one's name, model and picture.
// The picture goes through Normalize, so it is always a 64×64 PNG.
func (l *Library) Save(id, name, model string, pic []byte) (Skin, error) {
	name = strings.TrimSpace(name)
	if name == "" || utf8.RuneCountInString(name) > MaxName {
		return Skin{}, errors.New("the skin name must be 1-32 characters")
	}
	if model != Classic && model != Slim {
		return Skin{}, errors.New("the model must be classic or slim")
	}
	pic, _, err := Normalize(pic)
	if err != nil {
		return Skin{}, err
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	i := slices.IndexFunc(l.data.Skins, func(s Skin) bool { return s.ID == id })
	if id != "" && i < 0 {
		return Skin{}, errors.New("skin not found")
	}
	if i < 0 {
		b := make([]byte, 6)
		_, _ = rand.Read(b)
		l.data.Skins = append(l.data.Skins, Skin{ID: hex.EncodeToString(b), CreatedAt: time.Now()})
		i = len(l.data.Skins) - 1
	}
	s := &l.data.Skins[i]
	s.Name, s.Model = name, model
	if err := os.WriteFile(l.pngPath(s.ID), pic, 0o644); err != nil {
		return Skin{}, err
	}
	return *s, l.saveLocked()
}

// Delete removes a skin; profiles that wore it go back to the default skin.
func (l *Library) Delete(id string) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	i := slices.IndexFunc(l.data.Skins, func(s Skin) bool { return s.ID == id })
	if i < 0 {
		return errors.New("skin not found")
	}
	l.data.Skins = slices.Delete(l.data.Skins, i, i+1)
	for nick, sid := range l.data.Equipped {
		if sid == id {
			delete(l.data.Equipped, nick)
		}
	}
	if err := os.Remove(l.pngPath(id)); err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	return l.saveLocked()
}

// Equip makes nickname wear the skin; id "" puts the default back.
func (l *Library) Equip(nickname, id string) error {
	l.mu.Lock()
	defer l.mu.Unlock()
	if id == "" {
		delete(l.data.Equipped, nickname)
	} else if !slices.ContainsFunc(l.data.Skins, func(s Skin) bool { return s.ID == id }) {
		return errors.New("skin not found")
	} else {
		l.data.Equipped[nickname] = id
	}
	return l.saveLocked()
}

// Equipped returns the skin nickname wears and its picture; ok is false for
// the default skin.
func (l *Library) Equipped(nickname string) (s Skin, pic []byte, ok bool) {
	l.mu.Lock()
	id := l.data.Equipped[nickname]
	i := slices.IndexFunc(l.data.Skins, func(s Skin) bool { return s.ID == id })
	if i >= 0 {
		s = l.data.Skins[i]
	}
	l.mu.Unlock()
	if i < 0 {
		return Skin{}, nil, false
	}
	pic, err := l.PNG(id)
	return s, pic, err == nil
}

func (l *Library) saveLocked() error {
	raw, err := json.MarshalIndent(l.data, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(l.file(), raw, 0o644)
}

// maxFile is the largest skin file accepted; a 64×64 PNG is a few KB.
const maxFile = 1 << 20

// Normalize checks that raw is a Minecraft skin (a 64×64 PNG, or the old
// 64×32 layout, which is converted the way the game does) and re-encodes
// it, which strips metadata and keeps it small. model is the arm width the
// pixels suggest.
func Normalize(raw []byte) (pic []byte, model string, err error) {
	bad := errors.New("a skin must be a 64×64 or 64×32 PNG image")
	if len(raw) > maxFile || !bytes.HasPrefix(raw, []byte("\x89PNG")) {
		return nil, "", bad
	}
	cfg, err := png.DecodeConfig(bytes.NewReader(raw))
	if err != nil || cfg.Width != 64 || (cfg.Height != 64 && cfg.Height != 32) {
		return nil, "", bad
	}
	src, err := png.Decode(bytes.NewReader(raw))
	if err != nil {
		return nil, "", bad
	}
	img := image.NewNRGBA(image.Rect(0, 0, 64, 64))
	draw.Draw(img, src.Bounds(), src, image.Point{}, draw.Src)
	if cfg.Height == 32 {
		legacy(img)
	}
	var buf bytes.Buffer
	if err := (&png.Encoder{CompressionLevel: png.BestCompression}).Encode(&buf, img); err != nil {
		return nil, "", err
	}
	return buf.Bytes(), detectModel(img), nil
}

// legacy fills the bottom half of a 64×32 skin the way Minecraft does: the
// left arm and leg are mirrored copies of the right ones.
func legacy(img *image.NRGBA) {
	// Minecraft's own table: each face rect {x, y, dx, w, h} is copied to
	// (x+dx, y+32) mirrored left-right; the dx shuffle swaps outer/inner faces.
	for _, r := range [][5]int{
		{4, 16, 16, 4, 4}, {8, 16, 16, 4, 4}, {0, 20, 24, 4, 12}, {4, 20, 16, 4, 12}, {8, 20, 8, 4, 12}, {12, 20, 16, 4, 12},
		{44, 16, -8, 4, 4}, {48, 16, -8, 4, 4}, {40, 20, 0, 4, 12}, {44, 20, -8, 4, 12}, {48, 20, -16, 4, 12}, {52, 20, -8, 4, 12},
	} {
		x, y, dx, w, h := r[0], r[1], r[2], r[3], r[4]
		for j := 0; j < h; j++ {
			for i := 0; i < w; i++ {
				img.Set(x+dx+w-1-i, y+32+j, img.At(x+i, y+j))
			}
		}
	}
}

// detectModel guesses the arm width: slim skins leave the last column of
// the right arm's back (x 54–55, y 20–31) transparent, classic skins cannot.
func detectModel(img *image.NRGBA) string {
	for y := 20; y < 32; y++ {
		if img.NRGBAAt(55, y).A != 0 {
			return Classic
		}
	}
	return Slim
}
