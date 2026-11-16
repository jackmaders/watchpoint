# Implementation handoff: Watchpoint UX and Catppuccin

## Task and authorization

The user selected **Catppuccin** after the review and requested this plan for a new implementing agent. This supersedes the earlier Graphite recommendation. This document does not apply the theme itself.

Implement the selected Catppuccin theme and necessary portability/accessibility corrections as the first independent scope. The review's broader UX repairs are specified below for a separate implementation decision; theme selection alone must not be represented as explicit approval of every optional improvement or refactor. Do not change dependencies, package scripts, test/build/lint settings, deployment definitions or CI without explicit approval under AGENTS.md.

## Starting context

- Workspace: `/home/jackw/.herdr/worktrees/watchpoint/worktree-rapid-harbor-2da6`.
- Review baseline: branch `worktree/rapid-harbor-2da6`, SHA `bca8e8ec1a47d7a1b8a7a1408c9eda044ddb2a7e`. Inspect current status before editing; review files and two Playwright files were untracked at handoff. Preserve them and any newer user changes. A new checkout will need these uncommitted artifacts copied or committed by the user.
- Read AGENTS.md, `docs/agents/workflow.md`, architecture, coding standards and testing guides. Apply Ponytail and shadcn guidance; use applicable TanStack guides only for work touching those integrations.
- Installed component family: Base UI/shadcn `base-nova`, Tailwind v4, Geist. Preserve installed component defaults, variants, spacing and geometry. No registry overwrite or full preset CLI installation.
- Product: Overwatch VOD catalogue → timed multiple-choice Checkpoints → feedback/resume/review → score/reset. Answers currently live only in memory.
- Detailed findings, exact file anchors and source registers are linked from [README.md](README.md). Read [theme.md](theme.md) before implementation.

## Phase 1: selected theme and portability

1. Inspect `src/app/styles/index.css` and `theme.css`. The former imports the latter then overrides common light/dark colors and radius. Make `theme.css` the single source of palette values; keep framework mappings and intentional Nova geometry in the appropriate stylesheet. Remove conflicting declarations, not the mappings that consume them. Update the root README's theme-replacement instructions if needed.
2. Start with the dated Catppuccin light/dark palette snapshot in `evidence/theme-palettes.json`, using the source link in theme.md for provenance. Preserve purple primary, navy dark surfaces and the existing Geist font. The preview snapshot is partial: inspect and deliberately complete all semantic pairs used by installed components, including popover, destructive and status styling; do not copy unrelated preset typography, shadows or sidebar/chart additions blindly.
3. Correct shared semantic values rather than adding per-page colors or dark-mode overrides. Measured popup descriptions are **3.20:1 light / 4.10:1 dark**; ordinary text must reach at least 4.5:1 on every actual surface. Light muted/page screens at 4.37:1. Adjust muted foreground and/or surfaces to satisfy page/card/popover pairs together.
4. Fix the light popup password boundary: border/fill and adjacent surface currently coincide at **1.00:1**. Ensure controls remain identifiable unfocused and focused on cards and popovers in both modes. Target 3:1 for visual boundaries/state information needed to identify the control; judge actual adjacent colors, not decorative separators.
5. Resolve the light cyan accent's white text screening risk (**2.79:1**) wherever that pair is used. Prefer a suitably dark semantic accent foreground or adjusted accent; retain the palette identity. Verify actual enabled hover/selected text at 4.5:1. Current selected checkpoint text is 5.41:1 light / 8.07:1 dark before changes; preserve adequate contrast.
6. Verify focus using the complete indicator. Existing Nova `ring/50` is translucent; composite over actual surfaces. Catppuccin popup solid focused borders measured 3.51:1 light / 4.49:1 dark, while outer rings measured 1.90/2.28. Do not declare a failure solely from the outer ring when the solid border identifies focus. Keep default primitive styling; first solve deficiencies with shared tokens.
7. Audit raw emerald answer colors and native/custom controls for theme escape hatches. Use installed primitives/variants where they preserve wrapping and behavior. Necessary layout classes and the black media backing may remain. Avoid a new abstraction or bespoke component skin.

Acceptance: actual source theme is Catppuccin in light/dark; replacing palette values is no longer overridden; default Nova components stay intact; text/control/focus/hover/status checks pass on form, overlay, catalogue and dense player. Capture before/after screenshots at the same viewport and record changed tokens and measured pairs. Validate invalid, loading, empty, success, selected and disabled states, distinguishing disabled exceptions from enabled requirements. Do not present token calculations alone as complete accessibility certification.

## Phase 2: proposed UX repair scope

Keep this separate from the theme change and obtain approval if the user has only approved the theme:

- **Player accessibility (F3/F4):** deliberate announcement/focus behavior when automatic questions appear, concise result/completion status, visible Correct answer/Your answer cues. Mobile prompt extends below the fold while focus remains on another timestamp; preserve keyboard continuity without forcing disruptive focus changes on every update. Files: player prompt/page/session. Preserve single-attempt scoring, review and resume behavior.
- **Auth/recovery (F1/F2/F5/F7):** disclose and match the existing eight-character password minimum without changing policy; preserve a validated same-app destination through authentication; actionable router-error retry; honest zero-checkpoint empty state. Test invalid/external return destinations. Keep submitted drafts on failure.
- **Navigation (layout report):** skip-to-main link and visible drawer close action using the installed primitive. Escape already works. No dialog-clipping repair is needed: 320×568 signup fit, and tested widths had no horizontal overflow.
- **Sign-out:** existing error toast works. Pending/inline polish is optional, not a verified missing-feedback defect.

## Deferred work

Do not silently bundle answered counts, richer checkpoint labels, always-available Clear filters, new help, preserved catalogue-return context, About copy, persistence, mistake-review flows or profile promotion. They are opportunities needing scope approval. Optional simplifications in simplification.md likewise remain separate: unused form aliases, redundant answered-ID Set and direct props/query forwarding. Preserve synchronous refs, external player Effects, draft versus committed URL state and pending navigation distinctions.

## Validation and delivery

Use existing tooling/settings. Run `vp install` per AGENTS, focused checks during work, then `vp check`, `vp test`, `vp test --coverage`, `vpr check:full`, `vpr check:ci` and `vpr test:browser` as required. Never pass coverage on a single path. Inspect package scripts/tasks before choosing commands. Use preview Cloudflare environment and migrated preview D1; the wrong build mode previously caused signup failures. Follow browser.md replay recipes and current configuration rather than inventing environment changes.

Review evidence: corrected baseline 37 Chromium passes; six added journeys passed Chromium and Firefox; coverage 274 tests/56 files/100%. These are historical, not validation of the implementation. WebKit lacked system libraries. Full checks stopped on existing formatting. Reproduce and report blockers without unrelated formatting/config changes. New tests are `tests/browser/review-journeys.test.ts` and `mobile-review.test.ts`; retain them. Deterministic YouTube tests mock the player; real playback and manual screen-reader announcements were not established.

Test desktop/mobile at 320/768/1024/1280 widths, 320×568 overlays, keyboard entry/escape/focus restoration, long options and feedback. Add outcome-based tests for changed behavior, accessible locators and observable assertions; do not add tests that merely mirror token declarations. Report actual commands/results, mocks and remaining gaps.

Deliver small reviewable changes, final diff against accepted scope, screenshots/contrast evidence, and an updated validation handoff. No deployment, publication, dependency changes or unrelated refactors are part of this task.
