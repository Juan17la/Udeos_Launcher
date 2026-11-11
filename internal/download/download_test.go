package download

import (
	"bytes"
	"context"
	"crypto/sha1"
	"encoding/hex"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"sync/atomic"
	"testing"
	"time"
)

// A bad connection: the first answer dies halfway, the second one stalls,
// the third must resume from the part instead of starting over.
func TestResumeAfterDropAndStall(t *testing.T) {
	stallTimeout = 200 * time.Millisecond
	defer func() { stallTimeout = 30 * time.Second }()
	body := bytes.Repeat([]byte("udeos-"), 50_000)
	sum := sha1.Sum(body)
	var calls atomic.Int32
	var resumedAt atomic.Int64
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch calls.Add(1) {
		case 1: // half the file, then the connection drops
			w.Header().Set("Content-Length", "300000")
			w.Write(body[:len(body)/2])
			panic(http.ErrAbortHandler)
		case 2: // silence: no answer at all
			time.Sleep(400 * time.Millisecond)
		default:
			var from int64
			if rg := r.Header.Get("Range"); rg != "" {
				_, _ = fmt.Sscanf(rg, "bytes=%d-", &from)
			}
			resumedAt.Store(from)
			http.ServeContent(w, r, "f", time.Time{}, bytes.NewReader(body))
		}
	}))
	defer srv.Close()
	dst := filepath.Join(t.TempDir(), "f.jar")
	var last Progress
	p := NewPool(func(pr Progress) { last = pr })
	task := Task{URL: srv.URL, Path: dst, SHA1: hex.EncodeToString(sum[:]), Size: int64(len(body))}
	if err := p.Run(context.Background(), "t", []Task{task}); err != nil {
		t.Fatal(err)
	}
	if got, _ := os.ReadFile(dst); !bytes.Equal(got, body) {
		t.Fatal("file differs")
	}
	if resumedAt.Load() != int64(len(body)/2) {
		t.Fatalf("resumed at %d, want %d", resumedAt.Load(), len(body)/2)
	}
	if last.Bytes != last.TotalBytes || last.Done != 1 {
		t.Fatalf("progress %+v", last)
	}
}
