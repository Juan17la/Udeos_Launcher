# 14. AI search

## What the player sees

The **Addons** page has an **Ask AI** button (so does an instance's Mods,
Resource Packs and Shaders tab, next to **Search in Addons**). It opens a
small chat above the filters: the player writes what they want — "popular
performance mods for fabric 1.20.1", "a skyblock modpack", "medieval
textures" — and the answer arrives **in the chat**. It says what was
searched ("My picks from Modrinth for: Mods · optimization · 1.20.1 ·
Fabric") and lists up to three projects. Each one shows its icon and name, a
one-line reason why it fits (written by the AI, in the player's language),
and the same **Add** and **Details** buttons as a result card. **See all N
results** puts that search on the page (tab, text, version, loader, sort and
Modrinth **categories**, shown as removable tags). Until then the page's own
filters stay as they were. Follow-ups refine the chat's last search ("only
forge", "newer ones").

Nothing is downloaded and nothing needs setting up: it works right away
through **Groq**, with a key built into the launcher. The button in the
panel's corner ("Groq (built-in)") opens its settings, where the player can
use their own API key from **Groq, Claude, OpenAI, Gemini or Grok** instead,
and pick a model from a list. Each provider and model is marked **free plan**
(a free key from that provider works, with usage limits) or **paid** (needs
API credit), with a one-line hint under the selects. The key stays on this
computer; **Use built-in Groq** forgets it.

## Modrinth is the source of truth

The model never invents an addon. It answers in two steps, and each one is
checked.

**1. Read the request.** The model only picks filter values, and only from
lists the launcher gives it:

- **types**: the tabs the page offers right now (a Vanilla instance: resource
  packs only; a server: mods only),
- **categories**: Modrinth's own list (`GET /v2/tag/category`, cached like the
  version list),
- **versions**: Modrinth's release list, **loaders**: fabric, forge, quilt,
  neoforge, **sort**: the four the page has.

The prompt lists these values. Claude also receives them as a JSON schema
(structured outputs), so it cannot answer with anything else. The other
providers are only asked for "JSON only", so the launcher takes the first
`{…}` in their reply. Either way, `ai.validate` checks every value again
(the answer is untrusted input) and drops anything that is not on a list.
The launcher then runs that search on Modrinth itself (`SearchContent`,
cached like the page's).

**2. Pick from the results.** The model gets the top 8 results (id, title,
Modrinth's description, downloads) and returns up to 3 ids, each with a
reason. Ids that are not in those 8 are dropped (`ai.Manager.Pick`), so every
pick is a real Modrinth project. Its name, icon and versions come from
Modrinth. The **reason is the only text the model writes** that the player
sees. It is shown as plain text and cut to 200 characters. The descriptions
it reads are third-party text, so a strange project description could at
worst produce a strange reason, never a fake project. If this step fails
(rate limit, unreadable answer), the chat still shows Modrinth's top 3 with
their descriptions instead of reasons. The "My picks for…" line is a
template filled with the search, not model text.

With an instance in context its version and loader stay **locked**: the
instance's values replace the AI's before the search runs. **Add** is the
page's own Add, with the same compatibility, dependency and incompatibility
checks as always ([10](10-adding-content.md)).

## How it runs

`internal/ai` (Go), bound in `app_ai.go` as `AIStatus`, `SetAI`, `ResetAI`
and `AskAI`; the UI is `components/AIChat.tsx`. Requests go out from Go, so
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
- **Ask** (`AskAI`: read the request, search, pick): the first prompt lists
  the categories and gives seven worked examples, followed by the current
  filters and the message. The model only picks
  **type, categories, sort and keywords**. The loader and Minecraft version
  are read straight from the player's words (exact tokens: "neoforge",
  "1.20.1") or kept from the current filters, and are stripped from the
  keywords.
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
requests/day and 8K tokens/minute. One question takes **two** requests (read,
then pick) and about 2.5–3K tokens, so roughly 500 questions a day and two or
three a minute fit across all players.
After that, players get the "Rate limited" message suggesting their own key.
Moving the key to Groq's paid Developer plan raises the limits without any
change to the launcher.

## History

A first version ran a local model (llama.cpp `llama-server` with
Qwen2.5-1.5B-Instruct, downloaded on first use). It worked offline, but the
~1.1 GB download and ~1.2 GB of RAM while in use were too heavy for a light
launcher, so it was replaced by the hosted providers before release.
