package main

// InstallVersion downloads a version and its Java runtime without starting it.
// Progress arrives through the "install:progress" event.
func (a *App) InstallVersion(id string) error {
	_, _, err := a.launcher.Prepare(a.ctx, id)
	return err
}

// LaunchInstance installs what is missing and starts the game. It returns once
// the process is running; "game:state" reports when it exits.
func (a *App) LaunchInstance(id string) error {
	return a.launcher.Launch(a.ctx, id)
}

// IsRunning tells whether an instance's game process is alive.
func (a *App) IsRunning(id string) bool {
	return a.launcher.IsRunning(id)
}
