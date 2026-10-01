package ai

import (
	"cmp"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"
	"sync"

	"udeos/launcher/internal/modsearch"
)

// The advisor answers in two model calls with Modrinth in between:
//
//  1. Plan: what does the player really need? The model splits the request
//     into up to three goals (a renderer, game-logic savings and memory savings
//     are three different searches behind "make my game faster"), each a
//     filter set plus, optionally, names of well-known projects. A request too
//     vague to search gets a question back instead.
//  2. Advise: every goal is searched on Modrinth for the player's instance
//     (its Minecraft version and loader, minus what it already has). The model
//     then reads the real results and writes the answer: how the picks fit
//     together, caveats, and one reason per pick for this player.
//
// The model never introduces a project: ids it returns are checked against
// what Modrinth returned, filter values against the allowed lists, and all
// the text it writes is shown as plain text, cut to a length.

// Turn is one message of the conversation so far.
type Turn struct {
	Role string `json:"role"` // "user" or "assistant"
	Text string `json:"text"`
}

// Context is the instance the player is adding to; the zero value means none
// was chosen (they pick one when they press Add).
type Context struct {
	Name      string   `json:"name"`
	Version   string   `json:"version"`
	Loader    string   `json:"loader"`
	Installed []string `json:"installed"` // titles of what it already has
}

// Goal is one need found in the request and the search that serves it.
type Goal struct {
	Label  string   `json:"label"`
	Intent Intent   `json:"intent"`
	Names  []string `json:"names"` // well-known projects the model believes fit; looked up by name
}

// Plan is what the model understood and the searches it wants.
type Plan struct {
	Understood string `json:"understood"`
	Question   string `json:"question"` // set instead of goals when the request is too vague
	Goals      []Goal `json:"goals"`
}

const (
	maxGoals       = 3
	maxNames       = 3
	maxHistory     = 8 // turns sent back to the model
	maxPicksTotal  = 6 // across all groups
	maxPicksGroup  = 3
	maxInstalledIn = 60 // installed titles listed in the prompt
)

type planReply struct {
	Understood string `json:"understood"`
	Question   string `json:"question"`
	Goals      []struct {
		Label      string   `json:"label"`
		Type       string   `json:"type"`
		Categories []string `json:"categories"`
		Sort       string   `json:"sort"`
		Query      string   `json:"query"`
		Names      []string `json:"names"`
	} `json:"goals"`
}

// Plan asks the model what the player needs. Filter values are validated
// against allow; the instance's Minecraft version and loader replace the
// model's and the words' (they are the point of the instance).
func (m *Manager) Plan(ctx context.Context, message string, history []Turn, inst Context, allow Allowed) (Plan, error) {
	if len(allow.Types) == 0 {
		return Plan{}, errors.New("no content type to search")
	}
	message = cleanText(message, 400)
	reply, err := m.ask(ctx, planPrompt(allow), planSchema(allow), []chatMessage{{"user", transcript(message, history, inst)}})
	if err != nil {
		return Plan{}, err
	}
	var r planReply
	if err := decode(reply, &r); err != nil {
		return Plan{}, err
	}
	// Version and loader are exact words: read them from everything the player said.
	said := message
	for _, t := range history {
		if t.Role == "user" {
			said += " " + t.Text
		}
	}
	ldr, ver := mentioned(said, allow)
	plan := Plan{Understood: cleanText(r.Understood, 200), Question: cleanText(r.Question, 200)}
	for _, g := range r.Goals {
		in := validate(Intent{Type: g.Type, Query: g.Query, Categories: g.Categories, Sort: g.Sort, GameVersion: ver, Loader: ldr}, allow)
		lockInstance(&in, inst)
		goal := Goal{Label: cleanText(g.Label, 40), Intent: in, Names: []string{}}
		for _, n := range g.Names {
			if n = cleanText(n, 40); n != "" && len(goal.Names) < maxNames && !slices.Contains(goal.Names, n) {
				goal.Names = append(goal.Names, n)
			}
		}
		if !slices.ContainsFunc(plan.Goals, func(o Goal) bool {
			return o.Intent.Type == in.Type && o.Intent.Query == in.Query && slices.Equal(o.Intent.Categories, in.Categories)
		}) && len(plan.Goals) < maxGoals {
			plan.Goals = append(plan.Goals, goal)
		}
	}
	if len(plan.Goals) == 0 && plan.Question == "" {
		// The model gave nothing usable: search the player's own words.
		in := validate(Intent{Type: allow.Types[0], Query: message, GameVersion: ver, Loader: ldr}, allow)
		lockInstance(&in, inst)
		plan.Goals = []Goal{{Intent: in, Names: []string{}}}
	}
	if plan.Question != "" {
		plan.Goals = nil // a question and a search at once would be two answers
	}
	return plan, nil
}

// lockInstance makes the search the instance's: its Minecraft version, and for
// mods and modpacks its loader.
func lockInstance(in *Intent, inst Context) {
	if inst.Version == "" {
		return
	}
	in.GameVersion, in.Loader = inst.Version, ""
	if (in.Type == "mod" || in.Type == "modpack") && slices.Contains(loaders, strings.ToLower(inst.Loader)) {
		in.Loader = strings.ToLower(inst.Loader)
	}
}

func planPrompt(allow Allowed) string {
	var b strings.Builder
	b.WriteString(`You are the addon advisor inside a Minecraft launcher. A player describes what they want; you work out what they really need and plan searches on the Modrinth addon site. A second step reads the real search results, so do not recommend projects yet.
Reply with one JSON object only: {"understood": ..., "question": ..., "goals": [...]}.
- understood: one short sentence, in the player's language, saying what they are really after (their aim, not a repeat of their words).
- question: ONLY when the request is too vague to search well (like "something cool"): one short friendly question in the player's language, and then goals must be []. Otherwise "".
- goals: 1-3 different needs that together serve the request. Think like an expert: "better performance" needs a renderer, game-logic optimisation and memory savings, which are different searches; "play with friends" may need a voice-chat mod and a map mod. Each goal has:
  label: 2-4 words, in the player's language;
  type: one of ` + strings.Join(allow.Types, ", ") + ` ("resourcepack" = textures);
  categories: 0-2 from the list for that type, when one fits;
  sort: "downloads" for popular/best, "newest" for new, "updated" for recently updated, else "relevance";
  query: 1-2 keywords no category covers, else "";
  names: up to 3 exact names of well-known projects you are sure exist and fit this goal, else [].
- Respect the instance (its Minecraft version and loader are applied for you): do not plan what it already has, prefer what works with it.
- A short follow-up ("lighter", "without shaders", "now for my server") refines the conversation so far.
Categories:
`)
	for _, t := range allow.Types {
		if cats := allow.Categories[t]; len(cats) > 0 {
			b.WriteString(t + ": " + strings.Join(cats, ", ") + "\n")
		}
	}
	return b.String()
}

// planSchema is planPrompt's answer as a JSON schema (Claude holds its answer
// to it), restricted to allow's values. Property order is explicit: the
// grammar enforces it, and the model should state what it understood first.
func planSchema(allow Allowed) json.RawMessage {
	var cats []string
	for _, t := range allow.Types {
		cats = append(cats, allow.Categories[t]...)
	}
	slices.Sort(cats)
	cats = slices.Compact(cats)
	catItems := map[string]any{"type": "string"}
	if len(cats) > 0 {
		catItems = enum(cats)
	}
	str := map[string]any{"type": "string"}
	goal := object(
		field{"label", str},
		field{"type", enum(allow.Types)},
		field{"categories", map[string]any{"type": "array", "items": catItems}},
		field{"sort", enum(sorts)},
		field{"query", str},
		field{"names", map[string]any{"type": "array", "items": str}},
	)
	return object(
		field{"understood", str},
		field{"question", str},
		field{"goals", map[string]any{"type": "array", "items": goal}},
	)
}

// transcript is the one message the model reads: the conversation so far, the
// instance, and the new request.
func transcript(message string, history []Turn, inst Context) string {
	var b strings.Builder
	if len(history) > maxHistory {
		history = history[len(history)-maxHistory:]
	}
	if len(history) > 0 {
		b.WriteString("Conversation so far:\n")
		for _, t := range history {
			who := "Player"
			if t.Role == "assistant" {
				who = "Advisor"
			}
			b.WriteString(who + ": " + cleanText(t.Text, 500) + "\n")
		}
		b.WriteByte('\n')
	}
	b.WriteString(instanceLine(inst) + "\n")
	b.WriteString("Player's new message: " + message)
	return b.String()
}

func instanceLine(inst Context) string {
	if inst.Version == "" {
		return "Instance: none chosen yet (the player picks one when they add something)."
	}
	line := fmt.Sprintf("Instance: %q, Minecraft %s, %s.", cleanText(inst.Name, 40), inst.Version, cmp.Or(inst.Loader, "Vanilla"))
	installed := slices.Clone(inst.Installed)
	if len(installed) > maxInstalledIn {
		installed = installed[:maxInstalledIn]
	}
	if len(installed) == 0 {
		return line + " Nothing installed yet."
	}
	for i := range installed {
		installed[i] = cleanText(installed[i], 40)
	}
	return line + " Already installed: " + strings.Join(installed, ", ") + "."
}

// decode reads the JSON object out of a model reply (models may wrap it in prose or a ```json fence).
func decode(reply string, v any) error {
	i, j := strings.Index(reply, "{"), strings.LastIndex(reply, "}")
	if i < 0 || j < i {
		return errors.New("AI answer was not understood")
	}
	if err := json.Unmarshal([]byte(reply[i:j+1]), v); err != nil {
		return fmt.Errorf("AI answer was not understood: %w", err)
	}
	return nil
}

// Candidate is one Modrinth result the model may recommend.
type Candidate struct {
	ID          string `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	Downloads   int64  `json:"downloads"`
}

// Choice is one recommendation: a candidate's ID and why it fits this player.
type Choice struct {
	ID     string `json:"id"`
	Reason string `json:"reason"`
}

// GroupInput is one goal with the real results found for it.
type GroupInput struct {
	Label      string
	Candidates []Candidate
}

// Group is one goal's part of the answer.
type Group struct {
	Label string   `json:"label"`
	Intro string   `json:"intro"`
	Picks []Choice `json:"picks"`
}

// Composed is the written answer.
type Composed struct {
	Summary   string   `json:"summary"`
	Groups    []Group  `json:"groups"`
	FollowUps []string `json:"followUps"`
}

// Compose asks the model to write the answer from the real results: a
// summary of the approach, and per goal a sentence and up to three picks with
// a reason each. Ids are checked against the candidates (each project is
// used once), so the model can only recommend what Modrinth returned; labels
// must be the inputs' own.
func (m *Manager) Compose(ctx context.Context, message string, history []Turn, inst Context, understood string, groups []GroupInput) (Composed, error) {
	var ids, labels []string
	byLabel := map[string]map[string]bool{}
	var list strings.Builder
	for _, g := range groups {
		labels = append(labels, g.Label)
		byLabel[g.Label] = map[string]bool{}
		list.WriteString("Goal: " + g.Label + "\n")
		for _, c := range g.Candidates {
			c.Description = cleanText(c.Description, 200)
			raw, _ := json.Marshal(c)
			list.Write(raw)
			list.WriteByte('\n')
			ids = append(ids, c.ID)
			byLabel[g.Label][c.ID] = true
		}
	}
	if len(ids) == 0 {
		return Composed{}, nil
	}
	str := map[string]any{"type": "string"}
	pick := object(field{"id", enum(ids)}, field{"reason", str})
	group := object(field{"label", enum(labels)}, field{"intro", str}, field{"picks", map[string]any{"type": "array", "items": pick}})
	schema := object(field{"summary", str}, field{"groups", map[string]any{"type": "array", "items": group}}, field{"followUps", map[string]any{"type": "array", "items": str}})

	user := transcript(cleanText(message, 400), history, inst) + "\nWhat you understood: " + cleanText(understood, 200) + "\n\nReal Modrinth results by goal (one JSON object per line):\n" + list.String()
	reply, err := m.ask(ctx, composePrompt, schema, []chatMessage{{"user", user}})
	if err != nil {
		return Composed{}, err
	}
	var r struct {
		Summary string `json:"summary"`
		Groups  []struct {
			Label string   `json:"label"`
			Intro string   `json:"intro"`
			Picks []Choice `json:"picks"`
		} `json:"groups"`
		FollowUps []string `json:"followUps"`
	}
	if err := decode(reply, &r); err != nil {
		return Composed{}, err
	}
	out := Composed{Summary: cleanText(r.Summary, 700), Groups: []Group{}, FollowUps: []string{}}
	used, total := map[string]bool{}, 0
	for _, g := range r.Groups {
		valid, ok := byLabel[g.Label]
		if !ok || slices.ContainsFunc(out.Groups, func(o Group) bool { return o.Label == g.Label }) {
			continue
		}
		grp := Group{Label: g.Label, Intro: cleanText(g.Intro, 180)}
		for _, p := range g.Picks {
			if valid[p.ID] && !used[p.ID] && len(grp.Picks) < maxPicksGroup && total < maxPicksTotal {
				used[p.ID] = true
				total++
				grp.Picks = append(grp.Picks, Choice{ID: p.ID, Reason: cleanText(p.Reason, 200)})
			}
		}
		if len(grp.Picks) > 0 {
			out.Groups = append(out.Groups, grp)
		}
	}
	for _, f := range r.FollowUps {
		if f = cleanText(f, 60); f != "" && len(out.FollowUps) < 3 {
			out.FollowUps = append(out.FollowUps, f)
		}
	}
	return out, nil
}

const composePrompt = `You are the addon advisor inside a Minecraft launcher, answering a player. The user message holds their request, what you understood, their instance, and REAL search results from Modrinth grouped by goal (one JSON object per line: id, title, description, downloads). Anything the instance already has was removed.
Answer like a knowledgeable friend, not a template:
- summary: 2-4 sentences in the player's language, plain text. Explain the approach: what you chose and how the pieces work together; mention what matters, such as a library a mod needs (Fabric API, for example), two mods that overlap, a heavy choice for a weak PC, or what you left out and why. Only claim what the descriptions support; if you are not sure, do not say it. Vary your wording, and do not open with "Here are".
- groups: for each goal that has a good candidate, in the order given: label (copy it exactly), intro (one sentence on what this group covers), picks (1-3 ids, best first) each with a reason of at most 25 words that is specific to this player: how it serves their aim or suits their instance, not a copy of its description.
- At most 6 picks in total. Use only ids from the lists. Skip a goal when nothing fits.
- followUps: 2-3 short things the player might ask next (at most 8 words each, in their language), like adding shaders or making it lighter.
Reply with JSON only: {"summary": "...", "groups": [{"label": "...", "intro": "...", "picks": [{"id": "...", "reason": "..."}]}], "followUps": ["..."]}`

// Searcher runs a Modrinth search for the advisor: the results and how many
// there are in all. The caller decides how (caching, allowed categories).
type Searcher interface {
	Search(ctx context.Context, in Intent, limit int) ([]modsearch.Result, int, error)
}

// Pick is one recommended result with why.
type Pick struct {
	Result modsearch.Result `json:"result"`
	Reason string           `json:"reason"` // "" when the model could not be asked
}

// AnswerGroup is one goal's results: the model's words, the search that found
// them (so the player can open it in Addons) and what it recommends.
type AnswerGroup struct {
	Label  string `json:"label"`
	Intro  string `json:"intro"`
	Intent Intent `json:"intent"`
	Total  int    `json:"total"`
	Picks  []Pick `json:"picks"`
}

// Answer is the advisor's whole reply to one message.
type Answer struct {
	Understood string        `json:"understood"`
	Question   string        `json:"question"`
	Summary    string        `json:"summary"`
	Groups     []AnswerGroup `json:"groups"`
	FollowUps  []string      `json:"followUps"`
}

// Request is one player message with everything around it.
type Request struct {
	Message string
	History []Turn
	Inst    Context
	// Installed are the project ids the instance already has, left out of the results.
	Installed []string
	Allow     Allowed
}

// candidatesPerGoal is how many real results the model chooses from per goal.
const candidatesPerGoal = 8

// Advise runs the whole thing: plan, search every goal on Modrinth in
// parallel, write the answer. If writing fails (rate limit, odd answer) the
// player still gets the top results of each goal, just without words.
func (m *Manager) Advise(ctx context.Context, s Searcher, req Request) (Answer, error) {
	plan, err := m.Plan(ctx, req.Message, req.History, req.Inst, req.Allow)
	if err != nil {
		return Answer{}, err
	}
	ans := Answer{Understood: plan.Understood, Question: plan.Question, Groups: []AnswerGroup{}, FollowUps: []string{}}
	if len(plan.Goals) == 0 {
		return ans, nil
	}

	type found struct {
		cands []modsearch.Result
		total int
		err   error
	}
	results := make([]found, len(plan.Goals))
	var wg sync.WaitGroup
	for i, g := range plan.Goals {
		wg.Add(1)
		go func() {
			defer wg.Done()
			results[i].cands, results[i].total, results[i].err = searchGoal(ctx, s, g)
		}()
	}
	wg.Wait()

	// Each project belongs to the first goal that found it; what is installed never appears.
	seen := map[string]bool{}
	for _, id := range req.Installed {
		seen[id] = true
	}
	var inputs []GroupInput
	var kept []int // plan.Goals index of each input
	byID := map[string]modsearch.Result{}
	var failure error
	labels := map[string]bool{}
	for i, g := range plan.Goals {
		if results[i].err != nil {
			failure = results[i].err
			continue
		}
		label := cmp.Or(g.Label, "Picks")
		for n := 2; labels[label]; n++ {
			label = fmt.Sprintf("%s %d", cmp.Or(g.Label, "Picks"), n)
		}
		plan.Goals[i].Label = label
		in := GroupInput{Label: label}
		for _, r := range results[i].cands {
			if seen[r.ID] || len(in.Candidates) == candidatesPerGoal {
				continue
			}
			seen[r.ID] = true
			byID[r.ID] = r
			in.Candidates = append(in.Candidates, Candidate{ID: r.ID, Title: r.Title, Description: r.Description, Downloads: r.Downloads})
		}
		if len(in.Candidates) > 0 {
			labels[label] = true
			inputs = append(inputs, in)
			kept = append(kept, i)
		}
	}
	if len(inputs) == 0 {
		if failure != nil {
			return Answer{}, failure
		}
		return ans, nil // nothing new on Modrinth for this
	}

	composed, err := m.Compose(ctx, req.Message, req.History, req.Inst, plan.Understood, inputs)
	if err != nil || len(composed.Groups) == 0 {
		composed = Composed{}
		for _, in := range inputs {
			g := Group{Label: in.Label}
			for _, c := range in.Candidates[:min(2, len(in.Candidates))] {
				g.Picks = append(g.Picks, Choice{ID: c.ID})
			}
			composed.Groups = append(composed.Groups, g)
		}
	}
	ans.Summary, ans.FollowUps = composed.Summary, composed.FollowUps
	for _, g := range composed.Groups {
		k := slices.IndexFunc(inputs, func(in GroupInput) bool { return in.Label == g.Label })
		goal := plan.Goals[kept[k]]
		out := AnswerGroup{Label: g.Label, Intro: g.Intro, Intent: goal.Intent, Total: results[kept[k]].total, Picks: []Pick{}}
		for _, p := range g.Picks {
			out.Picks = append(out.Picks, Pick{Result: byID[p.ID], Reason: p.Reason})
		}
		ans.Groups = append(ans.Groups, out)
	}
	return ans, nil
}

// searchGoal finds a goal's candidates: the well-known projects the model
// named (first, matched by title so a wrong guess finds nothing rather than
// something else), then the goal's own search.
func searchGoal(ctx context.Context, s Searcher, g Goal) ([]modsearch.Result, int, error) {
	var out []modsearch.Result
	for _, name := range g.Names {
		in := g.Intent
		in.Query, in.Categories, in.Sort = name, nil, "relevance"
		rs, _, err := s.Search(ctx, in, 3)
		if err != nil {
			continue // a name that cannot be looked up is only a missed hint
		}
		// An exact title beats a longer one that merely starts with the name.
		i := slices.IndexFunc(rs, func(r modsearch.Result) bool { return norm(r.Title) == norm(name) })
		if i < 0 {
			i = slices.IndexFunc(rs, func(r modsearch.Result) bool { return sameName(r.Title, name) })
		}
		if i >= 0 {
			out = append(out, rs[i])
		}
	}
	rs, total, err := s.Search(ctx, g.Intent, candidatesPerGoal)
	if err != nil && len(out) == 0 {
		return nil, 0, err
	}
	return append(out, rs...), total, nil
}

// norm lowercases a project name and drops spaces and punctuation.
func norm(s string) string {
	return strings.Map(func(r rune) rune {
		if r >= 'A' && r <= 'Z' {
			return r + 32
		}
		if (r >= 'a' && r <= 'z') || (r >= '0' && r <= '9') {
			return r
		}
		return -1
	}, s)
}

// sameName compares project names ignoring case, spaces and punctuation. The
// shorter may also start the longer ("Iris" ~ "Iris Shaders"), as long as it
// has four letters or more, so a short guess never matches a longer project.
func sameName(a, b string) bool {
	a, b = norm(a), norm(b)
	if a == "" || b == "" {
		return false
	}
	return a == b || (len(a) >= 4 && len(b) >= 4 && (strings.HasPrefix(a, b) || strings.HasPrefix(b, a)))
}
