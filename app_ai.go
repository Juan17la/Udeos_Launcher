package main

import (
	"context"
	"slices"

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

// modrinthSearcher lets the advisor search Modrinth the way the Addons page does
// (same cache, same category checks).
type modrinthSearcher struct{ a *App }

func (s modrinthSearcher) Search(_ context.Context, in ai.Intent, limit int) ([]modsearch.Result, int, error) {
	page, err := s.a.SearchContent(in.Type, in.Query, in.GameVersion, in.Loader, in.Sort, in.Categories, 0, limit)
	return page.Results, page.Total, err
}

// AskAI is the advisor's reply to one message of the AI page. It works out
// what the player needs, searches Modrinth for each need (for the instance's
// Minecraft version and loader, leaving out what it already has), and writes
// an answer: how the picks fit together and why each one. history is the
// conversation so far, so follow-ups ("lighter", "without shaders") work.
// types are the project types on offer (an instance narrows them);
// instanceID is the instance the player is adding to ("" = none: they choose
// one when they press Add). See docs/14-ai-search.md.
func (a *App) AskAI(message string, types []string, history []ai.Turn, instanceID string) (ai.Answer, error) {
	req := ai.Request{Message: message, History: history, Allow: a.aiAllowed(types)}
	if instanceID != "" {
		inst, err := a.launcher.Instances.Get(instanceID)
		if err != nil {
			return ai.Answer{}, err
		}
		req.Inst = ai.Context{Name: inst.Name, Version: inst.Version, Loader: inst.Loader}
		// Hand-added files have no record and are not listed; the rest is what "already installed" means.
		if have, err := a.launcher.Content.Installed(a.ctx, inst); err == nil {
			for _, e := range have {
				req.Inst.Installed = append(req.Inst.Installed, e.Title)
				req.Installed = append(req.Installed, e.ProjectID)
			}
		}
	}
	return a.ai.Advise(a.ctx, modrinthSearcher{a}, req)
}

// aiAllowed is every value the model may use: the allowed types, Modrinth's own
// categories and versions, and known loaders. Anything else it says is dropped.
func (a *App) aiAllowed(types []string) ai.Allowed {
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
	return allow
}

// categoryType is the project type Modrinth files a type's categories under:
// datapacks are "mod" projects there, so they use the mod categories.
func categoryType(projectType string) string {
	if projectType == string(modsearch.TypeDatapack) {
		return string(modsearch.TypeMod)
	}
	return projectType
}

// knownCategories keeps the categories Modrinth has for projectType.
func (a *App) knownCategories(projectType string, categories []string) []string {
	if len(categories) == 0 {
		return nil
	}
	projectType = categoryType(projectType)
	cats, err := a.launcher.Search.Categories(a.ctx)
	if err != nil {
		return nil
	}
	return slices.DeleteFunc(slices.Clone(categories), func(c string) bool {
		return !slices.ContainsFunc(cats, func(k modsearch.Category) bool { return k.Name == c && string(k.ProjectType) == projectType })
	})
}
