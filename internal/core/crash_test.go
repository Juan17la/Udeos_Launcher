package core

import (
	"bytes"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestReadyWatchSplitMarker(t *testing.T) {
	var out bytes.Buffer
	calls := 0
	w := &readyWatch{w: &out, onReady: func() { calls++ }}
	w.Write([]byte("[Render thread/INFO]: Setting user: x\n[Render thread/INFO]: Backend lib"))
	if calls != 0 {
		t.Fatal("ready before the marker")
	}
	w.Write([]byte("rary: LWJGL version 3.3.3\n"))
	w.Write([]byte("LWJGL Version: 2.9.4\n"))
	if calls != 1 || !strings.Contains(out.String(), "Backend library") {
		t.Fatalf("calls=%d out=%q", calls, out.String())
	}
}

func TestDiagnose(t *testing.T) {
	dir := t.TempDir()
	logPath := filepath.Join(dir, "logs", "udeos-launcher.log")
	os.MkdirAll(filepath.Dir(logPath), 0o755)
	since := time.Now()

	os.WriteFile(logPath, []byte("boot\nException in thread main java.lang.UnsupportedClassVersionError: x has been compiled by a more recent version\n"), 0o644)
	if d := diagnose(dir, logPath, since, false); d.Reason != ReasonJava || !strings.Contains(d.Detail, "UnsupportedClassVersionError") {
		t.Fatalf("java: %+v", d)
	}

	os.WriteFile(logPath, []byte("a\nb\nc\n"), 0o644)
	if d := diagnose(dir, logPath, since, false); d.Reason != ReasonClosedEarly || d.Detail != "a\nb\nc" {
		t.Fatalf("closed early: %+v", d)
	}

	os.MkdirAll(filepath.Join(dir, "crash-reports"), 0o755)
	report := filepath.Join(dir, "crash-reports", "crash-1.txt")
	os.WriteFile(report, []byte("---- Minecraft Crash Report ----\n\nDescription: Rendering overlay\n\njava.lang.NullPointerException: boom\n\tat x\n"), 0o644)
	d := diagnose(dir, logPath, since, true)
	if d.Reason != ReasonCrash || d.CrashReport != report || d.Detail != "Description: Rendering overlay\njava.lang.NullPointerException: boom" {
		t.Fatalf("report: %+v", d)
	}
}
