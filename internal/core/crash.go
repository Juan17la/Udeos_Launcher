package core

import (
	"bytes"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// windowMarkers are logged by Minecraft right as it creates its window:
// LWJGL 3 (1.13 and newer) and LWJGL 2 (1.12 and older), with any loader.
var windowMarkers = [][]byte{[]byte("Backend library: LWJGL"), []byte("LWJGL Version:")}

// readyWatch passes the game's output through to the log and calls onReady
// once, the first time a window marker goes by. exec calls Write from a single
// goroutine when Stdout and Stderr are the same writer.
type readyWatch struct {
	w       io.Writer
	tail    []byte // the end of the last chunk, for a marker split across writes
	onReady func()
	seen    bool
}

func (r *readyWatch) Write(p []byte) (int, error) {
	n, err := r.w.Write(p)
	if !r.seen {
		buf := append(r.tail, p...)
		for _, m := range windowMarkers {
			if bytes.Contains(buf, m) {
				r.seen = true
				r.onReady()
				break
			}
		}
		if len(buf) > 64 {
			buf = buf[len(buf)-64:]
		}
		r.tail = append(r.tail[:0], buf...)
	}
	return n, err
}

// Crash reasons, for the UI to explain: what most likely went wrong.
const (
	ReasonMemory      = "memory"      // ran out of RAM, or could not reserve it
	ReasonJava        = "java"        // a mod or the game needs another Java version
	ReasonMods        = "mods"        // the loader refused the mod set (missing or clashing mods, a mixin failed)
	ReasonGraphics    = "graphics"    // no usable OpenGL: drivers
	ReasonClosedEarly = "closedEarly" // the process ended before its window opened, nothing more specific found
	ReasonCrash       = "crash"       // a crash report or a bad exit, cause unknown
)

var crashRules = []struct {
	re     *regexp.Regexp
	reason string
}{
	{regexp.MustCompile(`OutOfMemoryError|Could not reserve enough space|Cannot allocate memory|Invalid maximum heap size`), ReasonMemory},
	{regexp.MustCompile(`UnsupportedClassVersionError|compiled by a more recent version of the Java Runtime|requires Java \d+|Unsupported Java|Incompatible Java`), ReasonJava},
	{regexp.MustCompile(`Incompatible mods? (found|set)|Missing or unsupported mandatory dependencies|ModResolutionException|Mod resolution failed|LoadingFailedException|Mixin apply.* failed|MixinApplyError|Duplicate mods? found|requires (any version|version) .* of`), ReasonMods},
	{regexp.MustCompile(`GLFW error|Pixel format not accelerated|driver does not appear to support OpenGL|OpenGL.*not supported|No OpenGL context|GLFW_PLATFORM_UNAVAILABLE|Failed to create (the )?window`), ReasonGraphics},
}

// Diagnosis is what a crash looked like: a reason code, the lines that show
// it (from the crash report or the game log) and the crash report's path.
type Diagnosis struct {
	Reason      string
	Detail      string
	CrashReport string
}

// diagnose reads the newest crash report written since the game started and
// the end of the game log, and picks the most likely cause.
func diagnose(gameDir, logPath string, since time.Time, ready bool) Diagnosis {
	d := Diagnosis{Reason: ReasonCrash}
	if !ready {
		d.Reason = ReasonClosedEarly
	}
	var report string
	if path := newestCrashReport(gameDir, since); path != "" {
		if b, err := os.ReadFile(path); err == nil {
			d.CrashReport, report = path, string(b)
			d.Reason = ReasonCrash
			d.Detail = reportSummary(report)
		}
	}
	log := tailOf(logPath, 256<<10)
	for _, rule := range crashRules {
		for _, text := range []string{report, log} {
			if loc := rule.re.FindStringIndex(text); loc != nil {
				d.Reason = rule.reason
				if d.Detail == "" || text == log {
					d.Detail = linesAround(text, loc[0], 6)
				}
				return d
			}
		}
	}
	if d.Detail == "" {
		d.Detail = lastLines(log, 8)
	}
	return d
}

func newestCrashReport(gameDir string, since time.Time) string {
	paths, _ := filepath.Glob(filepath.Join(gameDir, "crash-reports", "*.txt"))
	best, bestTime := "", since.Add(-2*time.Second)
	for _, p := range paths {
		if fi, err := os.Stat(p); err == nil && fi.ModTime().After(bestTime) {
			best, bestTime = p, fi.ModTime()
		}
	}
	return best
}

// reportSummary is "Description: ..." plus the exception line under it.
func reportSummary(report string) string {
	lines := strings.Split(strings.ReplaceAll(report, "\r", ""), "\n")
	for i, l := range lines {
		if strings.HasPrefix(l, "Description:") {
			out := []string{strings.TrimSpace(l)}
			for _, next := range lines[i+1:] {
				if strings.TrimSpace(next) != "" {
					out = append(out, strings.TrimSpace(next))
					break
				}
			}
			return strings.Join(out, "\n")
		}
	}
	return ""
}

// linesAround returns the line holding offset at plus up to n-1 lines after it, each cut to 300 characters.
func linesAround(text string, at, n int) string {
	start := strings.LastIndexByte(text[:at], '\n') + 1
	lines := strings.Split(text[start:], "\n")
	if len(lines) > n {
		lines = lines[:n]
	}
	return clip(lines)
}

func lastLines(text string, n int) string {
	lines := strings.Split(strings.TrimRight(text, "\n"), "\n")
	if len(lines) > n {
		lines = lines[len(lines)-n:]
	}
	return clip(lines)
}

func clip(lines []string) string {
	out := make([]string, 0, len(lines))
	for _, l := range lines {
		l = strings.TrimRight(l, "\r ")
		if len(l) > 300 {
			l = l[:300] + "…"
		}
		if l != "" {
			out = append(out, l)
		}
	}
	return strings.Join(out, "\n")
}

func tailOf(path string, max int64) string {
	f, err := os.Open(path)
	if err != nil {
		return ""
	}
	defer f.Close()
	if fi, err := f.Stat(); err == nil && fi.Size() > max {
		_, _ = f.Seek(-max, io.SeekEnd)
	}
	b, _ := io.ReadAll(f)
	return string(b)
}
