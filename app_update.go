package main

import (
	"archive/tar"
	"compress/gzip"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strconv"
	"strings"
	"time"

	"udeos/launcher/internal/download"
)

// releasesURL lists the GitHub releases, newest first. /releases/latest is not
// used on purpose: it skips pre-releases, and every tag so far is one (-beta).
const releasesURL = "https://api.github.com/repos/Juan17la/Udeos_Launcher/releases?per_page=1"

// Update is a release newer than the running launcher.
type Update struct {
	Version string `json:"version"`
	URL     string `json:"url"` // the release page (notes)
}

type release struct {
	Tag    string `json:"tag_name"`
	URL    string `json:"html_url"`
	Assets []struct {
		Name string `json:"name"`
		URL  string `json:"browser_download_url"`
		Size int64  `json:"size"`
	} `json:"assets"`
}

func latestRelease(ctx context.Context) (release, error) {
	ctx, cancel := context.WithTimeout(ctx, 15*time.Second)
	defer cancel()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, releasesURL, nil)
	if err != nil {
		return release{}, err
	}
	req.Header.Set("User-Agent", "UdeosLauncher")
	req.Header.Set("Accept", "application/vnd.github+json")
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		return release{}, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return release{}, fmt.Errorf("GET %s: %s", releasesURL, res.Status)
	}
	var list []release
	if err := json.NewDecoder(res.Body).Decode(&list); err != nil {
		return release{}, err
	}
	if len(list) == 0 {
		return release{}, errors.New("no releases published")
	}
	return list[0], nil
}

// CheckUpdate returns the newest release when it is newer than this build, or
// nil. Development builds (Version "dev") never offer one.
func (a *App) CheckUpdate() (*Update, error) {
	if Version == "dev" {
		return nil, nil
	}
	rel, err := latestRelease(a.ctx)
	if err != nil {
		return nil, err
	}
	v := strings.TrimPrefix(rel.Tag, "v")
	if !newerVersion(v, Version) {
		return nil, nil
	}
	return &Update{Version: v, URL: rel.URL}, nil
}

// InstallUpdate downloads the newest release's file for this system and
// installs it: Windows runs the installer, macOS opens the .dmg, Linux
// installs the .deb/.rpm (asking for the password through pkexec) or swaps the
// binary of a .tar.gz install. Then the launcher closes (Linux restarts it).
func (a *App) InstallUpdate() error {
	rel, err := latestRelease(a.ctx)
	if err != nil {
		return err
	}
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	if exe, err = filepath.EvalSymlinks(exe); err != nil {
		return err
	}
	suffix := updateAsset(exe)
	i := 0
	for i < len(rel.Assets) && !strings.HasSuffix(rel.Assets[i].Name, suffix) {
		i++
	}
	if i == len(rel.Assets) {
		return fmt.Errorf("release %s has no %s file", rel.Tag, suffix)
	}
	asset := rel.Assets[i]
	file := filepath.Join(os.TempDir(), asset.Name)
	// Size is checked, so a cut download is fetched again instead of installed.
	if err := download.NewPool(nil).Run(a.ctx, "update", []download.Task{{URL: asset.URL, Path: file, Size: asset.Size}}); err != nil {
		return err
	}

	restart := runtime.GOOS == "linux"
	switch {
	case strings.HasSuffix(file, ".exe"):
		// Through the shell (ShellExecute), not CreateProcess: the installer
		// asks for admin, and only the shell shows the UAC prompt for it.
		err = exec.Command("rundll32", "url.dll,FileProtocolHandler", file).Start()
	case strings.HasSuffix(file, ".dmg"):
		err = exec.Command("open", file).Start()
	case strings.HasSuffix(file, ".deb"):
		err = run("pkexec", "apt-get", "install", "-y", file)
	case strings.HasSuffix(file, ".rpm"):
		err = run("pkexec", "dnf", "install", "-y", file)
	default:
		err = replaceBinary(file, exe)
	}
	if err != nil {
		return err
	}
	if restart {
		if err := exec.Command(exe).Start(); err != nil {
			return err
		}
	}
	go a.QuitLauncher() // after this call has answered the UI
	return nil
}

// updateAsset is the end of the release file name for this system (see
// .github/workflows/release.yml). /usr/bin means a .deb or .rpm install.
func updateAsset(exe string) string {
	switch {
	case runtime.GOOS == "windows":
		return "-windows-amd64-installer.exe"
	case runtime.GOOS == "darwin":
		return "-macos-universal.dmg"
	case !strings.HasPrefix(exe, "/usr/"):
		return "-linux-amd64.tar.gz"
	}
	if _, err := exec.LookPath("dpkg"); err == nil {
		return "-linux-amd64.deb"
	}
	return "-linux-x86_64.rpm"
}

func run(name string, args ...string) error {
	if out, err := exec.Command(name, args...).CombinedOutput(); err != nil {
		return fmt.Errorf("%s: %v: %s", name, err, strings.TrimSpace(string(out)))
	}
	return nil
}

// replaceBinary puts the udeos-launcher binary from the .tar.gz over exe.
// Linux lets a running binary be replaced by a rename.
func replaceBinary(archive, exe string) error {
	f, err := os.Open(archive)
	if err != nil {
		return err
	}
	defer f.Close()
	gz, err := gzip.NewReader(f)
	if err != nil {
		return err
	}
	tr := tar.NewReader(gz)
	for {
		h, err := tr.Next()
		if err != nil {
			if err == io.EOF {
				err = errors.New("no udeos-launcher binary in " + filepath.Base(archive))
			}
			return err
		}
		if filepath.Base(h.Name) != "udeos-launcher" || h.Typeflag != tar.TypeReg {
			continue
		}
		tmp := exe + ".new"
		out, err := os.OpenFile(tmp, os.O_CREATE|os.O_WRONLY|os.O_TRUNC, 0o755)
		if err != nil {
			return err
		}
		_, err = io.Copy(out, tr)
		if cerr := out.Close(); err == nil {
			err = cerr
		}
		if err != nil {
			os.Remove(tmp)
			return err
		}
		return os.Rename(tmp, exe)
	}
}

// newerVersion reports whether a > b for versions like 1.0.0, 1.0.0-beta:
// numbers compare numerically, a release beats its pre-releases, and
// pre-release labels compare as text (alpha < beta < rc).
func newerVersion(a, b string) bool {
	aCore, aPre, _ := strings.Cut(a, "-")
	bCore, bPre, _ := strings.Cut(b, "-")
	as, bs := strings.Split(aCore, "."), strings.Split(bCore, ".")
	for i := 0; i < max(len(as), len(bs)); i++ {
		var x, y int
		if i < len(as) {
			x, _ = strconv.Atoi(as[i])
		}
		if i < len(bs) {
			y, _ = strconv.Atoi(bs[i])
		}
		if x != y {
			return x > y
		}
	}
	if aPre == "" || bPre == "" {
		return aPre == "" && bPre != ""
	}
	return aPre > bPre
}
