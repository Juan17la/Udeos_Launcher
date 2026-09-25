package core

import (
	"net"
	"os"
	"os/exec"
	"runtime"
	"strconv"
	"testing"
	"time"

	"udeos/launcher/internal/paths"
	"udeos/launcher/internal/server"
)

// TestHelperListen is the process TestServerPort ends: it holds a port.
func TestHelperListen(t *testing.T) {
	p := os.Getenv("UDEOS_TEST_LISTEN")
	if p == "" {
		t.Skip("helper process")
	}
	ln, err := net.Listen("tcp", ":"+p)
	if err != nil {
		os.Exit(2)
	}
	defer ln.Close()
	time.Sleep(time.Minute)
}

func freePort(t *testing.T) int {
	ln, err := net.Listen("tcp", ":0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	return ln.Addr().(*net.TCPAddr).Port
}

func TestServerPort(t *testing.T) {
	l, err := New(paths.FromRoot(t.TempDir()), "test", nil, nil, nil)
	if err != nil {
		t.Fatal(err)
	}
	inst, err := l.Instances.Create("Srv", "1.21.1", "Vanilla", "", "")
	if err != nil {
		t.Fatal(err)
	}
	dir := l.Dirs.GameDir(inst.ID)

	// Held by a program that is not Java (this test): the server moves on and saves the new port.
	ln, err := net.Listen("tcp", ":0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()
	port := ln.Addr().(*net.TCPAddr).Port
	if PortFree(port) {
		t.Fatal("PortFree says a held port is free")
	}
	if pid, _ := portHolder(port); runtime.GOOS == "linux" && pid != os.Getpid() {
		t.Errorf("portHolder = pid %d, want this test (%d)", pid, os.Getpid())
	}
	got, err := l.serverPort(inst.ID, dir, port)
	if err != nil || got <= port || !PortFree(got) {
		t.Fatalf("serverPort(%d) = %d, %v; want a free port after it", port, got, err)
	}
	if props, _ := server.ReadProperties(dir); props["server-port"] != strconv.Itoa(got) {
		t.Errorf("server-port = %q, want %d", props["server-port"], got)
	}

	// endProcess stops another process holding a port and waits for it to be gone.
	p := freePort(t)
	cmd := exec.Command(os.Args[0], "-test.run=^TestHelperListen$")
	cmd.Env = append(os.Environ(), "UDEOS_TEST_LISTEN="+strconv.Itoa(p))
	if err := cmd.Start(); err != nil {
		t.Fatal(err)
	}
	go cmd.Wait() //nolint:errcheck // reaps it, as init reaps an orphan
	for end := time.Now().Add(5 * time.Second); PortFree(p) && time.Now().Before(end); time.Sleep(50 * time.Millisecond) {
	}
	if PortFree(p) {
		t.Fatal("the helper never listened")
	}
	if !endProcess(cmd.Process.Pid, p) || !PortFree(p) {
		t.Error("endProcess did not free the port")
	}
}
