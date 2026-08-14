# Engineering Workflows & Skill Sequences

This guide defines how skills link together into sequential workflows for different scopes of work, and what skill to trigger at each step.

---

## 1. Universal Starting Point: `/triage`

All work (new issues, bugs, and feature requests) starts with `/triage`.

```mermaid
graph TD
    A["New Issue"] --> B["/triage"]
    B -->|Large Milestone / Epic| C["Prompt: /wayfinder"]
    B -->|Medium / Small Feature| D["Prompt: /grill-me"]
    B -->|Defect / Regression| E["Prompt: /diagnosing-bugs"]
    B -->|Trivial Bug Fix| F["Prompt: /to-spec"]
```

---

## 2. Workflows by Scope

### Milestone Workflow (High Ambiguity / Epic)

```mermaid
graph LR
    A["/triage"] --> B["/wayfinder"]
    B --> C["/to-spec"]
    C --> D["/to-tickets"]
    D --> E["/implement"]
    E --> F["/code-review"]
```

1. **Triage**: Run `/triage` on the epic issue. Agent prompts: *"This is a milestone with significant fog. Run `/wayfinder`."*
2. **Wayfinding**: Run `/wayfinder` to build the Map issue and work unblocked decision tickets.
3. **Specification**: When all fog is resolved on the Map, the agent prompts: *"Map destination reached. Run `/to-spec` for each feature."*
4. **Ticket Slicing**: Run `/to-tickets` on each specification to produce dependency-wired issues (`ready-for-agent`).
5. **Implementation**: Run `/implement` on each unblocked child ticket.
6. **Review**: Run `/code-review` on opened PRs.

---

### Medium Feature Workflow (Multi-Ticket)

```mermaid
graph LR
    A["/triage"] --> B["/grill-me"]
    B --> C["/to-spec"]
    C --> D["/to-tickets"]
    D --> E["/implement"]
    E --> F["/code-review"]
```

1. **Triage**: Run `/triage` to classify as `[enhancement, needs-triage]`. Agent prompts: *"Run `/grill-me` on #[issue-number]."*
2. **Grilling**: Run `/grill-me` (or `/grill-with-docs`) to answer trade-off and edge-case questions. Once answered, the agent prompts: *"Decisions settled. Run `/to-spec`."*
3. **Specification**: Run `/to-spec` to publish the implementation spec onto the issue body. Agent prompts: *"Spec published. Run `/to-tickets` to split into tasks."*
4. **Ticket Slicing**: Run `/to-tickets` to generate sub-issues labeled `ready-for-agent`.
5. **Implementation**: Run `/implement` on unblocked child tickets in dependency order.
6. **Review**: Run `/code-review` on opened PRs.

---

### Small Feature Workflow (Single Session)

```mermaid
graph LR
    A["/triage"] --> B["/grill-me"]
    B --> C["/to-spec"]
    C --> D["/implement"]
    D --> E["/code-review"]
```

1. **Triage**: Run `/triage` to classify as `[enhancement, needs-triage]`. Agent prompts: *"Run `/grill-me` for a quick round."*
2. **Grilling**: Run 1 quick round of `/grill-me`. Once answered, the agent prompts: *"Run `/to-spec`."*
3. **Specification**: Run `/to-spec` to record the compact specification directly on the issue. Agent prompts: *"Spec ready. Run `/implement`."*
4. **Implementation**: Run `/implement` to create branch, write tests first with TDD, and open a PR.
5. **Review**: Run `/code-review` on the PR.

---

### Bug Fix Workflow

```mermaid
graph TD
    A["/triage"] --> B{Complexity}
    B -->|Non-Trivial / Flaky / Regression| C["/diagnosing-bugs"]
    B -->|Trivial / Obvious Fix| D["/to-spec"]
    C --> D
    D --> E["/implement"]
    E --> F["/code-review"]
```

1. **Triage**: Run `/triage` to verify the bug against local code and tag `[bug]`.
   - **For complex / flaky / performance bugs**: The agent prompts: *"Run `/diagnosing-bugs` to build a tight feedback loop and find root cause."*
   - **For obvious bugs**: The agent prompts: *"Root cause clear. Run `/to-spec` to define the test seam."*
2. **Diagnosis (if needed)**: Run `/diagnosing-bugs` to build the red feedback loop, isolate minimal repro, and identify the root cause. Agent prompts: *"Diagnosis confirmed. Run `/to-spec`."*
3. **Specification**: Run `/to-spec` to lock down the test seam and regression criteria. Agent prompts: *"Run `/implement`."*
4. **Implementation**: Run `/implement` to write the failing test, apply fix, confirm green, and open PR.
5. **Review**: Run `/code-review` on the PR.

---

### Post-Milestone Review Workflow

```mermaid
graph LR
    A["Milestone Merged"] --> B["/improve-codebase-architecture"]
    B --> C["/grilling"]
    C --> D["/implement"]
```

1. **Review**: After merging a milestone to `main`, run `/improve-codebase-architecture`.
2. **Select Candidate**: Review the generated visual report and select a refactoring candidate. Agent prompts: *"Run `/grilling` on chosen module refactor."*
3. **Grill**: Run `/grilling` to lock the new deep module interface and test seams.
4. **Implement**: Run `/implement` to execute the refactoring PR.

---

## 3. Domain Model & ADR Synchronization Rule

```mermaid
sequenceDiagram
    participant Human as Developer
    participant Planning as Planning Skill (/grill-me, /wayfinder, /to-spec)
    participant Issue as GitHub Issue
    participant Coding as Coding Agent (/implement)
    participant Git as Git Repo (CONTEXT.md & docs/adr/)

    Human->>Planning: Run planning skill
    Planning->>Git: Consult existing CONTEXT.md & docs/adr/
    Planning->>Issue: Write proposed domain terms & ADR text inside Issue Body
    Human->>Coding: Run /implement on issue
    Coding->>Issue: Read proposed domain terms & ADR text
    Coding->>Git: Update CONTEXT.md & write docs/adr/000X-*.md on feature branch
    Coding->>Git: Commit code + documentation updates together in PR
```

- **During Planning (`/grilling`, `/wayfinder`, `/to-spec`)**: Do not edit git files. Document proposed `CONTEXT.md` terms and ADR details directly inside the GitHub issue under `## Proposed Domain & ADR Updates`.
- **During Implementation (`/implement`)**: The implementing agent reads the documented updates from the issue, updates `CONTEXT.md`, and creates the new `docs/adr/000X-*.md` file directly on the feature branch.
