package core

import (
	"context"
	"testing"
)

// A server still getting its files ready has no process: Stop cancels the preparation.
func TestStopWhilePreparingCancels(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	l := &Launcher{servers: map[string]*serverProc{}}
	l.servers["s"] = &serverProc{state: ServerState{Starting: true}, cancel: cancel}
	if err := l.StopServer("s"); err != nil {
		t.Fatal(err)
	}
	if ctx.Err() == nil {
		t.Fatal("preparation was not canceled")
	}
	if !l.ServerStatus("s").Stopping {
		t.Fatal("state should read Stopping")
	}
}
