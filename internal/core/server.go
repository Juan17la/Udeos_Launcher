package core

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"time"

	"udeos/launcher/internal/content"
	"udeos/launcher/internal/download"
	"udeos/launcher/internal/instance"
	"udeos/launcher/internal/launch"
	"udeos/launcher/internal/loader"
	"udeos/launcher/internal/server"
	"udeos/launcher/internal/upnp"
)

// ServerState is the live part of a server: whether it runs, who is on it,
// and where the internet can reach it.
type ServerState struct {
	Starting bool     `json:"starting"` // preparing files or loading the world
	Running  bool     `json:"running"`  // the process is alive
	Ready    bool     `json:"ready"`    // "Done (…)! For help": players can join
	Players  []string `json:"players"`
	// PublicAddress is ip:port once the router forwards the port; PublicError says why it does not.
	PublicAddress string `json:"publicAddress,omitempty"`
	PublicError   string `json:"publicError,omitempty"`
}

// logLines is how much console history a server keeps for the UI.
const logLines = 500

type serverProc struct {
	cmd     *exec.Cmd
	stdin   io.WriteCloser
	state   ServerState
	log     []string
	port    int
	started time.Time
	saved   chan struct{} // closed on "Saved the game" while a backup waits for it
}

var (
	joinedRe = regexp.MustCompile(`\]: (\w{1,16}) joined the game`)
	leftRe   = regexp.MustCompile(`\]: (\w{1,16}) left the game`)
)

// serverEmit tells the UI: a console line, or (line == "") a state change.
func (l *Launcher) serverEmit(id, line string) {
	if l.OnServer != nil {
		l.OnServer(id, line)
	}
}

// ServerStatus returns a copy of the server's live state (zero when stopped).
func (l *Launcher) ServerStatus(id string) ServerState {
	l.mu.Lock()
	defer l.mu.Unlock()
	if p := l.servers[id]; p != nil {
		st := p.state
		st.Players = append([]string{}, p.state.Players...)
		return st
	}
	return ServerState{Players: []string{}}
}

// ServerLog returns the console lines kept for the server.
func (l *Launcher) ServerLog(id string) []string {
	l.mu.Lock()
	defer l.mu.Unlock()
	if p := l.servers[id]; p != nil {
		return append([]string{}, p.log...)
	}
	return []string{}
}

// note appends a launcher line ("[Udeos] …") to the server's console.
func (l *Launcher) note(id, msg string) { l.serverLine(id, "[Udeos] "+msg) }

func (l *Launcher) serverLine(id, line string) {
	l.mu.Lock()
	p := l.servers[id]
	if p == nil {
		l.mu.Unlock()
		return
	}
	p.log = append(p.log, line)
	if len(p.log) > logLines {
		p.log = p.log[len(p.log)-logLines:]
	}
	changed := false
	switch {
	case strings.Contains(line, "]: Done (") && strings.Contains(line, "For help"):
		p.state.Ready, p.state.Starting, changed = true, false, true
	case joinedRe.MatchString(line):
		p.state.Players = append(p.state.Players, joinedRe.FindStringSubmatch(line)[1])
		changed = true
	case leftRe.MatchString(line):
		name := leftRe.FindStringSubmatch(line)[1]
		for i, n := range p.state.Players {
			if n == name {
				p.state.Players = append(p.state.Players[:i], p.state.Players[i+1:]...)
				break
			}
		}
		changed = true
	case p.saved != nil && (strings.Contains(line, "Saved the game") || strings.Contains(line, "Saved the world")):
		close(p.saved)
		p.saved = nil
	}
	l.mu.Unlock()
	l.serverEmit(id, line)
	if changed {
		l.serverEmit(id, "")
	}
}

// StartServer prepares the server's files (server jar, Java, loader) and
// starts it. It returns once the process runs; the console and the state
// arrive through OnServer.
func (l *Launcher) StartServer(ctx context.Context, id string) error {
	inst, err := l.Instances.Get(id)
	if err != nil {
		return err
	}
	if !inst.Server {
		return errors.New("this instance is not a server")
	}
	l.mu.Lock()
	if l.servers[id] != nil {
		l.mu.Unlock()
		return errors.New("this server is already running")
	}
	p := &serverProc{state: ServerState{Starting: true, Players: []string{}}}
	l.servers[id] = p
	l.mu.Unlock()
	l.serverEmit(id, "")

	fail := func(err error) error {
		l.note(id, "Could not start: "+err.Error())
		l.mu.Lock()
		delete(l.servers, id)
		l.mu.Unlock()
		l.serverEmit(id, "")
		return err
	}
	dir := l.Dirs.GameDir(id)
	l.note(id, "Getting the server files and Java ready…")
	java, args, err := l.prepareServer(ctx, inst, dir)
	if err != nil {
		return fail(err)
	}
	props, err := server.ReadProperties(dir)
	if err != nil {
		return fail(err)
	}
	port, _ := strconv.Atoi(props["server-port"])
	if port == 0 {
		port = 25565
	}

	mem := inst.Launch.MaxMemoryMB
	if mem == 0 {
		mem = 2048
		if prof, err := l.Profile(); err == nil && prof.MaxMemoryMB > 0 {
			mem = prof.MaxMemoryMB
		}
	}
	full := append([]string{fmt.Sprintf("-Xmx%dM", mem)}, strings.Fields(inst.Launch.JvmArgs)...)
	cmd := exec.Command(loader.ConsoleJava(java), append(full, args...)...)
	cmd.Dir = dir
	launch.HideConsole(cmd)
	stdin, err := cmd.StdinPipe()
	if err != nil {
		return fail(err)
	}
	out, err := cmd.StdoutPipe()
	if err != nil {
		return fail(err)
	}
	cmd.Stderr = cmd.Stdout
	if err := cmd.Start(); err != nil {
		return fail(fmt.Errorf("start java: %w", err))
	}
	l.mu.Lock()
	p.cmd, p.stdin, p.port, p.started = cmd, stdin, port, time.Now()
	p.state.Running = true
	l.mu.Unlock()
	l.note(id, fmt.Sprintf("Started with %d MB of memory on port %d.", mem, port))
	l.serverEmit(id, "")
	if inst.Public {
		go l.openPublic(id, inst.Name, port)
	}

	go func() {
		sc := bufio.NewScanner(out)
		sc.Buffer(make([]byte, 0, 64*1024), 1024*1024)
		for sc.Scan() {
			l.serverLine(id, sc.Text())
		}
		_ = cmd.Wait()
		l.mu.Lock()
		public := p.state.PublicAddress != "" || p.state.PublicError != ""
		l.mu.Unlock()
		if public {
			_ = upnp.Unmap(context.Background(), port)
		}
		l.note(id, fmt.Sprintf("Server stopped (exit code %d).", cmd.ProcessState.ExitCode()))
		l.mu.Lock()
		delete(l.servers, id)
		l.mu.Unlock()
		_ = l.Instances.Touch(id, time.Since(p.started))
		l.serverEmit(id, "")
	}()
	return nil
}

// prepareServer downloads what the server needs and returns java and the
// arguments that start it from dir.
func (l *Launcher) prepareServer(ctx context.Context, inst instance.Instance, dir string) (string, []string, error) {
	v, err := l.Installer.LoadVersion(ctx, inst.Version)
	if err != nil {
		return "", nil, err
	}
	java, err := l.javaFor(ctx, v, inst)
	if err != nil {
		return "", nil, err
	}
	if inst.Loader == loader.Vanilla || inst.Loader == loader.Fabric {
		jar, ok := v.Downloads["server"]
		if !ok || jar.URL == "" {
			return "", nil, fmt.Errorf("Mojang publishes no server for Minecraft %s", inst.Version)
		}
		task := download.Task{URL: jar.URL, Path: filepath.Join(dir, "server.jar"), SHA1: jar.SHA1, Size: jar.Size}
		if err := download.NewPool(nil).Run(ctx, "server", []download.Task{task}); err != nil {
			return "", nil, fmt.Errorf("server jar: %w", err)
		}
	}
	if inst.Loader == loader.Vanilla {
		return java, []string{"-jar", "server.jar", "nogui"}, nil
	}
	if inst.Loader == loader.Forge || inst.Loader == loader.NeoForge {
		l.note(inst.ID, inst.Loader+" installs its server on the first start; this can take a couple of minutes.")
	}
	args, err := l.Loaders.InstallServer(ctx, inst.Loader, inst.Version, inst.LoaderVersion, java, dir)
	return java, args, err
}

// ServerCommand types a line into the server console.
func (l *Launcher) ServerCommand(id, line string) error {
	line = strings.TrimSpace(strings.TrimPrefix(strings.TrimSpace(line), "/"))
	if line == "" {
		return nil
	}
	l.mu.Lock()
	p := l.servers[id]
	l.mu.Unlock()
	if p == nil || p.stdin == nil {
		return errors.New("the server is not running")
	}
	l.serverLine(id, "> "+line)
	_, err := io.WriteString(p.stdin, line+"\n")
	return err
}

// StopServer asks the server to save and stop; it is killed if it has not
// exited 60 seconds later.
func (l *Launcher) StopServer(id string) error {
	if err := l.ServerCommand(id, "stop"); err != nil {
		return err
	}
	l.mu.Lock()
	p := l.servers[id]
	l.mu.Unlock()
	go func() {
		time.Sleep(60 * time.Second)
		l.mu.Lock()
		alive := l.servers[id] == p
		l.mu.Unlock()
		if alive && p.cmd != nil && p.cmd.Process != nil {
			_ = p.cmd.Process.Kill()
		}
	}()
	return nil
}

// StopServers stops every running server and waits (at most 30 seconds)
// for them to save; used when the launcher closes.
func (l *Launcher) StopServers() {
	l.mu.Lock()
	ids := make([]string, 0, len(l.servers))
	for id := range l.servers {
		ids = append(ids, id)
	}
	l.mu.Unlock()
	for _, id := range ids {
		_ = l.StopServer(id)
	}
	for deadline := time.Now().Add(30 * time.Second); time.Now().Before(deadline); time.Sleep(200 * time.Millisecond) {
		l.mu.Lock()
		n := len(l.servers)
		l.mu.Unlock()
		if n == 0 {
			return
		}
	}
}

// SetServerPublic turns internet access on or off; a running server opens
// or closes its port right away.
func (l *Launcher) SetServerPublic(id string, on bool) error {
	var name string
	if err := l.Instances.Update(id, func(i *instance.Instance) { i.Public, name = on, i.Name }); err != nil {
		return err
	}
	l.mu.Lock()
	p := l.servers[id]
	port := 0
	if p != nil {
		port = p.port
		if !on {
			p.state.PublicAddress, p.state.PublicError = "", ""
		}
	}
	l.mu.Unlock()
	if port == 0 {
		return nil
	}
	if on {
		go l.openPublic(id, name, port)
	} else {
		go func() { _ = upnp.Unmap(context.Background(), port) }()
		l.serverEmit(id, "")
	}
	return nil
}

func (l *Launcher) openPublic(id, name string, port int) {
	l.note(id, "Asking the router to open the port to the internet…")
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Second)
	defer cancel()
	ip, err := upnp.Map(ctx, port, "Udeos "+name)
	l.mu.Lock()
	if p := l.servers[id]; p != nil {
		p.state.PublicAddress, p.state.PublicError = "", ""
		if err != nil {
			p.state.PublicError = err.Error()
		} else {
			p.state.PublicAddress = ip + ":" + strconv.Itoa(port)
		}
	}
	l.mu.Unlock()
	if err != nil {
		l.note(id, "Internet access failed: "+err.Error())
	} else {
		l.note(id, "Open to the internet at "+ip+":"+strconv.Itoa(port))
	}
	l.serverEmit(id, "")
}

// worldDir is the folder of the server's world (level-name, "world" by default).
func worldDir(dir string) string {
	props, _ := server.ReadProperties(dir)
	name := props["level-name"]
	if name == "" {
		name = "world"
	}
	return filepath.Join(dir, filepath.Clean(name))
}

// BackupServer zips the world into backups/<world>-<date>.zip. A running
// server stops writing to disk while the copy is made (save-off, save-all
// flush, then save-on), so the zip is never half-saved.
func (l *Launcher) BackupServer(id string) (content.FileEntry, error) {
	dir := l.Dirs.GameDir(id)
	world := worldDir(dir)
	if _, err := os.Stat(filepath.Join(world, "level.dat")); err != nil {
		return content.FileEntry{}, errors.New("there is no world yet: start the server once to create it")
	}
	l.mu.Lock()
	p := l.servers[id]
	l.mu.Unlock()
	if p != nil {
		l.mu.Lock()
		ready := p.state.Ready
		l.mu.Unlock()
		if !ready {
			return content.FileEntry{}, errors.New("wait until the server has finished starting")
		}
		saved := make(chan struct{})
		l.mu.Lock()
		p.saved = saved
		l.mu.Unlock()
		if err := l.ServerCommand(id, "save-off"); err != nil {
			return content.FileEntry{}, err
		}
		defer l.ServerCommand(id, "save-on") //nolint:errcheck
		if err := l.ServerCommand(id, "save-all flush"); err != nil {
			return content.FileEntry{}, err
		}
		select {
		case <-saved:
		case <-time.After(60 * time.Second):
			return content.FileEntry{}, errors.New("the server did not finish saving within a minute")
		}
	}
	return l.zipBackup(dir, world)
}

func (l *Launcher) zipBackup(dir, world string) (content.FileEntry, error) {
	if err := os.MkdirAll(filepath.Join(dir, "backups"), 0o755); err != nil {
		return content.FileEntry{}, err
	}
	name := filepath.Base(world) + "-" + time.Now().Format("2006-01-02_15-04-05") + ".zip"
	dst := filepath.Join(dir, "backups", name)
	if err := content.ZipWorld(world, dst); err != nil {
		return content.FileEntry{}, err
	}
	st, err := os.Stat(dst)
	if err != nil {
		return content.FileEntry{}, err
	}
	return content.FileEntry{Name: name, SizeBytes: st.Size(), ModTime: st.ModTime()}, nil
}

// RestoreBackup replaces the world with a backup. The server must be
// stopped; the current world is backed up first, so nothing is lost.
func (l *Launcher) RestoreBackup(id, name string) error {
	l.mu.Lock()
	running := l.servers[id] != nil
	l.mu.Unlock()
	if running {
		return errors.New("stop the server before restoring a backup")
	}
	dir := l.Dirs.GameDir(id)
	src := filepath.Join(dir, "backups", filepath.Base(name))
	if _, err := os.Stat(src); err != nil {
		return errors.New("backup not found")
	}
	world := worldDir(dir)
	if _, err := os.Stat(filepath.Join(world, "level.dat")); err == nil {
		if _, err := l.zipBackup(dir, world); err != nil {
			return fmt.Errorf("back up the current world first: %w", err)
		}
	}
	// Extract next to the world, then swap, so a broken zip leaves it untouched.
	tmp := world + ".restoring"
	_ = os.RemoveAll(tmp)
	if err := content.UnzipWorld(src, tmp); err != nil {
		_ = os.RemoveAll(tmp)
		return err
	}
	if err := os.RemoveAll(world); err != nil {
		return err
	}
	return os.Rename(tmp, world)
}
