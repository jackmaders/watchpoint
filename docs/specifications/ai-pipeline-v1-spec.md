# Spec — Gemini-Driven AI Development Pipeline (v1)

**Status:** Draft for breakdown
**Supersedes:** `docs/ai-sdlc-lifecycle.md`
**Design rationale:** `docs/ai-agent-pipeline-design.md` (referenced below as *the design doc*)

---

## Stated assumption

You asked for an end-to-end workflow "using GHA and gemini", so **this spec puts every
model-driven stage on Gemini, including `implement`.** That differs from the design doc,
which recommended keeping `implement` on Claude Opus.

The assumption is recorded rather than hidden because it has a real cost:

- The Gemini API-key **free** tier is 250 requests/day, **Flash only**. One `implement`
  run costs 60–150 requests. That is roughly **two tickets per day** end to end, on the
  weakest model, with no headroom.
- Nothing else in the design changes. The consequence is confined to model quality on the
  longest agentic loop.

Two mitigations are built into this spec so the assumption is cheap to revisit:

1. **Model selection is a single config map** (`scripts/agents/models.ts`). Enabling
   pay-as-you-go billing and changing `flash` → `pro` for `implement` and `review` is a
   one-line diff, no redesign.
2. **The runner takes a `cli` parameter.** Routing any single stage to Claude later means
   changing one field in one config object.

**Recommendation regardless of routing: enable Gemini pay-as-you-go billing before
Ticket 9.** The free tier is a pilot allowance, not an operating budget, and Flash-only
is a meaningful handicap on implementation. Flash pricing is a rounding error next to
Opus.

---

## 1. Problem statement

The repository advertises a four-agent AI SDLC that does not work.

The Developer agent does not write code — it makes one tool-less Gemini
`generateContent` call and posts a text summary; the branch name it reports is never
created and no PR is ever opened. The Reviewer's documented two-round state machine is
not implemented — the labels it describes appear nowhere in the code — and it reviews a
silently truncated diff (`pulls.listFiles` unpaginated at 30 files). Five markdown files
carry Claude Code skill frontmatter but are only ever read as system-instruction strings,
so instructions like "run `bun run validate`" and "apply label X" are inert. Three of
those five are drifted forks of skills that now ship, maintained, in an installable
plugin.

The result: a maintainer cannot take an idea to a merged pull request without doing all
the work by hand, while the documentation claims otherwise.

Full findings: *the design doc*, Part 2 (F1–F10).

## 2. Solution

Replace the tool-less harness with the **Gemini CLI**, which has real tools and
implements the [agentskills.io](https://agentskills.io) standard — the same `SKILL.md`
format the `mattpocock-skills` plugin ships. Vendor those skills into the repo, delete
the local forks, and rebuild the workflows as thin, guard-heavy, label-driven shells
around one tested runner module.

The end state: a maintainer opens an issue, answers a few rounds of questions in
comments, approves a ticket breakdown, and then does nothing until pull requests arrive
approved and ready to merge. Merging is manual and stays that way. Each merge unblocks
the next tickets, which start themselves.

**The problem was never the vendor.** It was calling a model with no tools. Gemini stays.

## 3. Scope

**Teardown** — four workflows, five scripts (plus their tests), five prompt files, two
templates, one dependency, one doc.

**Build** — one runner module, one GitHub module, one wiring module, eight workflows,
nine prompt files, a vendored skill set, and the repo configuration the skills require.

## 4. User stories

**Planning**

1. As a maintainer, I want to open an issue with a loose idea and have an agent
   interrogate me about it, so that requirements are sharpened before any code exists.
2. As a maintainer, I want each round of questions numbered with a recommended answer, so
   that I can reply "1 yes, 2 option B, 3 no because…" without quoting questions back.
3. As a maintainer, I want to answer in an ordinary issue comment, so that I am not tied
   to a terminal session.
4. As a maintainer, I want the agent to look up facts itself and only ask me about
   decisions, so that my time is spent on judgement rather than lookup.
5. As a maintainer, I want the questioning to stop when there is nothing left to ask, so
   that I know when the design is settled.
6. As a maintainer, I want the settled conversation synthesised into a specification on
   the issue body, so that a fresh agent session can pick the work up without me
   re-explaining it.
7. As a maintainer, I want the spec to name the test seams before it is written, so that
   implementation and review both work against seams I agreed to.
8. As a maintainer, I want the original issue text preserved under the published spec, so
   that the provenance of the work is not lost.

**Ticketing**

9. As a maintainer, I want a spec broken into vertical slices that each cut through
   schema, logic, UI and tests, so that every ticket is demoable on its own.
10. As a maintainer, I want to review the proposed breakdown before anything is created,
    so that I can merge or split tickets while it is still cheap.
11. As a maintainer, I want child issues created as **native GitHub sub-issues** of the
    spec, so that the hierarchy is visible in GitHub's own UI.
12. As a maintainer, I want blocking relationships expressed as **native GitHub issue
    dependencies**, so that GitHub itself shows me what is takeable.
13. As a maintainer, I want re-running ticket creation to update existing tickets rather
    than duplicate them, so that a retry is safe.

**Implementation**

14. As a maintainer, I want an agent to pick up an unblocked ticket and implement it
    test-first, so that I get working code with tests rather than a plan.
15. As a maintainer, I want the agent to work on its own branch and open a draft pull
    request, so that nothing lands without review.
16. As a maintainer, I want the full validation suite to run before the PR opens, so that
    obviously broken work never reaches review.
17. As a maintainer, I want the agent refused when I label the wrong kind of issue — a
    spec, a blocked ticket, one that already has a PR — with a comment explaining why, so
    that mistakes are self-correcting.

**Review**

18. As a maintainer, I want every PR reviewed on two separate axes — does it follow our
    standards, and does it do what the ticket asked — so that neither can mask the other.
19. As a maintainer, I want review findings as inline comments anchored to real diff
    lines, so that they are actionable where the code is.
20. As a maintainer, I want the reviewer to fix what it can rather than only complain, so
    that small issues do not cost a round trip.
21. As a maintainer, I want at most two automated rounds before it escalates to me, so
    that agents cannot argue with each other indefinitely.

**Merge and flow**

22. As a maintainer, I want to be the only one who merges, so that nothing reaches `main`
    unread.
23. As a maintainer, I want merging a PR to close its ticket and start the tickets it
    unblocked, so that the pipeline advances without me.
24. As a maintainer, I want every stage's state visible as a label, so that I can see
    where everything is from the issue list.
25. As a maintainer, I want `gh issue list --label agent:in-progress` to show everything
    currently running and `--label agent:blocked` to show everything that failed.

**Operability**

26. As a maintainer, I want a failed run to leave a comment with the reason and a link to
    the workflow run, so that I do not have to dig through logs.
27. As a maintainer, I want re-adding the trigger label to be the retry mechanism, so
    that recovery needs no special knowledge.
28. As a maintainer, I want to trigger any stage from a comment command as well as a
    label, so that I can drive it from my phone.
29. As a maintainer, I want daily quota exhaustion reported as a distinct, recognisable
    state, so that I do not mistake it for a broken pipeline.
30. As a maintainer, I want token and request usage logged per run, so that I can decide
    on billing from data.
31. As a maintainer, I want a malformed model response rejected and retried rather than
    acted on, so that inconsistent output never creates half-wired tickets or a broken
    pull request.
32. As a maintainer, I want a response that is well-formed but incoherent — a blocker
    pointing at a ticket that does not exist, a comment on a line not in the diff —
    caught before it reaches GitHub.
33. As a maintainer, I want the shape the agent is asked for and the shape the code
    accepts to be the same object, so that they cannot drift apart.
34. As a developer, I want changing a schema to break compilation everywhere the old
    shape was assumed, so that no hand-written type can go stale behind it.

## 5. Implementation decisions

### 5.1 Runtime and authentication

- **Agent CLI:** `@google/gemini-cli`, installed globally in each workflow job.
- **Invocation:** `gemini --approval-mode yolo --output-format stream-json -m <model> -p -`
  with the prompt on **stdin** (avoids the ~128 KB argv limit).
- **Auth:** `GEMINI_API_KEY` (AI Studio). Headless mode cannot use the Google-account
  OAuth tier — there is no cached credential on a GitHub-hosted runner.
- **Models:** use Gemini CLI **aliases** (`flash`, `pro`), not concrete version strings,
  so the pipeline does not need editing when Google rev's a model.
- **Model map:** `scripts/agents/models.ts` exports one record of stage → `{ cli, model }`.
  Every workflow reads its entry from there. This is the only place a model is named.
- **Stage exit codes:** `0` success · `1` error or API failure · `42` invalid input ·
  `53` turn limit exceeded.

### 5.2 Skills

- **Vendor, do not install at job time.** Copy the required skill directories from
  `mattpocock-skills` into `.agents/skills/` and commit them, recording the upstream
  commit SHA in `.agents/skills/UPSTREAM.md`. CI must not depend on a marketplace being
  reachable, and a pinned copy is the only reproducible option.
- **Required skills:** `grilling`, `domain-modeling`, `to-spec`, `to-tickets`,
  `implement`, `tdd`, `code-review`, `research`, `codebase-design`. Add `wayfinder` with
  Ticket 13.
- **Local parity:** symlink `.claude/skills` → `.agents/skills` so interactive Claude Code
  sessions use the same copy. **Verify this resolves on the installed Claude Code version
  before relying on it**; if it does not, copy instead and add a CI drift check.
- **Every prompt must name its skill explicitly.** Gemini ignores
  `disable-model-invocation` and activates skills by description match, so an unnamed
  skill may not fire, or the wrong one may. The runner asserts the expected
  `activate_skill` call appeared in the stream before trusting a result.

### 5.3 The runner module — `scripts/agents/run-agent.ts`

The single seam through which every model invocation passes.

```ts
export interface RunAgentOptions<T> {
  cli: "gemini" | "claude";
  model: string;
  promptFile: string;
  promptArgs: Record<string, string>;
  completionSignal?: string;          // default "<promise>COMPLETE</promise>"
  expectSkill?: string;               // assert this skill activated
  output: OutputSpec<T>;              // REQUIRED — see §5.4
  spawn?: SpawnFn;                    // injected for tests; defaults to node:child_process
}

export interface RunAgentResult<T> {
  output: T;                          // typed, validated — never a raw string to branch on
  raw: string;                        // full transcript, for logging only
  sessionId?: string;
  completionSignal?: string;
  usage?: { requests: number; inputTokens: number; outputTokens: number };
}
```

`output` is **required** (§5.4). `raw` exists for diagnostics; no stage script may branch
on it.

Responsibilities, in order:

1. Read `promptFile`, substitute `{{KEY}}` from `promptArgs`. **An unmatched `{{KEY}}` is
   an error; an unused argument is a warning.** Argument *values* are inert — never
   re-scanned for placeholders or shell expressions, so issue text is safe to pass
   through.
2. Inject `{{OUTPUT_SCHEMA}}` — the JSON Schema derived from the Zod schema via
   `z.toJSONSchema()` — so the contract in the prompt and the contract in the code are
   the same object (§5.4).
3. Spawn the CLI, prompt on stdin.
4. Parse the JSONL stream into a normalised event union
   (`session_id | text | tool_call | activate_skill | result | usage`).
5. Stop on the completion signal.
6. Extract the `<tag>…</tag>` payload, parse, validate against the schema. On failure,
   **resume the same session** (`--resume <sessionId>`) with only the validation error as
   the new prompt, up to `maxRetries`. Resuming rather than re-invoking means the retry
   costs one request instead of re-running the whole task.
7. Classify failure and write `$OUTPUT_DIR/failure_reason.txt`:

| Condition | Classification | Workflow response |
| :--- | :--- | :--- |
| Exit `0`, signal seen, schema valid | `ok` | proceed |
| Exit `1` + rate-limit/quota text | `quota` | `agent:blocked` + "quota exhausted, re-add the label tomorrow" |
| Exit `53` | `turn-limit` | `agent:blocked` + "ticket too large, split it" |
| Exit `42` | `bad-input` | fail loudly — a prompt bug |
| Schema invalid after retries | `bad-output` | `agent:blocked` + the validation error |
| Expected skill never activated | `skill-miss` | `agent:blocked` + which skill was expected |

8. Append a usage line to `$OUTPUT_DIR/usage.jsonl` on every run.

**No workflow contains logic.** All branching lives in `scripts/agents/**` so it can be
unit-tested; workflow YAML is only guard → label → checkout → install → run script →
post outputs. This is the decision that makes the system testable at all.

### 5.4 Structured output and validation

LLM output formatting is unreliable. Every action this pipeline takes against GitHub —
creating issues, wiring dependencies, opening PRs, posting reviews, applying labels —
must therefore be driven by a **validated, typed payload**, never by parsing prose.

#### The rule

> **No stage may perform a GitHub mutation from unvalidated model output.**
> Every `runAgent` call declares an `output` spec. `output` is a required parameter, so
> forgetting one is a type error, not a runtime surprise.

```ts
type OutputSpec<T> =
  | { kind: "object"; tag: string; schema: z.ZodType<T>; maxRetries?: number }  // default 2
  | { kind: "prose" };   // explicit, greppable escape hatch — no mutation may follow
```

`{ kind: "prose" }` exists only for stages whose entire product is text posted verbatim.
It is deliberately conspicuous: a code review that sees `kind: "prose"` next to a
`gh issue edit` is looking at a bug.

#### Shape is not truth

Zod validates that a payload is *well-formed*. It cannot validate that it is *correct*.
Two consequences, both binding:

1. **Never ask the model for a fact the workflow can measure.** Commit counts come from
   `git rev-list`, test results come from `bun run validate`, diff line numbers come from
   the diff. A model self-reporting `validatePassed: true` is worth nothing, and asking
   for it invites the model to assert it.
2. **Never ask the model to echo back an input.** The workflow already knows the issue
   number, the branch name, the PR number. Passing them in and asking for them back
   creates a second, driftable copy. Where identity must appear in the payload — a
   ticket's temporary id — it is a model-generated key with no meaning outside the run.

#### Semantic validation beyond the schema

Some payloads are only correct *relative to something else*. Schema validation runs
first; these run second, in `scripts/agents/schemas.ts`, as `.superRefine` predicates or
as explicit post-checks:

| Payload | Semantic check | On failure |
| :--- | :--- | :--- |
| Ticket breakdown | Every `blockers[]` id is a declared ticket id | Reject whole payload, retry |
| Ticket breakdown | The blocker graph is acyclic | Reject whole payload, retry |
| Ticket breakdown | Every ticket has ≥1 acceptance criterion | Reject whole payload, retry |
| Review comments | `path` exists in the diff; `line` is an added/context line on the RIGHT side | Drop the comment, **and report the count dropped** in the review body |
| PR metadata | `template` is one of the real files in `.github/PULL_REQUEST_TEMPLATE/` | Reject, retry |
| PR metadata | `type` matches the conventional-commit type in the branch's commits | Warn only |

**Rejection granularity is a per-payload decision, not a global one.** Tickets are
interdependent, so a breakdown is accepted or rejected whole — taking 9 of 10 tickets
would leave dangling blocker references. Review comments are independent, so invalid ones
are dropped individually and the drop count is surfaced rather than hidden.

#### Schema design rules for LLM reliability

These exist to reduce the failure rate rather than merely detect it:

- **Flat over nested.** One level of nesting maximum inside an array element.
- **Enums, not free strings,** for anything the code branches on — `type`, `severity`,
  `verdict`, `template`.
- **No unions or discriminated unions.** Model one shape; use a nullable field instead.
- **Avoid optional fields.** Require the key and allow `null` or `[]`, so a missing key is
  unambiguously an error rather than a default.
- **`.describe()` every field.** It lands in the generated JSON Schema and is the cheapest
  documentation the model will actually read.
- **Prefer arrays of small objects to maps** keyed by model-chosen strings.
- **Bound everything** — `.max()` on arrays and strings — so one malformed run cannot
  create 400 issues.

#### One schema, two consumers

`z.toJSONSchema()` (Zod 4, already used by `agent-itemizer.ts`) generates the JSON Schema
from the Zod object, and the runner interpolates it into the prompt as
`{{OUTPUT_SCHEMA}}`. **The prompt never restates the schema in prose.** A schema edit
updates both the validator and the instruction in one commit, which removes the most
common source of drift between what is asked for and what is accepted.

#### Per-stage output specs

| Stage | Kind | Payload | Drives |
| :--- | :--- | :--- | :--- |
| `grill` | object | `{ frontierEmpty: boolean, roundMarkdown: string }` | Whether to chain `spec:needed` — a control decision, so it must be typed, not regexed out of prose |
| `spec` | object | `{ specMarkdown: string, seams: [{ name, rationale }], outOfScope: string[] }` | Issue-body update + the seams comment. Seams are structured because `tdd` and `code-review` both consume them downstream |
| `tickets` | object | `TicketBreakdownSchema` — `{ tickets: [{ id, title, whatToBuild, acceptanceCriteria[], blockers[], implementationSteps[] }] }` | Sub-issue creation, `blocked_by` wiring, milestone. **The highest-risk payload in the pipeline** |
| `implement` | object | `{ summary: string, pr: { type: enum, scope: string, emoji: string, title: string, template: enum } }` | The PR title, body and template choice. Commit count and validation status are **measured**, not reported |
| `review` (×2 axes) | object | `{ verdict: enum, summary: string, inlineComments: [{ path, line, body }], replies: [{ commentId, body }] }` | The GitHub review payload |
| `implement-pr` | object | `{ summary: string, replies: [{ commentId, body }] }` | Thread replies on the PR |
| `research` | object | `{ findingsMarkdown: string, sources: [{ title, url }] }` | The findings file and resolution comment |
| `dispatch` | — | no model | — |

Note `grill`: the questions themselves are prose, but they travel *inside* a validated
field. The thing that triggers an action — `frontierEmpty` — is a boolean the type system
knows about, not a sentinel string matched against free text.

All schemas live in **one module**, `scripts/agents/schemas.ts`, so the contract surface
is reviewable in a single file.

#### Derive, never duplicate

**The Zod schema is the single source of truth.** Nothing that can be derived from it may
be written by hand.

The current code is the anti-pattern: `agent-reviewer.ts` hand-writes
`ReviewFeedbackItem` and `ReviewDecisionData` interfaces, *and separately* hand-writes a
Gemini `responseSchema` object literal describing the same shape, *and* the prompt file
describes it a third time in prose. Three copies with nothing linking them; any two can
drift silently. `agent-itemizer.ts` already shows the correct pattern
(`export type Ticket = z.infer<typeof TicketSchema>`) — generalise it.

| Artifact | Derived from | Never |
| :--- | :--- | :--- |
| TypeScript types | `z.infer<typeof Schema>` | A hand-written `interface` mirroring a schema |
| JSON Schema in the prompt | `z.toJSONSchema(Schema)` via `{{OUTPUT_SCHEMA}}` | Prose restating the fields |
| Enum union types | `z.infer<typeof SomeEnum>` | A parallel `type X = "a" \| "b"` |
| Enum *values* | One `as const` array, fed to `z.enum()` | Literals repeated in schema and code |
| `Stage` union | `keyof typeof OUTPUTS` | A hand-maintained list of stage names |
| `runAgent`'s return type | Inferred from the schema passed in | An explicit type argument at the call site |

**The registry pattern.** One record maps stage → schema, and everything else derives
from it:

```ts
export const OUTPUTS = {
  grill:    { kind: "object", tag: "round",   schema: GrillRoundSchema },
  spec:     { kind: "object", tag: "spec",    schema: SpecSchema },
  tickets:  { kind: "object", tag: "tickets", schema: TicketBreakdownSchema },
  // …
} as const satisfies Record<string, OutputSpec<unknown>>;

export type Stage = keyof typeof OUTPUTS;
export type OutputOf<S extends Stage> = z.infer<(typeof OUTPUTS)[S]["schema"]>;
```

`runAgent` is generic over the schema, not over a hand-supplied `T`, so
`result.output` is fully typed at every call site with no annotation:

```ts
export async function runAgent<S extends z.ZodType>(
  opts: RunAgentOptions<S>,
): Promise<RunAgentResult<z.infer<S>>>;
```

Two things follow, and both are worth having:

- **`models.ts` is keyed by `Stage`**, so adding a stage to `OUTPUTS` without giving it a
  model is a compile error rather than a runtime one.
- **Labels get the same treatment.** Replace `agent-shared.ts`'s loose
  `export const DEV_NEEDED_LABEL = "dev-needed"` constants with one `as const` object;
  derive both the Zod enum and the TS union from it, so a label string cannot be typo'd
  into existence.

A **registry completeness test** asserts that every key in `OUTPUTS` has a `models.ts`
entry, a prompt file on disk, and a `{{OUTPUT_SCHEMA}}` placeholder in that prompt. Drift
between the three then fails a fast unit test instead of a workflow run.

### 5.5 Prompts — `scripts/agents/prompts/*.md`

One file per stage: `grill.md`, `spec.md`, `tickets.md`, `implement.md`,
`review-standards.md`, `review-spec.md`, `implement-pr.md`, `research.md`. Each:

- names its skill explicitly;
- points at `CONTEXT.md`, `docs/adr/`, `CODING_STANDARDS.md`;
- states the completion signal;
- and carries the standing prohibition, verbatim from Sandcastle's own prompts:
  **"Do not push. Do not close the issue. Do not edit labels. Do not create or edit PRs."**

The agent writes code and text. The workflow performs every GitHub mutation.

### 5.6 Labels

Per *the design doc* §3.4 — `{role}:{status}`, where the role names the stage that
**consumes** the label. Action labels are `{stage}:needed` and are removed by the first
step of the workflow they fire. Generic states use `agent:`. The seven canonical triage
roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`,
`bug`, `enhancement`) are the one exception — they use the plugin's literal strings, not
a `{role}:{status}` rendering. The mapping **must** be written to
`docs/agents/triage-labels.md` (an identity mapping, in this repo's case) or the skills
will create duplicate labels.

### 5.7 Shared workflow contract

Every model-driven workflow has the identical shape:

```yaml
on: { issues: [labeled] }            # or pull_request_target: [labeled]
if: github.event.label.name == '<stage>:needed'
timeout-minutes: 30
concurrency:
  group: agent-mutate-${{ github.event.issue.number }}   # shared across mutating workflows
  cancel-in-progress: false

steps:
  1. Guard        — refuse with a specific comment; remove label; agent:blocked
  2. Transition   — remove trigger label + agent:blocked; add agent:in-progress
  3. Checkout / setup Bun / bun install
  4. npm i -g @google/gemini-cli
  5. Run          — bun scripts/agents/<stage>.ts        ← the only model step
  6. Post outputs — gh api / gh issue comment, from ${RUNNER_TEMP}/*.json
  7. failure()    — agent:blocked + comment with failure_reason.txt and the run URL
  8. always()     — remove agent:in-progress
```

Pushes use `--force-with-lease="refs/heads/$BRANCH:$BRANCH_HEAD_SHA"`, with a
`non-fast-forward|rejected|stale info` grep that converts a race into an explicit
"branch advanced during the run" failure.

### 5.8 Workflows

| File | Trigger | Script | Skill | Chains to |
| :--- | :--- | :--- | :--- | :--- |
| `agent-dispatch.yml` | `issue_comment: created` matching `^/<cmd>\b` | `dispatch.ts` | — | the matching `{stage}:needed` |
| `agent-grill.yml` | `grill:needed`, or comment while `needs-info` | `grill.ts` | `grilling` + `domain-modeling` | `spec:needed` when the frontier empties |
| `agent-spec.yml` | `spec:needed` | `spec.ts` | `to-spec` | `tickets:needed` |
| `agent-tickets.yml` | `tickets:needed` | `tickets.ts` | `to-tickets` | `dev:needed` on frontier tickets |
| `agent-implement.yml` | `dev:needed` on an **issue** | `implement.ts` | `implement` + `tdd` | `review:needed` on the new PR |
| `agent-review.yml` | `review:needed` on a **PR** | `review.ts` | `code-review` | `dev:needed` on the PR, or stop |
| `agent-implement-pr.yml` | `dev:needed` on a **PR** | `implement-pr.ts` | `implement` | `review:needed` |
| `agent-frontier.yml` | `pull_request: closed && merged` | `frontier.ts` | — | `dev:needed` on newly unblocked |
| `agent-research.yml` | `research:needed` | `research.ts` | `research` | — |

**Chaining requires `AGENT_PAT`.** Labels applied with the default `GITHUB_TOKEN` do not
trigger workflows. Every chaining step uses the PAT with a documented fallback to a
manual re-label.

**Consequence of the PAT:** its comments are not `user.type == "Bot"`. Every
agent-authored comment must carry `<!-- bot-comment -->` and every reader must filter on
it, or grilling rounds feed back in as user input (F7).

### 5.9 Deterministic modules

- **`scripts/agents/schemas.ts`** — every Zod schema in the pipeline, plus the
  `.superRefine` semantic checks from §5.4. One file, so the entire contract surface
  between model output and GitHub mutation is reviewable at a glance.
- **`scripts/agents/github.ts`** — `agent-shared.ts` moved verbatim: `transitionState`,
  `extractLabelNames`, `removeLabelIfPresent`, `BOT_COMMENT_MARKER`, error comments.
- **`scripts/agents/wiring.ts`** — `agent-itemizer.ts`'s valuable half, repurposed as a
  pure post-processor over `to-tickets` output: `TicketSchema`, `topologicalSortTickets`,
  `getOrCreateMilestone`, `addSubIssue`/`addBlockedBy` GraphQL, and
  `<!-- spec-ticket-key -->` idempotency. **The model never wires dependencies** — the
  plugin's own docs record this as unreliable upstream (`mattpocock/skills#554`, `#513`).
- **`scripts/agents/frontier.ts`** — given a parent, return open children whose
  `issue_dependencies_summary.blocked_by` is `0` and which have no assignee. Pure
  decision function plus a thin Octokit caller.

Blocker ids for `addBlockedBy` are the numeric **database id**
(`gh api repos/{o}/{r}/issues/{n} --jq .id`), not the `#number` and not the `node_id`.

### 5.10 Repository configuration the skills require

`/setup-matt-pocock-skills` output, committed:

| File | Purpose |
| :--- | :--- |
| `docs/agents/issue-tracker.md` | GitHub `gh` conventions + wayfinding operations |
| `docs/agents/triage-labels.md` | Canonical role → literal label mapping (identity — no local override) |
| `docs/agents/domain.md` | Domain-doc layout |
| `CONTEXT.md` | Domain language (VOD, clip, watch-point, …) |
| `CODING_STANDARDS.md` | **What `code-review`'s Standards axis reads** |
| `docs/adr/` | ADRs relocated from `docs/architecture/adr/` |

`CODING_STANDARDS.md` absorbs the surviving content of the two deleted agent skills: FSD
pages-first, `app/` barrel-only, AAA blocks, <50 ms per test, 100% coverage, no console
output in tests, the two Grit plugin locks, the automocking rule, call-site signature
tracing, no spaghetti conditionals, the 1000-line file guard. **Drop the local Fowler
list** — `code-review` ships a fuller one with override rules.

## 6. Testing decisions

### Seams

The design deliberately produces **three seams**, all at the highest available point:

| Seam | What it isolates | How it is tested |
| :--- | :--- | :--- |
| `runAgent({ spawn })` | Every model invocation | Injected `spawn` replaying recorded JSONL fixtures. **No network, no subprocess.** |
| Octokit client passed into `github.ts` / `wiring.ts` / `frontier.ts` | Every GitHub mutation | `__mocks__` automocking per the repo lock |
| Pure functions | Parsing, substitution, extraction, sorting, classification | Direct, no doubles |

Do **not** add seams below these. In particular, do not extract inner helpers purely to
test them — the repo's own standards call that spaghetti testing, and `tdd`'s rule is to
prefer existing seams and take the highest one available.

### What is tested

- `parseStreamLine` — one case per event type, per CLI, from fixtures captured from real
  runs and committed under `scripts/agents/__tests__/fixtures/`.
- `substitutePromptArgs` — substitution, unmatched key throws, unused key warns, values
  containing `{{…}}` and `` !`…` `` stay inert.
- `extractTagged` + schema validation — happy path, missing tag, malformed JSON, schema
  mismatch, retry-by-resume, retry exhaustion.
- `classifyFailure` — one case per row of the §5.3 table.
- **Every schema in `schemas.ts`** — a valid payload, and one rejection case per
  constraint. The semantic checks get their own cases: a blocker referencing an undeclared
  id, a cyclic blocker graph, a ticket with no acceptance criteria, an inline comment on a
  line absent from the diff, a PR template name that is not a real file.
- **Registry completeness** — every key in `OUTPUTS` has a `models.ts` entry, a prompt
  file on disk, and a `{{OUTPUT_SCHEMA}}` placeholder in that prompt. This is the test that
  catches derive-don't-duplicate drift, so it runs on every commit.
- `topologicalSortTickets` — linear chain, diamond, cycle, orphan.
- `frontier` — blocked, unblocked, assigned, no children.
- Each `scripts/agents/<stage>.ts` — the orchestration, with `runAgent` and Octokit both
  doubled: asserts the right prompt args, the right labels, the right posted payload.

**Fixtures are typed by the schema, not hand-annotated.** A fixture builder returns
`z.infer<typeof Schema>`, so a schema change breaks the fixtures at compile time rather
than producing tests that pass against a shape the pipeline no longer accepts.

### Conformance changes this work requires

Three gaps between `AGENTS.md` and `vitest.config.ts` surfaced while specifying this, and
they must be closed as part of the work because the new code is load-bearing:

1. **Coverage excludes `scripts/`.** `vitest.config.ts` sets
   `include: ["src/**/*.{ts,tsx}"]`, so the 100% threshold `AGENTS.md` describes as
   universal has never applied to the agent scripts. Add `scripts/**/*.ts` to the
   coverage `include`.
2. **No `onConsoleLog` hook exists.** `AGENTS.md` §5 states console output fails the run
   via that hook; it is not in the config. Add it, and route the agent scripts' existing
   `console.log`/`console.error` through a logger that is silent under test.
3. **Existing specs sit beside their sources**, not in `__tests__`, contrary to
   `AGENTS.md` §4. New tests go in `scripts/agents/__tests__/`.

Every test keeps to the repo standard: AAA block comments, <50 ms, no console output, no
inline `vi.mock` factories.

## 7. Out of scope

- **Agents merging pull requests.** Merging is manual, permanently. No workflow calls
  `gh pr merge`; there is no merge label and no `/merge` command.
- **Adopting Sandcastle as a dependency.** Its value is sandboxing and worktree
  parallelism, which a GitHub-hosted runner already provides. Revisit only if the
  pipeline moves to a self-hosted runner.
- **Self-hosted runners** and therefore the 1,000 req/day OAuth tier.
- **Antigravity CLI (`agy`).** Interactive OAuth only, self-updating proprietary binary,
  no documented headless contract.
- **Parallel implementation agents.** One ticket per run; the frontier is worked
  sequentially in v1.
- **`/triage`.** It is for incoming issues from other people; this pipeline handles work
  you originate.
- **The Google Stitch design-mockup flow.** Currently non-functional (it writes to an
  ephemeral checkout). Removed in teardown; re-specify separately if wanted.
- **Migrating existing open issues** beyond the label rename in Ticket 13.

## 8. Work breakdown

Tracer-bullet vertical slices, each demoable on its own.

> **Bootstrapping note:** these tickets are built by hand, not by the pipeline — it does
> not exist yet. From Ticket 9 onward you can dogfood it on real feature work.

| # | Ticket | Blocked by | Delivers |
| :-- | :--- | :--- | :--- |
| **1** | **Repo foundation for agent skills** | — | `/setup-matt-pocock-skills` output committed; skills vendored to `.agents/skills/` at a pinned SHA; `CONTEXT.md`; `CODING_STANDARDS.md`; ADRs relocated; all `{role}:{status}` labels created; `GEMINI_API_KEY` + `AGENT_PAT` set. **Demo:** `gemini skills list` in the repo shows the vendored skills. |
| **2** | **Tear down the dead agents** | — | Delete `agent-developer.{ts,spec.ts}`, `agent-reviewer.{ts,spec.ts}`, their two workflows, `agent-developer.md`, `agent-reviewer.md`. Justified by F1/F2 — they provably do not do their documented job. Planner and itemizer keep running. **Demo:** CI green, no behaviour lost. |
| **3** | **Tracer bullet: runner skeleton + dispatch** | 1 | `run-agent.ts` (text only, injected `spawn`, JSONL parsing), `github.ts` moved from `agent-shared.ts`, `models.ts`, and `agent-dispatch.yml` handling one command end to end. **Demo:** comment `/ping` on an issue → Gemini responds in a comment. Proves auth, skills, labels, posting, and the seam. |
| **4** | **Complete the runner** | 3 | `{{KEY}}` substitution, `{{OUTPUT_SCHEMA}}` injection, completion signal, `<tag>` extraction, Zod validation with retry-by-resume, `expectSkill` assertion, failure classification, `failure_reason.txt`, `usage.jsonl`. Coverage + `onConsoleLog` config changes from §6. **Demo:** a fixture-driven suite covering every row of the §5.3 table. |
| **5** | **Schema registry** | 3 | `schemas.ts` with the `OUTPUTS` registry, every stage schema, the `.superRefine` semantic checks, derived `Stage`/`OutputOf` types, `as const` label and enum sources, and the registry-completeness test. Convert `models.ts` to be keyed by `Stage`. **Demo:** deleting a `models.ts` entry, or a prompt file, fails `bun run check:types` or a unit test — not a workflow run. |
| **6** | **Grill loop** | 4, 5 | `agent-grill.yml` + `grill.ts` + `grill.md`. Label → questions → `needs-info`; human comment → next round; frontier empty → `spec:needed`. **Demo:** label an issue, answer, get round 2, watch it hand off. |
| **7** | **Spec publication** | 6 | `agent-spec.yml` + `spec.ts` + `spec.md`. Publishes to the issue body preserving the original proposal, posts seams as a comment, applies `spec:ready` + `ready-for-agent`, chains `tickets:needed`. **Demo:** a grilled issue becomes a spec unattended. |
| **8** | **Ticket breakdown and wiring** | 7 | `agent-tickets.yml` + `tickets.ts` + `tickets.md`; `wiring.ts` refactored from `agent-itemizer.ts`. Quiz comment → `/approve` → sub-issues + native `blocked_by` + milestone; strips `ready-for-agent` from the parent; labels the frontier `dev:needed`. **Demo:** a spec becomes a wired dependency graph visible in GitHub's UI. |
| **9** | **Implementation agent** | 4, 5 | `agent-implement.yml` + `implement.ts` + `implement.md`. Shape guards, branch, TDD run, `bun run validate`, commit assertion, push, draft PR, chain `review:needed`. **Demo:** label a hand-written ticket → a draft PR with tests appears. |
| **10** | **Two-axis review** | 9 | `agent-review.yml` + `review.ts` + two prompts. Axes as two separate runs; structured output; inline comments filtered against the diff line map; reported side by side, never merged. **Demo:** a PR receives a Standards and a Spec review. |
| **11** | **Fix round and the two-round cap** | 10 | `agent-implement-pr.yml` + `implement-pr.ts` + `implement-pr.md`; `review:round-1`/`round-2`/`approved`/`escalated` transitions. **Demo:** review finds an issue → agent fixes it → round 2 approves. |
| **12** | **Frontier advance** | 8, 11 | `agent-frontier.yml` + `frontier.ts`. On human merge: close the ticket, label newly unblocked tickets `dev:needed`, close the parent when empty. **Demo:** merging ticket 1 starts ticket 2 unattended. |
| **13** | **Final teardown and label migration** | 6, 8, 11, 12 | Delete `agent-planner.{ts,spec.ts}`, `agent-itemizer.{ts,spec.ts}`, their workflows, the three forked skills, `feature-spec-template.md`, `@google/genai`, `docs/ai-sdlc-lifecycle.md`. Migrate hyphenated labels to `{role}:{status}` and delete the old ones. **Demo:** no `@google/genai` in the tree; pipeline still green. |
| **14** | **Wayfinder (optional)** | 8 | `agent-wayfinder.yml`, `wayfinder:*` labels, `agent-research.yml` for AFK research tickets. **Demo:** a loose idea becomes a decision map. |

Frontier after Ticket 5 splits: **6 → 7 → 8** (planning) and **9 → 10 → 11**
(execution) run in parallel, converging at 12.

Tickets 1 and 2 are independent and can start immediately.

## 9. Risks

1. **The free tier will bind quickly.** 250 requests/day, Flash only. With `implement` on
   Gemini this is ~2 tickets/day. Enable pay-as-you-go before Ticket 9 and log usage from
   Ticket 4 so the decision is data-driven.
2. **Flash on `implement` is the weakest link in this design.** If PR quality
   disappoints, the first lever is `pro` (one line in `models.ts`), the second is
   `cli: "claude"` (one field).
3. **`pull_request_target`** runs with secrets against a PR head. Safe on a private repo;
   if Watchpoint is public, gate on `authorAssociation`.
4. **Skill-activation drift.** Gemini activates by description match. Mitigated by naming
   skills explicitly and the `expectSkill` assertion — treat any `skill-miss` as a prompt
   bug, not a flake.
5. **Concurrency.** `agent-review` and `agent-implement-pr` must share one `concurrency`
   group per PR or the review and fix rounds will race the branch.
6. **Plugin drift.** Vendoring at a pinned SHA makes upgrades a reviewable commit rather
   than a silent change under a running pipeline.
7. **Schema strictness costs requests.** Every rejected payload is a retry. Retry-by-
   resume keeps that to one request rather than a full re-run, but a schema that is too
   strict or too baroque will burn quota on a stage that was nearly right. If a stage
   retries often, the fix is almost always to **flatten the schema** (§5.4) rather than to
   loosen validation — and `usage.jsonl` plus the `bad-output` classification tell you
   which stage is the offender.
8. **Semantic checks are the ones that matter and the ones easiest to forget.** A
   perfectly-shaped ticket breakdown whose blockers reference ids that do not exist will
   pass Zod and produce a broken dependency graph. Treat every new payload field that
   *refers to something else* as requiring a `.superRefine`, not just a type.
9. **Autonomy has a ceiling, by choice.** Three planning gates plus your merge gate. The
   pipeline is asynchronous before `dev:needed`, autonomous from `dev:needed` to
   `review:approved`, then stops.
