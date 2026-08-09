# Upstream

The skills in this directory are vendored, not installed at job time — CI must not
depend on the `claude-plugins-official` marketplace being reachable, and a pinned copy is
the only reproducible option (spec §5.2).

- **Source**: [`mattpocock/skills`](https://github.com/mattpocock/skills), distributed as
  the `mattpocock-skills` plugin on the `claude-plugins-official` marketplace.
- **Plugin version pinned**: `1.2.3`
- **Upstream commit SHA**: `84fdeffd12f2ee307994d1eb6feb48173b6e0502`

## Vendored skills

Only the skills this pipeline's stages actually invoke — not the full plugin:

| Skill | Upstream path |
| :--- | :--- |
| `grilling` | `skills/productivity/grilling` |
| `domain-modeling` | `skills/engineering/domain-modeling` |
| `to-spec` | `skills/engineering/to-spec` |
| `to-tickets` | `skills/engineering/to-tickets` |
| `implement` | `skills/engineering/implement` |
| `tdd` | `skills/engineering/tdd` |
| `code-review` | `skills/engineering/code-review` |
| `research` | `skills/engineering/research` |
| `codebase-design` | `skills/engineering/codebase-design` |

`wayfinder` will be added with Ticket 13 (spec §5.2) — do not add it speculatively ahead
of that ticket.

## Gemini CLI workspace trust

The Gemini CLI gates project-level skill discovery behind a workspace-trust check. An
untrusted folder silently skips loading `.agents/skills/` entirely — `gemini skills list`
reports "Skipping project agents due to untrusted folder" and falls back to global skills
only, with no error. Locally, trust the folder once via the Gemini CLI's own trust flow
(recorded in `~/.gemini/trustedFolders.json`, which is machine-local and never committed).

**CI runners are ephemeral and start untrusted every run.** Any workflow that shells out to
`gemini` (ticket #51 onward) must trust the checkout as a setup step before the first
`gemini` invocation, or every run will silently fall back to global-only skills and never
see the vendored copies here. Verify this explicitly when the first `agent-*.yml` workflow
is written — it will not fail loudly, it will just use the wrong skill.

## Upgrading

Upgrading is a reviewable commit, not a background sync:

1. Check out the new upstream tag/commit of `mattpocock/skills` (or bump the
   `mattpocock-skills` plugin locally and read its cache directory).
2. Diff each vendored skill directory against the new upstream copy.
3. Copy over the skills listed above, and update the SHA and plugin version recorded in
   this file, in the same commit as the diff.
4. Re-verify `.claude/skills` still resolves to this directory (see the repo root
   `AGENTS.md` → `## Agent skills` for the resolution / drift-check contract).
