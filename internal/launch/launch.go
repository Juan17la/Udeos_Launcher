// Package launch builds the java command line for a version, in offline mode:
// the nickname and offline UUID are passed directly, no token is ever needed.
package launch

import (
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"

	"udeos/launcher/internal/mojang"
	"udeos/launcher/internal/paths"
	"udeos/launcher/internal/rules"
)

// LauncherName is what the game reports as its launcher.
const LauncherName = "UdeosLauncher"

// Params is everything needed to build a command.
type Params struct {
	Version         *mojang.Version
	Dirs            paths.Dirs
	GameDir         string
	Nickname        string
	UUID            string
	JavaPath        string
	MaxMemoryMB     int
	Env             rules.Env
	LauncherVersion string
	LogConfigPath   string // empty when the version has no logging block
	LegacyAssets    string // ${game_assets} for pre-1.7.3 versions
}

// Build resolves arguments and returns the command ready to start in GameDir.
func Build(p Params) *exec.Cmd {
	args := Arguments(p)
	cmd := exec.Command(p.JavaPath, args...)
	cmd.Dir = p.GameDir
	hideConsole(cmd)
	return cmd
}

// Classpath lists every non-native library jar plus the client jar.
func Classpath(p Params) []string {
	var cp []string
	seen := map[string]bool{}
	for _, lib := range p.Version.Libraries {
		if !rules.Allowed(lib.Rules, p.Env) || lib.IsNativeOnly() {
			continue
		}
		var rel string
		switch {
		case lib.Downloads != nil && lib.Downloads.Artifact != nil && lib.Downloads.Artifact.Path != "":
			rel = lib.Downloads.Artifact.Path
		case lib.Downloads == nil:
			rel = mojang.MavenPath(lib.Name)
		default:
			continue // natives-only classifier entry
		}
		path := filepath.Join(p.Dirs.Libraries, filepath.FromSlash(rel))
		if !seen[path] {
			seen[path] = true
			cp = append(cp, path)
		}
	}
	return append(cp, p.Dirs.ClientJar(p.Version.ID))
}

// Arguments returns the full java argument list (JVM flags, main class, game args).
func Arguments(p Params) []string {
	v := p.Version
	sep := ":"
	if runtime.GOOS == "windows" {
		sep = ";"
	}
	classpath := strings.Join(Classpath(p), sep)
	vars := map[string]string{
		"auth_player_name":    p.Nickname,
		"auth_uuid":           p.UUID,
		"auth_access_token":   "0",
		"auth_session":        "0",
		"auth_xuid":           "0",
		"clientid":            "0",
		"user_type":           "legacy",
		"user_properties":     "{}",
		"version_name":        v.ID,
		"version_type":        v.Type,
		"game_directory":      p.GameDir,
		"assets_root":         p.Dirs.Assets,
		"assets_index_name":   v.AssetIndex.ID,
		"game_assets":         p.LegacyAssets,
		"natives_directory":   p.Dirs.NativesDir(v.ID),
		"launcher_name":       LauncherName,
		"launcher_version":    p.LauncherVersion,
		"classpath":           classpath,
		"classpath_separator": sep,
		"library_directory":   p.Dirs.Libraries,
		"resolution_width":    "854",
		"resolution_height":   "480",
		"quickPlayPath":       "",
	}
	expand := func(s string) string {
		for k, val := range vars {
			s = strings.ReplaceAll(s, "${"+k+"}", val)
		}
		return s
	}

	mem := p.MaxMemoryMB
	if mem < 512 {
		mem = 2048
	}
	args := []string{"-Xmx" + strconv.Itoa(mem) + "M", "-XX:+UnlockExperimentalVMOptions", "-XX:+UseG1GC", "-XX:G1NewSizePercent=20", "-XX:G1ReservePercent=20", "-XX:MaxGCPauseMillis=50", "-XX:G1HeapRegionSize=32M"}

	if v.Arguments != nil && len(v.Arguments.JVM) > 0 {
		for _, a := range v.Arguments.JVM {
			if rules.Allowed(a.Rules, p.Env) {
				for _, s := range a.Values {
					args = append(args, expand(s))
				}
			}
		}
	} else {
		// Versions <= 1.12 have no jvm list; this is what the official launcher passed.
		if runtime.GOOS == "darwin" {
			args = append(args, "-XstartOnFirstThread")
		}
		args = append(args,
			"-Djava.library.path="+vars["natives_directory"],
			"-Dminecraft.launcher.brand="+LauncherName,
			"-Dminecraft.launcher.version="+p.LauncherVersion,
			"-cp", classpath,
		)
	}
	if p.LogConfigPath != "" && v.Logging != nil && v.Logging.Client != nil {
		args = append(args, strings.ReplaceAll(v.Logging.Client.Argument, "${path}", p.LogConfigPath))
	}

	args = append(args, v.MainClass)

	if v.Arguments != nil {
		for _, a := range v.Arguments.Game {
			if rules.Allowed(a.Rules, p.Env) {
				for _, s := range a.Values {
					args = append(args, expand(s))
				}
			}
		}
	} else {
		for _, s := range strings.Fields(v.MinecraftArguments) {
			args = append(args, expand(s))
		}
	}
	return args
}
