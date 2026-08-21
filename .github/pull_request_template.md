## Link Issue
Closes #

## Summarize Purpose
<!-- Write exactly ONE sentence in Simplified Technical English (STE-1000 style: active voice, short, zero jargon) explaining what this PR achieves and why. -->
<!-- RULE: If you cannot convey the full technical change in one sentence without using the word "and", split this work into multiple PRs. -->


## Review Key Changes
<!-- Provide a numbered list (1-4 items) of major changes to guide the reviewer. Link to key files/symbols where helpful. -->
1. 

## Document Trade-offs & Future Work
<!-- Explain non-obvious decisions, trade-offs, discarded alternatives, and any deferred improvements or future refactors. If none, write "None — standard implementation". -->
- 

## Verify Guardrails
<!-- Diff must be under 300 total lines and under 150 active lines (excluding database migrations, snapshots, and unit tests). If larger, split into a stack. -->
- [ ] **Atomic PR:** Sized under 300 lines for rapid review

<!-- Tests must verify observable behavior with independent expected literals. Tautological mock assertions are prohibited. -->
- [ ] **Meaningful Tests:** Real behavior verified without tautological mocks

<!-- Logic and UI must reside in src/pages/<slice-name>/ with thin app/routes/ re-exports. Do not extract to other layers unless reused. -->
- [ ] **Pages-First FSD:** Slices self-contained without premature extraction

<!-- Changes must remain strictly within ticket scope. Log potential future cleanups separately rather than bundling them here. -->
- [ ] **Strict Scope:** Zero opportunistic refactoring or creep
