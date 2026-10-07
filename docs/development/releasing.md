# Releasing

Installers are built by GitHub Actions, never by hand. `.github/workflows/ci.yml`
runs the Go tests and the frontend type check on every push and pull request;
`.github/workflows/release.yml` builds and publishes a release when a tag is
pushed.

## Version numbers

The version lives in three places:

| Where | Format | Why |
|-------|--------|-----|
| `wails.json` `productVersion` | `2.1.0` (numbers only) | The Windows installer passes it to NSIS as `X.Y.Z.0`, which rejects suffixes like `-beta`. |
| `frontend/package.json` `version` | `2.1.0-beta` | The full string the UI shows. |
| The git tag | `v2.1.0-beta` | Starts the release. The workflow stamps it into the binary with `-ldflags "-X main.Version=..."`; that stamped value is what the self-updater compares. |

A build without the stamp (`wails dev`, a local `wails build`) has version `dev`
and never offers updates.

## Steps

1. Bump `wails.json` and `frontend/package.json`.
2. Write the player notes in `docs/releases/<version>.md`: plain language, no
   technical terms. The release job puts them above the download table.
3. Move the changelog's Unreleased section under the new version in
   `CHANGELOG.md`.
4. Commit, tag with a `v` prefix and push the tag:

   ```sh
   git tag -a v2.1.0-beta -m "Udeos Launcher 2.1.0 Beta"
   git push origin main v2.1.0-beta
   ```

A tag containing a hyphen (`-alpha`, `-beta`, `-rc1`) is published as a
pre-release.

## What the pipeline builds

The tag starts one job per OS and a final job that creates the GitHub Release
with every file attached plus `SHA256SUMS.txt`.

| Job | Runner | Produces |
|-----|--------|----------|
| Linux | `ubuntu-latest` inside an `ubuntu:22.04` container, so the binary links against an old glibc and runs on Ubuntu 22.04+, Debian 12+ and Fedora | `.deb` and `.rpm` (nfpm, `build/linux/nfpm.yaml`) and a portable `.tar.gz` |
| Windows | `windows-latest` with NSIS from Chocolatey | `...-windows-amd64-installer.exe` and a portable `.zip` |
| macOS | `macos-latest` | A universal (Intel and Apple Silicon) `.app` in a `.dmg`, ad-hoc signed, not notarized |

The Linux job pins nfpm (`NFPM_VERSION`). Raise it deliberately together with
the Go version in `go.mod`: a newer nfpm can require a newer Go.

Running the workflow by hand from the Actions tab (Run workflow) builds the same
files with version `dev` and keeps them as workflow artifacts without creating a
release. Do that first when changing the pipeline.

## The built-in AI key

The repository is public, so the Groq key that makes Ask AI work out of the box
is not in it. It lives in the GitHub secret `GROQ_API_KEY`. Each build job
scrambles it with `go run ./internal/ai/seal` and stamps the result into the
binary with `-X udeos/launcher/internal/ai.sealed=...`. A fork, or any build
without the secret, has no built-in key and the AI settings ask the player for
one. [AI advisor](../internals/ai-advisor.md) explains the limits of this.

## Code signing

Builds are not code-signed yet. Windows SmartScreen and macOS Gatekeeper show a
warning on first start; the release notes tell players how to get past it.
