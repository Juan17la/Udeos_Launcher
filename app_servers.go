package main

import (
	"bytes"
	"encoding/base64"
	"errors"
	"os"
	"path/filepath"
	"strconv"
	"strings"

	"udeos/launcher/internal/content"
	"udeos/launcher/internal/core"
	"udeos/launcher/internal/instance"
	"udeos/launcher/internal/loader"
	"udeos/launcher/internal/mojang"
	"udeos/launcher/internal/profile"
	"udeos/launcher/internal/server"
	"udeos/launcher/internal/upnp"
)

// Events pushed while servers run.
const (
	EventServerLog   = "server:log"   // {id, line}
	EventServerState = "server:state" // {id}: re-read ListServers
)

// ServerView is a server instance plus its live state and the bits of
// server.properties the cards show.
type ServerView struct {
	InstanceView
	State      core.ServerState `json:"state"`
	Port       int              `json:"port"`
	MaxPlayers int              `json:"maxPlayers"`
	// LanAddress is how players on the same network join (ip:port).
	LanAddress string `json:"lanAddress"`
}

func (a *App) serverView(inst instance.Instance) ServerView {
	v := ServerView{InstanceView: a.view(inst), State: a.launcher.ServerStatus(inst.ID)}
	v.Running = v.State.Running || v.State.Starting
	props, _ := server.ReadProperties(a.launcher.Dirs.GameDir(inst.ID))
	v.Port, _ = strconv.Atoi(props["server-port"])
	if v.Port == 0 {
		v.Port = 25565
	}
	v.MaxPlayers, _ = strconv.Atoi(props["max-players"])
	if v.MaxPlayers == 0 {
		v.MaxPlayers = 20
	}
	if ip := upnp.LocalIP(); ip != "" {
		v.LanAddress = ip + ":" + strconv.Itoa(v.Port)
	}
	return v
}

// ListServers returns the active profile's servers, most recently run first.
func (a *App) ListServers() []ServerView {
	out := []ServerView{}
	p, err := a.launcher.Profile()
	if err != nil {
		return out
	}
	for _, it := range a.launcher.Instances.List() {
		if it.Server && it.Owner == p.Nickname {
			out = append(out, a.serverView(it))
		}
	}
	return out
}

// CreateServer makes a server folder: the EULA accepted (the form asks),
// the name as its MOTD, offline mode (Udeos players have no Microsoft
// account) and the first port no other server uses. iconPNG is the 64×64
// server-icon.png, base64. Nothing is downloaded until the first start.
func (a *App) CreateServer(name, version, ldr, loaderVersion, icon, iconPNG string) (ServerView, error) {
	if !loader.Valid(ldr) || ldr == loader.Quilt {
		return ServerView{}, errors.New("servers run Vanilla, Fabric, Forge or NeoForge")
	}
	used := map[string]bool{}
	for _, it := range a.launcher.Instances.List() {
		if it.Server {
			props, _ := server.ReadProperties(a.launcher.Dirs.GameDir(it.ID))
			used[props["server-port"]] = true
		}
	}
	port := 25565
	for used[strconv.Itoa(port)] {
		port++
	}
	inst, err := a.launcher.Instances.Create(name, version, ldr, loaderVersion, icon)
	if err != nil {
		return ServerView{}, err
	}
	dir := a.launcher.Dirs.GameDir(inst.ID)
	// Create made the client's folders; a server only uses mods/ (removing an empty folder is safe).
	for _, sub := range []string{"saves", "screenshots", "resourcepacks", "shaderpacks"} {
		_ = os.Remove(filepath.Join(dir, sub))
	}
	err = errors.Join(
		a.launcher.Instances.Update(inst.ID, func(i *instance.Instance) { i.Server = true }),
		os.WriteFile(filepath.Join(dir, "eula.txt"), []byte("# Accepted in Udeos Launcher: https://aka.ms/MinecraftEULA\neula=true\n"), 0o644),
		server.WriteProperties(dir, map[string]string{"motd": inst.Name, "online-mode": "false", "server-port": strconv.Itoa(port)}),
	)
	if err == nil && iconPNG != "" {
		err = a.SetServerIcon(inst.ID, iconPNG)
	}
	if err != nil {
		_ = a.launcher.Instances.Delete(inst.ID)
		return ServerView{}, err
	}
	inst, _ = a.launcher.Instances.Get(inst.ID)
	return a.serverView(inst), nil
}

// SetServerIcon writes server-icon.png (base64 PNG, 64×64): the picture
// players see next to the server in their multiplayer list.
func (a *App) SetServerIcon(id, pngBase64 string) error {
	raw, err := base64.StdEncoding.DecodeString(pngBase64)
	if err != nil || !bytes.HasPrefix(raw, []byte("\x89PNG")) || len(raw) > 512*1024 {
		return errors.New("the icon must be a PNG image")
	}
	dir, err := a.gameDir(id)
	if err != nil {
		return err
	}
	return os.WriteFile(filepath.Join(dir, "server-icon.png"), raw, 0o644)
}

// StartServer downloads what is missing and starts the server. It returns
// once the process runs; "server:state" and "server:log" follow.
func (a *App) StartServer(id string) error { return a.launcher.StartServer(a.ctx, id) }

// StopServer saves the world and stops the server.
func (a *App) StopServer(id string) error { return a.launcher.StopServer(id) }

// ServerCommand types a command into the running server's console.
func (a *App) ServerCommand(id, line string) error { return a.launcher.ServerCommand(id, line) }

// ServerLog returns the latest console lines.
func (a *App) ServerLog(id string) []string { return a.launcher.ServerLog(id) }

// ServerProperties returns server.properties as key → value.
func (a *App) ServerProperties(id string) (map[string]string, error) {
	dir, err := a.gameDir(id)
	if err != nil {
		return nil, err
	}
	return server.ReadProperties(dir)
}

// SetServerProperties saves the given keys; the server reads them on its
// next start, except the whitelist switch, which a running server applies now.
func (a *App) SetServerProperties(id string, props map[string]string) error {
	dir, err := a.gameDir(id)
	if err != nil {
		return err
	}
	if p, ok := props["server-port"]; ok {
		if n, err := strconv.Atoi(p); err != nil || n < 1024 || n > 65535 {
			return errors.New("the port must be a number from 1024 to 65535")
		}
	}
	for k, v := range props {
		if strings.ContainsAny(k+v, "\r\n") {
			return errors.New("settings cannot contain line breaks")
		}
	}
	if err := server.WriteProperties(dir, props); err != nil {
		return err
	}
	if on, ok := props["white-list"]; ok && a.launcher.ServerStatus(id).Running {
		cmd := "whitelist off"
		if on == "true" {
			cmd = "whitelist on"
		}
		return a.launcher.ServerCommand(id, cmd)
	}
	return nil
}

// ServerPlayers is who is online and who is on each list.
type ServerPlayers struct {
	Online    []string `json:"online"`
	Whitelist []string `json:"whitelist"`
	Ops       []string `json:"ops"`
	Banned    []string `json:"banned"`
}

// GetServerPlayers reads the player lists.
func (a *App) GetServerPlayers(id string) (ServerPlayers, error) {
	dir, err := a.gameDir(id)
	if err != nil {
		return ServerPlayers{}, err
	}
	out := ServerPlayers{Online: a.launcher.ServerStatus(id).Players}
	for _, l := range []struct {
		name string
		dst  *[]string
	}{{"whitelist", &out.Whitelist}, {"ops", &out.Ops}, {"banned", &out.Banned}} {
		if *l.dst, err = server.Names(dir, l.name); err != nil {
			return ServerPlayers{}, err
		}
	}
	return out, nil
}

// SetServerPlayer adds or removes a player on a list (whitelist, ops,
// banned). The file is written right away; a running server also gets the
// command, so it applies without a restart.
func (a *App) SetServerPlayer(id, list, name string, add bool) (ServerPlayers, error) {
	name = strings.TrimSpace(name)
	if !profile.ValidNickname(name) {
		return ServerPlayers{}, errors.New("player names are 3-16 letters, digits or _")
	}
	dir, err := a.gameDir(id)
	if err != nil {
		return ServerPlayers{}, err
	}
	uuid := ""
	if add {
		if uuid, err = a.playerUUID(dir, name); err != nil {
			return ServerPlayers{}, err
		}
	}
	if err := server.SetPlayer(dir, list, name, uuid, add); err != nil {
		return ServerPlayers{}, err
	}
	if a.launcher.ServerStatus(id).Running {
		cmd, _ := server.Command(list, name, add)
		if err := a.launcher.ServerCommand(id, cmd); err != nil {
			return ServerPlayers{}, err
		}
	}
	return a.GetServerPlayers(id)
}

// playerUUID is the id the server knows the player by: the offline UUID
// (what Udeos players get) unless the server checks Microsoft accounts.
func (a *App) playerUUID(dir, name string) (string, error) {
	props, _ := server.ReadProperties(dir)
	if props["online-mode"] != "true" {
		return profile.OfflineUUID(name), nil
	}
	var res struct {
		ID string `json:"id"`
	}
	if err := mojang.NewClient().GetJSON(a.ctx, "https://api.mojang.com/users/profiles/minecraft/"+name, &res); err != nil || len(res.ID) != 32 {
		return "", errors.New("no Minecraft account is named " + name)
	}
	u := res.ID
	return u[:8] + "-" + u[8:12] + "-" + u[12:16] + "-" + u[16:20] + "-" + u[20:], nil
}

// SetServerPublic opens (or closes) the server to the internet through the router.
func (a *App) SetServerPublic(id string, on bool) error { return a.launcher.SetServerPublic(id, on) }

// ListBackups lists the server's world backups, newest first.
func (a *App) ListBackups(id string) ([]content.FileEntry, error) {
	return a.list(id, "backups", ".zip")
}

// BackupServer zips the world now (a running server pauses saving meanwhile).
func (a *App) BackupServer(id string) (content.FileEntry, error) {
	if _, err := a.gameDir(id); err != nil {
		return content.FileEntry{}, err
	}
	return a.launcher.BackupServer(id)
}

// RestoreBackup puts a backup's world back (the current one is backed up first).
func (a *App) RestoreBackup(id, name string) error {
	if _, err := a.gameDir(id); err != nil {
		return err
	}
	return a.launcher.RestoreBackup(id, name)
}

// RemoveBackup deletes one backup.
func (a *App) RemoveBackup(id, name string) error {
	dir, err := a.gameDir(id)
	if err != nil {
		return err
	}
	return content.Remove(dir, "backups", name)
}
