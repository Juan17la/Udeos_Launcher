package sysinfo

import (
	"os/exec"
	"strconv"
	"strings"
)

func totalMemoryMB() int {
	out, err := exec.Command("sysctl", "-n", "hw.memsize").Output()
	if err != nil {
		return 0
	}
	b, _ := strconv.ParseInt(strings.TrimSpace(string(out)), 10, 64)
	return int(b / (1024 * 1024))
}
