# Aligning Watchpoint's AI SDLC to Matt Pocock's Skills

A review of the current agent workflows, a reference for how the `mattpocock-skills`
plugin is intended to be used, a proposed automated pipeline built on top of it, a
comparison against Sandcastle, and a migration recommendation.

**Sources reviewed**

| Source | Location |
| :--- | :--- |
| Current agent workflows | `.github/workflows/agent-{planner,itemizer,developer,reviewer}.yml` |
| Current agent runners | `scripts/agent-{planner,itemizer,developer,reviewer,shared}.ts` |
| Current custom skills | `.github/skills/{grill-me,to-spec,to-tickets,agent-developer,agent-reviewer}.md` |
| Current docs | `docs/ai-sdlc-lifecycle.md`, `AGENTS.md`, `docs/architecture/` |
| Plugin | `mattpocock-skills@claude-plugins-official` v1.2.3 (25 skills + `docs/engineering`, `docs/productivity`) |
| Sandcastle | `mattpocock/sandcastle` @ `e99f832` — `README.md`, `.sandcastle/`, `.github/workflows/agent-*.yml` |

---

# Part 1 — How the mattpocock skills are intended to be used

## 1.1 The design philosophy

The README states the position directly: GSD, BMAD and Spec-Kit "own the process… and
make bugs in the process hard to resolve." These skills are deliberately the opposite —
**small, adaptable, composable, model-agnostic**. There is no runtime, no state machine,
no orchestrator. Each skill is a markdown file that gets loaded into a session; the
composition happens because *you* type the next slash command, or because a skill's
prose tells the agent to invoke another skill.

Two consequences matter enormously for automation:

1. **Most of the pipeline skills are `disable-model-invocation: true`.** `wayfinder`,
   `to-spec`, `to-tickets`, `implement`, `triage`, `grill-me`,
   `setup-matt-pocock-skills` and `improve-codebase-architecture` can only be reached by
   a human typing them. The docs are explicit: *"Wherever `ask-matt` or `to-tickets`
   says 'then `/implement` per ticket', that is an instruction to you, not something the
   agent will do unprompted."* Any automation must supply that typing.
2. **Only `grilling`, `tdd`, `code-review`, `domain-modeling`, `codebase-design`,
   `research`, `prototype`, `diagnosing-bugs`, `resolving-merge-conflicts`, `wizard` and
   `writing-for-agents` are model-invocable.** These are the ones another skill (or an
   automated prompt) can reach for on its own.

## 1.2 The canonical chain

```
grill-with-docs  →  to-spec  →  to-tickets  →  implement  →  code-review
                                                   │
                                                   └── drives /tdd at pre-agreed seams
```

`wayfinder` sits *above* this chain, not inside it. When an idea is too big for one
session, `wayfinder` charts a map of **decision tickets**, resolves them one per
session, and when the map clears you feed **the map issue** into `/to-spec` — not the
individual decision tickets, and never straight into `/implement`.

```
wayfinder (map cleared)  →  to-spec #<map_issue>  →  to-tickets  →  implement  →  code-review
```

The routing rules, from the skills' own docs:

| What you have | What to run |
| :--- | :--- |
| A loose idea, effort spans many sessions, route unclear | `/wayfinder` |
| A well-scoped feature settleable in one sitting | `/grill-with-docs` (or `/grill-me` with no codebase) |
| A settled conversation, work spans several sessions | `/to-spec`, then `/to-tickets` |
| A settled conversation, work fits one context window | `/implement` directly — **skip the spec and tickets** |
| A ticket on the tracker | `/implement #42`, one ticket per session, clear context between |
| A diff you want checked | `/code-review <fixed-point>` |
| Issues that arrived from *other people* | `/triage` |

Note the negative rule that catches most people: `to-tickets` output is agent-ready by
construction, so **never run `/triage` over your own tickets**. `triage` is only for
incoming work.

## 1.3 Skill-by-skill reference

### Planning skills

**`/wayfinder`** — charts a **map** (one issue labelled `wayfinder:map`) whose **child
issues** are decision tickets. Two invocation modes:

- *Chart the map*: `/grilling` + `/domain-modeling` to name the **destination**; grill
  again breadth-first to map the frontier; create the map issue; create the tickets you
  can specify *now* as sub-issues; wire blocking edges in a **second pass** (issues need
  ids before they can reference each other); fire `/research` subagents for research
  tickets; **stop**.
- *Work through the map*: load the map (low-res only), pick the first **frontier**
  ticket (open + unblocked + unassigned), **claim it by assigning yourself before any
  work**, resolve it, post a resolution comment, close it, append a one-line context
  pointer to the map's *Decisions so far*, then graduate any newly-specifiable fog into
  fresh tickets.

Hard constraints: **never resolve more than one ticket per session** (research
excepted); the map is an **index, not a store** (a decision lives in exactly one place —
its ticket); refer to maps and tickets **by title, never by bare number**.

Ticket types, each with an execution posture:

| Type | Posture | Resolved by |
| :--- | :--- | :--- |
| `wayfinder:research` | **AFK** | a `/research` subagent |
| `wayfinder:prototype` | **HITL** | `/prototype`, links the artifact |
| `wayfinder:grilling` | **HITL** | `/grilling` + `/domain-modeling` — the default case |
| `wayfinder:task` | HITL or AFK | manual work that unblocks a decision |

"HITL" is load-bearing: *"the agent never stands in for the human's side of it (a
grilling agent that answers its own questions has broken this)."*

**`/grilling`** — the interview loop. Maps the subject as a **design tree**; works it in
**rounds**; each round asks the whole **frontier** (every decision whose prerequisites
are settled) in one go, numbered, each with a recommended answer:

```
❓ **Q1** - **<title>**: <body, tradeoffs, options>

➡️ <recommended answer>
```

Then it **waits**. Facts are the agent's job (dispatch a subagent); **decisions are the
user's**. Session ends when the frontier is empty. `/grill-me` is a thin
user-invocable wrapper; `/grill-with-docs` is the same session plus inline `CONTEXT.md`
and ADR updates.

**`/to-spec`** — *no interview*. Synthesises the conversation into a spec and publishes
it as one issue with the `ready-for-agent` label. Before writing prose it sketches the
**seams** the feature will be tested at and checks them with you — existing seams
preferred, highest seam possible, ideally one across the change. Those agreed seams then
travel: `/tdd` only writes tests at pre-agreed seams, and `/code-review`'s Spec axis
flags seams nobody agreed to. Template sections: Problem Statement, Solution, User
Stories (extensive), Implementation Decisions, Testing Decisions, Out of Scope, Further
Notes. **No file paths, no code snippets** — they go stale.

**`/to-tickets`** — breaks a spec/plan/conversation into **tracer-bullet** tickets, each
declaring its **blocking edges**.

- Each slice cuts a narrow but *complete* path through every layer (schema → API → UI →
  tests). Vertical, never horizontal.
- A completed slice is demoable on its own.
- Each is sized to one fresh context window.
- Prefactoring first: "make the change easy, then make the easy change."
- **Wide refactors are the documented exception** → expand / migrate-in-batches /
  contract, each batch its own ticket blocked by the expand.
- **Step 4 is a mandatory quiz**: present the numbered breakdown, ask about granularity
  and blocking edges, *iterate until the user approves*. Nothing reaches the tracker
  before that.
- Publish in dependency order (blockers first) so edges can reference real ids; use the
  tracker's **native** blocking/sub-issue relationship; label `ready-for-agent`.
- **Do NOT close or modify the parent issue.**

### Execution skills

**`/implement`** — implement the spec/ticket; create or verify the dedicated branch
before editing; use `/tdd` at pre-agreed seams; typecheck often, single test files often,
full suite once at the end; run `/code-review`; commit each GREEN checkpoint and push
immediately after every commit. It does not open a PR, does not close the ticket, does not
tick acceptance criteria, and does not act on the review's findings. One invocation = one
ticket; parallel runs in one checkout are documented as actively harmful.

**`/tdd`** — red-green-refactor, one vertical slice at a time. Refuses to write a test
at an unconfirmed seam.

**`/code-review`** — reviews `git diff <fixed-point>...HEAD` along two axes in
**parallel sub-agents** that never see each other's reasoning:

- **Standards** — the repo's documented standards (`CODING_STANDARDS.md`,
  `CONTRIBUTING.md`, …) *plus* a built-in **Fowler smell baseline** (12 smells:
  Mysterious Name, Duplicated Code, Feature Envy, Data Clumps, Primitive Obsession,
  Repeated Switches, Shotgun Surgery, Divergent Change, Speculative Generality, Message
  Chains, Middle Man, Refused Bequest). The repo overrides the baseline; baseline hits
  are always judgement calls; skip anything tooling enforces.
- **Spec** — missing/partial requirements, scope creep, wrong implementations, each
  quoting the spec line. Spec source resolution order: issue refs in commit messages →
  a path you pass → a spec file under `docs/`/`specs/`/`.scratch/` → ask.

Findings are reported side by side and **never merged or re-ranked** — a worst issue per
axis, no single winner. It requires an explicit fixed point and fails fast if the ref
doesn't resolve or the diff is empty.

### Supporting skills

`/triage` (incoming issues only, state machine over canonical roles), `/research`
(background agent, cited markdown file), `/domain-modeling` (`CONTEXT.md` + ADRs),
`/codebase-design` (deep-module vocabulary), `/prototype`, `/diagnosing-bugs`,
`/resolving-merge-conflicts`, `/wizard`, `/writing-for-agents`, `/ask-matt` (router),
`/handoff`, `/teach`, `/to-questionnaire`, `/wait-what`,
`/improve-codebase-architecture`.

## 1.4 The setup contract — `/setup-matt-pocock-skills`

**This is the prerequisite for everything.** `to-spec`, `to-tickets`, `wayfinder`,
`triage` and `code-review` all carry the line *"the issue tracker should have been
provided to you — run `/setup-matt-pocock-skills` if not."* It is a one-time,
prompt-driven, interactive skill that writes:

| File | Contents |
| :--- | :--- |
| `docs/agents/issue-tracker.md` | Where issues live and the exact CLI commands to use |
| `docs/agents/triage-labels.md` | Canonical role → real label-string mapping (only if `triage` is installed) |
| `docs/agents/domain.md` | `CONTEXT.md` + ADR layout and consumer rules |
| `CLAUDE.md` (or `AGENTS.md`) | An `## Agent skills` block pointing at the three files above |

Selection rule: **if `CLAUDE.md` exists, edit it; else `AGENTS.md`; never create one when
the other exists.** Watchpoint has both, so `CLAUDE.md` wins — but Watchpoint's
`CLAUDE.md` is a single `@AGENTS.md` include, so in practice the block should be placed
where it will actually be read.

## 1.5 How GitHub Issues is the substrate

`skills/engineering/setup-matt-pocock-skills/issue-tracker-github.md` is the seed
template that becomes `docs/agents/issue-tracker.md`. It is the whole GitHub contract:

- **All operations go through `gh`.** `gh issue create/view/list/comment/edit/close`,
  with `--json`/`--jq` shapes given verbatim.
- **"Publish to the issue tracker" means: create a GitHub issue.**
- **"Fetch the relevant ticket" means: `gh issue view <n> --comments`.**
- **PRs as a request surface** — an explicit flag, defaulted **off**. Only `triage`
  reads it.
- **Wayfinding operations:**
  - Map = one issue labelled `wayfinder:map`.
  - Child ticket = a **native GitHub sub-issue** (`gh api` on the sub-issues endpoint),
    falling back to a task list + `Part of #<map>` where sub-issues are unavailable.
  - Blocking = **GitHub's native issue dependencies**:
    `gh api --method POST repos/<o>/<r>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-db-id>`
    where the id is the numeric **database id** (`gh api repos/<o>/<r>/issues/<n> --jq .id`),
    **not** the `#number` and **not** the `node_id`. This is the single most-missed
    detail in the whole system.
  - **Frontier query** = the map's open children, minus any with
    `issue_dependencies_summary.blocked_by > 0`, minus any with an assignee; first in map
    order wins.
  - **Claim** = `gh issue edit <n> --add-assignee @me`, as the session's *first write*.
  - **Resolve** = comment the answer → close → append a context pointer to the map.

### Canonical triage labels

Five state roles + two category roles, label strings equal to the role names by default:

`needs-triage` · `needs-info` · `ready-for-agent` · `ready-for-human` · `wontfix`
and `bug` · `enhancement`.

Every triaged issue carries exactly one category and one state role.

## 1.6 The three HITL gates — and why they are not bugs

This is the thing to understand before designing any automation:

| Gate | Skill | What it waits for |
| :--- | :--- | :--- |
| 1 | `/grilling` | The user's **decisions**, round by round. Facts are the agent's job; decisions never are. |
| 2 | `/to-spec` | Confirmation that the **seams** match expectations, before prose is written. |
| 3 | `/to-tickets` | Approval of the **breakdown quiz** — granularity, blocking edges, merges/splits. |

Wayfinder reinforces this by classifying grilling and prototype tickets as HITL and
stating outright that an agent answering its own grilling questions has broken the skill.

An "autonomous" pipeline that removes these gates isn't running the skills — it's running
a fork of them with their central mechanism deleted. The design in Part 3 keeps all three
gates but makes them **asynchronous** (a comment on an issue rather than a live terminal
session), which is the change that makes them compatible with GitHub Actions.

## 1.7 Known gaps that matter for automation

Documented in the plugin's own `docs/engineering/*.md`:

| Gap | Impact on automation |
| :--- | :--- |
| `to-tickets` frequently fails to create real GitHub sub-issues (`mattpocock/skills#554`) and writes "Blocked by" as body text instead of a native dependency (`#513`) | **The wiring must be done deterministically in code, not left to the model.** This is exactly what `scripts/agent-itemizer.ts` already does well. |
| `implement` never closes the ticket or ticks acceptance criteria | The frontier never visibly advances. Automation must close it. |
| `implement` runs `code-review` *before* committing, so the diff is often empty | Run `code-review` as a **separate** job against a fixed point, on a pushed branch. |
| An agent reviewing code it just wrote is biased toward its own solution | Reinforces splitting review into its own job/session. |
| `to-spec` labels the parent spec `ready-for-agent`, so AFK pollers try to build the whole spec in one run | **Strip `ready-for-agent` from the spec issue once `/to-tickets` has run**, or exclude parents explicitly. |
| `/implement #2` resolves `#2` against any numbered list it can see | Always pass `owner/repo#N` or a full URL. |
| `to-spec`'s user-story template fits features badly for refactors/architecture | Lean on Implementation/Testing Decisions; put durable calls in ADRs. |

---

# Part 2 — Review of the current Watchpoint system

## 2.1 What it actually is

Four GitHub Actions workflows, each running a Bun script that makes **one** Google Gemini
`generateContent` call (`gemini-3.6-flash`, `thinkingBudget: 2048`) with a
`.github/skills/*.md` file passed as `systemInstruction`, then writes the text back to
GitHub via Octokit.

The model has **no tools**. It cannot read files, run commands, edit code, or call the
GitHub API. Everything it "does" is text that a script then interprets.

## 2.2 Findings, most severe first

### 🔴 F1 — The Developer agent does not write any code

`scripts/agent-developer.ts:178-236` is the whole run. It fetches the issue, computes
`branchName` via `sanitizeBranchName()`, transitions labels, sends one Gemini call, and
posts the response as a comment. `branchName` is **only ever interpolated into that
comment string** (`agent-developer.ts:165`). There is no `git checkout -b`, no `git
commit`, no `git push`, no `gh pr create`.

The workflow requests `contents: write` and `pull-requests: write`
(`agent-developer.yml:11-14`) and never exercises either. `docs/ai-sdlc-lifecycle.md:23`
documents `K["Pull Request Created"]` as a pipeline stage; it does not exist.

Corollary: `extractAndSaveDesignMockup()` writes `docs/designs/<slice>/layout.html` into
the runner's ephemeral checkout (`agent-developer.ts:100-110`) and nothing ever commits
it. The Stitch workflow in `docs/ai-sdlc-lifecycle.md:102-116` describes a file that is
deleted when the job ends. The developer skill's instruction *"Ensure this layout file is
committed to git on your implementation branch"* (`agent-developer.md:174`) is addressed
to a model that cannot run git.

### 🔴 F2 — The Reviewer's documented state machine is not implemented

`.github/skills/agent-reviewer.md:101-142` specifies `review-round-1`, `review-round-2`,
`changes-requested`, `approved`, `ready-to-merge`. Grepping the codebase, **those four
strings appear nowhere outside that prompt file.** `agent-shared.ts` defines only
`APPROVED_LABEL` and `NEEDS_HUMAN_REVIEW_LABEL`, and `postPRReviewAndLabels()` applies
only those two.

Because the labels are never written, `determineReviewRound()`
(`agent-reviewer.ts:44-64`) returns `"round-1"` on every run unless `needs-human-review`
is already present. **The "2-round cap" is not a cap.** A PR can receive unbounded
round-1 reviews; escalation only ever happens via the model spontaneously returning
`decision: "ESCALATE"`.

### 🔴 F3 — The Reviewer sees a truncated diff

`agent-reviewer.ts:75-79` calls `octokit.rest.pulls.listFiles` **unpaginated** — default
`per_page` is 30. Comments *are* paginated two lines later
(`octokit.paginate(octokit.rest.issues.listComments, …)`), so this is an oversight rather
than a choice. Any PR touching >30 files is reviewed against a silent subset. GitHub also
omits `patch` for large files, so those arrive as filename-only.

The reviewer skill's headline rule is *"Cross-Reference Call Sites: for EVERY function
modified in the PR, trace every invocation site across the diff **and codebase**"*
(`agent-reviewer.md:45-46`). The model receives a truncated diff and zero codebase
access. That instruction is unsatisfiable.

### 🟠 F4 — Skill files are prompts wearing skill costumes

Every `.github/skills/*.md` has Claude Code skill frontmatter (`name:`, `description:`)
but lives outside `.claude/skills/` and is only ever `readFile`d into a Gemini
`systemInstruction`. Instructions written for an agentic runtime — *"run `bun run
validate`"*, *"`gh pr create --template …`"*, *"apply labels: `review-round-1`"* — are
inert.

### 🟠 F5 — Custom skills are drifted forks of the plugin's

`to-spec.md`, `to-tickets.md` and `grill-me.md` are recognisably Matt's, with a **Your
Target Stack** block bolted on. That stack block is duplicated verbatim in three files
and is exactly the content that belongs in `AGENTS.md` / `CONTEXT.md`, where every skill
reads it once.

`to-tickets.md` also diverges on substance: it mandates `targetFiles` (*"e.g.
`["src/_pages/auth/ui/LoginForm.tsx"]`"*) and `implementationSteps`. The upstream skill
explicitly forbids this — *"avoid specific file paths or code snippets — they go stale
fast."* You should make this call deliberately (see §5.4), not inherit it by accident.

`agent-reviewer.md` §4 re-derives a 7-item Fowler smell list; the plugin's `code-review`
ships a 12-item baseline with fix guidance and override rules.

### 🟠 F6 — Trigger conditions are broad and partly redundant

- `agent-developer.yml:20` fires on **any** `issues: assigned` event, regardless of
  label — assigning a human to a spec issue starts the developer agent.
- `agent-developer.yml:21` fires on any comment containing `/dev` — including the
  substring inside `/develop`, `/devops`, or a code block.
- Each workflow's `if:` re-checks labels, then the script re-checks them again with
  different logic (`isDeveloperTrigger`, `determineSkillPath`, `isReviewerTrigger`). Two
  sources of truth.
- `agent-itemizer.yml:3-4` fires on `edited` for any `spec-ready` issue — and the planner
  *edits the issue body* when publishing a spec, so spec publication races into
  itemization. `concurrency` groups are per-workflow, so they don't serialise this.

### 🟡 F7 — Bot-comment detection is inconsistent

`fetchIssueContext()` filters comments by `user?.type === "Bot" || body.includes(BOT_COMMENT_MARKER)`
(`agent-shared.ts:114-115`), but `executeGrilling()` (`agent-planner.ts:129-142`) posts
grilling rounds **without** the marker. It works today only because `GITHUB_TOKEN`
comments are attributed to `github-actions[bot]`. Move to a PAT (which you need — see
§3.7) and every prior grilling round starts feeding back in as user input.

### 🟡 F8 — No setup contract, no CONTEXT.md

There is no `docs/agents/issue-tracker.md`, no `docs/agents/triage-labels.md`, no
`docs/agents/domain.md`, and no root `CONTEXT.md`. ADRs live at `docs/architecture/adr/`
and the glossary at `docs/architecture/glossary.md` — neither is where the skills look.
`/setup-matt-pocock-skills` has not been run.

### 🟡 F9 — The plugin is not reproducible

`.claude/` is untracked (and not gitignored). There is no committed
`.claude/settings.json` pinning `mattpocock-skills@claude-plugins-official`, so nothing
guarantees a CI runner gets the same skills you have locally.

### 🟢 F10 — What is genuinely good and should survive

- **`scripts/agent-itemizer.ts` is the best asset in the repo.** Zod-validated ticket
  schema, `topologicalSortTickets()`, milestone create-or-reuse, GraphQL `addSubIssue`
  and `addBlockedBy` wiring, idempotency via `<!-- spec-ticket-key: … -->` markers. It
  solves precisely the failure the plugin's own docs flag as unfixed (`skills#554`,
  `#513`).
- **The label state machine concept** (6 labels, one owner each) is sound.
- **`transitionState()`** — a clean, idempotent add/remove primitive.
- **`bun run validate`** as a single non-negotiable gate.
- **The test discipline** — `*.spec.ts` in `__tests__`, AAA enforced by a Grit plugin,
  100% coverage, <50ms per block, no console output. This is exactly the kind of
  documented standard `/code-review`'s Standards axis is designed to consume.

---

# Part 3 — The recommended automated pipeline

## 3.1 Design principles

1. **Skills are the prompt; Actions are the state machine.** Never ask the model to
   apply a label, wire a dependency, or open a PR. The model produces text/commits/JSON;
   the workflow performs every GitHub mutation. (This is precisely how Sandcastle's own
   repo works — see Part 4.)
2. **One action label = one workflow = one skill invocation.** Labels are the API.
3. **Action labels are work orders, consumed on trigger.** The first step of every
   workflow removes the label that fired it and applies `agent:in-progress`. Re-adding
   the label is the retry mechanism. On failure: `agent:blocked` + a comment with the
   reason and the run URL. `always()`: remove `agent:in-progress`.
4. **The three HITL gates stay, asynchronously.** The agent posts a round and applies
   `needs-info`; the human answers in a comment; the comment re-fires the agent. The
   loop is autonomous *between* human turns, not through them.
5. **Merging is human, always.** No workflow calls `gh pr merge`. Agents take a PR to
   `review:approved` and stop. This is a deliberate fourth gate on top of the plugin's
   three, and it is the one that guarantees nothing reaches `main` unread.
6. **Determinism where the model is weak.** Sub-issue and `blocked_by` wiring, frontier
   queries, label transitions, PR creation — all code.
7. **Real skills, really loaded.** Run an agentic CLI with the skills vendored into the
   repo, so `wayfinder` means `wayfinder`. Both `claude` and `gemini` read the same
   `SKILL.md` files, which is what makes cost-based routing possible at all.

## 3.2 Harness decision

The root cause of F1–F4 is not "Gemini" — it is **a model with no tools**. A
`generateContent` call cannot run a skill that says "explore the repo", "run
`/tdd`", "commit your work". The fix is to run an **agentic CLI**, and both
vendors ship one.

| Option | Verdict |
| :--- | :--- |
| Keep `@google/genai` + `generateContent` | **No.** Tool-less. Every finding in Part 2 traces back here. |
| Sandcastle + `noSandbox()` | **No — for GitHub-hosted runs.** Its unique value is sandbox isolation, worktrees and branch-merge-back parallelism, all of which a GH runner already provides. The two features you *do* want from it (iteration loop, structured output) are ~150 lines. Revisit if the pipeline ever moves to a self-hosted runner, where those features become the whole point. |
| `anthropic/claude-code-action@v1` | Viable, but Claude-only — it can't carry the Gemini stages. |
| **Two CLIs behind one thin runner module** | **Recommended.** `claude` and `gemini` are both installed in the workflow; one internal `runAgent()` abstracts the difference. |

### Both CLIs run the same skills

The decisive fact: **Gemini CLI implements the [agentskills.io](https://agentskills.io)
open standard** — the same `SKILL.md` format the plugin ships. It discovers skills from
`.agents/skills/` (workspace, version-controlled) and `~/.agents/skills/` (user), injects
name + description into the system prompt, and loads the body on demand via an
`activate_skill` tool.

So the mattpocock skills are **not Claude-only**, and the pipeline is not locked to one
vendor.

**Vendor the skills into `.agents/skills/` and commit them.** Pin a plugin SHA and copy
the skill directories in, rather than installing over the network at job time — CI should
not depend on a marketplace being reachable, and a pinned copy is the only way a run is
reproducible. Point Claude Code at the same directory (symlink `.claude/skills` →
`.agents/skills`; verify this on your Claude Code version before relying on it).

Two behavioural differences to design around:

- **`disable-model-invocation: true` is a Claude Code field.** Gemini activates skills by
  description match, so the user-invoked-only skills become model-reachable. For an
  automated pipeline that's fine — but **name the skill explicitly in every prompt**
  rather than trusting description matching to fire the right one.
- **Skill activation asks for consent.** Headless runs need `--approval-mode yolo`.

### The runner module

`scripts/agents/run-agent.ts` — roughly 200 lines, and the only place a model is invoked:

```ts
runAgent({
  cli: "gemini" | "claude",
  model: string,
  promptFile: string,
  promptArgs: Record<string, string>,   // {{KEY}} substitution
  completionSignal?: string,            // default "<promise>COMPLETE</promise>"
  output?: { tag: string; schema: ZodTypeAny; maxRetries?: number },
}): Promise<{ text: string; output?: T; sessionId?: string; commits: number }>
```

It spawns the CLI with the prompt on **stdin** (both accept `-p -` / `-p` with piped
stdin, avoiding the 128 KB argv limit), parses the JSONL stream, stops on the completion
signal, extracts and Zod-validates the tagged payload, and writes `failure_reason.txt` to
`$OUTPUT_DIR` on any failure.

| | Claude Code | Gemini CLI |
| :--- | :--- | :--- |
| Invocation | `claude --print --verbose --output-format stream-json --model <m> --dangerously-skip-permissions -p -` | `gemini --approval-mode yolo --output-format stream-json -m <m> -p -` |
| Session id | `system`/`init` → `session_id` | `init` |
| Assistant text | `assistant` → content blocks | `message` |
| Tool call | `tool_use` block | `tool_use` |
| Final | `result` | `result` |
| Resume | `--resume <id>` | `--resume <id>` / `-r` |
| Exit codes | standard | `0` ok · `1` error/API failure · `42` bad input · `53` turn limit |

That table *is* the abstraction — you are building a two-provider version of Sandcastle's
`AgentProvider`. That is the right trade at this scale, and it keeps the door open: if you
later move to a self-hosted runner, Sandcastle's `AgentProvider` interface is publicly
exported and a `geminiCli()` provider is ~50 lines, so the migration is small.

### Secrets

| Secret | Used by | Notes |
| :--- | :--- | :--- |
| `GEMINI_API_KEY` | Gemini stages | AI Studio key. **Headless mode cannot use the Google-account OAuth tier** — see the quota table below. |
| `CLAUDE_CODE_OAUTH_TOKEN` | Claude stages | `claude setup-token` on your machine. `ANTHROPIC_API_KEY` also works. |
| `AGENT_PAT` | Every stage that chains | Fine-grained PAT — see §3.7 (chaining). |

## 3.3 Model routing and the quota that shapes it

The goal is to spend Gemini's free tier on async work and reserve Claude for the stages
where quality compounds. The binding constraint is sharper than it first looks.

### The quota

Gemini CLI's headless mode uses a cached credential if one exists, and otherwise
**requires `GEMINI_API_KEY` or Vertex AI**. A GitHub-hosted runner has no cached
credential, so the generous tier is unreachable there:

| Auth method | Requests / user / day | Models | Usable in GH-hosted CI |
| :--- | :--- | :--- | :--- |
| Google account (Code Assist individual) | 1,000 | Full Gemini family | ❌ browser OAuth |
| Google AI Pro / Ultra | 1,500 / 2,000 | Full family | ❌ browser OAuth |
| **Gemini API key — free** | **250** | **Flash only** | ✅ |
| Gemini API key — pay-as-you-go | unlimited | Full family | ✅ |
| Vertex AI Express | varies | varies | ✅ (90 days, then billing) |

These are **request** counts, not tokens, and every agentic turn is a request. That is the
number that matters:

| Stage | Rough requests per run |
| :--- | :--- |
| One grilling round | 3–10 |
| `/to-spec` | 5–15 |
| `/to-tickets` | 10–20 |
| `/research` | 20–40 |
| `/code-review` (both axes) | 40–60 |
| `/implement` | 60–150+ |

A day of three tickets through the pipeline lands around 250–300 requests. **The free tier
will bind within about a week of real use.** Plan for it rather than being surprised.

### Routing

| Stage | CLI | Model | Why |
| :--- | :--- | :--- | :--- |
| grill | `gemini` | Flash | Cheap rounds, and you validate every one. Good Flash fit. |
| research | `gemini` | Flash | AFK, bounded, read-heavy. |
| spec | `gemini` | Flash | Synthesis of an already-settled thread — no new decisions. |
| tickets | `gemini` | Flash | Mechanical, schema-constrained. |
| **implement** | `claude` | Opus 5 | The longest agentic loop and the only stage whose output is permanent. Flash-only at 250/day cannot carry it — that's 3–4 runs a day at best. |
| **review** | `gemini` | Flash | See below. Budget carefully — this is the hungriest Gemini stage. |
| frontier | — | — | Pure code, no model. |

**Reviewing with a different vendor than the implementer is a design win, not a
concession.** The plugin's own docs flag that an agent reviewing code it just wrote is
biased toward its own solution — that's why `code-review` isolates its two axes into
separate sub-agents. Claude writes, Gemini reviews: the bias is structurally gone, and it
is the cheaper option.

Related: run the two axes as **two separate CLI invocations** rather than sub-agents.
Stronger isolation than sub-agents, portable across both CLIs, and trivially orchestrated
from `run-agent.ts`.

### Handling exhaustion

Quota exhaustion surfaces as Gemini CLI exit code `1` with a rate-limit message. Every
Gemini step should detect it explicitly and take one of two configured paths rather than
failing opaquely:

- **Defer** — apply `agent:blocked` with a "Gemini daily quota exhausted, re-add the label
  tomorrow" comment. Correct for `research`, `spec`, `tickets`.
- **Escalate** — retry the same prompt on `claude`. Correct for `review`, where a stalled
  PR blocks the frontier.

Log `stats.tokens` from the CLI's `--output-format json` on every run so you can see where
the budget actually goes before tuning.

**If the cap binds — and it will — switch the Gemini stages to pay-as-you-go Flash before
moving any of them to Claude.** Flash pricing is a rounding error next to Opus, it removes
the 250/day ceiling and the Flash-only restriction in one step, and it keeps the Claude
budget where you wanted it: on interactive work and on `implement`.

## 3.4 The full label taxonomy

Every label is `{role}:{status}`, with one deliberate exception: the seven canonical
triage-role labels (§ "Canonical role labels" below) use the plugin's literal strings
verbatim instead, because they are a hardcoded contract with the `triage`, `to-spec`, and
`to-tickets` skills rather than a Watchpoint-owned routing key. The `role` segment on
every other label is the **lifecycle stage** that owns the label; `agent:` is the
role-agnostic namespace for statuses no single stage owns.

### The naming rule

**A label's role segment names the stage that *consumes* it.** The test is mechanical —
*can a workflow's `if:` select on this label?*

| Answer | Kind | Naming |
| :--- | :--- | :--- |
| Yes | **Action label** — an addressed work order | Name it for its **consumer**: `{stage}:needed` |
| No | **State label** — a fact about where the item stands | Name it for the **stage the fact belongs to**: `spec:ready`, `review:round-1` |
| No, and no stage owns it | **Generic state** | `agent:{status}` |

Why consumer and not producer: `dev:needed` is written by the ticketing agent *and* by
the frontier workflow, and read only by `agent-implement.yml`. Under producer semantics
it would be named `tickets:emitted-work`, so the label that fires implementation would be
named after ticketing — and the queue becomes unreadable at exactly the moment you need
it. A routing key must name its destination. Producer identity is not lost; it is in the
issue timeline, which is a better audit trail than a label.

For action labels, "stage that consumes it" and "stage that does the work" are the same
thing by construction, because one action label maps to exactly one workflow (§3.1). That
is what keeps the rule from needing a second clause.

### Action labels — `{stage}:needed`, consumed on trigger

| Label | Target | Applied by | Consumed by | Skill invoked | Produces |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `wayfinder:needed` | Issue | Human | `agent-wayfinder.yml` | `/wayfinder` | A `wayfinder:map` issue + child decision tickets with native `blocked_by` edges |
| `grill:needed` | Issue | Human, wayfinder | `agent-grill.yml` | `/grilling` + `/domain-modeling` | One round of numbered questions as a comment; `needs-info` |
| `research:needed` | Wayfinder ticket | Wayfinder | `agent-research.yml` | `/research` | A cited findings file on a `research/<name>` branch; resolution comment |
| `spec:needed` | Issue | Human, grill (on frontier empty) | `agent-spec.yml` | `/to-spec` | Spec written to the issue body; `spec:ready` + `ready-for-agent` |
| `tickets:needed` | Spec issue | Human, spec | `agent-itemizer.yml` | `/to-tickets` → deterministic wiring | Child issues, milestone, `blocked_by` edges; frontier tickets get `dev:needed` |
| `dev:needed` | Ticket issue | Tickets, frontier | `agent-implement.yml` | `/implement` (drives `/tdd`) | Branch `agent/issue-<n>-<slug>`, commits, draft PR, then applies `review:needed` |
| `dev:needed` | PR | Review (round 1 findings) | `agent-implement-pr.yml` | `/implement` (address review) | Fix commits on the PR branch, then re-applies `review:needed` |
| `review:needed` | PR | Dev, human | `agent-review.yml` | `/code-review` | Two-axis review, inline comments, a round label or `review:approved` |

**There is no merge action label.** Merging is a human act in this pipeline — the last
gate before code reaches `main` stays with you. The agents take a PR as far as
`review:approved` + ready-for-review and stop; `agent-frontier.yml` then reacts to *your*
merge (§3.6 Stage 7) rather than performing one.

### Stage state labels — never trigger anything

| Label | Meaning | Written by |
| :--- | :--- | :--- |
| `wayfinder:map` | This issue **is** a map | Wayfinder *(upstream string)* |
| `wayfinder:research` · `:prototype` · `:grilling` · `:task` | Decision-ticket type | Wayfinder *(upstream strings)* |
| `spec:ready` | Spec published on the issue body | Spec |
| `tickets:proposed` | Breakdown posted as a comment; awaiting `/approve` | Tickets |
| `tickets:wired` | Child issues created with native sub-issue + `blocked_by` edges | Tickets |
| `review:round-1` · `review:round-2` | Automated review rounds consumed | Review |
| `review:approved` | Both axes clean | Review |
| `review:escalated` | Round cap reached, or explicit escalation | Review |

The `wayfinder:*` values are **types**, not statuses — they are the one place the format
carries a noun rather than a state. They stay as-is because the plugin's tracker contract
hard-codes those exact strings (§1.5).

### Generic state labels — `agent:{status}`

Applied to any item regardless of which stage is acting.

| Label | Meaning |
| :--- | :--- |
| `agent:in-progress` | A workflow is running against this item right now |
| `agent:blocked` | The last run failed; reason + run URL are in a comment |

`ready-for-agent` and `ready-for-human` used to live in this bucket as `agent:ready` and
`agent:needs-human`. They've moved to the canonical role labels below — same meaning, the
plugin's literal string instead of a `{role}:{status}` rendering of it.

This is where the format earns its keep operationally:
`gh issue list --label agent:in-progress` is everything currently burning tokens, and
`gh issue list --label agent:blocked` is your entire error queue — across every stage, in
one query.

### Canonical role labels — literal upstream strings

The five triage state roles and two category roles, used as-is rather than translated
into `{role}:{status}`:

| Label | Meaning | Also used by |
| :--- | :--- | :--- |
| `needs-triage` | Never triaged; a maintainer must evaluate | `/triage` only |
| `needs-info` | Waiting on reporter/reviewer for more information | Grill loop (§3.6 Stage 2) |
| `ready-for-agent` | Fully specified; an AFK agent may take it | Spec/tickets stages (§3.6 Stages 3–4) |
| `ready-for-human` | Needs a human, not an agent | `/triage` only |
| `wontfix` | Will not be actioned | `/triage` only |
| `bug` | Category: defect | `/triage` only |
| `enhancement` | Category: new capability | `/triage` only |

`needs-info` and `ready-for-agent` are dual-purpose: `/triage` applies them to incoming
issues, and the pipeline itself applies the identical string mid-flow (a grill round
awaiting an answer; a spec that's ready to itemize). That reuse is what makes the literal
strings worth the naming-convention exception — the alternative is two different labels
meaning the same thing depending on who asked.

`review:escalated` has no canonical counterpart — it is yours, and distinct from
`ready-for-human`: escalated means *an agent tried twice and gave up on this diff*,
`ready-for-human` means *this work was never delegable in the first place*.

### Mapping to the plugin's canonical roles

The skills hard-code canonical label strings in their prose — `/to-spec` and
`/to-tickets` both say "apply the `ready-for-agent` triage label". Watchpoint uses those
strings directly rather than routing them through the `/setup-matt-pocock-skills`
Section B override, so `docs/agents/triage-labels.md` records an identity mapping (kept
for documentation completeness and because the setup skill expects the file to exist,
not because a translation is happening).

### Slash commands — ergonomic aliases

Every action label has a comment alias, handled by one `agent-dispatch.yml` workflow that
does nothing but apply the corresponding label. This keeps trigger logic in exactly one
place (fixing F6's two-sources-of-truth problem).

| Comment | Applies |
| :--- | :--- |
| `/wayfind` | `wayfinder:needed` |
| `/grill` | `grill:needed` |
| `/spec` | `spec:needed` |
| `/tickets` | `tickets:needed` |
| `/implement` | `dev:needed` |
| `/review` | `review:needed` |
| `/approve` | Clears `tickets:proposed` and publishes the breakdown |

There is deliberately no `/merge`.

Match with an anchored regex (`^/implement\b`) at the start of a line, not
`String.includes` — F6.

## 3.5 The trigger matrix

| # | Event | Condition | Workflow | Skill | Human gate after? |
| :-- | :--- | :--- | :--- | :--- | :--- |
| 1 | `issues: labeled` | `label == wayfinder:needed` | `agent-wayfinder.yml` | `/wayfinder` | ✅ decision tickets need answers |
| 2 | `issues: labeled` | `label == grill:needed` | `agent-grill.yml` | `/grilling` | ✅ **always** — posts a round, waits |
| 3 | `issue_comment: created` | `needs-info` present **and** author is human | `agent-grill.yml` | `/grilling` (next round) | ✅ until frontier empty |
| 4 | `issues: labeled` | `label == research:needed` | `agent-research.yml` | `/research` | ❌ AFK by design |
| 5 | `issues: labeled` | `label == spec:needed` | `agent-spec.yml` | `/to-spec` | ⚠️ seam confirmation → posted as a comment, auto-proceeds after N hours or on `/approve` |
| 6 | `issues: labeled` | `label == tickets:needed` | `agent-itemizer.yml` | `/to-tickets` | ⚠️ breakdown quiz → posted as a comment, `/approve` publishes |
| 7 | `issues: labeled` | `label == dev:needed`, issue has **no sub-issues** and **no open blockers** | `agent-implement.yml` | `/implement` + `/tdd` | ❌ fully autonomous |
| 8 | `pull_request_target: labeled` | `label == review:needed` | `agent-review.yml` | `/code-review` | ❌ autonomous, max 2 rounds |
| 9 | `pull_request_target: labeled` | `label == dev:needed` | `agent-implement-pr.yml` | `/implement` (address review) | ❌ autonomous |
| 10 | `pull_request: closed` | `merged == true` | `agent-frontier.yml` | — (no model) | ❌ closes the ticket, advances the frontier |
| 11 | `issue_comment: created` | body matches a slash command | `agent-dispatch.yml` | — | — |

**Row 10 is the only place a merge appears, and it is a reaction, not an action.** No
workflow calls `gh pr merge`; the pipeline stops at `review:approved` and waits for a
human to press the button.

Rows 7 and 9 share the `dev:needed` string on different targets — an issue and a PR — so
they are separated by their event (`issues` vs `pull_request_target`), not by their label.
That is deliberate: both are the same stage doing the same thing (write code to satisfy a
requirement), and giving them one name keeps `/implement` meaning one thing everywhere.

## 3.6 Stage walkthroughs

### Stage 0 — Setup (one time)

Run `/setup-matt-pocock-skills` locally and commit its output. Then:

- Write `CONTEXT.md` at the repo root (domain language: VOD, clip, watch-point, …).
- Move `docs/architecture/adr/` → `docs/adr/` (or record the override in
  `docs/agents/domain.md`).
- Write `CODING_STANDARDS.md` — **this is the file `/code-review`'s Standards axis
  reads.** Fold in the surviving content from `agent-developer.md` and
  `agent-reviewer.md`: FSD pages-first, `app/` barrel-only, AAA blocks, <50ms, 100%
  coverage, no console output, the Grit plugin locks, the automocking rule, the
  Thermo-Nuclear call-site-signature rule, no spaghetti conditionals, the 1000-line file
  guard. **Drop your duplicate Fowler list** — the skill ships a better one.
- **Vendor the plugin's skills into `.agents/skills/` at a pinned SHA and commit them**
  (fixes F9). Both CLIs read them, and CI no longer depends on a marketplace being
  reachable. Symlink `.claude/skills` → `.agents/skills` so local Claude Code sessions use
  the same copy; verify that resolution on your Claude Code version first.
- Create every label in §3.4 (`gh label create`), and record the identity mapping in
  `docs/agents/triage-labels.md` — **without that file, `/to-spec` and `/to-tickets` don't
  know a mapping has already been decided and may create a duplicate `ready-for-agent`
  label.**
- Colour-code by role prefix so the namespacing is visible in the issue list (one hue per
  `{role}`, shades for `{status}`).

### Stage 1 — Idea → map (`wayfinder:needed`)

Human opens an issue with a loose idea and applies `wayfinder:needed`. The workflow runs
`/wayfinder` in chart mode. Because charting *starts* with a grilling session and the
runner has no human, split it:

- **1a** — the wayfinder agent names a candidate destination and posts a **breadth-first
  grilling round** as a comment; applies `needs-info`.
- **1b** — the human answers in a comment; workflow #3 re-fires; iterate until the
  agent's frontier is empty.
- **1c** — the agent creates the `wayfinder:map` issue, creates the tickets it can
  specify, and a **deterministic post-step** wires the sub-issue and `blocked_by` edges
  (the itemizer's existing GraphQL code, generalised). Research tickets get
  `research:needed` and run AFK immediately.

Skip this stage entirely for anything that fits one session — go straight to Stage 2.

### Stage 2 — Grill to certainty (`grill:needed` → `needs-info` loop)

The core HITL loop, and the honest answer to "ensure there is no uncertainty in the
requirements". The agent posts one round; the human answers; repeat. Termination: the
agent emits an explicit sentinel when the frontier is empty, e.g.

```
<promise>FRONTIER_EMPTY</promise>
```

which Sandcastle surfaces as `result.completionSignal`. On that signal, the workflow
removes `needs-info` and applies `spec:needed` — chaining into Stage 3 with no human
action needed.

### Stage 3 — Spec (`spec:needed`)

`/to-spec` synthesises the thread into the spec template and the workflow writes it to
the issue body (preserving the original proposal in a `<details>` block, as
`executeSpecPublishing()` already does). Seams are posted as a separate comment for
review. Apply `spec:ready` + `ready-for-agent`, then chain `tickets:needed`.

### Stage 4 — Tickets (`tickets:needed`)

`/to-tickets` runs on **Gemini Flash** and produces the breakdown as **structured
output**:

```ts
runAgent({
  cli: "gemini", model: "gemini-flash-latest",
  promptFile: "scripts/agents/prompts/tickets.md",
  promptArgs: { SPEC_ISSUE: issueNumber },
  output: {
    tag: "tickets",
    schema: TicketBreakdownSchema,   // scripts/agent-itemizer.ts already has this
    maxRetries: 2,
  },
});
```

This is the best-value Gemini stage in the pipeline: schema-constrained, mechanical, and
the Zod validation catches anything Flash gets wrong before it reaches the tracker.

The workflow then:

1. Posts the numbered breakdown as a comment (the quiz) and applies `tickets:proposed`,
   then waits for `/approve` — or auto-approves after a configured window if you want it
   fully hands-off.
2. On approval, runs the **existing itemizer wiring**: topological sort → create issues
   in dependency order → `addSubIssue` → `addBlockedBy` → milestone. Applies
   `tickets:wired`.
3. **Strips `ready-for-agent` from the parent spec issue** (the documented AFK footgun from
   §1.7 — an AFK poller that sees it will try to build the entire spec in one run).
4. Applies `dev:needed` to every frontier ticket (blockers all closed).

### Stage 5 — Implement (`dev:needed` on an issue) — Claude, fully autonomous

Modelled directly on `sandcastle/.github/workflows/agent-implement.yml`. **This is the one
stage that stays on Claude Opus** — the longest agentic loop, the only permanent output,
and the one the free Gemini tier provably cannot carry (§3.3).

1. **Shape guards** — refuse if the issue has sub-issues (it's a spec, not a ticket);
   refuse if it has open `blocked_by` dependencies; refuse if an open PR already says
   `Closes #N`. Each refusal removes the label, applies `agent:blocked`, and comments why.
2. Transition labels → checkout `main` → create `agent/issue-<n>-<slug>`.
3. `bun install` → `npm i -g @anthropic-ai/claude-code` → `runAgent({ cli: "claude",
   model: "claude-opus-5", … })`. The prompt hands the agent the ticket body and comments
   (`gh issue view <n> --comments`), points it at `CONTEXT.md`, `docs/adr/`,
   `CODING_STANDARDS.md`, and instructs: use the `implement` skill, red-green-refactor at
   existing seams, **do not improvise new seams**, run focused checks regularly, commit
   conventionally at each GREEN checkpoint, push immediately after every commit, **do not
   close the issue, do not edit labels, do not create PRs**, then emit
   `<promise>COMPLETE</promise>`.
4. Post-run assertion in code: `git rev-list --count main..HEAD` must be > 0, else fail
   with a written `failure_reason.txt`.
5. Final push backstop; `gh pr create --draft` with `Closes #<n>` and the right
   `.github/PULL_REQUEST_TEMPLATE/*`; apply `review:needed` **using the PAT**.

Note the division of labour: the *agent* writes code, commits, and pushes GREEN
checkpoints. Every issue, label, and PR mutation is still a workflow step. That is what
makes it debuggable.

### Stage 6 — Review (`review:needed`) — Gemini, max 2 rounds

Modelled on `sandcastle/.github/workflows/agent-review.yml`, with your round cap layered
on. **Runs on Gemini Flash** — a different vendor from the implementer, which structurally
removes the self-review bias the plugin's docs warn about, and costs nothing.

1. Read `review:round-N` labels to determine the round. If `review:round-2` is already
   present → apply `review:escalated`, comment, stop.
2. Checkout the PR head. Run the two axes as **two separate `runAgent()` calls** — Standards
   and Spec — with the fixed point set to the merge-base with `main`. Separate processes
   give stronger isolation than sub-agents and work identically on either CLI. Give the
   Spec run the linked issue; give both the unresolved review threads.
3. Extract **structured output** per axis — `summary`, `inlineComments[]`
   (path/line/body), `replies[]`, `verdict` — Zod-validated with `maxRetries`. Filter
   inline comments against the actual diff line map before posting (Sandcastle's
   `filterInlineComments`/`filterReplies` pattern) so GitHub never rejects the payload.
   Present the two axes side by side and **do not merge or re-rank them** (§1.3).
   On Gemini quota exhaustion, retry this stage on `claude` rather than deferring — a
   stalled PR blocks the frontier.
4. Post via `gh api --method POST repos/{owner}/{repo}/pulls/N/reviews --input payload.json`.
5. **Decide:**
   - Both axes clean → `review:approved` + `gh pr ready`, then **stop**. The PR sits
     waiting for a human merge; no agent touches it again.
   - Findings, round 1 → `review:round-1`, apply `dev:needed` **to the PR** (workflow #9)
     so the fix round runs automatically.
   - Findings, round 2 → `review:round-2` + `review:escalated`, stop.

The "two rounds back and forth" you asked for is: implement → review (finds issues) →
implement-on-PR → review (round 2) → approve or escalate.

Note the review job also lets the agent **commit improvements**, not just comment — that
is Matt's own posture (*"Your job is not just to comment. Actively improve the branch…"*).
Keep that; it's what makes round 2 usually clean.

### Stage 7 — Frontier advance (`pull_request: closed`)

**The merge itself is yours.** Review leaves the PR approved and ready; you read it and
press merge. This stage is what happens *after* that — no model involved, and no
`gh pr merge` anywhere in the pipeline. On merge:

1. GitHub auto-closes the ticket via `Closes #N`.
2. Query the parent map/spec's open children; for each, read
   `issue_dependencies_summary.blocked_by`; any that just hit `0` and are unassigned get
   `dev:needed`.
3. If no open children remain, comment on the parent and close it.

**This is the step that makes the pipeline a loop rather than a line, and nothing in the
plugin or in Sandcastle provides it.** It's the natural home for your existing GraphQL
code.

## 3.7 The two infrastructure gotchas

### `GITHUB_TOKEN` does not trigger workflows

Labels applied by a job using the default `GITHUB_TOKEN` **will not fire another
workflow.** The whole auto-chaining design collapses without a fix. Sandcastle handles
this exactly as you should:

```yaml
- name: Request automated review
  env:
    AGENT_PAT: ${{ secrets.AGENT_PAT }}
  run: |
    if [ -n "$AGENT_PAT" ]; then
      GH_TOKEN="$AGENT_PAT" gh pr edit "$PR_NUMBER" --add-label "review:needed" && exit 0
    fi
    gh pr edit "$PR_NUMBER" --add-label "review:needed"   # fallback: manual re-label
```

Create a fine-grained PAT (contents, issues, pull-requests: write) as `AGENT_PAT`.

Second-order effect: PAT-authored comments are **not** `user.type == "Bot"`, so F7 bites.
Every agent-authored comment must carry `<!-- bot-comment -->` and every reader must
filter on it. You already have `BOT_COMMENT_MARKER` — apply it consistently.

### `pull_request_target` and forks

The review and implement-PR workflows need repo secrets, so they use
`pull_request_target` — which runs with write permissions and secrets while checking out
the **PR head SHA**. For a private/solo repo this is fine. If Watchpoint ever takes
outside contributions, gate these on `authorAssociation` being `OWNER`/`MEMBER`/
`COLLABORATOR`, or split into a `pull_request` job that produces an artifact and a
`workflow_run` job that posts it.

## 3.8 The human's day

| You do | System does |
| :--- | :--- |
| Open an issue: "I want viewers to bookmark moments in a VOD." Add `wayfinder:needed` (big) or `grill:needed` (small). | Posts round 1 of numbered questions, applies `needs-info`. |
| Reply in a comment: "1 yes, 2 option B, 3 no because…" | Posts round 2. Repeats until the frontier is empty, then auto-applies `spec:needed`. |
| (Optional) Read the seams comment. | Writes the spec to the issue body, applies `spec:ready`, chains `tickets:needed`. |
| Read the numbered breakdown, comment `/approve` (or ask to merge/split tickets first). | Creates child issues with native sub-issue + `blocked_by` edges and a milestone; labels the frontier `dev:needed`. |
| **Nothing.** | Each frontier ticket: branch → TDD implementation → `bun run validate` → draft PR → two-axis review → fix round → `review:approved`, ready for review. |
| **Read and merge approved PRs yourself.** This is the one gate no agent touches. | On merge: closes the ticket, unblocks the next tickets, and starts them. Repeats until the milestone is empty. |
| Handle anything labelled `review:escalated` or `agent:blocked`. | — |

Escape hatches at every point: `/grill` to reopen questions, `/review` to force another
round, remove any `{stage}:needed` label to stop.

Because every trigger is `{stage}:needed` and every in-flight item carries
`agent:in-progress`, the whole system's state is two `gh issue list` calls — which is the
practical payoff of the naming rule in §3.4.

---

# Part 4 — Sandcastle

## 4.1 What it is

`@ai-hero/sandcastle` is **a TypeScript library for orchestrating AI coding agents in
isolated sandboxes**. Not a workflow engine, not a methodology — a runtime primitive.

```ts
await run({
  agent: claudeCode("claude-opus-4-8", { effort: "high" }),
  sandbox: docker(),                              // or podman(), vercel(), noSandbox()
  branchStrategy: { type: "branch", branch: "agent/fix-42" },
  promptFile: ".sandcastle/prompt.md",
  promptArgs: { ISSUE_NUMBER: "42" },
  maxIterations: 5,
});
```

Core capabilities:

| Capability | Detail |
| :--- | :--- |
| **Sandbox providers** | Docker, Podman, Vercel Firecracker microVMs, `noSandbox()`, or your own via `createBindMountSandboxProvider` / `createIsolatedSandboxProvider`. |
| **Branch strategies** | `head` (write to the working dir), `merge-to-head` (temp branch in a worktree, merged back), `branch` (named branch in a worktree, reused and fast-forwarded across runs). |
| **Prompt templating** | `{{KEY}}` substitution from `promptArgs`; `` !`command` `` expansion executed **inside the sandbox** in parallel; built-in `{{SOURCE_BRANCH}}`/`{{TARGET_BRANCH}}`. Argument values are inert — user-authored issue text can't inject shell. |
| **Iteration + completion signal** | `maxIterations`, plus `<promise>COMPLETE</promise>` (configurable, array-able) to break early. A `completionTimeoutSeconds` grace window rescues commits from agents whose child processes hang the stdout pipe. |
| **Structured output** | `Output.object({ tag, schema, maxRetries })` — any Standard Schema validator. Retries **resume the same session** with a token-efficient error description. |
| **Reusable sandboxes** | `createSandbox()` + `await using` — run implement then review in one warm container, with `sandbox.exec("npm test")` to gate between them. |
| **Session capture / resume / fork** | Persist and branch agent sessions. |
| **Agent providers** | `claudeCode`, `codex`, `pi` (resumable); `cursor`, `opencode`, `copilot`. |
| **Templates** | `sandcastle init` scaffolds `blank`, `simple-loop`, `sequential-reviewer`, `parallel-planner`, `parallel-planner-with-review`; issue tracker choice of GitHub Issues, Beads, or Custom. |

The repo's own `.sandcastle/run.ts` is the reference loop: **Plan** (one agent emits a
`<plan>` JSON of parallelizable issues) → **Execute + Review** (up to 4 concurrent, each
in its own sandbox on its own branch, implement then review) → **Merge** (one agent
merges all branches) — repeated up to 10 iterations.

## 4.2 How Sandcastle's own repo uses Actions — the pattern to copy

`mattpocock/sandcastle/.github/workflows/` contains `agent-explore.yml`,
`agent-implement.yml`, `agent-implement-pr.yml`, `agent-review.yml`,
`agent-update-branch.yml`. Every one follows the identical shape:

```
on: issues|pull_request_target: [labeled]
if: github.event.label.name == 'agent:<verb>'
concurrency: agent-mutate-pr-<n>          # shared group across mutating workflows
timeout-minutes: 60

1. Guard        — refuse and explain (closed PR, sub-issue, PRD-shaped, existing PR)
2. Transition   — remove the trigger label, remove agent:blocked, add agent:in-progress
3. Checkout / prepare branch / install deps / build
4. Install Claude Code globally
5. Run  npx tsx .sandcastle/agent-workflows/<verb>/<verb>.ts   ← the ONLY model step
6. Push with --force-with-lease="refs/heads/$BRANCH:$BRANCH_HEAD_SHA"
7. Post outputs from ${RUNNER_TEMP}/*.json via gh api
8. failure()  — agent:blocked + comment with reason + run URL, "re-add the label to retry"
9. always()   — remove agent:in-progress
```

Every design decision worth stealing is visible here:

- **Issue/PR mutations stay outside the agent.** The current implement prompt allows git
  pushes for GREEN-checkpoint preservation, but still says: *"Do not close the issue. Do
  not edit labels. Do not create or edit PRs."* The TS script writes JSON to
  `$OUTPUT_DIR`; workflow steps post it with `gh api`.
- **The label is consumed, not held.** Re-adding it is the retry.
- **Failure is a written artifact.** `fail()` writes `failure_reason.txt`; the
  `failure()` step reads it into the comment. No log-diving.
- **`--force-with-lease` pinned to the SHA the run started from**, with a
  `non-fast-forward|rejected|stale info` grep that turns a race into an explicit "branch
  advanced during the run" failure.
- **Guards refuse loudly.** `agent-implement.yml` refuses sub-issues, refuses issues with
  sub-issues, and refuses when a collaborator's PR already targets the issue — each with
  a specific comment.
- **`noSandbox()` in CI.** The runner is the sandbox.
- **Structured output validated then re-filtered in code** — inline comments checked
  against the real diff line map before they're posted.

## 4.3 Sandcastle vs. the skills vs. Watchpoint today

| | mattpocock-skills | Sandcastle | Watchpoint today |
| :--- | :--- | :--- | :--- |
| **What it is** | Markdown methodology | TS orchestration runtime | Bespoke Gemini + Octokit scripts |
| **Layer** | *What* the agent should do | *How* to run agents safely | Both, welded together |
| **Model** | Any | Any (6 CLI providers) | Gemini Flash only |
| **Can it edit files?** | Whatever host allows | Yes, that's the point | **No** |
| **Isolation** | — | Docker / Podman / Vercel / none | GH runner, unused |
| **Parallelism** | Explicitly none | First-class, with branch merge-back | None |
| **GitHub integration** | `gh` conventions in a doc | None in the library; done in workflows | Octokit in scripts |
| **Sub-issue / blocked-by wiring** | Documented; **model-driven and unreliable** | Out of scope | ✅ **Deterministic GraphQL — your best asset** |
| **State machine** | Triage labels, no enforcement | None | 6 labels, partially implemented |
| **HITL gates** | 3, by design | None (prompt's problem) | Grilling only |
| **Structured output** | — | ✅ schema + retry + session resume | Gemini `responseSchema` |

They compose cleanly, and that's the point: **skills say what, Sandcastle says how,
Actions say when.** Watchpoint currently has a fourth thing that duplicates parts of all
three.

### Why we're not adopting Sandcastle itself

Watchpoint is staying on GitHub-hosted runners, and that decides it. Sandcastle's
distinctive value — Docker/Podman isolation, git-worktree branch strategies, parallel
agents merged back to HEAD — is precisely what a disposable GH runner already gives you
for free. What's left that you genuinely want (the iteration loop, the completion signal,
schema-validated structured output) is the ~200-line `run-agent.ts` in §3.2.

There is also a hard blocker: Sandcastle ships no Gemini provider, and Watchpoint's
routing puts five of seven stages on Gemini. The `AgentProvider` interface *is* publicly
exported and a `geminiCli()` provider is only ~50 lines — Gemini CLI's `stream-json`
events map cleanly onto `ParsedStreamEvent` — but that would be ~50 lines of adapter *plus*
a dependency, to get features the runner already provides.

**Revisit this decision if the pipeline ever moves to a self-hosted runner.** There, two
things flip at once: Sandcastle's worktree parallelism becomes the whole point, and the
cached OAuth credential unlocks Gemini's 1,000 req/day tier across the full model family
instead of 250 Flash-only. That is the configuration Sandcastle was built for, and the
`geminiCli()` adapter is the small piece of work that gets you there.

The gap all three share: **nothing advances the frontier.** `implement` doesn't close
tickets; Sandcastle doesn't know what a ticket is. §3.6 Stage 7 is yours to build, and
you already have the GraphQL code for it.

---

# Part 5 — Recommendation

## 5.1 Do this

**Adopt the plugin wholesale for methodology. Copy Sandcastle's Actions pattern without
the dependency. Route by cost. Keep exactly one piece of custom code: dependency-graph
management.**

Concretely:

- Retire the tool-less `@google/genai` harness — but **keep Gemini**, now as the `gemini`
  CLI with real tools and native Agent Skills support. The problem was never the vendor.
- Vendor the plugin's skills into `.agents/skills/` at a pinned SHA; both CLIs read them.
- Delete the five forked skills; move their durable content to `CODING_STANDARDS.md`.
- Write one ~200-line `scripts/agents/run-agent.ts` that abstracts `claude` and `gemini`.
- Rewrite the workflows as thin, guard-heavy, label-driven shells around `bun` scripts,
  copying Sandcastle's own workflow shape (§4.2) verbatim.
- Route five of seven stages to Gemini Flash; keep `implement` on Claude Opus.

## 5.2 Delete

| Path | Why | Replaced by |
| :--- | :--- | :--- |
| `.github/skills/grill-me.md` | Fork; stack block belongs in `AGENTS.md` | `/grilling`, `/grill-with-docs` |
| `.github/skills/to-spec.md` | Fork | `/to-spec` |
| `.github/skills/to-tickets.md` | Fork with a substantive divergence (see §5.4) | `/to-tickets` |
| `.github/skills/agent-developer.md` | Written for a tool-less model; §3–4 duplicate the plugin's `tdd/tests.md` | `/implement` + `/tdd`; standards → `CODING_STANDARDS.md` |
| `.github/skills/agent-reviewer.md` | §4 is a weaker Fowler list; §6 describes labels the code never writes | `/code-review`; standards → `CODING_STANDARDS.md` |
| `.github/templates/feature-spec-template.md` | `/to-spec` carries its own | — |
| `scripts/agent-planner.ts` (+ spec) | Gemini harness | `agent-grill.yml` + `agent-spec.yml` |
| `scripts/agent-developer.ts` (+ spec) | Doesn't implement anything | `agent-implement.yml` |
| `scripts/agent-reviewer.ts` (+ spec) | Truncated diff, dead state machine | `agent-review.yml` |
| `@google/genai` dependency | Tool-less SDK — the root cause of F1–F4 | `@google/gemini-cli` + `@anthropic-ai/claude-code`, installed in the workflow |
| `docs/ai-sdlc-lifecycle.md` | Documents stages that don't exist | This document |

Not deleted, and worth saying explicitly: **Gemini stays.** F1–F4 were caused by calling a
model with no tools, not by which model it was. The `gemini` CLI has tools, runs the same
Agent Skills, and carries five of the seven stages.

## 5.3 Keep and repurpose

| Keep | Becomes |
| :--- | :--- |
| `scripts/agent-itemizer.ts` — `TicketSchema`, `topologicalSortTickets`, `getOrCreateMilestone`, `addSubIssue`/`addBlockedBy`, `<!-- spec-ticket-key -->` idempotency | `scripts/agents/wiring.ts` — a pure post-processor over `/to-tickets`' structured output, plus the frontier-advance query for Stage 7 |
| `scripts/agent-shared.ts` — `transitionState`, `extractLabelNames`, `removeLabelIfPresent`, `BOT_COMMENT_MARKER` | `scripts/agents/github.ts`, unchanged |
| `.github/templates/developer-ticket-template.md` | The `promptArgs` body template for created tickets |
| `.github/PULL_REQUEST_TEMPLATE/*` | Unchanged — Stage 5 picks one |
| `bun run validate` | The gate inside the implement prompt |
| All of `AGENTS.md`'s architecture rules | Split: durable standards → `CODING_STANDARDS.md`; domain language → `CONTEXT.md` |

## 5.4 One decision to make deliberately

Your `to-tickets.md` mandates `targetFiles` (concrete paths) and `implementationSteps`.
Upstream forbids both: *"avoid specific file paths or code snippets — they go stale
fast."*

Both positions are defensible — Watchpoint's FSD layout is rigid enough that
`src/_pages/<slice>/ui/…` is genuinely predictable, and prescribed paths reduce agent
drift. But stale paths in a ticket that sits behind three blockers actively mislead. My
recommendation: **keep `implementationSteps`, drop `targetFiles`** in favour of naming
the *slice* (`src/_pages/watch-points/`) rather than files. You get the FSD steer without
pinning filenames the implementation will rename. Enforce it with `bun run
check:architecture` where it belongs.

## 5.5 Phasing

Each phase leaves the system working.

| Phase | Work | Result |
| :--- | :--- | :--- |
| **0 — Foundation** | Run `/setup-matt-pocock-skills`; vendor the plugin skills into `.agents/skills/` at a pinned SHA; write `CONTEXT.md` + `CODING_STANDARDS.md`; move ADRs; create the §3.4 labels + `docs/agents/triage-labels.md` mapping; mint `AGENT_PAT`, `GEMINI_API_KEY`, `CLAUDE_CODE_OAUTH_TOKEN`. | Skills work locally and in CI, reproducibly, on both CLIs. |
| **1 — The runner** | Write `scripts/agents/run-agent.ts` (§3.2) with unit tests against recorded JSONL fixtures for both CLIs. No workflows yet. | One tested seam every later phase builds on. |
| **2 — Prove it end to end** | `agent-implement.yml` (`dev:needed`, Claude) + `agent-review.yml` (`review:needed`, Gemini), hand-triggered by label, workflow shape copied from Sandcastle's own. Leave the old planner running on its hyphenated labels. | **The biggest win.** F1–F3 fixed — agents ship code and review a full diff. |
| **3 — Replace planning** | `agent-grill.yml` (Gemini, with the `needs-info` comment loop), `agent-spec.yml` (Gemini), `agent-dispatch.yml`. Retire `agent-planner.ts` and the `spec-needed`/`spec-ready` labels. | Real `/grilling` and `/to-spec`; F4–F7 fixed. |
| **4 — Rewire itemization** | Refactor `agent-itemizer.ts` into a post-processor over `/to-tickets`' structured output (Gemini Flash); strip `ready-for-agent` from spec parents. | Real `/to-tickets`, deterministic edges. |
| **5 — Close the loop** | `agent-frontier.yml` on `pull_request: closed`. | Autonomous multi-ticket execution. |
| **6 — Wayfinder** | `agent-wayfinder.yml` + `wayfinder:*` labels + AFK `research:needed` tickets. | Idea → map → spec → tickets → PRs, end to end. |

Phase 1 is new and worth not skipping: `run-agent.ts` is the single seam every stage runs
through, it's the one piece of this system that is genuinely unit-testable against
recorded fixtures, and getting it wrong shows up as six broken workflows instead of one
failing test.

Old and new labels coexist safely during phases 2–4 because they are different strings —
`dev-needed` (hyphen, old) and `dev:needed` (colon, new) never collide. Migrate with
`gh issue list --label dev-needed --json number --jq '.[].number' | xargs -I{} gh issue edit {} --add-label dev:needed --remove-label dev-needed`
once the new workflow is proven.

Phases 1–3 are where nearly all the value is. Phase 6 is optional — `/grill-with-docs` →
`/to-spec` covers everything that fits a single planning session, which is most work.

## 5.6 Risks to accept up front

1. **"Autonomous" has a ceiling, by choice.** Three of the four planning skills gate on a
   human by design, and you have added a fourth at merge. The pipeline is *asynchronous*
   before `dev:needed`, fully autonomous from `dev:needed` to `review:approved`, then
   stops for your merge. Deleting the upstream gates would mean forking the skills — the
   opposite of the stated goal.
2. **The Gemini free tier will bind, probably within a week.** 250 requests/day, Flash
   only, and `review` alone can spend 40–60 per PR. This is not a reason to move stages
   to Claude — it is a reason to put the Gemini stages on pay-as-you-go Flash, which is a
   rounding error next to Opus and removes both the daily cap and the Flash-only
   restriction. Instrument first: log `stats.tokens` from every run so the decision is
   made on data. Vertex AI Express (90 days free) is a stopgap, not a foundation.
3. **Claude cost on `implement`.** One `/implement` run is documented at 100k+ tokens on
   Opus, plus a fix round. Right-size tickets rather than raising effort, and set
   `timeout-minutes`. This is the stage worth paying for; everything else routes to Gemini.
4. **Skill-delivery drift in non-interactive runs.** Skills marked
   `disable-model-invocation` must be supplied by the workflow. Inject each stage's fixed
   vendored skill text before its stage contract; do not treat a model-emitted activation
   event as proof that the instructions were applied.
5. **`pull_request_target`** carries the fork-security caveat in §3.7.
6. **Plugin drift.** The skills are actively developed (`to-prd` → `to-spec` in v1.1).
   Vendoring into `.agents/skills/` at a pinned SHA makes upgrades a deliberate,
   reviewable commit rather than a silent change under a running pipeline.
7. **Serialise the mutators.** Use one shared `concurrency` group per PR across
   `agent-review` and `agent-implement-pr`, as Sandcastle does
   (`group: agent-mutate-pr-<n>`), or the review and fix rounds will race the branch.
