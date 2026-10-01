// Package profile stores the local player: a nickname and an offline UUID.
// There is no account and nothing is ever sent to Mojang or Microsoft.
package profile

import (
	"crypto/md5"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"regexp"
	"slices"
	"strings"
)

// Profile is everything the launcher remembers about the player and their
// preferences. Nickname is the active player; Nicknames every one saved
// (the active included), so the player can keep a few and switch between
// them. Language and Theme are the active one's; each nickname keeps its own
// in Prefs, and switching puts the new one's back on. Memory and Java are
// shared by all of them.
type Profile struct {
	Nickname    string   `json:"nickname"`
	UUID        string   `json:"uuid"`
	Nicknames   []string `json:"nicknames"`
	Language    string   `json:"language"` // "en" | "es"
	Theme       string   `json:"theme"`    // "light" (default) | "dark" | "custom"
	Colors      Colors   `json:"colors"`   // the palette of the "custom" theme
	Agreed      bool     `json:"agreed"`   // accepted Privacy Policy & Terms of Use
	MaxMemoryMB int      `json:"maxMemoryMB"`
	JavaPath    string   `json:"javaPath,omitempty"` // optional override; empty = managed runtime
	// Prefs is every nickname's language, theme and colours (the active one's mirrors
	// Language/Theme/Colors). Kept by Save from the file, never from the caller.
	Prefs map[string]Prefs `json:"prefs,omitempty"`
}

// Colors is the personalised theme: five #rrggbb picks. Everything else
// (hover tints, text, shadows) is derived from them in the frontend, so the
// text always contrasts whatever the player chooses.
type Colors struct {
	Background string `json:"background"`
	Panel      string `json:"panel"`
	Primary    string `json:"primary"`
	Secondary  string `json:"secondary"`
	Third      string `json:"third"`
}

// DefaultColors is where the personalised theme starts: a calm teal on deep blue.
var DefaultColors = Colors{Background: "#11202B", Panel: "#1A2E3C", Primary: "#2DB6A3", Secondary: "#3B5A74", Third: "#27404F"}

var hexRe = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

// normalize keeps only valid #rrggbb values, falling back to the default per colour.
func (c *Colors) normalize() {
	for _, f := range []struct {
		v   *string
		def string
	}{
		{&c.Background, DefaultColors.Background}, {&c.Panel, DefaultColors.Panel}, {&c.Primary, DefaultColors.Primary},
		{&c.Secondary, DefaultColors.Secondary}, {&c.Third, DefaultColors.Third},
	} {
		if !hexRe.MatchString(*f.v) {
			*f.v = f.def
		}
	}
}

// Prefs is what each nickname chooses for itself.
type Prefs struct {
	Language string `json:"language"`
	Theme    string `json:"theme"`
	Colors   Colors `json:"colors"`
}

// DefaultMaxMemoryMB is the JVM heap given to the game unless the player changes it.
const DefaultMaxMemoryMB = 2048

var nicknameRe = regexp.MustCompile(`^[A-Za-z0-9_]{3,16}$`)

// ErrInvalidNickname is returned when the nickname is not 3–16 letters, digits or underscores.
var ErrInvalidNickname = errors.New("nickname must be 3-16 characters: letters, digits or _")

// ValidNickname reports whether the name is one Minecraft accepts.
func ValidNickname(name string) bool { return nicknameRe.MatchString(name) }

// OfflineUUID derives the same UUID vanilla servers use for offline players:
// a version-3 (MD5) UUID of "OfflinePlayer:<name>".
func OfflineUUID(name string) string {
	sum := md5.Sum([]byte("OfflinePlayer:" + name))
	sum[6] = (sum[6] & 0x0f) | 0x30 // version 3
	sum[8] = (sum[8] & 0x3f) | 0x80 // RFC 4122 variant
	return fmt.Sprintf("%x-%x-%x-%x-%x", sum[0:4], sum[4:6], sum[6:8], sum[8:10], sum[10:16])
}

// Load reads the profile file. os.ErrNotExist is returned when the player has
// not gone through the login screen yet.
func Load(path string) (Profile, error) {
	var p Profile
	data, err := os.ReadFile(path)
	if err != nil {
		return p, err
	}
	if err := json.Unmarshal(data, &p); err != nil {
		return p, err
	}
	p.normalize()
	return p, nil
}

// Save validates and writes the profile. The UUID is always recomputed from the
// nickname so the two can never drift apart. Switching to a nickname that
// already has a language and theme puts them back on; a new one keeps the
// current ones.
func Save(path string, p Profile) (Profile, error) {
	p.Nickname = strings.TrimSpace(p.Nickname)
	if !ValidNickname(p.Nickname) {
		return p, ErrInvalidNickname
	}
	old, _ := Load(path) // none yet on first login
	if pr, ok := old.Prefs[p.Nickname]; ok && old.Nickname != p.Nickname {
		p.Language, p.Theme, p.Colors = pr.Language, pr.Theme, pr.Colors
	}
	p.Prefs = old.Prefs
	p.UUID = OfflineUUID(p.Nickname)
	p.normalize()
	data, err := json.MarshalIndent(p, "", "  ")
	if err != nil {
		return p, err
	}
	return p, os.WriteFile(path, data, 0o644)
}

func (p *Profile) normalize() {
	if p.Language != "es" {
		p.Language = "en"
	}
	if p.Theme != "dark" && p.Theme != "custom" {
		p.Theme = "light"
	}
	p.Colors.normalize()
	if p.MaxMemoryMB < 512 {
		p.MaxMemoryMB = DefaultMaxMemoryMB
	}
	// The active nickname always leads the list; the rest keep their order, no duplicates, only valid names.
	names := []string{p.Nickname}
	for _, n := range p.Nicknames {
		if n = strings.TrimSpace(n); n != p.Nickname && ValidNickname(n) && !slices.Contains(names, n) {
			names = append(names, n)
		}
	}
	p.Nicknames = names
	prefs := map[string]Prefs{}
	for _, n := range names {
		if pr, ok := p.Prefs[n]; ok {
			pr.Colors.normalize() // files from before the custom theme have none
			prefs[n] = pr
		}
	}
	prefs[p.Nickname] = Prefs{p.Language, p.Theme, p.Colors}
	p.Prefs = prefs
}
