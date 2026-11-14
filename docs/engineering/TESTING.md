# Testing

Applies when implementing new behavior or writing, reviewing, or organizing tests.

## Naming

- Place unit tests in a colocated `__tests__` directory and name them
  `<module>.spec.ts` or `<module>.spec.tsx`.
- Keep each source module's unit tests in one matching test file, including
  validation, error, and recovery scenarios.
- When a test requires the Cloudflare Workers runtime, place it in
  `__tests__/workers/` and name it `<module>.spec.ts`.
- Place browser tests in `tests/browser/` and name them `<scenario>.test.ts`.
- Place browser test page objects in `tests/browser/page-objects/` and component
  objects in `tests/browser/page-objects/components/`, exporting them through
  `tests/browser/page-objects/index.ts`. Follow the guidelines in
  [.agents/skills/playwright-best-practices/SKILL.md](../../.agents/skills/playwright-best-practices/SKILL.md).

## Fixtures

- Place test data and mock factories in `tests/vitest/fixtures/` by domain
  (`session.ts`, `records.ts`, `images.ts`, `db.ts`) without `test-` or `mock-`
  prefixes, and import them via `@test/vitest/fixtures/<fixture>`.
- Name static reference records with `TEST_<ENTITY>` (e.g. `TEST_USER`,
  `TEST_RECORD`) and enforce deterministic timestamps and IDs.
- Provide `create<Entity>Fixture(overrides?)` factory functions when tests
  require customized copies of domain entities.
- Provide `createMock<Service>(...)` factory functions for mocked runtimes or
  databases.
- Never place test fixtures or mock helpers in un-prefixed directories under
  `src/` (such as `src/**/testing/`).

## Wrappers and mocks

- Test provider-backed libraries without mocking them:
  - Use `createTestingWrapper` or `renderWithProviders` from
    `tests/vitest/wrappers/testing-wrapper.tsx` (`@test/vitest/wrappers/testing-wrapper`)
    for `@tanstack/react-query` and `@tanstack/react-router`.
  - Use `createFormWrapper` or `renderWithForm` from
    `tests/vitest/wrappers/form-wrapper.tsx` (`@test/vitest/wrappers/form-wrapper`)
    for `@tanstack/react-form` components.
- Avoid inline `vi.mock(import(...), () => ...)` factory functions in spec files.
  Use colocated `__mocks__/` files for local modules, `{ spy: true }` when
  spying on real implementations, or root `__mocks__/` files for third-party
  packages.
- Use `Promise.withResolvers<T>()` instead of custom `createDeferred` helpers.

## Unit tests

- When implementing new behavior, first write a failing test stating
  the expected result.
- Make test preconditions explicit and keep setup simple. Routine behavior
  changes should affect only the relevant test data and expectations.
- Assert externally observable results so implementation changes that
  preserve behavior leave tests passing.
- Test expected exceptions, including their required recovery or
  propagation behavior.
- Separate test setup, the action under test, and assertions into distinct
  Arrange, Act, and Assert sections.
- Place all `expect` statements in the Assert section. Perform actions and capture
  their results before that section; assertion expressions should only inspect
  those results.
- Test one behavior per test. Split independent claims so each failure
  identifies the behavior that broke.
- Keep unit tests fast and runnable in any order. Isolate mutable state
  and control external inputs such as time, randomness, and network responses.
- Write branch-free test bodies (`vitest(no-conditional-in-test)`); keep all
  assertion flows linear inside `it()` blocks.
- Never write conditional assertions (if (...) expect(...)) or try/catch in tests; use expect(() => fn()).toThrow(...).
- Place `waitFor` expectations within Act/Assert blocks; assert mocked call counts
  explicitly (`toHaveBeenCalledTimes`) for memoization and caching verifications.

## Browser tests and Page Object Model

- Model every browser page, modal, or form interaction through page objects and component objects, following [.agents/skills/playwright-best-practices/SKILL.md](../../.agents/skills/playwright-best-practices/SKILL.md). Keep tests focused on intent and expectations while delegating locators and interactions to page objects.
- Place root page objects in `tests/browser/page-objects/` and nested UI dialog or form component objects in `tests/browser/page-objects/components/`. Export them from `tests/browser/page-objects/index.ts`.
- Expose locators as public properties on page and component objects so tests can run direct assertions against elements.
- Encapsulate navigation and user actions as intent-revealing methods on page objects (e.g. `goto()`, `submitCreate()`, `deleteItem()`).
- Keep test assertions in the test files. Page objects encapsulate elements and interaction mechanics; test files state expectations and verify behavior.
- Decompose complex dialogs and nested forms into discrete component objects under `tests/browser/page-objects/components/` (one class per file) to keep classes focused and comply with class length limits.
- Run browser test suites with `vpr test:browser`.

## Diagnostics and reporters

- Test and check outputs default to minimal reporters (such as `dot` reporter) to keep tool output concise.
- When running targeted tests during development, execute `vp test <path>`. Do NOT pass `--coverage` on single test paths, because Vitest enforces a 100% per-file coverage threshold across the entire project, which will fail on single-file subsets. Full coverage must be run exclusively via `vp test --coverage` across the complete suite.
- When diagnosing a test or typecheck failure, pass explicit reporter or verbose flags for detailed traces:
  - Run unit tests with `--reporter=default` or `--reporter=verbose` (e.g. `vp test <path> --reporter=default`).
  - Run `vp check --fix` to automatically format and resolve linting issues.

## Browser test execution and preview

Run browser checks with `vpr test:browser` (or `vpr test:browser --project=chromium` for PR parity). Playwright launches the local preview server automatically (`vp preview`) with fallback auth configuration when `PLAYWRIGHT_BASE_URL` is not provided. The current Cloudflare Vite plugin configuration disables remote bindings (`remoteBindings: false`) for local development, preview, and Workers unit tests.

## Worktree and subagent hygiene

- **Workspace confinement**: Confine all file inspection, creation, edits, and file tool searches (`read_file`, `find_by_name`, `grep_search`) strictly to the active workspace. Herdr and Git worktrees contain `.git` pointer files referencing parent repository metadata; avoid traversing parent directories.
- **Workspace-root Git operations**: Run all Git commands (`git status`, `git diff`, `git log`, `git checkout`, `git merge`) via `run_command` directly within the active workspace root.
