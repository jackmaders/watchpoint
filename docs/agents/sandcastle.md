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

The `pick` and `watch` commands resolve the same provider, model, credentials,
Docker image, and Codex configuration as ad-hoc runs. Codex is the default and
uses `openrouter/free`; pass `--model provider/model` to pin a route, or use
`--agent agy` for the Antigravity escape hatch. The free router is dynamic and
may vary its selected model, availability, latency, and rate limits, so it is
intended for low-volume experimentation rather than reproducible unattended
production work.

Retries reuse the selected runner and configuration. A failed Codex/OpenRouter
run never silently falls back to another provider or model. Queue output
includes the routed model when the provider exposes it, but absent metadata is
not an execution failure.

Environment setup:

```sh
export OPENROUTER_API_KEY="..."
```

See `.sandcastle/.env.example` for the complete forwarded environment list.
