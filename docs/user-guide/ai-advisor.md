# Ask AI

Ask AI is a helper for finding addons. You describe what you want to do, and
it answers with a few real mods, packs or shaders from Modrinth and explains
why each one fits.

![Ask AI](../assets/screenshots/ai.png)

## Where to find it

- The Ask AI button at the top of the Addons page.
- The Ask AI button on an instance's Mods, Datapacks, Resources and Shaders
  tabs. From there it knows the instance: its version and loader are always
  respected, and what you already have is left out.

## How to ask

Say what you are after, not what to search for:

- "My game lags on a weak PC"
- "Mods to play with friends"
- "Something spooky for survival"
- "Shaders that look great but run well"

The answer has:

- one line saying what it understood, and a short summary of the approach;
- the picks, grouped by need (a faster game might become "renderer", "game
  logic" and "memory"), each with a reason written for you;
- buttons to continue ("Add shaders too", "Make it lighter") and, per group,
  See all in Addons to browse every result.

If your request is too vague, it asks a question first. The conversation is
remembered, so "lighter" or "without shaders" refine the last answer.

Add and Details on a pick work exactly like on the Addons page, with the same
compatibility and dependency checks.

## Is it reliable?

The AI never invents an addon. It only chooses from results Modrinth actually
returned, and the names, icons and versions you see come from Modrinth. Only
the explanations are written by the AI.

## Providers and your own key

It works out of the box through Groq, with a key built into the launcher. That
key is shared by every player, so at busy times you may see "Rate limited".

The button in the page header ("Groq (built-in)") opens the settings, where you
can use your own key from Groq, Claude, OpenAI, Gemini or Grok, and choose a
model. Each model is marked "free plan" (a free key from that provider works)
or "paid" (needs credit with the provider). Your key is stored only on your
computer and is never shown again. Use built-in Groq forgets it.

## What is sent

Your message, the conversation so far, the instance's version, loader and the
names of its installed addons, and public information about the Modrinth
results (titles, descriptions, download counts). Nothing else about you or your
computer.
