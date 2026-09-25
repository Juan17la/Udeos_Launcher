// Package server reads and writes the files a Minecraft dedicated server keeps
// in its folder: server.properties and the player lists (whitelist, ops, bans).
package server

import (
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf16"
)

// PropertiesFile is the server's settings file.
const PropertiesFile = "server.properties"

// ReadProperties parses server.properties; a missing file is an empty map.
func ReadProperties(dir string) (map[string]string, error) {
	out := map[string]string{}
	raw, err := os.ReadFile(filepath.Join(dir, PropertiesFile))
	if errors.Is(err, os.ErrNotExist) {
		return out, nil
	}
	if err != nil {
		return nil, err
	}
	for _, line := range strings.Split(string(raw), "\n") {
		line = strings.TrimSpace(line)
		if line == "" || line[0] == '#' || line[0] == '!' {
			continue
		}
		if k, v, ok := strings.Cut(line, "="); ok {
			out[strings.TrimSpace(k)] = unescape(strings.TrimSpace(v))
		}
	}
	return out, nil
}

// WriteProperties sets the given keys and keeps every other line (comments
// and settings the launcher does not know) as it was.
func WriteProperties(dir string, set map[string]string) error {
	path := filepath.Join(dir, PropertiesFile)
	raw, err := os.ReadFile(path)
	if err != nil && !errors.Is(err, os.ErrNotExist) {
		return err
	}
	left := map[string]string{}
	for k, v := range set {
		left[k] = v
	}
	var lines []string
	if len(raw) > 0 {
		lines = strings.Split(strings.TrimRight(string(raw), "\n"), "\n")
	}
	for i, line := range lines {
		k, _, ok := strings.Cut(strings.TrimSpace(line), "=")
		if v, want := left[strings.TrimSpace(k)]; ok && want {
			lines[i] = strings.TrimSpace(k) + "=" + escape(v)
			delete(left, strings.TrimSpace(k))
		}
	}
	for k, v := range left {
		lines = append(lines, k+"="+escape(v))
	}
	return os.WriteFile(path, []byte(strings.Join(lines, "\n")+"\n"), 0o644)
}

// escape writes a value the way Java's Properties.store does: backslashes
// doubled, anything outside ASCII as \uXXXX (older servers read the file as Latin-1).
func escape(v string) string {
	var b strings.Builder
	for _, r := range strings.ReplaceAll(v, "\\", "\\\\") {
		if r < 0x80 {
			b.WriteRune(r)
			continue
		}
		for _, u := range utf16.Encode([]rune{r}) {
			fmt.Fprintf(&b, "\\u%04x", u)
		}
	}
	return b.String()
}

// unescape undoes Java's escapes (\uXXXX, \:, \=, \\).
func unescape(v string) string {
	if !strings.Contains(v, "\\") {
		return v
	}
	var units []uint16
	for i := 0; i < len(v); i++ {
		c := v[i]
		if c == '\\' && i+1 < len(v) {
			i++
			if v[i] == 'u' && i+4 < len(v) {
				if u, err := strconv.ParseUint(v[i+1:i+5], 16, 16); err == nil {
					units = append(units, uint16(u))
					i += 4
					continue
				}
			}
			c = v[i]
		}
		units = append(units, uint16(c))
	}
	return string(utf16.Decode(units))
}

// Addresses friends type. nip.io is a free public DNS that answers any
// "<anything>.<a-b-c-d>.nip.io" with the IP a.b.c.d, so a server gets a
// readable name of its own without an account or a domain to buy; the
// port after ":" is what makes it unique on a shared relay.

var labelRe = regexp.MustCompile(`^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`)

// MaxAddressName keeps the whole address short enough to type.
const MaxAddressName = 60

// ValidAddressName: dot-separated labels of a-z, 0-9 and "-", each with a letter.
func ValidAddressName(name string) bool {
	if name == "" || len(name) > MaxAddressName {
		return false
	}
	for _, label := range strings.Split(name, ".") {
		if !labelRe.MatchString(label) || !strings.ContainsAny(label, "abcdefghijklmnopqrstuvwxyz") {
			return false
		}
	}
	return true
}

// DefaultAddressName is "udeoslauncher.<server name as a label>".
func DefaultAddressName(serverName string) string {
	var b strings.Builder
	for _, r := range strings.ToLower(serverName) {
		switch {
		case r >= 'a' && r <= 'z' || r >= '0' && r <= '9':
			b.WriteRune(r)
		case b.Len() > 0 && !strings.HasSuffix(b.String(), "-"):
			b.WriteByte('-')
		}
	}
	label := strings.Trim(b.String(), "-")
	if len(label) > 40 {
		label = strings.Trim(label[:40], "-")
	}
	if !ValidAddressName(label) {
		label = "server"
	}
	return "udeoslauncher." + label
}

// PublicAddress is what friends type: "<name>.<a-b-c-d>.nip.io", plus
// ":port" unless it is Minecraft's default 25565. IPv6 has no such name.
func PublicAddress(name string, ip net.IP, port int) string {
	suffix := ""
	if port != 25565 {
		suffix = ":" + strconv.Itoa(port)
	}
	v4 := ip.To4()
	if v4 == nil || !ValidAddressName(name) {
		return net.JoinHostPort(ip.String(), strconv.Itoa(port))
	}
	return name + "." + strings.ReplaceAll(v4.String(), ".", "-") + ".nip.io" + suffix
}

// Player lists and the file each one lives in.
var listFiles = map[string]string{"whitelist": "whitelist.json", "ops": "ops.json", "banned": "banned-players.json"}

// Commands the running server takes to add/remove a player from a list.
var listCommands = map[string][2]string{"whitelist": {"whitelist add", "whitelist remove"}, "ops": {"op", "deop"}, "banned": {"ban", "pardon"}}

// Command is the console command that adds (or removes) name on a list.
func Command(list, name string, add bool) (string, error) {
	c, ok := listCommands[list]
	if !ok {
		return "", fmt.Errorf("unknown player list %q", list)
	}
	if add {
		return c[0] + " " + name, nil
	}
	return c[1] + " " + name, nil
}

// Names returns the player names on a list, in file order.
func Names(dir, list string) ([]string, error) {
	entries, err := readList(dir, list)
	if err != nil {
		return nil, err
	}
	out := []string{}
	for _, e := range entries {
		if n, _ := e["name"].(string); n != "" {
			out = append(out, n)
		}
	}
	return out, nil
}

// SetPlayer adds (uuid needed) or removes name on a list. Names compare
// case-insensitively, the way the server does; adding twice is a no-op.
func SetPlayer(dir, list, name, uuid string, add bool) error {
	entries, err := readList(dir, list)
	if err != nil {
		return err
	}
	kept := entries[:0]
	found := false
	for _, e := range entries {
		n, _ := e["name"].(string)
		if strings.EqualFold(n, name) {
			found = true
			if !add {
				continue
			}
		}
		kept = append(kept, e)
	}
	if add && !found {
		e := map[string]any{"uuid": uuid, "name": name}
		switch list {
		case "ops":
			e["level"], e["bypassesPlayerLimit"] = 4, false
		case "banned":
			e["created"], e["source"], e["expires"], e["reason"] = time.Now().Format("2006-01-02 15:04:05 -0700"), "Server", "forever", "Banned by an operator."
		}
		kept = append(kept, e)
	}
	raw, err := json.MarshalIndent(kept, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dir, listFiles[list]), raw, 0o644)
}

func readList(dir, list string) ([]map[string]any, error) {
	file, ok := listFiles[list]
	if !ok {
		return nil, fmt.Errorf("unknown player list %q", list)
	}
	raw, err := os.ReadFile(filepath.Join(dir, file))
	if errors.Is(err, os.ErrNotExist) || len(strings.TrimSpace(string(raw))) == 0 {
		return []map[string]any{}, nil
	}
	if err != nil {
		return nil, err
	}
	var out []map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		return nil, fmt.Errorf("%s: %w", file, err)
	}
	return out, nil
}
