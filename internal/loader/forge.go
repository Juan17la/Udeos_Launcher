package loader

import (
	"archive/zip"
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"sort"
	"strconv"
	"strings"

	"udeos/launcher/internal/download"
	"udeos/launcher/internal/launch"
	"udeos/launcher/internal/mojang"
)

// Forge's public metadata and maven repository.
const (
	ForgePromotionsURL = "https://files.minecraftforge.net/net/minecraftforge/forge/promotions_slim.json"
	ForgeMetadataURL   = "https://files.minecraftforge.net/net/minecraftforge/forge/maven-metadata.json"
	ForgeMavenURL      = "https://maven.minecraftforge.net/"
)

// forgeOptions picks one build per Minecraft version: the "recommended"
// promotion when there is one, otherwise "latest". maven-metadata.json gives
// the full artifact version (old builds carry a branch suffix, e.g.
// 1.7.10-10.13.4.1614-1.7.10) and the order of the game versions.
func (m *Manager) forgeOptions(ctx context.Context) ([]Option, error) {
	var promos struct {
		Promos map[string]string `json:"promos"`
	}
	if err := m.Client.GetJSON(ctx, ForgePromotionsURL, &promos); err != nil {
		return nil, err
	}
	var metadata map[string][]string
	if err := m.Client.GetJSON(ctx, ForgeMetadataURL, &metadata); err != nil {
		return nil, err
	}
	var opts []Option
	for mc, builds := range metadata {
		if !forgeHasInstaller(mc) || len(builds) == 0 {
			continue
		}
		pick := promos.Promos[mc+"-recommended"]
		if pick == "" {
			pick = promos.Promos[mc+"-latest"]
		}
		full := ""
		for _, b := range builds {
			if pick != "" && (b == mc+"-"+pick || strings.HasPrefix(b, mc+"-"+pick+"-")) {
				full = b
			}
		}
		if full == "" {
			full = builds[len(builds)-1]
		}
		opts = append(opts, Option{Minecraft: mc, Version: full, Label: Label(Forge, mc, full)})
	}
	sort.Slice(opts, func(i, j int) bool { return opts[i].Minecraft < opts[j].Minecraft })
	return opts, nil
}

// forgeHasInstaller is true from 1.5.2 on; earlier Forge was a jar mod with
// no installer, which this launcher does not support.
func forgeHasInstaller(mc string) bool {
	parts := strings.Split(mc, ".")
	nums := make([]int, 3)
	for i := 0; i < len(parts) && i < 3; i++ {
		n, err := strconv.Atoi(strings.SplitN(parts[i], "-", 2)[0])
		if err != nil {
			return false
		}
		nums[i] = n
	}
	if nums[0] != 1 {
		return nums[0] > 1
	}
	return nums[1] > 5 || (nums[1] == 5 && nums[2] >= 2)
}

// installProfile is install_profile.json inside the installer jar. Two eras:
// the legacy one (<= 1.12.2 build 2847) carries the whole version json in
// "versionInfo" and the universal jar inside the installer; the modern one
// ("spec") points at version.json and lists processors that patch the vanilla
// jar, which only the installer itself can run.
type installProfile struct {
	VersionInfo *mojang.Version `json:"versionInfo,omitempty"`
	Install     *struct {
		Path     string `json:"path"`     // maven name of the universal jar
		FilePath string `json:"filePath"` // its entry inside the installer
	} `json:"install,omitempty"`
	JSON string `json:"json,omitempty"` // modern: "/version.json"
	Data map[string]struct {
		Client string `json:"client"`
	} `json:"data,omitempty"`
}

// forgeInstaller is the installer jar for a Forge build.
func forgeInstaller(version string) download.Task {
	name := "forge-" + version + "-installer.jar"
	return download.Task{URL: ForgeMavenURL + "net/minecraftforge/forge/" + version + "/" + name, Path: filepath.Join("forge", name)}
}

// installForge downloads the installer for the build and either unpacks it
// (legacy) or runs it headless against the launcher's data folder, whose
// versions/ and libraries/ layout is the one the installer expects. NeoForge
// forked the installer, so it takes the same path with its own jar.
func (m *Manager) installForge(ctx context.Context, id, mc, java string, installer download.Task) error {
	jar := filepath.Join(m.Dirs.Root, "cache", installer.Path)
	if err := m.Pool.Run(ctx, Phase, []download.Task{{URL: installer.URL, Path: jar}}); err != nil {
		return fmt.Errorf("installer: %w", err)
	}
	profile, err := readJSONEntry[installProfile](jar, "install_profile.json")
	if err != nil {
		return fmt.Errorf("read installer: %w", err)
	}

	if profile.VersionInfo != nil {
		return m.installLegacyForge(id, mc, jar, profile)
	}

	entry := strings.TrimPrefix(profile.JSON, "/")
	if entry == "" {
		entry = "version.json"
	}
	v, err := readJSONEntry[mojang.Version](jar, entry)
	if err != nil {
		return fmt.Errorf("read %s: %w", entry, err)
	}
	if v.InheritsFrom == "" {
		v.InheritsFrom = mc
	}
	if err := m.runForgeInstaller(ctx, jar, java); err != nil {
		return err
	}
	for _, rel := range forgeOutputs(profile, v) {
		if !fileExists(filepath.Join(m.Dirs.Libraries, filepath.FromSlash(rel))) {
			return fmt.Errorf("installer finished but %s is missing", filepath.Base(rel))
		}
	}
	// The installer also wrote versions/<its own id>/; ours is the one used.
	if v.ID != "" && v.ID != id && v.ID != mc {
		_ = os.RemoveAll(m.Dirs.VersionDir(v.ID))
	}
	return m.writeProfile(id, v)
}

// installLegacyForge writes the version json embedded in the installer and
// copies the universal jar to its maven location; the rest of the libraries
// are plain maven downloads handled by the regular installer.
func (m *Manager) installLegacyForge(id, mc, jar string, profile *installProfile) error {
	v := profile.VersionInfo
	if v.InheritsFrom == "" {
		v.InheritsFrom = mc
	}
	if profile.Install != nil && profile.Install.FilePath != "" {
		dst := filepath.Join(m.Dirs.Libraries, filepath.FromSlash(mojang.MavenPath(profile.Install.Path)))
		if err := extractEntry(jar, profile.Install.FilePath, dst); err != nil {
			return fmt.Errorf("universal jar: %w", err)
		}
		m.progress(filepath.Base(dst))
	}
	for i := range v.Libraries {
		// Old profiles point at hosts that no longer exist.
		if strings.Contains(v.Libraries[i].URL, "files.minecraftforge.net") {
			v.Libraries[i].URL = ForgeMavenURL
		}
	}
	return m.writeProfile(id, v)
}

// forgeOutputs lists files (relative to libraries/) the processors must have
// produced: the patched client jar named by the PATCHED data entry, plus any
// library the version json lists without a download URL.
func forgeOutputs(profile *installProfile, v *mojang.Version) []string {
	var paths []string
	if d, ok := profile.Data["PATCHED"]; ok {
		if name := strings.TrimSuffix(strings.TrimPrefix(d.Client, "["), "]"); name != d.Client && name != "" {
			paths = append(paths, mojang.MavenPath(name))
		}
	}
	for _, lib := range v.Libraries {
		if lib.Downloads != nil && lib.Downloads.Artifact != nil && lib.Downloads.Artifact.URL == "" && lib.Downloads.Artifact.Path != "" {
			paths = append(paths, lib.Downloads.Artifact.Path)
		}
	}
	return paths
}

// runForgeInstaller runs "java -jar installer --installClient <root>". The
// installer insists on a launcher_profiles.json in the target (it adds a
// profile to it, which we ignore). Its console output is streamed to the
// progress overlay because the processors can take a couple of minutes.
func (m *Manager) runForgeInstaller(ctx context.Context, jar, java string) error {
	profiles := filepath.Join(m.Dirs.Root, "launcher_profiles.json")
	if _, err := os.Stat(profiles); err != nil {
		if err := os.WriteFile(profiles, []byte("{\"profiles\":{}}\n"), 0o644); err != nil {
			return err
		}
	}
	cmd := exec.CommandContext(ctx, consoleJava(java), "-jar", jar, "--installClient", m.Dirs.Root)
	cmd.Dir = m.Dirs.Root
	launch.HideConsole(cmd)
	out, err := cmd.StdoutPipe()
	if err != nil {
		return err
	}
	cmd.Stderr = cmd.Stdout
	if err := cmd.Start(); err != nil {
		return fmt.Errorf("start java: %w", err)
	}
	var tail []string
	scanner := bufio.NewScanner(out)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		m.progress(line)
		tail = append(tail, line)
		if len(tail) > 6 {
			tail = tail[1:]
		}
	}
	if err := cmd.Wait(); err != nil {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		return fmt.Errorf("forge installer failed: %s", strings.Join(tail, " | "))
	}
	return nil
}

// consoleJava swaps javaw.exe for java.exe so the installer's output can be
// captured; the launcher's own runtime always has both.
func consoleJava(java string) string {
	if runtime.GOOS == "windows" && strings.EqualFold(filepath.Base(java), "javaw.exe") {
		if alt := filepath.Join(filepath.Dir(java), "java.exe"); fileExists(alt) {
			return alt
		}
	}
	return java
}

func fileExists(path string) bool {
	st, err := os.Stat(path)
	return err == nil && !st.IsDir()
}

// withEntry runs fn on one file inside a jar.
func withEntry(jar, name string, fn func(io.Reader) error) error {
	r, err := zip.OpenReader(jar)
	if err != nil {
		return err
	}
	defer r.Close()
	for _, f := range r.File {
		if f.Name != name {
			continue
		}
		rc, err := f.Open()
		if err != nil {
			return err
		}
		defer rc.Close()
		return fn(rc)
	}
	return errors.New(name + " not found in installer")
}

// readJSONEntry decodes one file inside a jar.
func readJSONEntry[T any](jar, name string) (*T, error) {
	var out T
	err := withEntry(jar, name, func(r io.Reader) error { return json.NewDecoder(r).Decode(&out) })
	if err != nil {
		return nil, fmt.Errorf("%s: %w", name, err)
	}
	return &out, nil
}

// extractEntry copies one file out of a jar.
func extractEntry(jar, name, dst string) error {
	return withEntry(jar, name, func(r io.Reader) error {
		if err := os.MkdirAll(filepath.Dir(dst), 0o755); err != nil {
			return err
		}
		out, err := os.Create(dst)
		if err != nil {
			return err
		}
		_, err = io.Copy(out, r)
		if cerr := out.Close(); err == nil {
			err = cerr
		}
		return err
	})
}
