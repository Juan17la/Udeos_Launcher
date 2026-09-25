package main

import (
	"bytes"
	"encoding/base64"
	"errors"
	"fmt"
	"maps"
	"net"
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
	"udeos/launcher/internal/tunnel"
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
	// AddressName starts the internet address (Internet.Name or the default from the server's name).
	AddressName string `json:"addressName"`
}

func (a *App) serverView(inst instance.Instance) ServerView {
	v := ServerView{InstanceView: a.view(inst), State: a.launcher.ServerStatus(inst.ID), AddressName: core.AddressName(inst)}
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
// the name as its MOTD, players joining through Udeos Launcher so skins
// show (Udeos players have no Microsoft account; see Instance.UdeosLogin)
// and the first port no other server uses. iconPNG is the 64×64
// server-icon.png, base64. Nothing is downloaded until the first start.
func (a *App) CreateServer(name, version, ldr, loaderVersion, icon, iconPNG string) (ServerView, error) {
	if !loader.Valid(ldr) || ldr == loader.Quilt {
		return ServerView{}, errors.New("servers run Vanilla, Fabric, Forge or NeoForge")
	}
	used := a.serverPorts("")
	port := 25565
	for used[strconv.Itoa(port)] != "" {
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
		// The address name is fixed now, so renaming the server later does not change the address friends saved.
		a.launcher.Instances.Update(inst.ID, func(i *instance.Instance) {
			i.Server, i.Internet.Name, i.UdeosLogin = true, server.DefaultAddressName(inst.Name), true
		}),
		os.WriteFile(filepath.Join(dir, "eula.txt"), []byte("# Accepted in Udeos Launcher: https://aka.ms/MinecraftEULA\neula=true\n"), 0o644),
		server.WriteProperties(dir, map[string]string{"motd": inst.Name, "online-mode": "true", "enforce-secure-profile": "false", "server-port": strconv.Itoa(port)}),
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

// serverPorts maps each port a server uses (every profile's) to its name,
// leaving out the server skip.
func (a *App) serverPorts(skip string) map[string]string {
	used := map[string]string{}
	for _, it := range a.launcher.Instances.List() {
		if it.Server && it.ID != skip {
			props, _ := server.ReadProperties(a.launcher.Dirs.GameDir(it.ID))
			port := props["server-port"]
			if port == "" {
				port = "25565"
			}
			used[port] = it.Name
		}
	}
	return used
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

// loginKey is who can join, as the settings form shows it: "udeos"
// (through Udeos Launcher, skins show), "offline" (any launcher, no skins)
// or "microsoft" (Microsoft accounts only). It is not a server.properties
// key: it maps to online-mode plus Instance.UdeosLogin.
const loginKey = "login"

func loginMode(inst instance.Instance, props map[string]string) string {
	switch {
	case inst.UdeosLogin:
		return "udeos"
	case props["online-mode"] == "true":
		return "microsoft"
	}
	return "offline"
}

// ServerProperties returns server.properties as key → value, plus "login" (see loginKey).
func (a *App) ServerProperties(id string) (map[string]string, error) {
	dir, err := a.gameDir(id)
	if err != nil {
		return nil, err
	}
	props, err := server.ReadProperties(dir)
	if err != nil {
		return nil, err
	}
	inst, err := a.launcher.Instances.Get(id)
	props[loginKey] = loginMode(inst, props)
	return props, err
}

// SetServerProperties saves the given keys ("login" included, see
// loginKey); the server reads them on its next start, except the whitelist
// switch, which a running server applies now.
func (a *App) SetServerProperties(id string, props map[string]string) error {
	dir, err := a.gameDir(id)
	if err != nil {
		return err
	}
	for key, r := range map[string]struct {
		name     string
		min, max int
	}{"server-port": {"the port", 1024, 65535}, "max-players": {"max players", 1, 500}, "view-distance": {"the view distance", 2, 32}} {
		if v, ok := props[key]; ok {
			if n, err := strconv.Atoi(v); err != nil || n < r.min || n > r.max {
				return fmt.Errorf("%s must be a number from %d to %d", r.name, r.min, r.max)
			}
		}
	}
	if other := a.serverPorts(id)[props["server-port"]]; other != "" {
		return fmt.Errorf("the server %q already uses port %s: pick another one", other, props["server-port"])
	}
	for k, v := range props {
		if strings.ContainsAny(k+v, "\r\n") {
			return errors.New("settings cannot contain line breaks")
		}
	}
	if mode, ok := props[loginKey]; ok {
		if mode != "udeos" && mode != "offline" && mode != "microsoft" {
			return errors.New("unknown login mode " + mode)
		}
		props = maps.Clone(props)
		delete(props, loginKey)
		props["online-mode"] = strconv.FormatBool(mode != "offline")
		if mode == "udeos" {
			props["enforce-secure-profile"] = "false"
		}
		if err := a.launcher.Instances.Update(id, func(i *instance.Instance) { i.UdeosLogin = mode == "udeos" }); err != nil {
			return err
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
		if uuid, err = a.playerUUID(id, dir, name); err != nil {
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
// (what Udeos players get, also through the Udeos login) unless the server
// checks Microsoft accounts.
func (a *App) playerUUID(id, dir, name string) (string, error) {
	inst, _ := a.launcher.Instances.Get(id)
	props, _ := server.ReadProperties(dir)
	if loginMode(inst, props) != "microsoft" {
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

// SetServerPublic opens (or closes) the server to the internet.
func (a *App) SetServerPublic(id string, on bool) error { return a.launcher.SetServerPublic(id, on) }

// SetServerInternet sets how the internet reaches the server: mode "relay"
// (default) or "router", the address name ("" = from the server's name),
// and for the relay mode a relay "host[:port]" ("" = bore.pub) and its secret.
// An open server reconnects with the new settings.
func (a *App) SetServerInternet(id, mode, name, relay, secret string) error {
	if _, err := a.gameDir(id); err != nil {
		return err
	}
	if mode != instance.RelayMode && mode != instance.RouterMode {
		return errors.New("unknown connection mode " + mode)
	}
	name = strings.ToLower(strings.TrimSpace(name))
	if name != "" && !server.ValidAddressName(name) {
		return fmt.Errorf("the address name can use a-z, 0-9, dots and dashes (%d characters at most, each part with a letter)", server.MaxAddressName)
	}
	relay = strings.TrimSpace(relay)
	if relay != "" {
		host, port, err := net.SplitHostPort(tunnel.Addr(relay))
		if n, _ := strconv.Atoi(port); err != nil || host == "" || strings.ContainsAny(host, " /") || n < 1 || n > 65535 {
			return errors.New("the relay must be a host name or IP, optionally with :port")
		}
	}
	return a.launcher.SetServerInternet(id, instance.Internet{Mode: mode, Name: name, Relay: relay, Secret: strings.TrimSpace(secret)})
}

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
