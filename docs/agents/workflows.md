# Engineering Playbook & Workflows

A practical guide for planning, refining, and implementing work across different scopes using the engineering skills and issue tracking workflow.

---

## The Label Lifecycle

Every issue in the repo carries **1 Category label** and **1 State label**:

* **Categories**: 🐛 `bug`, ✨ `enhancement`
* **States**:
  * 🔴 `needs-triage` — Newly created or modified; needs maintainer evaluation.
  * 🟡 `needs-info` — Grilling questions posted; awaiting human response.
  * 🤖 `ready-for-agent` — Fully specified with acceptance criteria; ready for AFK/pair implementation.
  * 👤 `ready-for-human` — Requires human credentials, product judgment, or manual testing.
  * ⛔ `wontfix` — Out of scope or obsolete.

---

## 1. Planning a Large Milestone (High Ambiguity / Epic)

Use when an effort is too large for a single agent session and contains unknown APIs, unmade decisions, or architectural "fog of war."

```
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
1. **Initialize the Map**: Ask the agent: `"/wayfinder chart a map for [milestone goal]"`.
2. **Work the Frontier**: The agent identifies open, unblocked decision tickets. Work them one at a time:
   - For research tickets: The agent runs `/research` subagents against docs.
   - For prototype tickets: Build throwaway components to validate UX.
   - For grilling tickets: Answer technical interview questions.
3. **Lock in Decisions**: As decisions settle, the agent records terms in `CONTEXT.md` and generates ADRs in `docs/adr/`.
4. **Graduate to Specs**: Once all tickets on the Map close, ask the agent to run `/to-spec` on the settled architecture to produce formal feature specifications.
5. **Break Down & Build**: Run `/to-tickets` on each spec and build with `/implement`.

---

## 2. Planning & Building a Medium Feature (Multi-Ticket)

Use for well-understood, multi-component features that span multiple layers (e.g. database schema + server action + UI component).

```
   New Issue / Idea
          │
          ▼
      /grill-me ────────► (Settles edge cases & updates CONTEXT.md / ADRs)
          │
          ▼
      /to-spec ─────────► (Writes formal spec & testing seams to issue body)
          │
          ▼
    /to-tickets ────────► (Creates dependency-wired child tickets: ready-for-agent)
          │
          ▼
      /implement ───────► (Builds each ticket with /tdd + /code-review)
```

### Steps:
1. **Grill Requirements**: Tell the agent: `"Grill me on #[issue-number]"`. Answer the 3–5 targeted questions.
2. **Draft the Spec**: Tell the agent: `"Turn the conversation into a spec with /to-spec"`.
3. **Create Slices**: Tell the agent: `"Break down the spec with /to-tickets"`.
4. **Build**: Tell the agent: `"Implement #[child-ticket-number] using TDD"`.
5. **Review**: Automated `/code-review` verifies standards and spec criteria before merging.

---

## 3. Planning & Building a Small Feature (Single Session)

Use for compact, focused features (e.g. a keyboard shortcut, an isolated button, a small UI drawer).

```
   Issue (needs-triage)
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
1. Run a fast grilling round: `"Grill me on #[issue-number]"`.
2. Generate spec: `"Run /to-spec on #[issue-number]"`.
3. Implement directly: `"Implement #[issue-number] using /tdd and open a PR"`.

---

## 4. Triaging & Fixing a Bug

Use for defects, broken flows, or runtime regressions.

```
   Reported Bug
        │
        ▼
     /triage ──────────► (Checks codebase, reproduces defect, labels [bug])
        │
        ▼
     /to-spec ─────────► (Identifies highest test seam & regression test criteria)
        │
        ▼
    /implement ────────► (Writes failing test ➔ fixes bug ➔ verifies sub-50ms test)
        │
        ▼
    PR & Merge
```

### Steps:
1. **Triage & Verify**: Ask the agent: `"Triage issue #[issue-number]"`. The agent verifies the bug against local code and adds `bug`.
2. **Define Test Seam**: Ask: `"Create a bugfix spec for #[issue-number]"`.
3. **Fix with TDD**: Ask: `"Implement the fix for #[issue-number] with /tdd"`. The agent writes a failing test first, patches the bug, confirms green, and submits a PR.

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
