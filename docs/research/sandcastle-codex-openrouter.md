# Sandcastle with Codex and OpenRouter Free

**Date:** 2026-08-16  
**Status:** Investigated; implementation not yet applied

## Conclusion

The Sandcastle setup can support Antigravity and Codex side by side, with Codex routed through OpenRouter. The cleanest design is to keep `agy` as the existing provider and add an OpenRouter-backed Codex mode selected with the existing `--agent codex` flag and a model such as `openrouter/free`.

This is not currently end-to-end ready in the repository. The CLI already accepts `codex`, but the Docker path does not provide the Codex executable, Codex configuration, or `OPENROUTER_API_KEY` to the container.

## Evidence from the repository

- `.sandcastle/types.ts` and `.sandcastle/cli-args.ts` already define `codex` as a valid agent.
- `.sandcastle/agent-providers.ts` delegates Codex to Sandcastle's built-in `codex()` provider.
- `.sandcastle/workflow/agent-runner.ts` invokes `codex exec <prompt>` and adds `--model` plus `--dangerously-bypass-approvals-and-sandbox` when requested.
- `.sandcastle/auth-mounts.ts` forwards `OPENAI_API_KEY`, but not `OPENROUTER_API_KEY`, and mounts `~/.gemini` plus the Antigravity binary only.
- `.sandcastle/Dockerfile` installs Bun and `gh`, but does not install Codex or create/mount `/home/agent/.codex`.
- The main orchestration path uses the Docker sandbox with a hard-coded `sandcastle:local` image; the pick/watch path uses `DefaultAgentRunner`. Both paths therefore need to be verified or updated together.
- The host currently has Codex CLI `0.147.0`, but mounting the host symlink alone would not be sufficient because it points into the host's global Node package tree. Installing Codex in the image is safer and reproducible.

## Provider configuration

OpenRouter's Codex integration documentation specifies a Codex provider block with `base_url = "https://openrouter.ai/api/v1"` and authentication from `OPENROUTER_API_KEY`. It recommends command-based auth so Codex can refresh the model catalog; a plain `env_key` also authenticates but may show fallback metadata for non-OpenAI models. See [OpenRouter's Codex CLI integration](https://openrouter.ai/docs/cookbook/coding-agents/codex-cli).

The intended container-side configuration is:

```toml
model_provider = "openrouter"
model = "openrouter/free"

[model_providers.openrouter]
name = "openrouter"
base_url = "https://openrouter.ai/api/v1"

[model_providers.openrouter.auth]
command = "sh"
args = ["-c", "echo $OPENROUTER_API_KEY"]
```

OpenRouter documents `openrouter/free` as a router that selects a compatible free model and notes that availability, rate limits, latency, and the selected model can change. A specific `:free` model variant is preferable when reproducibility matters. See [OpenRouter's Free Models Router](https://openrouter.ai/docs/guides/routing/routers/free-router) and [free model variants](https://openrouter.ai/docs/guides/routing/model-variants/free).

## Recommended implementation

1. Add `OPENROUTER_API_KEY` to the forwarded environment allowlist and `.sandcastle/.env.example`.
2. Add a narrow Codex configuration mount or generated config. Do not mount the entire host `~/.codex` by default because it contains sessions, history, databases, and potentially unrelated credentials. A generated `/home/agent/.codex/config.toml` containing only the OpenRouter provider is safer.
3. Install a pinned `@openai/codex` CLI version in `.sandcastle/Dockerfile`, or make the image build accept an explicit version. Do not mount the host's `codex` symlink without its target package tree.
4. Ensure both execution paths use the same Codex configuration: the main `@ai-hero/sandcastle` provider path and `DefaultAgentRunner` used by `pick`/`watch`.
5. Add a provider-specific model default only for Codex/OpenRouter, for example `openrouter/free`; preserve the existing Antigravity default and invocation unchanged.
6. Add tests for forwarded key names, generated Codex config, command construction, and the CLI help/parse path. Then build the image and run a low-risk `--dry-run` followed by a local-only task.

## Important trade-offs

- `openrouter/free` is useful for low-volume experiments, but random model selection and free-tier limits make it a poor default for unattended production queue processing.
- Codex's own command execution remains inside the Docker container; OpenRouter only supplies model inference. The container still needs network access to reach OpenRouter.
- The OpenRouter key must be available to the host process and injected into the container at runtime. It should not be committed to `.sandcastle/.env.example`, Docker layers, logs, or generated config files.
- Antigravity's host credential mount should remain separate. The two providers have different authentication and session stores.

## Verification result

The installed Codex CLI accepts the required headless form:

```text
codex exec [OPTIONS] [PROMPT]
```

It also accepts `--model` and `--dangerously-bypass-approvals-and-sandbox`, matching the current runner's command shape. This confirms that the integration is technically feasible; the repository changes above are the missing wiring.

## Sources

- [OpenRouter: Codex CLI integration](https://openrouter.ai/docs/cookbook/coding-agents/codex-cli)
- [OpenRouter: Free Models Router](https://openrouter.ai/docs/guides/routing/routers/free-router)
- [OpenRouter: Free model variant](https://openrouter.ai/docs/guides/routing/model-variants/free)
- [OpenAI Docs: Codex model guidance](https://developers.openai.com/api/docs/guides/latest-model)
