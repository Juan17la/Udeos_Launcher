package main

import "context"

// InstallInstance downloads everything an instance needs (game, Java, mod
// loader) without starting it. Progress arrives through the "install:progress" event.
func (a *App) InstallInstance(id string) error {
	inst, err := a.launcher.Instances.Get(id)
	if err != nil {
		return err
	}
	_, _, err = a.launcher.Prepare(a.ctx, inst)
	return err
}

// LaunchInstance installs what is missing and starts the game. It returns once
// the process is running; "game:state" reports when it exits.
func (a *App) LaunchInstance(id string) error {
	ctx, done := a.job("launch:" + id)
	defer done()
	return a.launcher.Launch(ctx, id)
}

// job gives a download a context CancelDownload(key) can stop; done forgets it.
func (a *App) job(key string) (context.Context, func()) {
	ctx, cancel := context.WithCancel(a.ctx)
	a.jobs.Store(key, cancel)
	return ctx, func() { a.jobs.Delete(key); cancel() }
}

// CancelDownload stops a download in progress: "launch:<instance id>" (Play
// installing the game) or "content" (an Addons install; one runs at a time).
// The call it belongs to then fails with "context canceled".
func (a *App) CancelDownload(key string) {
	if cancel, ok := a.jobs.Load(key); ok {
		cancel.(context.CancelFunc)()
	}
}

// IsRunning tells whether an instance's game process is alive.
func (a *App) IsRunning(id string) bool {
	return a.launcher.IsRunning(id)
}
