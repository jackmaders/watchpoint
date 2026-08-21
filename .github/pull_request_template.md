## Link Issue
Closes #

## Summarize Purpose
<!-- Write exactly ONE sentence in Simplified Technical English (STE-1000 style: active voice, short, zero jargon) explaining what this PR achieves and why. -->
<!-- RULE: If you cannot convey the full technical change in one sentence without using the word "and", split this work into multiple PRs. -->


## Review Key Changes
<!-- Provide a numbered list (1-4 items) of major changes to guide the reviewer. Link to key files/symbols where helpful. -->
1. 

## Document Trade-offs
<!-- Explain any non-obvious decisions, trade-offs, or discarded alternatives. If none, write "None — standard implementation". -->
- 

## Verify Guardrails
<!-- Verify all non-CI guardrails before submitting. -->
- [ ] **Atomic PR:** Diff is under 300 total lines and under 150 active lines (excluding database migrations, snapshots, and unit tests). If larger, split into a stack.
- [ ] **Meaningful Tests:** Tests verify real observable behavior with independent expected literals; zero tautological mock assertions.
- [ ] **Pages-First FSD:** Code starts in `src/pages/<slice-name>/` with thin `app/routes/` re-exports; no premature extraction to other layers unless reused.
- [ ] **Scope & Future Cleanups:** Zero unsolicited scope creep; potential future improvements are logged as follow-up notes rather than bundled here.
