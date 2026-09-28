// Package ai turns a player's plain-language request ("a performance mod for
// fabric") into content-search filters, so the Addons page can search
// Modrinth for it. The model only ever picks filter values out of lists it
// is given — every result, version and dependency still comes from Modrinth
// through internal/modsearch.
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

// answer is the part of an Intent the model decides. Version and loader are
// exact words in the request, read without it (see mentioned).
type answer struct {
	Type       string   `json:"type"`
	Categories []string `json:"categories"`
	Sort       string   `json:"sort"`
	Query      string   `json:"query"`
}

func answerOf(i Intent) answer {
	return answer{Type: i.Type, Categories: i.Categories, Sort: i.Sort, Query: i.Query}
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

// Parse asks the model which search the message describes. prev is the
// search on screen, so follow-ups ("only fabric", "newer ones") refine it.
func (m *Manager) Parse(ctx context.Context, message string, prev Intent, allow Allowed) (Intent, error) {
	if len(allow.Types) == 0 {
		return Intent{}, errors.New("no content type to search")
	}
	prev = validate(prev, allow)
	message = cleanText(message, 300)
	reply, err := m.ask(ctx, systemPrompt(allow), schema(allow), conversation(message, prev))
	if err != nil {
		return Intent{}, err
	}
	return intentOf(reply, message, prev, allow)
}

// Candidate is one Modrinth search result the model may recommend.
type Candidate struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Downloads   int64  `json:"downloads"`
}

// Choice is one recommendation: a candidate's ID and why it fits the request.
type Choice struct {
	ID     string `json:"id"`
	Reason string `json:"reason"`
}

// Pick asks the model which candidates (Modrinth's results for the request)
// fit it best, up to max, best first, each with one short sentence in the
// player's language on why. IDs are checked against candidates, so the
// model can only recommend projects Modrinth returned; the reason is the one
// piece of model-written text the player sees (shown as plain text).
func (m *Manager) Pick(ctx context.Context, message string, candidates []Candidate, max int) ([]Choice, error) {
	if len(candidates) == 0 {
		return nil, nil
	}
	var list strings.Builder
	ids := make([]string, len(candidates))
	for i, c := range candidates {
		c.Description = cleanText(c.Description, 200)
		raw, _ := json.Marshal(c)
		list.Write(raw)
		list.WriteByte('\n')
		ids[i] = c.ID
	}
	system := fmt.Sprintf(`A Minecraft player asked for addons. The user message holds their request and real search results from Modrinth, one JSON object per line.
Pick the 1-%d results that fit the request best, best first. For each, write one short sentence (at most 20 words) telling the player why it fits, in the same language as the request. Use only ids from the list; never mention projects that are not in it.
Reply with JSON only: {"picks": [{"id": "...", "reason": "..."}]}`, max)
	items := map[string]any{
		"type": "object", "additionalProperties": false, "required": []string{"id", "reason"},
		"properties": map[string]any{"id": enum(ids), "reason": map[string]any{"type": "string"}},
	}
	reply, err := m.ask(ctx, system, object(field{"picks", map[string]any{"type": "array", "items": items}}),
		[]chatMessage{{"user", "Request: " + cleanText(message, 300) + "\nResults:\n" + list.String()}})
	if err != nil {
		return nil, err
	}
	i, j := strings.Index(reply, "{"), strings.LastIndex(reply, "}")
	if i < 0 || j < i {
		return nil, errors.New("AI answer was not understood")
	}
	var out struct {
		Picks []Choice `json:"picks"`
	}
	if err := json.Unmarshal([]byte(reply[i:j+1]), &out); err != nil {
		return nil, fmt.Errorf("AI answer was not understood: %w", err)
	}
	var picks []Choice
	for _, c := range out.Picks {
		if slices.Contains(ids, c.ID) && !slices.ContainsFunc(picks, func(p Choice) bool { return p.ID == c.ID }) && len(picks) < max {
			picks = append(picks, Choice{ID: c.ID, Reason: cleanText(c.Reason, 200)})
		}
	}
	return picks, nil
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

// systemPrompt teaches the model the job and lists the categories it may pick.
func systemPrompt(allow Allowed) string {
	var b strings.Builder
	b.WriteString(`You turn a Minecraft player's request into search filters for the Modrinth addon site.
Reply with one JSON object only: {"type": ..., "categories": [...], "sort": ..., "query": ...}.
- type: one of ` + strings.Join(allow.Types, ", ") + ` ("resourcepack" = textures). Pick it from the request; keep the current type only if the request does not say.
- categories: 0-2 from the list for that type, when one fits the request.
- sort: "downloads" for popular/best/top, "newest" for new, "updated" for recently updated, else "relevance".
- query: 1-2 keywords from the request that no category covers (a theme or a project name), else "". Never invent names.
Categories:
`)
	for _, t := range allow.Types {
		if cats := allow.Categories[t]; len(cats) > 0 {
			b.WriteString(t + ": " + strings.Join(cats, ", ") + "\n")
		}
	}
	return b.String()
}

type chatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

// examples are worked turns, one chained conversation: each request refines
// the filters the previous one produced.
var examples = []struct {
	request string
	answer  answer
}{
	{"best performance mods for fabric 1.20.1", answer{"mod", []string{"optimization"}, "downloads", ""}},
	{"something with dragons instead", answer{"mod", []string{}, "relevance", "dragons"}},
	{"medieval textures", answer{"resourcepack", []string{}, "relevance", "medieval"}},
	{"realistic shaders with nice shadows", answer{"shader", []string{"realistic", "shadows"}, "relevance", ""}},
	{"a popular tech modpack", answer{"modpack", []string{"technology"}, "downloads", ""}},
	{"storage mods", answer{"mod", []string{"storage"}, "relevance", ""}},
	{"quiero mods de magia nuevos", answer{"mod", []string{"magic"}, "newest", ""}},
}

func turn(current answer, request string) string {
	raw, _ := json.Marshal(current)
	return "Current filters: " + string(raw) + "\nRequest: " + request
}

// conversation is the worked examples, then the player's message on top of
// the search on screen (the system prompt goes separately).
func conversation(message string, prev Intent) []chatMessage {
	var msgs []chatMessage
	shown := answer{Type: "mod", Categories: []string{}, Sort: "relevance"}
	for _, ex := range examples {
		raw, _ := json.Marshal(ex.answer)
		msgs = append(msgs, chatMessage{"user", turn(shown, ex.request)}, chatMessage{"assistant", string(raw)})
		shown = ex.answer
	}
	return append(msgs, chatMessage{"user", turn(answerOf(prev), message)})
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

// intentOf reads the model's JSON (models may wrap it in prose or a
// ```json fence) and turns it into a validated Intent.
func intentOf(reply, message string, prev Intent, allow Allowed) (Intent, error) {
	i, j := strings.Index(reply, "{"), strings.LastIndex(reply, "}")
	if i < 0 || j < i {
		return Intent{}, errors.New("AI answer was not understood")
	}
	var a answer
	if err := json.Unmarshal([]byte(reply[i:j+1]), &a); err != nil {
		return Intent{}, fmt.Errorf("AI answer was not understood: %w", err)
	}
	ldr, v := mentioned(message, allow)
	in := Intent{Type: a.Type, Query: a.Query, Categories: a.Categories, Sort: a.Sort,
		GameVersion: cmp.Or(v, prev.GameVersion), Loader: cmp.Or(ldr, prev.Loader)}
	return validate(in, allow), nil
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

// schema is the JSON schema of an answer restricted to allow's values. No
// maxItems/maxLength: structured-output APIs reject them, and validate cuts
// both anyway.
func schema(allow Allowed) json.RawMessage {
	var cats []string
	for _, t := range allow.Types {
		cats = append(cats, allow.Categories[t]...)
	}
	slices.Sort(cats)
	cats = slices.Compact(cats)
	items := map[string]any{"type": "string"}
	if len(cats) > 0 {
		items = enum(cats)
	}
	return object( // same order as answer's fields
		field{"type", enum(allow.Types)},
		field{"categories", map[string]any{"type": "array", "items": items}},
		field{"sort", enum(sorts)},
		field{"query", map[string]any{"type": "string"}},
	)
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
