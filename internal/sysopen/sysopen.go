// Package sysopen shows a folder in the operating system's file manager.
package sysopen

import (
	"errors"
	"os/exec"
	"runtime"
)

// Dir opens path in the file manager (Files/Nautilus, Finder, Explorer). It
// returns as soon as the request is handed to the OS.
func Dir(path string) error {
	var cmd *exec.Cmd
	switch runtime.GOOS {
	case "windows":
		cmd = exec.Command("explorer", path)
	case "darwin":
		cmd = exec.Command("open", path)
	default:
		if _, err := exec.LookPath("xdg-open"); err != nil {
			return errors.New("xdg-open is not installed; open the folder manually: " + path)
		}
		cmd = exec.Command("xdg-open", path)
	}
	return cmd.Start()
}
