package sysinfo

import "testing"

func TestParseMeminfo(t *testing.T) {
	if got := parseMeminfo("MemTotal:       16318192 kB\nMemFree:  1234 kB\n"); got != 15935 {
		t.Errorf("got %d", got)
	}
	if got := parseMeminfo("garbage"); got != 0 {
		t.Errorf("got %d", got)
	}
}
