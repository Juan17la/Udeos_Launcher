# 14. The AI advisor

## What the player sees

**Ask AI** is a full page (from the Addons header, or from an instance's
Mods / Resource Packs / Shaders tab next to **Search in Addons**). The player
says what they want to *do*, not what to search for: "my game lags on a weak
PC", "mods to play with friends", "something spooky for survival". The advisor
does not answer with the search the player could run themselves. It works out
what they really need and answers like a person who knows the mods:

- **What it understood** (one small line) and a written **summary** of the
  approach: what it chose, how the pieces work together, what matters
  (a library a mod needs, two mods that overlap, a heavy choice for a weak
  PC). The wording differs from answer to answer.
- The picks **grouped by need**. "Make my game faster" becomes a renderer,
  game-logic optimisation and memory savings: three different searches, each
  with a sentence saying what the group covers and up to three picks, each
  with a reason written for this player. At most six picks in all.
- A **question** instead, when the request is too vague to search well
  ("something cool"): it asks what kind of fun before it searches.
- **Follow-up chips** ("Add shaders too", "Make it lighter") and, per group,
  **See all N in Addons** (opens Addons with that group's filters already set).
  The conversation is remembered: "lighter", "without shaders" refine it.

It knows the instance it is adding to: the instance's Minecraft version and
loader are always applied, and what the instance **already has** is left out
of the results (and told to the model, so it can explain how a pick goes with
what is there). No instance in context: the advisor searches broadly, and
**Add** asks which instance (only the ones the pick works on, the picker of
the Addons page).

**Add** on a pick is the page's own Add, with the same compatibility,
dependency and incompatibility checks as always ([10](10-adding-content.md)).
With an instance in context it installs straight into it; otherwise it asks
which one first. The card reads **Adding…**, then **Added** (and, without an
instance in context, "Added to <name>"). A failure shows in the Activity
button like any install and offers alternatives when it is a conflict.

Nothing is downloaded and nothing needs setting up: it works right away
through **Groq**, with a key built into the launcher. The button in the page
header ("Groq (built-in)") opens its settings, where the player can use their
own API key from **Groq, Claude, OpenAI, Gemini or Grok** instead, and pick a
model from a list. Each provider and model is marked **free plan** (a free key
from that provider works, with usage limits) or **paid** (needs API credit),
with a one-line hint under the selects. The key stays on this computer;
**Use built-in Groq** forgets it.

## Modrinth is the source of truth

The model never invents an addon. It answers in **two calls with Modrinth in
between** (`internal/ai/advisor.go`), and each step is checked.

**1. Plan** (`Manager.Plan`). The model gets the conversation so far, the
instance (name, Minecraft version, loader, installed titles) and the new
message, and returns what it understood plus up to **three goals**. A goal is
a label, a filter set (type, 0-2 categories, sort, keywords) and up to three
**names of well-known projects** it is sure exist. It may instead return a
**question** (and no goals) for a vague request. The filter values can only
come from the lists the launcher gives it:

- **types**: what the page offers now (a Vanilla instance: resource packs
  only; a server: mods only),
- **categories**: Modrinth's own list (`GET /v2/tag/category`, cached),
- **sort**: the four the page has.

Claude also receives them as a JSON schema (structured outputs); the other
providers are asked for "JSON only" and the launcher takes the first `{…}`.
Either way `ai.validate` checks every value again (the answer is untrusted
input) and drops anything that is not on a list. The **Minecraft version and
loader** never come from the model: the instance's replace everything, else
they are read from the player's own words (exact tokens: "neoforge",
"1.20.1"). If the model returns nothing usable, the player's own words are
searched.

**2. Search, then write** (`Manager.Advise`, `Compose`). The goals are searched
on Modrinth **in parallel** (`SearchContent`, cached like the Addons page).
Named projects are looked up by name and accepted only when the **title
matches** (an exact title beats a longer one that starts with the name), so a
wrong guess finds nothing instead of something else. Each project belongs to
the first goal that found it, and what the instance already has never appears.
The model then gets up to eight real results per goal (id, title, Modrinth's
description, downloads) and writes the answer. Ids that are not in those lists
are dropped, each project is used once, a group has at most three picks and the
answer at most six, so every pick is a real Modrinth project. Its name, icon
and versions come from Modrinth.

**The text the model writes** (understood, summary, group intros, reasons,
follow-ups, the question) is the only model text the player sees. It is shown
as plain text and cut to a length. The descriptions it reads are third-party
text, so a strange project description could at worst produce a strange
sentence, never a fake project. If writing fails (rate limit, unreadable
answer) the player still gets the top two results of each goal with their
Modrinth descriptions instead of reasons.

## How it runs

`internal/ai` (Go), bound in `app_ai.go` as `AIStatus`, `SetAI`, `ResetAI`
and `AskAI(message, types, history, instanceId)`; the UI is `screens/Advisor.tsx`
(settings in `components/AISettings.tsx`). Requests go out from Go, so
the webview never sees a key.

- **Providers and models** (`providers` in `internal/ai/ai.go`): each
  provider has three models to pick from. The first one is the default, and
  each is flagged `Free` if the provider's free plan covers it. As of 2026-09:

  | Provider | Models (default first) | Free plan |
  |---|---|---|
  | Groq | `openai/gpt-oss-20b`, `openai/gpt-oss-120b`, `qwen/qwen3.8-27b` | all three |
  | Claude | `claude-opus-5`, `claude-sonnet-5`, `claude-haiku-4-5` | none |
  | OpenAI | `gpt-6-luna`, `gpt-6-sol`, `gpt-6-astra` | none |
  | Gemini | `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-pro-preview` | the two Flash models |
  | Grok (xAI) | `grok-4.20-0309-non-reasoning`, `grok-4.3`, `grok-4.7` | none |

  When a provider retires a model, update this list; a saved model the list
  no longer has falls back to the default. `SetAI` only accepts listed
  models. Groq, OpenAI, Gemini
  and xAI use the OpenAI chat-completions format, and only `model` and
  `messages` are sent, because each one rejects a different set of optional
  settings. Claude uses Anthropic's Go SDK with structured outputs, low effort
  and server-side refusal fallbacks. The last two are only set on the default
  model (Haiku 4.5 rejects effort).
- **Ask** (`AskAI` → `ai.Advise`): the plan prompt lists the categories and
  teaches the model to think in needs, not keywords; the compose prompt asks
  for an answer that sounds like a knowledgeable friend and forbids claims the
  descriptions do not support. `ai.Searcher` is the seam to Modrinth (the app
  passes its cached `SearchContent`), which keeps the whole flow testable with
  a fake model and a fake Modrinth (`ai_test.go`).
- **Errors**: a rejected key and a rate limit have their own wording (and
  headline in the UI). A provider's error text is cut short, and the key is
  never in it.
- **Settings** live in `<data dir>/ai.json` (provider, the player's key,
  model; file mode 0600). `AIStatus` returns whether a key is saved (never
  the key) and the model lists.

## The built-in Groq key

The repository is public, so the key is **not in it**. The GitHub secret
`GROQ_API_KEY` holds it. The release workflow scrambles it with
`go run ./internal/ai/seal` (XOR with a pad, then hex) and stamps the result
in, the way the version is stamped:

```sh
GROQ_API_KEY=gsk_… wails build -tags webkit2_41 \
  -ldflags "-X udeos/launcher/internal/ai.sealed=$(go run ./internal/ai/seal)"
```

The key only exists unscrambled in memory, in the request header. Running
`strings` on the binary or grepping it for `gsk_` finds nothing, and the
scrambled value is masked in the Actions logs. A build without the variable
(`wails dev`, forks) has no built-in key, and the panel asks for one.

**Limit:** scrambling keeps the key from being casually copied, not from a
determined person with a debugger. The only real protection is a small
proxy server that holds the key. Until one exists, use a Groq key made only
for the launcher. Groq's free tier is rate-limited rather than billed, so
abuse can use up the limit but never costs money. Rotate the key if that
happens.

That limit is **shared by every player** using the built-in key. For
`openai/gpt-oss-20b` on Groq's free plan it is 30 requests/minute, 1,000
requests/day and 8K tokens/minute. One question takes **two** requests (plan,
then write) and about 4–5K tokens, so roughly 500 questions a day but only
one or two a minute fit across all players.
After that, players get the "Rate limited" message suggesting their own key.
Moving the key to Groq's paid Developer plan raises the limits without any
change to the launcher.

## History

A first version ran a local model (llama.cpp `llama-server` with
Qwen2.5-1.5B-Instruct, downloaded on first use). It worked offline, but the
~1.1 GB download and ~1.2 GB of RAM while in use were too heavy for a light
launcher, so it was replaced by the hosted providers before release.
