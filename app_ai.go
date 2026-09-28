package main

import (
	"slices"
	"strings"

	"udeos/launcher/internal/ai"
	"udeos/launcher/internal/modsearch"
)

// AIStatus tells the Addons page which AI provider is set and whether a key
// is there to ask with (never the key itself).
func (a *App) AIStatus() ai.Status { return a.ai.Status() }

// SetAI picks the AI provider (groq, claude, openai, gemini, grok), the
// player's API key ("" keeps the saved one for the same provider; Groq
// without one uses the built-in key) and a model ("" = the default).
func (a *App) SetAI(provider, key, model string) (ai.Status, error) {
	return a.ai.Save(provider, key, model)
}

// ResetAI goes back to Groq with the built-in key.
func (a *App) ResetAI() (ai.Status, error) { return a.ai.Reset() }

// AIAnswer is the chat's reply to one message: the Modrinth search it ran
// and the results it recommends, each with why.
type AIAnswer struct {
	Intent ai.Intent `json:"intent"`
	Total  int       `json:"total"` // Modrinth results for Intent ("See all")
	Picks  []AIPick  `json:"picks"`
}

// AIPick is one recommended Modrinth result; Reason is "" when the model
// could not be asked for one.
type AIPick struct {
	Result modsearch.Result `json:"result"`
	Reason string           `json:"reason"`
}

// aiCandidates is how many top Modrinth results the model chooses from, and
// aiPicks how many it recommends.
const aiCandidates, aiPicks = 8, 3

// AskAI answers a chat message: the model reads a search out of it, the
// launcher runs that search on Modrinth, and the model picks the best few
// results with a one-line reason each. types are the project types the page
// offers (an instance narrows them); prev is the last search, so follow-ups
// refine it. lockVersion/lockLoader are an instance's, and win over the
// model's ("" = no instance).
func (a *App) AskAI(message string, types []string, prev ai.Intent, lockVersion, lockLoader string) (AIAnswer, error) {
	in, err := a.aiIntent(message, types, prev)
	if err != nil {
		return AIAnswer{}, err
	}
	if lockVersion != "" {
		in.GameVersion, in.Loader = lockVersion, ""
		if in.Type == "mod" || in.Type == "modpack" {
			in.Loader = strings.ToLower(lockLoader)
		}
	}
	page, err := a.SearchContent(in.Type, in.Query, in.GameVersion, in.Loader, in.Sort, in.Categories, 0, aiCandidates)
	if err != nil {
		return AIAnswer{}, err
	}
	answer := AIAnswer{Intent: in, Total: page.Total, Picks: []AIPick{}}
	candidates := make([]ai.Candidate, len(page.Results))
	for i, r := range page.Results {
		candidates[i] = ai.Candidate{ID: r.ID, Title: r.Title, Description: r.Description, Downloads: r.Downloads}
	}
	// ponytail: if picking fails (rate limit, odd answer), the top results
	// still help more than an error; they just come without reasons.
	choices, err := a.ai.Pick(a.ctx, message, candidates, aiPicks)
	if err != nil || len(choices) == 0 {
		choices = nil
		for _, c := range candidates[:min(aiPicks, len(candidates))] {
			choices = append(choices, ai.Choice{ID: c.ID})
		}
	}
	for _, c := range choices {
		i := slices.IndexFunc(page.Results, func(r modsearch.Result) bool { return r.ID == c.ID })
		answer.Picks = append(answer.Picks, AIPick{Result: page.Results[i], Reason: c.Reason})
	}
	return answer, nil
}

// aiIntent reads a search out of the player's message; it only ever holds
// the allowed types, Modrinth's own categories and versions, and known loaders.
func (a *App) aiIntent(message string, types []string, prev ai.Intent) (ai.Intent, error) {
	allow := ai.Allowed{Categories: map[string][]string{}}
	for _, t := range types {
		if slices.Contains([]string{"mod", "modpack", "resourcepack", "shader"}, t) {
			allow.Types = append(allow.Types, t)
		}
	}
	// Categories and versions are cached lists; without them (offline, first
	// run) the model still picks a type and keywords.
	if cats, err := a.launcher.Search.Categories(a.ctx); err == nil {
		for _, c := range cats {
			allow.Categories[string(c.ProjectType)] = append(allow.Categories[string(c.ProjectType)], c.Name)
		}
	}
	if versions, err := a.ListSearchGameVersions(); err == nil {
		for _, v := range versions {
			allow.Versions = append(allow.Versions, v.Version)
		}
	}
	return a.ai.Parse(a.ctx, message, prev, allow)
}

// knownCategories keeps the categories Modrinth has for projectType.
func (a *App) knownCategories(projectType string, categories []string) []string {
	if len(categories) == 0 {
		return nil
	}
	cats, err := a.launcher.Search.Categories(a.ctx)
	if err != nil {
		return nil
	}
	return slices.DeleteFunc(slices.Clone(categories), func(c string) bool {
		return !slices.ContainsFunc(cats, func(k modsearch.Category) bool { return k.Name == c && string(k.ProjectType) == projectType })
	})
}
