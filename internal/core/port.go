package core

import (
	"fmt"
	"net"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"

	"udeos/launcher/internal/launch"
	"udeos/launcher/internal/server"
)

// PortFree reports whether a server could listen on the TCP port right now.
func PortFree(port int) bool {
	ln, err := net.Listen("tcp", ":"+strconv.Itoa(port))
	if err != nil {
		return false
	}
	ln.Close()
	return true
}

// ServerPorts maps each port a server is set to (every profile's) to its
// name, leaving out the server skip.
func (l *Launcher) ServerPorts(skip string) map[string]string {
	used := map[string]string{}
	for _, it := range l.Instances.List() {
		if it.Server && it.ID != skip {
			props, _ := server.ReadProperties(l.Dirs.GameDir(it.ID))
			port := props["server-port"]
			if port == "" {
				port = "25565"
			}
			used[port] = it.Name
		}
	}
	return used
}

// serverPort makes sure the server can listen on port. A Java process
// holding it (most often a server left running when the launcher was closed
// abruptly) is stopped; anything else keeps the port, and the server moves
// to the next free one, saved in its server.properties.
func (l *Launcher) serverPort(id, dir string, port int) (int, error) {
	if PortFree(port) {
		return port, nil
	}
	if pid, name := portHolder(port); pid > 0 && isJava(name) && !l.ownsPid(pid) {
		l.note(id, fmt.Sprintf("Port %d is held by a Java process (pid %d), probably a server that was left running. Stopping it…", port, pid))
		if endProcess(pid, port) {
			return port, nil
		}
		l.note(id, "It did not stop.")
	}
	used := l.ServerPorts(id)
	for p := port + 1; p <= 65535 && p <= port+100; p++ {
		if used[strconv.Itoa(p)] == "" && PortFree(p) {
			l.note(id, fmt.Sprintf("Port %d is in use by another program, so this server moves to port %d (saved in Settings).", port, p))
			return p, server.WriteProperties(dir, map[string]string{"server-port": strconv.Itoa(p)})
		}
	}
	return 0, fmt.Errorf("port %d is in use by another program and the next 100 ports are taken too", port)
}

// ownsPid reports whether pid is a game or server this launcher runs.
func (l *Launcher) ownsPid(pid int) bool {
	l.mu.Lock()
	defer l.mu.Unlock()
	for _, p := range l.servers {
		if p.cmd != nil && p.cmd.Process != nil && p.cmd.Process.Pid == pid {
			return true
		}
	}
	for _, c := range l.running {
		if c.Process != nil && c.Process.Pid == pid {
			return true
		}
	}
	return false
}

func isJava(name string) bool {
	n := strings.TrimSuffix(strings.ToLower(filepath.Base(name)), ".exe")
	return n == "java" || n == "javaw"
}

var ssUsersRe = regexp.MustCompile(`\(\("([^"]+)",pid=(\d+)`)

// portHolder finds the process listening on the TCP port with the tool each
// system ships (ss, lsof, netstat + tasklist); pid 0 when it cannot tell.
func portHolder(port int) (pid int, name string) {
	p := strconv.Itoa(port)
	run := func(prog string, args ...string) string {
		cmd := exec.Command(prog, args...)
		launch.HideConsole(cmd)
		out, _ := cmd.Output()
		return string(out)
	}
	switch runtime.GOOS {
	case "linux":
		// LISTEN 0 50 *:25565 *:* users:(("java",pid=1234,fd=45))
		if m := ssUsersRe.FindStringSubmatch(run("ss", "-Hltnp", "sport = :"+p)); m != nil {
			pid, _ = strconv.Atoi(m[2])
			return pid, m[1]
		}
	case "darwin":
		// -Fpc prints "p<pid>" and "c<command>" lines.
		for _, line := range strings.Split(run("lsof", "-nP", "-iTCP:"+p, "-sTCP:LISTEN", "-Fpc"), "\n") {
			if strings.HasPrefix(line, "p") && pid == 0 {
				pid, _ = strconv.Atoi(line[1:])
			} else if strings.HasPrefix(line, "c") && name == "" {
				name = line[1:]
			}
		}
		return pid, name
	case "windows":
		// "TCP 0.0.0.0:25565 0.0.0.0:0 LISTENING 1234": the state word is
		// translated, but only a listener has remote port 0.
		for _, line := range strings.Split(run("netstat", "-ano"), "\n") {
			if f := strings.Fields(line); len(f) == 5 && f[0] == "TCP" && strings.HasSuffix(f[1], ":"+p) && strings.HasSuffix(f[2], ":0") {
				pid, _ = strconv.Atoi(f[4])
				break
			}
		}
		if pid > 0 { // "java.exe","1234",…
			name, _, _ = strings.Cut(run("tasklist", "/FI", fmt.Sprintf("PID eq %d", pid), "/FO", "CSV", "/NH"), ",")
			name = strings.Trim(strings.TrimSpace(name), `"`)
		}
		return pid, name
	}
	return 0, ""
}

// endProcess asks the process to quit (a Minecraft server saves its world on
// SIGTERM; Windows has no SIGTERM, so there it is killed) and kills it if it
// is still there 20 seconds later. It reports whether the port came free.
func endProcess(pid, port int) bool {
	proc, err := os.FindProcess(pid)
	if err != nil {
		return false
	}
	if proc.Signal(syscall.SIGTERM) != nil && proc.Kill() != nil {
		return false // not ours to end (another user's), or already gone
	}
	// Wait for the process itself, not only the port: a server closes its
	// port before it has finished saving the world. Signal 0 fails once it is
	// gone (always on Windows, where Kill is immediate anyway).
	gone := func() bool { return proc.Signal(syscall.Signal(0)) != nil && PortFree(port) }
	for _, wait := range []time.Duration{20 * time.Second, 5 * time.Second} {
		for end := time.Now().Add(wait); time.Now().Before(end); time.Sleep(200 * time.Millisecond) {
			if gone() {
				return true
			}
		}
		_ = proc.Kill()
	}
	return false
}
