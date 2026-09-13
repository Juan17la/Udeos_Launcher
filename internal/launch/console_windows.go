package launch

import (
	"os/exec"
	"syscall"
)

// hideConsole stops a console window from flashing up behind the game.
func hideConsole(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{HideWindow: true}
}
