// Package paths decides where the launcher keeps its data on each operating system.
package paths

import (
	"os"
	"path/filepath"
)

// Dirs holds every directory the launcher writes to. Game files (versions,
// libraries, assets, Java runtimes) are shared between instances so a version
// is only downloaded once; each instance only owns its own game directory.
type Dirs struct {
	Root      string // e.g. ~/.config/UdeosLauncher, %AppData%\UdeosLauncher, ~/Library/Application Support/UdeosLauncher
	Versions  string // <root>/versions/<id>/{<id>.json,<id>.jar,natives/}
	Libraries string // <root>/libraries/<maven path>
	Assets    string // <root>/assets/{indexes,objects,log_configs,virtual}
	Runtimes  string // <root>/runtimes/<component>/<platform>
	Instances string // <root>/instances/<instance id>/.minecraft
}

// Default resolves the data directory. UDEOS_HOME overrides it (handy for tests
// and portable installs).
func Default() (Dirs, error) {
	root := os.Getenv("UDEOS_HOME")
	if root == "" {
		base, err := os.UserConfigDir()
		if err != nil {
			return Dirs{}, err
		}
		root = filepath.Join(base, "UdeosLauncher")
	}
	return FromRoot(root), nil
}

// FromRoot builds the layout under an explicit root.
func FromRoot(root string) Dirs {
	return Dirs{
		Root:      root,
		Versions:  filepath.Join(root, "versions"),
		Libraries: filepath.Join(root, "libraries"),
		Assets:    filepath.Join(root, "assets"),
		Runtimes:  filepath.Join(root, "runtimes"),
		Instances: filepath.Join(root, "instances"),
	}
}

// EnsureAll creates every directory that does not exist yet.
func (d Dirs) EnsureAll() error {
	for _, p := range []string{d.Root, d.Versions, d.Libraries, d.Assets, d.Runtimes, d.Instances} {
		if err := os.MkdirAll(p, 0o755); err != nil {
			return err
		}
	}
	return nil
}

// VersionDir is where a version's json, client jar and extracted natives live.
func (d Dirs) VersionDir(id string) string { return filepath.Join(d.Versions, id) }

// VersionJSON is the cached version metadata file.
func (d Dirs) VersionJSON(id string) string { return filepath.Join(d.Versions, id, id+".json") }

// ClientJar is the game jar for a version.
func (d Dirs) ClientJar(id string) string { return filepath.Join(d.Versions, id, id+".jar") }

// NativesDir is where native libraries (.so/.dll/.dylib) are extracted.
func (d Dirs) NativesDir(id string) string { return filepath.Join(d.Versions, id, "natives") }

// InstanceDir holds an instance's metadata and its .minecraft game directory.
func (d Dirs) InstanceDir(id string) string { return filepath.Join(d.Instances, id) }

// GameDir is the working directory the game runs in (saves/, screenshots/, ...).
func (d Dirs) GameDir(id string) string { return filepath.Join(d.Instances, id, ".minecraft") }

// ProfileFile stores the local player profile.
func (d Dirs) ProfileFile() string { return filepath.Join(d.Root, "profile.json") }

// InstancesFile stores the list of instances.
func (d Dirs) InstancesFile() string { return filepath.Join(d.Root, "instances.json") }
