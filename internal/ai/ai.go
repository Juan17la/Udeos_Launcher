// Package ai is the addon advisor: it turns a player's plain-language
// request ("make my game faster") into a plan of Modrinth searches, runs
// them, and explains a few real results (advisor.go). The model only ever
// picks filter values and ids out of lists it is given — every result,
// version and dependency still comes from Modrinth through internal/modsearch.
//
// It asks a hosted model: Groq with the key built into release builds (see
// Seal), or the player's own Groq, Claude, OpenAI, Gemini or Grok key. A
// local model (llama.cpp + Qwen 1.5B) was tried first; its ~1.1 GB download
// and ~1.2 GB of RAM were too heavy for the launcher.
package ai

import (
	"bytes"
	"cmp"
	"context"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"slices"
	"strings"
	"sync"
	"time"
	"unicode"

	"github.com/anthropics/anthropic-sdk-go"
	"github.com/anthropics/anthropic-sdk-go/option"
	"github.com/anthropics/anthropic-sdk-go/shared/constant"

	"udeos/launcher/internal/paths"
)

// Model is one a player can pick. Free means the provider's free plan
// covers it (rate-limited, no card); the others need paid API credit.
type Model struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Free bool   `json:"free"`
}

type provider struct {
	url    string  // chat completions endpoint (Claude: the API base URL)
	models []Model // the first is the default
}

// providers are the services a player can pick. All but Claude speak
// OpenAI's chat-completions format. Model lists and free plans as of
// 2026-09 (each provider's models/pricing page); update them here.
var providers = map[string]provider{
	"groq": {"https://api.groq.com/openai/v1/chat/completions", []Model{
		{"openai/gpt-oss-20b", "GPT-OSS 20B", true},
		{"openai/gpt-oss-120b", "GPT-OSS 120B", true},
		{"qwen/qwen3.8-27b", "Qwen 3.8 27B", true},
	}},
	"claude": {"https://api.anthropic.com", []Model{
		{"claude-opus-5", "Claude Opus 5", false},
		{"claude-sonnet-5", "Claude Sonnet 5", false},
		{"claude-haiku-4-5", "Claude Haiku 4.5", false},
	}},
	"openai": {"https://api.openai.com/v1/chat/completions", []Model{
		{"gpt-6-luna", "GPT-6 Luna", false},
		{"gpt-6-sol", "GPT-6 Sol", false},
		{"gpt-6-astra", "GPT-6 Astra", false},
	}},
	"gemini": {"https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", []Model{
		{"gemini-3.8-flash", "Gemini 3.8 Flash", true},
		{"gemini-3.5-flash-lite", "Gemini 3.5 Flash-Lite", true},
		{"gemini-3.1-pro-preview", "Gemini 3.1 Pro (preview)", false},
	}},
	"grok": {"https://api.x.ai/v1/chat/completions", []Model{
		{"grok-4.20-0309-non-reasoning", "Grok 4.20", false},
		{"grok-4.3", "Grok 4.3", false},
		{"grok-4.7", "Grok 4.7", false},
	}},
}

func (p provider) has(model string) bool {
	return slices.ContainsFunc(p.models, func(m Model) bool { return m.ID == model })
}

// sealed is the built-in Groq key, scrambled by Seal and stamped in at build
// time (-ldflags "-X udeos/launcher/internal/ai.sealed=…", see
// docs/14-ai-search.md). It is never in the repository; builds without it
// need the player's own key.
// ponytail: scrambling only keeps the key out of `strings`/grep. Anyone with
// a debugger can still recover it; a proxy server that holds the key is the
// real fix if it gets abused. Until then: a dedicated free-tier key, rotated.
var sealed string

// pad scrambles the built-in key. Changing it means re-sealing the key.
const pad = "u9dE0s-L4unch3r/m0dr1nth~a1Qx"

func mask(b []byte) {
	for i := range b {
		b[i] ^= pad[i%len(pad)] ^ byte(i*31)
	}
}

// Seal scrambles key for the sealed build variable (cmd: internal/ai/seal).
func Seal(key string) string {
	b := []byte(key)
	mask(b)
	return hex.EncodeToString(b)
}

func unseal(s string) string {
	b, err := hex.DecodeString(s)
	if err != nil {
		return ""
	}
	mask(b)
	return string(b)
}

// ErrNoKey means there is no key to ask with: another provider was picked
// without a key, or this build carries no built-in one.
var ErrNoKey = errors.New("no AI API key: add one in the AI search settings")

// Settings are the player's choice, saved in ai.json (mode 0600). An empty
// Key on Groq means the built-in key; an empty Model the provider's default
// (so is a model a newer launcher no longer lists).
type Settings struct {
	Provider string `json:"provider"`
	Key      string `json:"key"`
	Model    string `json:"model"`
}

// Status is what the Addons page shows about the settings. It never carries
// a key back to the UI.
type Status struct {
	Provider string             `json:"provider"`
	Model    string             `json:"model"`   // "" = the provider's default (its first model)
	HasKey   bool               `json:"hasKey"`  // the player saved their own key
	BuiltIn  bool               `json:"builtIn"` // this build carries a Groq key
	Models   map[string][]Model `json:"models"`  // provider → the models to pick from
}

// Intent is the search the model read out of a request. Field values are
// always ones the caller allowed (see Allowed); Query is free keywords.
type Intent struct {
	Type        string   `json:"type"`
	Query       string   `json:"query"`
	Categories  []string `json:"categories"`
	GameVersion string   `json:"gameVersion"`
	Loader      string   `json:"loader"`
	Sort        string   `json:"sort"`
}

// Allowed is every value an Intent may hold; anything else the model says is dropped.
type Allowed struct {
	Types      []string            // project types the page offers right now
	Categories map[string][]string // project type → Modrinth category names
	Versions   []string            // Minecraft releases Modrinth knows
}

var (
	loaders = []string{"fabric", "forge", "quilt", "neoforge"}
	sorts   = []string{"relevance", "downloads", "newest", "updated"}
)

// Manager holds the AI settings and asks the picked provider.
type Manager struct {
	Dirs paths.Dirs
	http *http.Client
	mu   sync.Mutex // guards ai.json
}

// New returns a manager keeping its settings under dirs.
func New(dirs paths.Dirs) *Manager {
	return &Manager{Dirs: dirs, http: &http.Client{Timeout: 45 * time.Second}}
}

func (m *Manager) load() Settings {
	var s Settings
	if raw, err := os.ReadFile(m.Dirs.AIFile()); err == nil {
		json.Unmarshal(raw, &s)
	}
	p, ok := providers[s.Provider]
	if !ok {
		return Settings{Provider: "groq"}
	}
	if !p.has(s.Model) {
		s.Model = ""
	}
	return s
}

func (m *Manager) status(s Settings) Status {
	models := map[string][]Model{}
	for name, p := range providers {
		models[name] = p.models
	}
	return Status{Provider: s.Provider, Model: s.Model, HasKey: s.Key != "", BuiltIn: sealed != "", Models: models}
}

// Status reports the saved settings.
func (m *Manager) Status() Status {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.status(m.load())
}

// Save picks a provider, key and model (one of the provider's, or "" for its
// default). An empty key keeps the saved one when the provider stays the
// same; every provider but Groq needs one.
func (m *Manager) Save(providerName, key, model string) (Status, error) {
	p, ok := providers[providerName]
	if !ok {
		return Status{}, fmt.Errorf("unknown AI provider %q", providerName)
	}
	if model != "" && !p.has(model) {
		return Status{}, fmt.Errorf("unknown %s model %q", providerName, model)
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	s := Settings{Provider: providerName, Key: strings.TrimSpace(key), Model: model}
	if old := m.load(); s.Key == "" && old.Provider == s.Provider {
		s.Key = old.Key
	}
	if s.Key == "" && s.Provider != "groq" {
		return Status{}, fmt.Errorf("an API key is needed for %s", providerName)
	}
	raw, _ := json.Marshal(s)
	if err := os.WriteFile(m.Dirs.AIFile(), raw, 0o600); err != nil {
		return Status{}, err
	}
	return m.status(s), nil
}

// Reset forgets the player's settings: back to Groq with the built-in key.
func (m *Manager) Reset() (Status, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if err := os.Remove(m.Dirs.AIFile()); err != nil && !errors.Is(err, os.ErrNotExist) {
		return Status{}, err
	}
	return m.status(Settings{Provider: "groq"}), nil
}

// ask sends one conversation to the picked provider and returns its reply.
// Claude's answer is held to schema; the others are asked for JSON in system.
func (m *Manager) ask(ctx context.Context, system string, schema json.RawMessage, msgs []chatMessage) (string, error) {
	m.mu.Lock()
	s := m.load()
	m.mu.Unlock()
	key := s.Key
	if key == "" && s.Provider == "groq" {
		key = unseal(sealed)
	}
	if key == "" {
		return "", ErrNoKey
	}
	p := providers[s.Provider]
	model := cmp.Or(s.Model, p.models[0].ID)
	if s.Provider == "claude" {
		return askClaude(ctx, m.http, p.url, key, model, model == p.models[0].ID, system, schema, msgs)
	}
	return askChat(ctx, m.http, p.url, key, model, system, msgs)
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// askChat asks an OpenAI-style chat-completions endpoint. Only model and
// messages are sent: reasoning models and the compatibility layers each
// reject a different set of the optional knobs.
func askChat(ctx context.Context, hc *http.Client, url, key, model, system string, msgs []chatMessage) (string, error) {
	body, _ := json.Marshal(map[string]any{
		"model":    model,
		"messages": append([]chatMessage{{"system", system}}, msgs...),
	})
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+key)
	res, err := hc.Do(req)
	if err != nil {
		return "", err
	}
	defer res.Body.Close()
	if res.StatusCode != http.StatusOK {
		b, _ := io.ReadAll(io.LimitReader(res.Body, 300))
		return "", statusError(res.StatusCode, string(b), key)
	}
	var out struct {
		Choices []struct {
			Message struct {
				Content string `json:"content"`
			} `json:"message"`
		} `json:"choices"`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		return "", err
	}
	if len(out.Choices) == 0 {
		return "", errors.New("the AI gave no answer")
	}
	return out.Choices[0].Message.Content, nil
}

// askClaude asks Claude through Anthropic's SDK, with the answer held to
// schema. Low effort (a classification) and server-side refusal
// fallbacks are only set on the default model: Haiku 4.5 rejects effort.
func askClaude(ctx context.Context, hc *http.Client, baseURL, key, model string, isDefault bool, system string, schema json.RawMessage, msgs []chatMessage) (string, error) {
	client := anthropic.NewClient(option.WithAPIKey(key), option.WithBaseURL(baseURL), option.WithHTTPClient(hc), option.WithMaxRetries(1))
	params := anthropic.BetaMessageNewParams{
		Model:        anthropic.Model(model),
		MaxTokens:    4096,
		System:       []anthropic.BetaTextBlockParam{{Text: system}},
		OutputConfig: anthropic.BetaOutputConfigParam{Format: anthropic.BetaJSONOutputFormatParam{Schema: schema}},
	}
	for _, m := range msgs {
		params.Messages = append(params.Messages, anthropic.BetaMessageParam{
			Role: anthropic.BetaMessageParamRole(m.Role), Content: []anthropic.BetaContentBlockParamUnion{anthropic.NewBetaTextBlock(m.Content)},
		})
	}
	if isDefault {
		params.OutputConfig.Effort = anthropic.BetaOutputConfigEffortLow
		params.Fallbacks = anthropic.BetaFallbacksParamUnion{OfDefault: constant.ValueOf[constant.Default]()}
		params.Betas = []anthropic.AnthropicBeta{anthropic.AnthropicBetaServerSideFallback2026_07_01}
	}
	res, err := client.Beta.Messages.New(ctx, params)
	if apiErr := (*anthropic.Error)(nil); errors.As(err, &apiErr) {
		return "", statusError(apiErr.StatusCode, apiErr.RawJSON(), key)
	}
	if err != nil {
		return "", err
	}
	if res.StopReason == anthropic.BetaStopReasonRefusal {
		return "", errors.New("the AI declined this request")
	}
	for _, b := range res.Content {
		if b.Type == "text" {
			return b.Text, nil
		}
	}
	return "", errors.New("the AI gave no answer")
}

// statusError words a provider's HTTP error so the UI's errorHeadline can
// tell a bad key and a rate limit apart. The key never ends up in it.
func statusError(code int, body, key string) error {
	switch code {
	case http.StatusUnauthorized, http.StatusForbidden:
		return fmt.Errorf("the AI provider rejected the API key (%d)", code)
	case http.StatusTooManyRequests:
		return errors.New("AI rate limit reached: try again in a minute, or add your own API key")
	}
	body = cleanText(body, 300)
	if key != "" {
		body = strings.ReplaceAll(body, key, "***")
	}
	return fmt.Errorf("AI provider: %d %s %s", code, http.StatusText(code), body)
}

// mentioned reads the loader and Minecraft version straight from the
// player's words, where they are exact tokens: models mix up forge/neoforge
// and drop versions.
// ponytail: plain token match; a version typed as "1.20" means 1.20 itself, not 1.20.x.
func mentioned(message string, allow Allowed) (loader, version string) {
	words := strings.FieldsFunc(strings.ToLower(message), func(r rune) bool { return !unicode.IsLetter(r) && !unicode.IsDigit(r) && r != '.' })
	for i, w := range words {
		w = strings.Trim(w, ".")
		switch {
		case w == "neoforge" || (w == "forge" && i > 0 && words[i-1] == "neo"):
			loader = "neoforge"
		case slices.Contains(loaders, w) && loader == "":
			loader = w
		case slices.Contains(allow.Versions, w):
			version = w
		}
	}
	return loader, version
}

func enum(values ...[]string) map[string]any {
	return map[string]any{"type": "string", "enum": slices.Concat(values...)}
}

// field is one schema property; a slice keeps them in order (a Go map would
// marshal them sorted).
type field struct {
	name string
	def  map[string]any
}

func object(fields ...field) json.RawMessage {
	var b bytes.Buffer
	b.WriteString(`{"type":"object","additionalProperties":false,"properties":{`)
	names := make([]string, len(fields))
	for i, f := range fields {
		k, _ := json.Marshal(f.name)
		v, _ := json.Marshal(f.def)
		if i > 0 {
			b.WriteByte(',')
		}
		b.Write(k)
		b.WriteByte(':')
		b.Write(v)
		names[i] = f.name
	}
	req, _ := json.Marshal(names)
	b.WriteString(`},"required":`)
	b.Write(req)
	b.WriteByte('}')
	return b.Bytes()
}

// validate keeps only values allow lists. Whatever the model says is
// untrusted, so this is the trust boundary.
func validate(in Intent, allow Allowed) Intent {
	// Loader names and versions are filters, not keywords ("create neoforge" → "create").
	words := slices.DeleteFunc(strings.Fields(cleanText(in.Query, 60)), func(w string) bool {
		w = strings.ToLower(w)
		return w == "neo" || slices.Contains(loaders, w) || slices.Contains(allow.Versions, w)
	})
	out := Intent{Type: in.Type, Query: strings.Join(words, " "), Categories: []string{}, Sort: in.Sort}
	if !slices.Contains(allow.Types, out.Type) {
		if len(allow.Types) == 0 {
			return Intent{Categories: []string{}, Sort: "relevance"}
		}
		out.Type = allow.Types[0]
	}
	for _, c := range in.Categories {
		if slices.Contains(allow.Categories[out.Type], c) && !slices.Contains(out.Categories, c) && len(out.Categories) < 2 {
			out.Categories = append(out.Categories, c)
		}
	}
	if slices.Contains(allow.Versions, in.GameVersion) {
		out.GameVersion = in.GameVersion
	}
	if (out.Type == "mod" || out.Type == "modpack") && slices.Contains(loaders, in.Loader) {
		out.Loader = in.Loader
	}
	if !slices.Contains(sorts, out.Sort) {
		out.Sort = "relevance"
	}
	return out
}

// cleanText drops control characters and cuts s to max runes.
func cleanText(s string, max int) string {
	s = strings.TrimSpace(strings.Map(func(r rune) rune {
		if unicode.IsControl(r) {
			return ' '
		}
		return r
	}, s))
	if r := []rune(s); len(r) > max {
		s = strings.TrimSpace(string(r[:max]))
	}
	return s
}
