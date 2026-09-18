package sysinfo

import "os"

func totalMemoryMB() int {
	raw, err := os.ReadFile("/proc/meminfo")
	if err != nil {
		return 0
	}
	return parseMeminfo(string(raw))
}
