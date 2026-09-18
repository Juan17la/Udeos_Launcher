package mojang

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client fetches JSON metadata from piston-meta.
type Client struct {
	HTTP *http.Client
}

// NewClient returns a client with sensible timeouts.
func NewClient() *Client {
	return &Client{HTTP: &http.Client{Timeout: 60 * time.Second}}
}

// FetchVersion downloads one version JSON from the URL given in the manifest.
func (c *Client) FetchVersion(ctx context.Context, url string) (*Version, []byte, error) {
	raw, err := c.GetBytes(ctx, url)
	if err != nil {
		return nil, nil, err
	}
	var v Version
	if err := json.Unmarshal(raw, &v); err != nil {
		return nil, nil, fmt.Errorf("decode version json: %w", err)
	}
	return &v, raw, nil
}

// GetJSON fetches a URL and decodes it into v.
func (c *Client) GetJSON(ctx context.Context, url string, v any) error {
	raw, err := c.GetBytes(ctx, url)
	if err != nil {
		return err
	}
	return json.Unmarshal(raw, v)
}

// GetBytes fetches a URL and returns the body.
func (c *Client) GetBytes(ctx context.Context, url string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("User-Agent", "UdeosLauncher")
	res, err := c.HTTP.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("GET %s: %s", url, res.Status)
	}
	return io.ReadAll(res.Body)
}
