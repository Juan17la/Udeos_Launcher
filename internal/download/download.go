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

// Pool runs tasks on a fixed number of workers.
type Pool struct {
	http       *http.Client
	OnProgress func(Progress)
}

// NewPool returns a pool whose progress goes to onProgress.
func NewPool(onProgress func(Progress)) *Pool {
	return &Pool{http: &http.Client{Timeout: 10 * time.Minute}, OnProgress: onProgress}
}

// Run downloads every task, stopping at the first error or context cancel.
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
	var done int64
	var bytes int64
	report := func(t Task) {
		d := atomic.AddInt64(&done, 1)
		b := atomic.AddInt64(&bytes, t.Size)
		if p.OnProgress != nil {
			p.OnProgress(Progress{Phase: phase, Done: int(d), Total: len(tasks), Bytes: b, TotalBytes: totalBytes, Current: filepath.Base(t.Path)})
		}
	}

	queue := make(chan Task)
	errs := make(chan error, workers)
	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for t := range queue {
				if err := p.fetch(ctx, t); err != nil {
					errs <- fmt.Errorf("%s: %w", filepath.Base(t.Path), err)
					cancel()
					return
				}
				report(t)
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

// fetch downloads one task unless the file is already valid. Retries three times.
func (p *Pool) fetch(ctx context.Context, t Task) error {
	if Valid(t.Path, t.SHA1, t.Size) {
		return nil
	}
	if err := os.MkdirAll(filepath.Dir(t.Path), 0o755); err != nil {
		return err
	}
	var err error
	for attempt := 0; attempt < 3; attempt++ {
		if err = p.fetchOnce(ctx, t); err == nil {
			return nil
		}
		if ctx.Err() != nil {
			return ctx.Err()
		}
		time.Sleep(time.Duration(attempt+1) * 500 * time.Millisecond)
	}
	return err
}

func (p *Pool) fetchOnce(ctx context.Context, t Task) error {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, t.URL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "UdeosLauncher")
	res, err := p.http.Do(req)
	if err != nil {
		return err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return fmt.Errorf("GET %s: %s", t.URL, res.Status)
	}
	tmp := t.Path + ".part"
	f, err := os.Create(tmp)
	if err != nil {
		return err
	}
	h := sha1.New()
	_, copyErr := io.Copy(io.MultiWriter(f, h), res.Body)
	closeErr := f.Close()
	if copyErr != nil {
		os.Remove(tmp)
		return copyErr
	}
	if closeErr != nil {
		os.Remove(tmp)
		return closeErr
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

// Valid reports whether the file exists and matches the expected hash (or size).
func Valid(path, sha string, size int64) bool {
	st, err := os.Stat(path)
	if err != nil || st.IsDir() {
		return false
	}
	if sha == "" {
		return size == 0 || st.Size() == size
	}
	f, err := os.Open(path)
	if err != nil {
		return false
	}
	defer f.Close()
	h := sha1.New()
	if _, err := io.Copy(h, f); err != nil {
		return false
	}
	return hex.EncodeToString(h.Sum(nil)) == sha
}
