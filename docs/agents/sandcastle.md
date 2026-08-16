# Sandcastle local Codex/OpenRouter smoke test

The `sandcastle:watchpoint` image contains the pinned Codex CLI and a minimal
OpenRouter provider configuration. The API key is injected only at runtime;
it is not baked into the image or mounted from the host Codex directory.

Build the image from the repository root:

```sh
docker build -t sandcastle:watchpoint -f .sandcastle/Dockerfile .
```

With `OPENROUTER_API_KEY` set in the host environment, run a low-risk local-only
task against a disposable prompt:

```sh
OPENROUTER_API_KEY="$OPENROUTER_API_KEY" \
  bun run sandcastle --local-only --no-pr --prompt \
  "Inspect the repository and report the package manager; make no file changes."
```

Use `--dry-run` first when checking argument parsing. Without the key, Codex
execution stops with an actionable `OPENROUTER_API_KEY` error. OpenRouter or
Codex failures are returned as non-zero agent failures; Sandcastle does not
fall back to another provider.

Antigravity remains available with `--agent agy`; its existing `~/.gemini` and
`agy` mounts are independent of Codex's runtime configuration.
