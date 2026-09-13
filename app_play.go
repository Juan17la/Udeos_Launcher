package main

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
	return a.launcher.Launch(a.ctx, id)
}

// IsRunning tells whether an instance's game process is alive.
func (a *App) IsRunning(id string) bool {
	return a.launcher.IsRunning(id)
}
