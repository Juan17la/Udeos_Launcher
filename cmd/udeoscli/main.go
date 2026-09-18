// udeoscli is a tiny command-line front for the launcher core. It exists to
// test installs and launches without the desktop window:
//
//	go run ./cmd/udeoscli versions
//	go run ./cmd/udeoscli profile Steve
//	go run ./cmd/udeoscli create "My World" 1.21.1 [Fabric|Quilt|Forge|NeoForge]
//	go run ./cmd/udeoscli loaders Forge
//	go run ./cmd/udeoscli install <instance id>
//	go run ./cmd/udeoscli play <instance id>
//	go run ./cmd/udeoscli add <instance id> <project id or slug> [mod|resourcepack|shader]
package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"

	"udeos/launcher/internal/core"
	"udeos/launcher/internal/download"
	"udeos/launcher/internal/loader"
	"udeos/launcher/internal/modsearch"
	"udeos/launcher/internal/paths"
	"udeos/launcher/internal/profile"
)

func main() {
	if len(os.Args) < 2 {
		fmt.Fprintln(os.Stderr, "usage: udeoscli versions | loaders <Fabric|Quilt|Forge|NeoForge> | profile <name> | create <name> <version> [loader] | list | install <instance id> | play <instance id> | add <instance id> <project> [type]")
		os.Exit(2)
	}
	dirs, err := paths.Default()
	check(err)
	exited := make(chan core.GameEvent, 1)
	printProgress := func(p download.Progress) {
		switch {
		case p.Total > 0:
			fmt.Printf("\r%-10s %5d/%-5d %s                    ", p.Phase, p.Done, p.Total, p.Current)
		case p.Current != "":
			fmt.Printf("  %s\n", p.Current)
		default:
			fmt.Printf("\n[%s]\n", p.Phase)
		}
	}
	l, err := core.New(dirs, "cli", printProgress, printProgress, func(ev core.GameEvent) {
		if !ev.Running {
			exited <- ev
		}
	})
	check(err)
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	switch os.Args[1] {
	case "versions":
		m, err := l.Installer.Manifest(ctx)
		check(err)
		fmt.Println("latest release:", m.Latest.Release, " snapshot:", m.Latest.Snapshot)
		for i, v := range m.Versions {
			if i > 15 {
				break
			}
			fmt.Println(v.ID, v.Type)
		}
	case "profile":
		p, err := l.SaveProfile(profile.Profile{Nickname: arg(2), Agreed: true})
		check(err)
		fmt.Println("saved", p.Nickname, p.UUID)
	case "loaders":
		opts, err := l.Loaders.Options(ctx, arg(2))
		check(err)
		for _, o := range opts {
			fmt.Println(o.Minecraft, o.Version)
		}
	case "create":
		ldr, lv := loader.Vanilla, ""
		if len(os.Args) > 4 {
			ldr = os.Args[4]
			opts, err := l.Loaders.Options(ctx, ldr)
			check(err)
			for _, o := range opts {
				if o.Minecraft == arg(3) {
					lv = o.Version
				}
			}
			if lv == "" {
				check(fmt.Errorf("%s has no build for %s", ldr, arg(3)))
			}
		}
		inst, err := l.Instances.Create(arg(2), arg(3), ldr, lv, "grass")
		check(err)
		fmt.Println("created", inst.ID)
	case "list":
		for _, it := range l.Instances.List() {
			fmt.Println(it.ID, it.Name, it.Version, it.Loader, it.LoaderVersion)
		}
	case "install":
		inst, err := l.Instances.Get(arg(2))
		check(err)
		_, java, err := l.Prepare(ctx, inst)
		check(err)
		fmt.Println("\ninstalled; java:", java)
	case "add":
		inst, err := l.Instances.Get(arg(2))
		check(err)
		kind := modsearch.TypeMod
		if len(os.Args) > 4 {
			kind = modsearch.ProjectType(os.Args[4])
		}
		plan, err := l.Content.Plan(ctx, inst, arg(3), kind)
		check(err)
		if plan.AlreadyInstalled {
			fmt.Println(plan.Title, "is already installed")
			return
		}
		for _, it := range plan.Items {
			why := ""
			if it.Reason != "" {
				why = " (required by " + it.Reason + ")"
			}
			fmt.Printf("will install %s %s%s\n", it.Title, it.Version.VersionNumber, why)
		}
		for _, w := range plan.Warnings {
			fmt.Println("note:", w)
		}
		entries, err := l.Content.Apply(ctx, inst, plan)
		check(err)
		for _, e := range entries {
			fmt.Println("\nadded", e.File)
		}
	case "play":
		check(l.Launch(ctx, arg(2)))
		fmt.Println("\ngame started, waiting for it to exit...")
		ev := <-exited
		fmt.Println("exit code", ev.ExitCode, "log:", ev.LogPath)
	default:
		fmt.Fprintln(os.Stderr, "unknown command", os.Args[1])
		os.Exit(2)
	}
}

func arg(i int) string {
	if len(os.Args) <= i {
		fmt.Fprintln(os.Stderr, "missing argument")
		os.Exit(2)
	}
	return os.Args[i]
}

func check(err error) {
	if err != nil {
		fmt.Fprintln(os.Stderr, "\nerror:", err)
		os.Exit(1)
	}
}
