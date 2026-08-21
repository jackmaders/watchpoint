<!--
- Prioritize extreme conciseness, simplicity, and human readability above all else.
- Write in Simplified Technical English (STE-1000 style): active voice, short sentences, and zero jargon.
- Avoid low-level code dumping, file list repetition, or boilerplate filler text.
-->

## Link Issue
Closes #

## Summarize Purpose
<!-- Write exactly ONE sentence in STE-1000 style explaining what this PR achieves and why. -->
<!-- RULE: If you cannot convey the full technical change in one sentence without using the word "and", split this work into multiple PRs. -->


## Review Key Changes
<!-- Provide a numbered list (1-4 items) of major changes to guide the reviewer. Link to key files/symbols where helpful. -->
1. 

## Document Trade-offs
<!-- Explain any non-obvious decisions, trade-offs, or discarded alternatives. Include any coverage exceptions in the test suite. If none, write "None — standard implementation". -->
- 

## Note Future Improvements
<!-- List any deferred cleanups, follow-up tickets, or potential future refactors identified during this work. If none, write "None". -->
- 

## Verify Guardrails
<!-- Diff must be under under 150 active lines (excluding database migrations, snapshots, and unit tests). If larger, split into a stack. -->
- [ ] **Atomic PR:** Sized under 150 lines for rapid review

<!-- Tests must verify observable behavior with independent expected literals. Tautological mock assertions are prohibited. -->
- [ ] **Meaningful Tests:** Real behavior verified without tautological mocks

<!-- All single-use Logic and UI must reside in src/pages/<slice-name>/ with thin app/routes/ re-exports. Do not extract to other layers unless reused. -->
- [ ] **Pages-First FSD:** Slices self-contained without premature extraction
