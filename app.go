package main

import (
	"context"
	"log"
	"runtime"
	"sync/atomic"
	"udeos/launcher/internal/sysinfo"

	wailsrt "github.com/wailsapp/wails/v2/pkg/runtime"

	"udeos/launcher/internal/core"
	"udeos/launcher/internal/download"
	"udeos/launcher/internal/paths"
)

// Version is the launcher version shown in the UI and sent to the game as launcher_version.
const Version = "0.1.0"

// Events pushed to the frontend (see frontend/src/api/bridge.ts).
const (
	EventInstallProgress = "install:progress"
	EventContentProgress = "content:progress"
	EventGame            = "game:state"
	EventCloseRequest    = "app:close" // {running}: servers run, the UI asks before QuitLauncher
)

// App is the single struct bound to the frontend. Every exported method becomes
// a JS function under window.go.main.App. The methods live in app_*.go, one
// file per feature.
type App struct {
	ctx      context.Context
	launcher *core.Launcher
	quitting atomic.Bool // the player confirmed closing with servers running
}

func NewApp() *App {
	return &App{}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	dirs, err := paths.Default()
	if err != nil {
		log.Fatalf("data directory: %v", err)
	}
	a.launcher, err = core.New(dirs, Version,
		func(p download.Progress) { wailsrt.EventsEmit(a.ctx, EventInstallProgress, p) },
		func(p download.Progress) { wailsrt.EventsEmit(a.ctx, EventContentProgress, p) },
		func(ev core.GameEvent) { wailsrt.EventsEmit(a.ctx, EventGame, ev) },
	)
	if err != nil {
		log.Fatalf("open launcher data: %v", err)
	}
	a.launcher.OnServer = func(id, line string) {
		if line == "" {
			wailsrt.EventsEmit(a.ctx, EventServerState, map[string]string{"id": id})
		} else {
			wailsrt.EventsEmit(a.ctx, EventServerLog, map[string]string{"id": id, "line": line})
		}
	}
	wailsrt.OnFileDrop(ctx, a.onFileDrop)
}

// beforeClose keeps the window open while servers run and asks the UI to
// confirm; QuitLauncher then closes for real.
func (a *App) beforeClose(ctx context.Context) (prevent bool) {
	n := a.launcher.RunningServers()
	if n == 0 || a.quitting.Load() {
		return false
	}
	wailsrt.EventsEmit(ctx, EventCloseRequest, map[string]int{"running": n})
	return true
}

// QuitLauncher saves and stops every server, then closes the launcher.
func (a *App) QuitLauncher() {
	a.quitting.Store(true)
	a.launcher.StopServers()
	wailsrt.Quit(a.ctx)
}

// shutdown lets running servers save their worlds before the launcher exits
// (already done when QuitLauncher closed it).
func (a *App) shutdown(context.Context) {
	a.launcher.StopServers()
}

// AppInfo is static information about this build.
type AppInfo struct {
	Version string `json:"version"`
	OS      string `json:"os"`
	Arch    string `json:"arch"`
	DataDir string `json:"dataDir"`
	// TotalMemoryMB is the machine's RAM (0 = unknown): the memory slider's ceiling.
	TotalMemoryMB int `json:"totalMemoryMB"`
}

// GetAppInfo returns the launcher version, the platform it is running on and the machine's memory.
func (a *App) GetAppInfo() AppInfo {
	return AppInfo{Version: Version, OS: runtime.GOOS, Arch: runtime.GOARCH, DataDir: a.launcher.Dirs.Root, TotalMemoryMB: sysinfo.TotalMemoryMB()}
}
