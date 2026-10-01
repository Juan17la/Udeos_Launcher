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
	"sync"
	"testing"

	"udeos/launcher/internal/modsearch"
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

func TestStatusErrorWording(t *testing.T) {
	if err := statusError(429, "", "k"); !strings.Contains(err.Error(), "rate limit") {
		t.Error(err)
	}
	if err := statusError(500, `{"error":"bad key sk-123"}`, "sk-123"); strings.Contains(err.Error(), "sk-123") {
		t.Errorf("key in error: %v", err)
	}
}

// chatReply writes one OpenAI-style completion holding content.
func chatReply(w http.ResponseWriter, content string) {
	json.NewEncoder(w).Encode(map[string]any{"choices": []any{map[string]any{"message": map[string]any{"content": content}}}})
}

func TestPlanWithBuiltInGroqKey(t *testing.T) {
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
		user := req.Messages[1].Content
		if !strings.Contains(user, "Already installed: Sodium") || !strings.Contains(user, "Advisor: Try Lithium") || !strings.Contains(user, "Player's new message: lighter please") {
			t.Errorf("the model was not told the instance or the conversation:\n%s", user)
		}
		// Models may wrap the JSON; invented categories, a fourth goal and a repeat are dropped.
		chatReply(w, "Sure:\n```json\n"+`{"understood":"A smoother game\nfor a weak PC","question":"","goals":[
			{"label":"Renderer","type":"mod","categories":["optimization","made-up"],"sort":"downloads","query":"","names":["Sodium"," Sodium ","Lithium","A","B"]},
			{"label":"Renderer again","type":"mod","categories":["optimization"],"sort":"downloads","query":"","names":[]},
			{"label":"Textures","type":"resourcepack","categories":[],"sort":"relevance","query":"lite","names":[]},
			{"label":"Memory","type":"shader","categories":[],"sort":"relevance","query":"","names":[]},
			{"label":"Extra","type":"mod","categories":["technology"],"sort":"relevance","query":"","names":[]}]}`+"\n```")
	}))
	defer srv.Close()
	withProvider(t, "groq", srv.URL)
	m := New(paths.FromRoot(t.TempDir()))
	inst := Context{Name: "Fabric Fun", Version: "1.20.1", Loader: "Fabric", Installed: []string{"Sodium"}}
	history := []Turn{{"user", "faster game on neo forge"}, {"assistant", "Try Lithium and Sodium."}}
	allowAll := Allowed{Types: []string{"mod", "resourcepack"}, Categories: map[string][]string{"mod": {"optimization", "technology"}}, Versions: allow.Versions}

	sealed = ""
	if _, err := m.Plan(context.Background(), "lighter please", history, inst, allowAll); err != ErrNoKey {
		t.Errorf("no built-in key: got %v", err)
	}
	sealed = Seal("gsk_built_in")
	t.Cleanup(func() { sealed = "" })

	got, err := m.Plan(context.Background(), "lighter please", history, inst, allowAll)
	if err != nil {
		t.Fatal(err)
	}
	// The instance's version and loader win over the words ("neo forge") and the model; "shader" is not allowed here.
	want := Plan{Understood: "A smoother game for a weak PC", Goals: []Goal{
		{"Renderer", Intent{Type: "mod", Categories: []string{"optimization"}, GameVersion: "1.20.1", Loader: "fabric", Sort: "downloads"}, []string{"Sodium", "Lithium", "A"}},
		{"Textures", Intent{Type: "resourcepack", Query: "lite", Categories: []string{}, GameVersion: "1.20.1", Sort: "relevance"}, []string{}},
		{"Memory", Intent{Type: "mod", Categories: []string{}, GameVersion: "1.20.1", Loader: "fabric", Sort: "relevance"}, []string{}},
	}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got  %+v\nwant %+v", got, want)
	}

	// The player's own key replaces the built-in one; a rejected key reads as such.
	m.Save("groq", "gsk_players", "")
	if _, err := m.Plan(context.Background(), "mods", nil, Context{}, allowAll); err == nil || !strings.Contains(err.Error(), "rejected the API key") {
		t.Errorf("bad key: got %v", err)
	}
}

func TestPlanAsksAboutAVagueRequestAndFallsBackToTheWords(t *testing.T) {
	replies := []string{
		`{"understood":"Something fun","question":"What kind of fun: building, fighting or exploring?","goals":[{"label":"x","type":"mod","categories":[],"sort":"relevance","query":"","names":[]}]}`,
		`{"understood":"","question":"","goals":[]}`,
	}
	n := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { chatReply(w, replies[n]); n++ }))
	defer srv.Close()
	withProvider(t, "groq", srv.URL)
	m := New(paths.FromRoot(t.TempDir()))
	m.Save("groq", "gsk_players", "")

	got, err := m.Plan(context.Background(), "something cool", nil, Context{}, allow)
	if err != nil || got.Question == "" || len(got.Goals) != 0 {
		t.Errorf("vague request: %+v %v", got, err)
	}
	// An answer with nothing usable still searches what the player typed.
	got, err = m.Plan(context.Background(), "dragon mods for forge", nil, Context{}, allow)
	if err != nil || len(got.Goals) != 1 || got.Goals[0].Intent.Type != "mod" || got.Goals[0].Intent.Loader != "forge" || !strings.Contains(got.Goals[0].Intent.Query, "dragon") {
		t.Errorf("fallback: %+v %v", got, err)
	}
}

func TestPlanWithClaude(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, _ := io.ReadAll(r.Body)
		if r.URL.Path != "/v1/messages" || r.Header.Get("X-Api-Key") != "sk-ant-test" {
			t.Errorf("request %s key %q", r.URL.Path, r.Header.Get("X-Api-Key"))
		}
		for _, s := range []string{`"format"`, `"optimization"`, `"goals"`, `"names"`, `"effort":"low"`, `"fallbacks":"default"`} {
			if !strings.Contains(string(body), s) {
				t.Errorf("request lacks %s: %s", s, body)
			}
		}
		w.Header().Set("Content-Type", "application/json")
		io.WriteString(w, `{"id":"msg_1","type":"message","role":"assistant","model":"claude-opus-5","stop_reason":"end_turn",
			"content":[{"type":"text","text":"{\"understood\":\"A sky base\",\"question\":\"\",\"goals\":[{\"label\":\"Packs\",\"type\":\"modpack\",\"categories\":[\"adventure\"],\"sort\":\"newest\",\"query\":\"sky\",\"names\":[]}]}"}],
			"usage":{"input_tokens":1,"output_tokens":1}}`)
	}))
	defer srv.Close()
	withProvider(t, "claude", srv.URL)
	m := New(paths.FromRoot(t.TempDir()))
	m.Save("claude", "sk-ant-test", "")

	got, err := m.Plan(context.Background(), "new sky modpacks for 1.20.1", nil, Context{}, allow)
	if err != nil {
		t.Fatal(err)
	}
	want := Goal{"Packs", Intent{Type: "modpack", Query: "sky", Categories: []string{"adventure"}, GameVersion: "1.20.1", Sort: "newest"}, []string{}}
	if len(got.Goals) != 1 || !reflect.DeepEqual(got.Goals[0], want) {
		t.Errorf("got %+v, want %+v", got.Goals, want)
	}
}

func TestComposeKeepsOnlyCandidates(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Messages []chatMessage `json:"messages"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		user := req.Messages[1].Content
		if !strings.Contains(user, `"id":"AANobbMI"`) || !strings.Contains(user, "Goal: Speed") || !strings.Contains(user, "What you understood: smoother") {
			t.Errorf("request lacks the results or the goal:\n%s", user)
		}
		// Unknown ids and labels, repeats and extras are dropped; text is cleaned and cut.
		chatReply(w, `{"summary":"Use both.\nThey stack.","groups":[
			{"label":"Speed","intro":"Makes it fast","picks":[{"id":"AANobbMI","reason":"Fast\nand light."},{"id":"made-up","reason":"x"},{"id":"AANobbMI","reason":"again"},{"id":"P7dR8mSH","reason":"Needed by many."},{"id":"gvQqBUqZ","reason":"third"},{"id":"zzzzzzzz","reason":"fourth"}]},
			{"label":"Invented","intro":"x","picks":[{"id":"zzzzzzzz","reason":"y"}]},
			{"label":"Speed","intro":"twice","picks":[{"id":"zzzzzzzz","reason":"y"}]},
			{"label":"Looks","intro":"","picks":[{"id":"AANobbMI","reason":"already used"}]}],
			"followUps":["Add shaders too","  ","Make it lighter","Third","Fourth"]}`)
	}))
	defer srv.Close()
	withProvider(t, "groq", srv.URL)
	m := New(paths.FromRoot(t.TempDir()))
	m.Save("groq", "gsk_players", "")

	groups := []GroupInput{
		{"Speed", []Candidate{{ID: "AANobbMI", Title: "Sodium"}, {ID: "P7dR8mSH", Title: "Fabric API"}, {ID: "gvQqBUqZ", Title: "Lithium"}, {ID: "zzzzzzzz", Title: "Fourth"}}},
		{"Looks", []Candidate{{ID: "LLLLLLLL", Title: "Iris"}}},
	}
	got, err := m.Compose(context.Background(), "faster", nil, Context{}, "smoother", groups)
	if err != nil {
		t.Fatal(err)
	}
	want := Composed{Summary: "Use both. They stack.", FollowUps: []string{"Add shaders too", "Make it lighter", "Third"}, Groups: []Group{
		{"Speed", "Makes it fast", []Choice{{"AANobbMI", "Fast and light."}, {"P7dR8mSH", "Needed by many."}, {"gvQqBUqZ", "third"}}},
	}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got  %+v\nwant %+v", got, want)
	}
	if got, err := m.Compose(context.Background(), "x", nil, Context{}, "", nil); err != nil || len(got.Groups) != 0 {
		t.Errorf("no candidates: %+v %v", got, err)
	}
}

// fakeModrinth answers searches from tables keyed by the query text / type.
type fakeModrinth struct {
	mu       sync.Mutex
	searches []Intent
}

func (f *fakeModrinth) Search(_ context.Context, in Intent, limit int) ([]modsearch.Result, int, error) {
	f.mu.Lock()
	f.searches = append(f.searches, in)
	f.mu.Unlock()
	r := func(id, title string) modsearch.Result {
		return modsearch.Result{ID: id, Title: title, Description: title + " description"}
	}
	switch {
	case in.Query == "Lithium":
		return []modsearch.Result{r("lith-x", "Lithium Extras"), r("lith", "Lithium")}, 2, nil
	case in.Query == "Sodium":
		return []modsearch.Result{r("sod", "Sodium")}, 1, nil
	case in.Type == "mod" && len(in.Categories) > 0:
		return []modsearch.Result{r("sod", "Sodium"), r("ferrite", "FerriteCore"), r("ent", "EntityCulling")}, 40, nil
	case in.Type == "resourcepack":
		return nil, 0, nil
	}
	return nil, 0, nil
}

func TestAdviseInvestigatesInsteadOfJustSearching(t *testing.T) {
	var composeFails bool
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Messages []chatMessage `json:"messages"`
		}
		json.NewDecoder(r.Body).Decode(&req)
		if strings.Contains(req.Messages[0].Content, "plan searches") {
			chatReply(w, `{"understood":"A smoother game","question":"","goals":[
				{"label":"Rendering","type":"mod","categories":["optimization"],"sort":"downloads","query":"","names":["Sodium","Lithium"]},
				{"label":"Textures","type":"resourcepack","categories":[],"sort":"relevance","query":"lite","names":[]}]}`)
			return
		}
		if composeFails {
			w.WriteHeader(http.StatusInternalServerError)
			return
		}
		user := req.Messages[1].Content
		if strings.Contains(user, `"id":"sod"`) {
			t.Errorf("an installed project was offered:\n%s", user)
		}
		if !strings.Contains(user, `"id":"lith"`) || strings.Contains(user, `"id":"lith-x"`) {
			t.Errorf("the named project must be matched by title, not by position:\n%s", user)
		}
		chatReply(w, `{"summary":"Lithium handles the game logic; FerriteCore saves memory.","groups":[{"label":"Rendering","intro":"The core of it","picks":[{"id":"lith","reason":"Speeds up the game logic."},{"id":"ferrite","reason":"Cuts memory use."}]}],"followUps":["Add shaders"]}`)
	}))
	defer srv.Close()
	withProvider(t, "groq", srv.URL)
	m := New(paths.FromRoot(t.TempDir()))
	m.Save("groq", "gsk_players", "")
	fm := &fakeModrinth{}
	req := Request{
		Message: "make my game faster", Installed: []string{"sod"},
		Inst:  Context{Name: "Fabric Fun", Version: "1.20.1", Loader: "Fabric", Installed: []string{"Sodium"}},
		Allow: Allowed{Types: []string{"mod", "resourcepack"}, Categories: map[string][]string{"mod": {"optimization"}}, Versions: allow.Versions},
	}

	got, err := m.Advise(context.Background(), fm, req)
	if err != nil {
		t.Fatal(err)
	}
	if got.Understood != "A smoother game" || !strings.Contains(got.Summary, "FerriteCore") || len(got.FollowUps) != 1 {
		t.Errorf("text: %+v", got)
	}
	// One group: Textures found nothing; Sodium is installed; the Lithium hint came first.
	if len(got.Groups) != 1 || got.Groups[0].Label != "Rendering" || got.Groups[0].Total != 40 || got.Groups[0].Intent.GameVersion != "1.20.1" || got.Groups[0].Intent.Loader != "fabric" {
		t.Fatalf("groups: %+v", got.Groups)
	}
	var titles []string
	for _, p := range got.Groups[0].Picks {
		titles = append(titles, p.Result.Title+": "+p.Reason)
	}
	if !reflect.DeepEqual(titles, []string{"Lithium: Speeds up the game logic.", "FerriteCore: Cuts memory use."}) {
		t.Errorf("picks: %v", titles)
	}

	// If writing the answer fails, the player still gets the top results of each goal.
	composeFails = true
	got, err = m.Advise(context.Background(), fm, req)
	if err != nil || got.Summary != "" || len(got.Groups) != 1 || len(got.Groups[0].Picks) != 2 || got.Groups[0].Picks[0].Reason != "" {
		t.Errorf("fallback: %+v %v", got, err)
	}
}

func TestAdviseWithAQuestionSearchesNothing(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		chatReply(w, `{"understood":"","question":"Do you want to build or to fight?","goals":[]}`)
	}))
	defer srv.Close()
	withProvider(t, "groq", srv.URL)
	m := New(paths.FromRoot(t.TempDir()))
	m.Save("groq", "gsk_players", "")
	fm := &fakeModrinth{}
	got, err := m.Advise(context.Background(), fm, Request{Message: "something cool", Allow: allow})
	if err != nil || got.Question == "" || len(got.Groups) != 0 || len(fm.searches) != 0 {
		t.Errorf("got %+v %v, searches %v", got, err, fm.searches)
	}
}

func TestSameName(t *testing.T) {
	for _, c := range []struct {
		a, b string
		want bool
	}{{"Sodium", "sodium", true}, {"Iris", "Iris Shaders", true}, {"Fabric API", "fabric-api", true}, {"Lit", "Lithium", false}, {"Sodium", "Lithium", false}, {"", "x", false}} {
		if sameName(c.a, c.b) != c.want {
			t.Errorf("sameName(%q, %q) != %v", c.a, c.b, c.want)
		}
	}
}
