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
	"strings"
)

// Profile is everything the launcher remembers about the player and their preferences.
type Profile struct {
	Nickname    string `json:"nickname"`
	UUID        string `json:"uuid"`
	Language    string `json:"language"` // "en" | "es"
	Theme       string `json:"theme"`    // "light" | "dark"
	Agreed      bool   `json:"agreed"`   // accepted Privacy Policy & Terms of Use
	MaxMemoryMB int    `json:"maxMemoryMB"`
	JavaPath    string `json:"javaPath,omitempty"` // optional override; empty = managed runtime
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
// nickname so the two can never drift apart.
func Save(path string, p Profile) (Profile, error) {
	p.Nickname = strings.TrimSpace(p.Nickname)
	if !ValidNickname(p.Nickname) {
		return p, ErrInvalidNickname
	}
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
	if p.Theme != "light" {
		p.Theme = "dark"
	}
	if p.MaxMemoryMB < 512 {
		p.MaxMemoryMB = DefaultMaxMemoryMB
	}
}
