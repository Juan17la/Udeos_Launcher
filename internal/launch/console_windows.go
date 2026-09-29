package launch

import (
	"os/exec"
	"syscall"
)

// createNoWindow is CREATE_NO_WINDOW: no console for java.exe. HideWindow is
// not used because its SW_HIDE also applies to the process's first ShowWindow,
// which leaves LWJGL 2 (<= 1.12) game windows invisible.
const createNoWindow = 0x08000000

// HideConsole stops a console window from flashing up behind the game (or
// behind a headless installer run).
func HideConsole(cmd *exec.Cmd) {
	cmd.SysProcAttr = &syscall.SysProcAttr{CreationFlags: createNoWindow}
}
