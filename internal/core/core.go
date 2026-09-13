// Package core ties the pieces together: it prepares a version (files + Java)
// and starts the game for an instance. Both the Wails bindings and the CLI use it.
package core

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sync"
	"time"

	"udeos/launcher/internal/download"
	"udeos/launcher/internal/install"
	"udeos/launcher/internal/instance"
	"udeos/launcher/internal/jre"
	"udeos/launcher/internal/launch"
	"udeos/launcher/internal/mojang"
	"udeos/launcher/internal/paths"
	"udeos/launcher/internal/profile"
	"udeos/launcher/internal/rules"
)

// GameEvent is emitted when a game process starts or stops.
type GameEvent struct {
	InstanceID string `json:"instanceId"`
	Running    bool   `json:"running"`
	ExitCode   int    `json:"exitCode"`
	LogPath    string `json:"logPath"`
	Error      string `json:"error,omitempty"`
}

// Launcher is the application service.
type Launcher struct {
	Dirs      paths.Dirs
	Version   string
	Instances *instance.Store
	Installer *install.Installer
	JRE       *jre.Manager
	OnGame    func(GameEvent)

	mu      sync.Mutex
	running map[string]*exec.Cmd
}

// New opens the data directory and the instance list.
func New(dirs paths.Dirs, version string, report func(download.Progress), onGame func(GameEvent)) (*Launcher, error) {
	if err := dirs.EnsureAll(); err != nil {
		return nil, err
	}
	store, err := instance.Open(dirs)
	if err != nil {
		return nil, err
	}
	return &Launcher{
		Dirs: dirs, Version: version, Instances: store,
		Installer: install.New(dirs, report), JRE: jre.New(dirs, report),
		OnGame: onGame, running: map[string]*exec.Cmd{},
	}, nil
}

// Profile loads the local player, or os.ErrNotExist before first login.
func (l *Launcher) Profile() (profile.Profile, error) {
	return profile.Load(l.Dirs.ProfileFile())
}

// SaveProfile persists the player and recomputes the offline UUID.
func (l *Launcher) SaveProfile(p profile.Profile) (profile.Profile, error) {
	return profile.Save(l.Dirs.ProfileFile(), p)
}

// Prepare installs the version files and the Java runtime it needs.
func (l *Launcher) Prepare(ctx context.Context, versionID string) (*mojang.Version, string, error) {
	v, err := l.Installer.Install(ctx, versionID)
	if err != nil {
		return nil, "", err
	}
	l.Installer.Report(download.Progress{Phase: install.PhaseJava})
	p, _ := l.Profile()
	if p.JavaPath != "" {
		return v, p.JavaPath, nil
	}
	component := jre.DefaultComponent
	if v.JavaVersion != nil && v.JavaVersion.Component != "" {
		component = v.JavaVersion.Component
	}
	java, err := l.JRE.Ensure(ctx, component)
	if err != nil {
		return nil, "", fmt.Errorf("java runtime: %w", err)
	}
	return v, java, nil
}

// IsRunning reports whether the instance has a live game process.
func (l *Launcher) IsRunning(id string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	_, ok := l.running[id]
	return ok
}

// Launch prepares and starts the instance. It returns once the process has
// started; the exit is reported later through OnGame.
func (l *Launcher) Launch(ctx context.Context, id string) error {
	if l.IsRunning(id) {
		return errors.New("this instance is already running")
	}
	inst, err := l.Instances.Get(id)
	if err != nil {
		return err
	}
	p, err := l.Profile()
	if err != nil {
		return errors.New("set a nickname before playing")
	}
	v, java, err := l.Prepare(ctx, inst.Version)
	if err != nil {
		return err
	}

	params := launch.Params{
		Version: v, Dirs: l.Dirs, GameDir: l.Dirs.GameDir(id),
		Nickname: p.Nickname, UUID: p.UUID, JavaPath: java, MaxMemoryMB: p.MaxMemoryMB,
		Env: rules.Current(), LauncherVersion: l.Version,
	}
	if v.AssetIndex.ID == "legacy" || v.AssetIndex.ID == "pre-1.6" {
		params.LegacyAssets = l.Installer.LegacyAssetsDir(v)
	}
	cmd := launch.Build(params)

	// Next to the game's own logs/latest.log and crash-reports/, so one folder has everything.
	logPath := filepath.Join(params.GameDir, "logs", "udeos-launcher.log")
	if err := os.MkdirAll(filepath.Dir(logPath), 0o755); err != nil {
		return err
	}
	logFile, err := os.Create(logPath)
	if err != nil {
		return err
	}
	fmt.Fprintf(logFile, "# %s\n# %s %v\n\n", time.Now().Format(time.RFC3339), java, redact(cmd.Args[1:]))
	cmd.Stdout = io.MultiWriter(logFile)
	cmd.Stderr = logFile

	if err := cmd.Start(); err != nil {
		logFile.Close()
		return fmt.Errorf("start java: %w", err)
	}
	l.mu.Lock()
	l.running[id] = cmd
	l.mu.Unlock()
	l.Installer.Report(download.Progress{Phase: install.PhaseDone})
	if l.OnGame != nil {
		l.OnGame(GameEvent{InstanceID: id, Running: true, LogPath: logPath})
	}

	started := time.Now()
	go func() {
		waitErr := cmd.Wait()
		logFile.Close()
		l.mu.Lock()
		delete(l.running, id)
		l.mu.Unlock()
		_ = l.Instances.Touch(id, time.Since(started))
		ev := GameEvent{InstanceID: id, Running: false, LogPath: logPath}
		if cmd.ProcessState != nil {
			ev.ExitCode = cmd.ProcessState.ExitCode()
		}
		if waitErr != nil && ev.ExitCode == 0 {
			ev.Error = waitErr.Error()
		}
		if l.OnGame != nil {
			l.OnGame(ev)
		}
	}()
	return nil
}

// redact keeps the command log readable without the huge classpath.
func redact(args []string) []string {
	out := make([]string, 0, len(args))
	skip := false
	for _, a := range args {
		if skip {
			out = append(out, "<classpath>")
			skip = false
			continue
		}
		if a == "-cp" {
			skip = true
		}
		out = append(out, a)
	}
	return out
}
