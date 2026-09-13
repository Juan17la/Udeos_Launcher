//go:build !windows

package launch

import "os/exec"

func hideConsole(*exec.Cmd) {}
