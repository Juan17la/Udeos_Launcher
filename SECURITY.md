# Security policy

## Supported versions

Only the newest release receives fixes. The launcher updates itself, so please
update before reporting.

## Reporting a vulnerability

Please do not open a public issue. Use GitHub's private
[security advisory form](https://github.com/Juan17la/Udeos_Launcher/security/advisories/new)
and include the version, your system, the steps to reproduce and what an
attacker could achieve. You will get an answer as soon as possible, and credit
in the release notes if you want it.

## What is in scope

Things that matter most for a launcher:

- downloaded files being installed without hash verification;
- a modpack, world or join file writing outside its target folder;
- Modrinth page content (descriptions are Markdown with HTML) reaching the
  Wails bindings;
- an AI provider key leaking from `ai.json`, logs or error messages;
- the local skin server (`127.0.0.1:25585`) being reachable from other
  machines;
- the server relay or UPnP code exposing more than the chosen server port.

Known and accepted:

- The built-in Groq key is scrambled, not encrypted. Someone with a debugger can
  recover it; it only grants access to a free, rate-limited account.
- The skin signing key in `internal/skin/key.pem` is public on purpose. It only
  vouches that a skin belongs to an offline name, which offline mode lets anyone
  claim anyway. See [Skins](docs/internals/skins.md).
