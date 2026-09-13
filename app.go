package main

import (
	"context"
	"log"
	"runtime"

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
	EventGame            = "game:state"
)

// App is the single struct bound to the frontend. Every exported method becomes
// a JS function under window.go.main.App. The methods live in app_*.go, one
// file per feature.
type App struct {
	ctx      context.Context
	launcher *core.Launcher
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
		func(ev core.GameEvent) { wailsrt.EventsEmit(a.ctx, EventGame, ev) },
	)
	if err != nil {
		log.Fatalf("open launcher data: %v", err)
	}
	wailsrt.OnFileDrop(ctx, a.onFileDrop)
}

// AppInfo is static information about this build.
type AppInfo struct {
	Version string `json:"version"`
	OS      string `json:"os"`
	Arch    string `json:"arch"`
	DataDir string `json:"dataDir"`
}

// GetAppInfo returns the launcher version and the platform it is running on.
func (a *App) GetAppInfo() AppInfo {
	return AppInfo{Version: Version, OS: runtime.GOOS, Arch: runtime.GOARCH, DataDir: a.launcher.Dirs.Root}
}
