// Package sysinfo answers the one machine question the UI asks: how much RAM
// there is, so the memory slider can stop at it and warn near it.
package sysinfo

import (
	"bufio"
	"strconv"
	"strings"
)

// TotalMemoryMB is the machine's physical memory, 0 when it cannot be read.
func TotalMemoryMB() int { return totalMemoryMB() }

// parseMeminfo reads MemTotal (in kB) out of /proc/meminfo's text.
func parseMeminfo(text string) int {
	sc := bufio.NewScanner(strings.NewReader(text))
	for sc.Scan() {
		if f := strings.Fields(sc.Text()); len(f) >= 2 && f[0] == "MemTotal:" {
			kb, _ := strconv.Atoi(f[1])
			return kb / 1024
		}
	}
	return 0
}
