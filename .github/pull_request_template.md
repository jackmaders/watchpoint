## Summary
<!-- Exactly ONE sentence in plain, simple English explaining what this PR achieves and why. -->

- **Issue:** Closes #

---

## Major Changes
<!-- A numbered list of the major steps/changes made to implement this. Keep it high-level, clear, and easy to follow (avoid dumping file paths or raw code diffs). -->
1. 

<!--
### Bug Fix Details (Only for bug fixes)
- **Root Cause:** Plain-English explanation of why it broke (symptom masking is prohibited).
- **Resolution:** How this change resolves it permanently.
-->

<!--
### UI Changes (Only for user-visible changes)
- Attach screenshot / video or note "N/A — no UI change".
-->

---

## Architectural & Quality Checklist

- [ ] **Routing & Slices:** Route files in `app/routes/` remain thin; slice logic resides in `src/pages/<slice-name>/` with clean public exports.
- [ ] **Tests:** Unit tests follow Arrange-Act-Assert (AAA), execute under 50ms, and maintain 100% coverage.
- [ ] **Validation:** `bun run validate` passes cleanly (types, linter, architecture, coverage, build).
