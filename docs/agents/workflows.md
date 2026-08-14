# Engineering Playbook & Workflows

A practical guide for planning, refining, diagnosing, and implementing work across different scopes using the engineering skills and issue tracking workflow.

---

## Universal Entry Point: `/triage`

**Every new issue (milestone, feature, or bug) begins at `/triage`.**

When `/triage` runs, it inspects the request against the codebase and domain documentation to assign:
1. **1 Category label**: 🐛 `bug` or ✨ `enhancement`
2. **1 State label**: 🔴 `needs-triage`, 🟡 `needs-info`, 🤖 `ready-for-agent`, 👤 `ready-for-human`, or ⛔ `wontfix`

### What Documents Does `/triage` Read?

Before recommending an action or label, `/triage` automatically consults:
1. **`docs/agents/issue-tracker.md`** — Tracker conventions (GitHub `gh` CLI commands, PR triage settings).
2. **`docs/agents/triage-labels.md`** — The label dictionary mapping canonical roles to tracker labels.
3. **`CONTEXT.md` (via `docs/agents/domain.md`)** — Ubiquitous language, domain entities, and glossary definitions.
4. **`docs/adr/`** — Architectural Decision Records, ensuring the proposed request does not contradict past architectural choices.
5. **`.out-of-scope/*.md`** (if present) — Knowledge base of previously rejected or ruled-out proposals.
6. **The Issue/PR Body & Comments** — Prior triage notes, reporter conversation, and history.

---

## 1. Planning a Large Milestone (High Ambiguity / Epic)

Use when an effort is too large for a single agent session and contains unknown APIs, unmade decisions, or architectural "fog of war."

```
                     /triage (Categorise & Route)
                                 │
                                 ▼
                    /wayfinder (Create Map Issue)
                                 │
                                 ▼
             Resolve Decision Tickets on the Frontier
     (🔬 /research, 🎨 /prototype, 🔥 /grilling, ⚙️ /task)
                                 │
            (Lock decisions into CONTEXT.md & docs/adr/)
                                 │
                                 ▼
       Map Destination Reached (All decisions locked in Map)
                                 │
                                 ▼
            /to-spec (Generate Mid-Sized Feature Specs)
                                 │
                                 ▼
           /to-tickets (Slice into ready-for-agent Issues)
                                 │
                                 ▼
                    /implement (via /tdd)
```

### Steps:
1. **Triage the Epic**: Run `/triage` to classify as `[enhancement, ready-for-human]`.
2. **Initialize the Map**: Ask the agent: `"/wayfinder chart a map for [milestone goal]"`.
3. **Work the Frontier**: The agent identifies open, unblocked decision tickets. Work them one at a time:
   - For research tickets: The agent runs `/research` subagents against docs.
   - For prototype tickets: Build throwaway components to validate UX.
   - For grilling tickets: Answer technical interview questions.
4. **Lock in Decisions**: As decisions settle, the agent records terms in `CONTEXT.md` and generates ADRs in `docs/adr/`.
5. **Graduate to Specs**: Once all tickets on the Map close, ask the agent to run `/to-spec` on the settled architecture to produce formal feature specifications.
6. **Break Down & Build**: Run `/to-tickets` on each spec and build with `/implement`.

---

## 2. Planning & Building a Medium Feature (Multi-Ticket)

Use for well-understood, multi-component features that span multiple layers (e.g. database schema + server action + UI component).

```
                 /triage (Categorise as enhancement)
                                 │
                                 ▼
                             /grill-me 
             (Settles edge cases & updates CONTEXT.md / ADRs)
                                 │
                                 ▼
                             /to-spec 
             (Writes formal spec & testing seams to issue body)
                                 │
                                 ▼
                           /to-tickets 
             (Creates dependency-wired child tickets: ready-for-agent)
                                 │
                                 ▼
                           /implement 
             (Builds each ticket with /tdd + /code-review)
```

### Steps:
1. **Triage**: Run `/triage` to inspect existing code and verify it's not already implemented.
2. **Grill Requirements**: Tell the agent: `"Grill me on #[issue-number]"`. Answer the 3–5 targeted questions.
3. **Draft the Spec**: Tell the agent: `"Turn the conversation into a spec with /to-spec"`.
4. **Create Slices**: Tell the agent: `"Break down the spec with /to-tickets"`.
5. **Build**: Tell the agent: `"Implement #[child-ticket-number] using TDD"`.
6. **Review**: Automated `/code-review` verifies standards and spec criteria before merging.

---

## 3. Planning & Building a Small Feature (Single Session)

Use for compact, focused features (e.g. a keyboard shortcut, an isolated button, a small UI drawer).

```
   /triage (Categorise as enhancement)
          │
          ▼
      /grill-me (1 quick round of 2-3 questions)
          │
          ▼
      /to-spec (Writes concise spec directly on issue)
          │
          ▼
      /implement (Creates branch, writes tests first, opens PR)
          │
          ▼
      /code-review & Merge
```

### Steps:
1. Run `/triage` on the issue.
2. Run a fast grilling round: `"Grill me on #[issue-number]"`.
3. Generate spec: `"Run /to-spec on #[issue-number]"`.
4. Implement directly: `"Implement #[issue-number] using /tdd and open a PR"`.

---

## 4. Triaging, Diagnosing & Fixing a Bug

Use for defects, broken flows, runtime exceptions, or performance regressions.

```
   Reported Defect
          │
          ▼
       /triage (Verify claim, check redundancy, tag [bug])
          │
          ▼
   Is it obvious or hard/flaky?
     ├── OBVIOUS ───────────────────────────────┐
     │                                          │
     ▼                                          ▼
   /to-spec (Define test seam)           /diagnosing-bugs
     │                                  (6-Phase Discipline)
     │                                    1. Build tight feedback loop
     │                                    2. Reproduce & minimise
     │                                    3. 3-5 Ranked hypotheses
     │                                    4. Targeted instrumentation
     │                                    5. Failing test ➔ Fix ➔ Green
     │                                    6. Cleanup & post-mortem
     │                                          │
     └──────────────────┬───────────────────────┘
                        ▼
                   /implement (via /tdd)
                        │
                        ▼
                   /code-review & Merge
```

### The `/diagnosing-bugs` Discipline for Non-Trivial Bugs:
1. **Phase 1 — Build a Feedback Loop**: Create a fast, deterministic, agent-runnable command that goes RED on this specific symptom (e.g. unit test, curl script, Playwright test).
2. **Phase 2 — Reproduce & Minimise**: Strip all non-load-bearing inputs/config until only the minimal reproduction remains.
3. **Phase 3 — Hypothesise**: Formulate 3–5 falsifiable hypotheses (*"If X is the cause, changing Y will make it disappear"*).
4. **Phase 4 — Instrument**: Insert targeted debug logs prefixed with `[DEBUG-xxxx]` (or use breakpoints). Change one variable at a time.
5. **Phase 5 — Fix & Regression Test**: Turn the minimised repro into a permanent regression test at the correct seam, apply the fix, and confirm GREEN.
6. **Phase 6 — Cleanup & Post-Mortem**: Remove all `[DEBUG-xxxx]` logs, document root cause in PR commit message, and hand off any architectural lessons to `/improve-codebase-architecture`.

---

## 5. Post-Milestone Architectural Health Check

Use periodically after merging a large milestone or batch of features to prevent technical debt and shallow module accumulation.

```
   Milestone Merged
          │
          ▼
   /improve-codebase-architecture
          │
          ▼
   Visual HTML Report (Mermaid Before/After diagrams opened in browser)
          │
          ▼
   Select Refactor Candidate
          │
          ▼
   /grill-me ➔ /implement (Surgical cleanup PR)
```

### Steps:
1. Trigger review: `"/improve-codebase-architecture"`.
2. Review the generated HTML report in your browser to inspect before/after module structures and test seams.
3. Select a high-impact candidate to refine and execute cleanly with `/implement`.

---

## Keeping `CONTEXT.md` & ADRs Synchronized

* **During Grilling / Wayfinding**: Skills edit `CONTEXT.md` and write `docs/adr/000X-*.md` directly in the repository as decisions are resolved.
* **During Implementation**: The new ADR and `CONTEXT.md` updates are committed to the feature branch alongside the code so they land in `main` together.
* **Stand-alone Doc PRs**: After large planning sessions, ask the agent: `"Commit the updated domain docs to a branch and open a PR"`.
