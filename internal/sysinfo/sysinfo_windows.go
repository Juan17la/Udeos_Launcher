package sysinfo

import (
	"syscall"
	"unsafe"
)

// memoryStatusEx mirrors MEMORYSTATUSEX for kernel32.GlobalMemoryStatusEx.
type memoryStatusEx struct {
	Length               uint32
	MemoryLoad           uint32
	TotalPhys            uint64
	AvailPhys            uint64
	TotalPageFile        uint64
	AvailPageFile        uint64
	TotalVirtual         uint64
	AvailVirtual         uint64
	AvailExtendedVirtual uint64
}

func totalMemoryMB() int {
	var st memoryStatusEx
	st.Length = uint32(unsafe.Sizeof(st))
	proc := syscall.NewLazyDLL("kernel32.dll").NewProc("GlobalMemoryStatusEx")
	if r, _, _ := proc.Call(uintptr(unsafe.Pointer(&st))); r == 0 {
		return 0
	}
	return int(st.TotalPhys / (1024 * 1024))
}
