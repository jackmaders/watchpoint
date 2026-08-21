## Summary
<!-- Provide a concise 1-3 sentence summary of what this PR does and why. -->

- **Issue:** Closes #
<!-- - **Type:** Feature | Bug Fix | Refactor | Chore -->

---

## Changes Made
<!-- List the key changes in simple, clear bullet points. -->
- 

<!--
### Bug Fix Details (Only for bug fixes)
- **Root Cause:** Explain the underlying cause (symptom masking or silent fallbacks are prohibited).
- **Resolution:** How this change permanently fixes the issue.
-->

<!--
### UI Changes (Only for user-visible changes)
- Attach screenshot/recording (Light/Dark mode if applicable) or note "N/A — no UI change".
-->

---

## Architectural & Quality Checklist

- [ ] **Routing & Slices:** Route files in `app/routes/` remain thin; slice logic resides in `src/pages/<slice-name>/` with clean public exports.
- [ ] **Tests:** Unit tests follow Arrange-Act-Assert (AAA), execute under 50ms, and maintain 100% coverage.
- [ ] **Validation:** `bun run validate` passes cleanly (types, linter, architecture, coverage, build).
