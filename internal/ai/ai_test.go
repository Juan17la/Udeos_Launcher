package ai

import (
	"context"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"reflect"
	"strings"
	"testing"

	"udeos/launcher/internal/paths"
)

var allow = Allowed{
	Types:      []string{"mod", "modpack"},
	Categories: map[string][]string{"mod": {"optimization", "technology"}, "modpack": {"adventure"}},
	Versions:   []string{"1.20.1", "1.21.1"},
}

func TestValidateDropsWhatIsNotAllowed(t *testing.T) {
	got := validate(Intent{
		Type: "shader", Query: " sodium\nlike\x00 Fabric 1.20.1 ", Categories: []string{"adventure", "optimization", "optimization", "technology"},
		GameVersion: "1.99", Loader: "rift", Sort: "best",
	}, allow)
	want := Intent{Type: "mod", Query: "sodium like", Categories: []string{"optimization", "technology"}, Sort: "relevance"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %+v, want %+v", got, want)
	}
	// Loaders only narrow mods and modpacks.
	got = validate(Intent{Type: "resourcepack", Loader: "fabric", GameVersion: "1.21.1", Sort: "newest"}, Allowed{Types: []string{"resourcepack"}, Versions: allow.Versions})
	if got.Loader != "" || got.GameVersion != "1.21.1" || got.Sort != "newest" {
		t.Errorf("got %+v", got)
	}
}

func TestMentioned(t *testing.T) {
	for msg, want := range map[string][2]string{
		"Forge mods for 1.20.1, please": {"forge", "1.20.1"},
		"neoforge 1.21.1":               {"neoforge", "1.21.1"},
		"mods for neo forge":            {"neoforge", ""},
		"fabric or 1.99":                {"fabric", ""},
		"magic mods":                    {"", ""},
	} {
		if l, v := mentioned(msg, allow); l != want[0] || v != want[1] {
			t.Errorf("%q: got %q %q, want %v", msg, l, v, want)
		}
	}
}

func TestSealHidesTheKey(t *testing.T) {
	s := Seal("gsk_abc123")
	if strings.Contains(s, "gsk") || strings.Contains(s, "abc123") || unseal(s) != "gsk_abc123" {
		t.Errorf("Seal = %q, unseal = %q", s, unseal(s))
	}
	if unseal("not hex") != "" {
		t.Error("bad input unsealed to something")
	}
}

func TestSettings(t *testing.T) {
	m := New(paths.FromRoot(t.TempDir()))
	if st := m.Status(); st.Provider != "groq" || st.HasKey {
		t.Fatalf("fresh status %+v", st)
	}
	if _, err := m.Save("claude", "", ""); err == nil {
		t.Error("claude saved without a key")
	}
	if _, err := m.Save("gpt", "k", ""); err == nil {
		t.Error("unknown provider saved")
	}
	st, err := m.Save("claude", " sk-secret ", "")
	if err != nil || !st.HasKey || st.Provider != "claude" {
		t.Fatalf("save: %+v %v", st, err)
	}
	if raw, _ := json.Marshal(st); strings.Contains(string(raw), "sk-secret") {
		t.Errorf("status leaks the key: %s", raw)
	}
	if fi, err := os.Stat(m.Dirs.AIFile()); err != nil || fi.Mode().Perm() != 0o600 {
		t.Errorf("ai.json mode: %v %v", fi, err)
	}
	// An empty key keeps the saved one while the provider stays; only listed models are taken.
	if _, err := m.Save("claude", "", "claude-haiku-4-5"); err != nil || m.load().Key != "sk-secret" {
		t.Errorf("key not kept: %+v %v", m.load(), err)
	}
	if _, err := m.Save("claude", "", "gpt-6-luna"); err == nil {
		t.Error("another provider's model saved")
	}
	// A model a newer launcher no longer lists falls back to the default.
	os.WriteFile(m.Dirs.AIFile(), []byte(`{"provider":"claude","key":"k","model":"claude-2"}`), 0o600)
	if st := m.Status(); st.Model != "" || len(st.Models["groq"]) == 0 || !st.Models["groq"][0].Free {
		t.Errorf("status %+v", st)
	}
	if _, err := m.Save("openai", "", ""); err == nil {
		t.Error("switching provider kept the other provider's key")
	}
	if st, err := m.Reset(); err != nil || st.Provider != "groq" || st.HasKey || m.load() != (Settings{Provider: "groq"}) {
		t.Errorf("reset: %+v %v", st, err)
	}
}

// withProvider points a provider at a test server for one test.
func withProvider(t *testing.T, name, url string) {
	old := providers[name]
	providers[name] = provider{url, old.models}
	t.Cleanup(func() { providers[name] = old })
}

func TestParseWithBuiltInGroqKey(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer gsk_built_in" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		var req struct {
			Model    string        `json:"model"`
			Messages []chatMessage `json:"messages"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		if req.Model != "openai/gpt-oss-20b" || req.Messages[0].Role != "system" || !strings.Contains(req.Messages[0].Content, "optimization") {
			t.Errorf("request: %+v", req)
		}
		// Models may wrap the JSON; categories they invent are dropped.
		reply := "Sure:\n```json\n{\"type\":\"mod\",\"categories\":[\"optimization\",\"made-up\"],\"sort\":\"downloads\",\"query\":\"\"}\n```"
		json.NewEncoder(w).Encode(map[string]any{"choices": []any{map[string]any{"message": map[string]any{"content": reply}}}})
	}))
	defer srv.Close()
	withProvider(t, "groq", srv.URL)
	m := New(paths.FromRoot(t.TempDir()))

	sealed = ""
	if _, err := m.Parse(context.Background(), "fast mods", Intent{}, allow); err != ErrNoKey {
		t.Errorf("no built-in key: got %v", err)
	}
	sealed = Seal("gsk_built_in")
	t.Cleanup(func() { sealed = "" })

	// Version and loader come from the words ("neo forge") or the current search, not the model.
	got, err := m.Parse(context.Background(), "fast neo forge mods", Intent{Type: "mod", GameVersion: "1.21.1"}, allow)
	if err != nil {
		t.Fatal(err)
	}
	want := Intent{Type: "mod", Categories: []string{"optimization"}, GameVersion: "1.21.1", Loader: "neoforge", Sort: "downloads"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %+v, want %+v", got, want)
	}

	// The player's own key replaces the built-in one; a rejected key reads as such.
	m.Save("groq", "gsk_players", "")
	if _, err := m.Parse(context.Background(), "mods", Intent{}, allow); err == nil || !strings.Contains(err.Error(), "rejected the API key") {
		t.Errorf("bad key: got %v", err)
	}
}

func TestStatusErrorWording(t *testing.T) {
	if err := statusError(429, "", "k"); !strings.Contains(err.Error(), "rate limit") {
		t.Error(err)
	}
	if err := statusError(500, `{"error":"bad key sk-123"}`, "sk-123"); strings.Contains(err.Error(), "sk-123") {
		t.Errorf("key in error: %v", err)
	}
}

func TestParseWithClaude(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		if r.URL.Path != "/v1/messages" || r.Header.Get("X-Api-Key") != "sk-ant-test" {
			t.Errorf("request %s key %q", r.URL.Path, r.Header.Get("X-Api-Key"))
		}
		for _, s := range []string{`"format"`, `"optimization"`, `"effort":"low"`, `"fallbacks":"default"`} {
			if !strings.Contains(string(body), s) {
				t.Errorf("request lacks %s: %s", s, body)
			}
		}
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"id":"msg_1","type":"message","role":"assistant","model":"claude-opus-5","stop_reason":"end_turn",
			"content":[{"type":"text","text":"{\"type\":\"modpack\",\"categories\":[\"adventure\"],\"sort\":\"newest\",\"query\":\"sky\"}"}],
			"usage":{"input_tokens":1,"output_tokens":1}}`)
	}))
	defer srv.Close()
	withProvider(t, "claude", srv.URL)
	m := New(paths.FromRoot(t.TempDir()))
	m.Save("claude", "sk-ant-test", "")

	got, err := m.Parse(context.Background(), "new sky modpacks for 1.20.1", Intent{Type: "mod"}, allow)
	if err != nil {
		t.Fatal(err)
	}
	want := Intent{Type: "modpack", Query: "sky", Categories: []string{"adventure"}, GameVersion: "1.20.1", Sort: "newest"}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %+v, want %+v", got, want)
	}
}

func TestPickKeepsOnlyCandidates(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Messages []chatMessage `json:"messages"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		if !strings.Contains(req.Messages[1].Content, `"id":"AANobbMI"`) || !strings.Contains(req.Messages[1].Content, "magic mods") {
			t.Errorf("request lacks the candidates or the message: %s", req.Messages[1].Content)
		}
		// A project Modrinth never returned, a repeat and one too many are dropped.
		reply := `{"picks":[{"id":"AANobbMI","reason":"Fast\nand light."},{"id":"made-up","reason":"x"},{"id":"AANobbMI","reason":"again"},{"id":"P7dR8mSH","reason":"Needed by many mods."},{"id":"gvQqBUqZ","reason":"third"}]}`
		json.NewEncoder(w).Encode(map[string]any{"choices": []any{map[string]any{"message": map[string]any{"content": reply}}}})
	}))
	defer srv.Close()
	withProvider(t, "groq", srv.URL)
	m := New(paths.FromRoot(t.TempDir()))
	m.Save("groq", "gsk_players", "")

	candidates := []Candidate{{ID: "AANobbMI", Title: "Sodium"}, {ID: "P7dR8mSH", Title: "Fabric API"}, {ID: "gvQqBUqZ", Title: "Lithium"}}
	got, err := m.Pick(context.Background(), "magic mods", candidates, 2)
	want := []Choice{{"AANobbMI", "Fast and light."}, {"P7dR8mSH", "Needed by many mods."}}
	if err != nil || !reflect.DeepEqual(got, want) {
		t.Errorf("got %+v %v, want %+v", got, err, want)
	}
	if got, err := m.Pick(context.Background(), "x", nil, 3); got != nil || err != nil {
		t.Errorf("no candidates: %v %v", got, err)
	}
}
