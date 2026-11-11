// Package download fetches many files concurrently, verifies their SHA-1 and
// skips anything already present, so re-installing a version is instant.
package download

import (
	"context"
	"crypto/sha1"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// Task is one file to fetch.
type Task struct {
	URL        string
	Path       string
	SHA1       string // optional; when empty only the size is checked
	Size       int64  // optional
	Executable bool
}

// Progress is reported after every finished (or skipped) task.
type Progress struct {
	Phase      string `json:"phase"`
	Done       int    `json:"done"`
	Total      int    `json:"total"`
	Bytes      int64  `json:"bytes"`
	TotalBytes int64  `json:"totalBytes"`
	Current    string `json:"current"`
}

// workers is how many files download at once.
const workers = 8

// Bad connections: a download that receives nothing for stallTimeout is
// dropped and retried (up to attempts times, waiting 1, 2, 4, 8, 15 s),
// resuming from what it already has instead of starting over. There is no
// cap on the total time, so a big file on a slow line still finishes.
var stallTimeout = 30 * time.Second

const attempts = 6

// errPermanent marks an answer retrying cannot fix (404, 403...).
var errPermanent = errors.New("permanent")

// Pool runs tasks on a fixed number of workers.
type Pool struct {
	http       *http.Client
	OnProgress func(Progress)
}

// NewPool returns a pool whose progress goes to onProgress.
func NewPool(onProgress func(Progress)) *Pool {
	t := http.DefaultTransport.(*http.Transport).Clone()
	t.TLSHandshakeTimeout = 30 * time.Second // the default 10 s fails on lossy links
	t.ResponseHeaderTimeout = stallTimeout
	return &Pool{http: &http.Client{Transport: t}, OnProgress: onProgress}
}

// Run downloads every task, stopping at the first error or context cancel.
// Progress comes after every file and, while bytes arrive, at most 4 times a second.
func (p *Pool) Run(ctx context.Context, phase string, tasks []Task) error {
	if len(tasks) == 0 {
		return nil
	}
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	var totalBytes int64
	for _, t := range tasks {
		totalBytes += t.Size
	}
	var done, bytes, last atomic.Int64
	report := func(force bool, cur string) {
		if p.OnProgress == nil {
			return
		}
		now, prev := time.Now().UnixNano(), last.Load()
		if !force && (now-prev < int64(250*time.Millisecond) || !last.CompareAndSwap(prev, now)) {
			return
		}
		last.Store(now)
		p.OnProgress(Progress{Phase: phase, Done: int(done.Load()), Total: len(tasks), Bytes: bytes.Load(), TotalBytes: totalBytes, Current: cur})
	}
	queue := make(chan Task)
	errs := make(chan error, workers)
	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for t := range queue {
				name := filepath.Base(t.Path)
				add := func(n int64) { bytes.Add(n); report(false, name) }
				if err := p.fetch(ctx, t, add); err != nil {
					errs <- fmt.Errorf("%s: %w", name, err)
					cancel()
					return
				}
				done.Add(1)
				report(true, name)
			}
		}()
	}
loop:
	for _, t := range tasks {
		select {
		case queue <- t:
		case <-ctx.Done():
			break loop
		}
	}
	close(queue)
	wg.Wait()
	select {
	case err := <-errs:
		return err
	default:
	}
	return ctx.Err()
}

// fetch downloads one task unless the file is already valid, retrying with
// a growing wait. add credits bytes to the progress; got is what this task
// has credited so far, so a restart from zero takes its bytes back.
func (p *Pool) fetch(ctx context.Context, t Task, add func(int64)) error {
	if Valid(t.Path, t.SHA1, t.Size) {
		add(t.Size)
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(t.Path), 0o755); err != nil {
		return err
	}
	var got int64
	credit := func(to int64) { add(to - got); got = to }
	var err error
	for attempt := 0; attempt < attempts; attempt++ {
		if attempt > 0 {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(min(time.Second<<(attempt-1), 15*time.Second)):
			}
		}
		if err = p.fetchOnce(ctx, t, credit); err == nil {
			if t.Size > 0 {
				credit(t.Size)
			}
			return nil
		}
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if errors.Is(err, errPermanent) {
			return err
		}
	}
	return err
}

// fetchOnce downloads into <path>.part, continuing a part left by an
// earlier attempt (Range request) when the server allows it.
func (p *Pool) fetchOnce(ctx context.Context, t Task, credit func(int64)) error {
	tmp := t.Path + ".part"
	var off int64
	if st, err := os.Stat(tmp); err == nil && (t.Size == 0 || st.Size() < t.Size) {
		off = st.Size()
	}
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	var stalled atomic.Bool
	timer := time.AfterFunc(stallTimeout, func() { stalled.Store(true); cancel() })
	defer timer.Stop()
	fail := func(err error) error {
		if stalled.Load() {
			return fmt.Errorf("the download stalled (nothing received for %s)", stallTimeout)
		}
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, t.URL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "UdeosLauncher")
	if off > 0 {
		req.Header.Set("Range", fmt.Sprintf("bytes=%d-", off))
	}
	res, err := p.http.Do(req)
	if err != nil {
		return fail(err)
	}
	defer res.Body.Close()
	flags := os.O_CREATE | os.O_WRONLY | os.O_TRUNC
	switch {
	case res.StatusCode == http.StatusPartialContent && off > 0 && strings.HasPrefix(res.Header.Get("Content-Range"), fmt.Sprintf("bytes %d-", off)):
		flags = os.O_WRONLY | os.O_APPEND
	case res.StatusCode == http.StatusOK:
		off = 0 // no resume support: start over
	case off > 0: // 416 or a range we did not ask for: drop the part and retry from zero
		os.Remove(tmp)
		return fmt.Errorf("GET %s: %s", t.URL, res.Status)
	case res.StatusCode >= 400 && res.StatusCode < 500 && res.StatusCode != http.StatusRequestTimeout && res.StatusCode != http.StatusTooManyRequests:
		return fmt.Errorf("GET %s: %s: %w", t.URL, res.Status, errPermanent)
	default:
		return fmt.Errorf("GET %s: %s", t.URL, res.Status)
	}
	h := sha1.New()
	if off > 0 { // the hash covers the whole file: read back what is there
		if err := hashFile(h, tmp); err != nil {
			return err
		}
	}
	credit(off)
	f, err := os.OpenFile(tmp, flags, 0o644)
	if err != nil {
		return err
	}
	buf := make([]byte, 64*1024)
	n := off
	var copyErr error
	for {
		k, rerr := res.Body.Read(buf)
		if k > 0 {
			timer.Reset(stallTimeout)
			if _, werr := f.Write(buf[:k]); werr != nil {
				copyErr = werr
				break
			}
			h.Write(buf[:k])
			n += int64(k)
			credit(n)
		}
		if rerr == io.EOF {
			break
		}
		if rerr != nil {
			copyErr = fail(rerr)
			break
		}
	}
	if err := f.Close(); copyErr == nil {
		copyErr = err
	}
	if copyErr != nil {
		return copyErr // the part stays: the next attempt resumes it
	}
	if t.SHA1 != "" && hex.EncodeToString(h.Sum(nil)) != t.SHA1 {
		os.Remove(tmp)
		return errors.New("sha1 mismatch")
	}
	mode := os.FileMode(0o644)
	if t.Executable {
		mode = 0o755
	}
	if err := os.Chmod(tmp, mode); err != nil {
		return err
	}
	return os.Rename(tmp, t.Path)
}

func hashFile(h io.Writer, path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	_, err = io.Copy(h, f)
	return err
}

// Valid reports whether the file exists and matches the expected hash (or size).
func Valid(path, sha string, size int64) bool {
	st, err := os.Stat(path)
	if err != nil || st.IsDir() {
		return false
	}
	if sha == "" {
		return size == 0 || st.Size() == size
	}
	h := sha1.New()
	return hashFile(h, path) == nil && hex.EncodeToString(h.Sum(nil)) == sha
}
