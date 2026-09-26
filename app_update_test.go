package main

import "testing"

func TestNewerVersion(t *testing.T) {
	for _, c := range []struct {
		a, b string
		want bool
	}{
		{"1.0.0-beta", "0.10.0-beta", true},
		{"0.10.0-beta", "1.0.0-beta", false},
		{"1.0.0-beta", "1.0.0-beta", false},
		{"1.0.0", "1.0.0-beta", true},
		{"1.0.0-beta", "1.0.0", false},
		{"1.0.0-rc", "1.0.0-beta", true},
		{"1.0.1", "1.0", true},
		{"0.10.0", "0.9.9", true},
	} {
		if got := newerVersion(c.a, c.b); got != c.want {
			t.Errorf("newerVersion(%q, %q) = %v, want %v", c.a, c.b, got, c.want)
		}
	}
}
