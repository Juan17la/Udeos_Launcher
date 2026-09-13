package launch

import (
	"os/exec"
	"syscall"
)

// HideConsole stops a console window from flashing up behind the game (or
// behind a headless installer run).
func HideConsole(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}
