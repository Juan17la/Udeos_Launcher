//go:build !windows

package launch

import "os/exec"

// HideConsole is a no-op outside Windows.
func HideConsole(*exec.Cmd) {}
