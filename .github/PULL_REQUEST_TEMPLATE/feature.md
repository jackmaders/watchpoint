## 🚀 Feature Overview
<!-- Clear description of the user story, feature goal, and business value. -->
- **Goal:** 
- **User Story:** As a [user type], I want to [action] so that [benefit].
- **Issue / Ticket Link:** Closes #
- **FSD Target Slice:** `src/_pages/<slice-name>/`

### Design Handoff (UI changes)
- **Prototype branch:**
- **Design Contract / prototype evidence:**
- **UI changes and state expectations:**
- [ ] No material UI change; the lighter path applies.

---

## 🛠️ Technical Implementation & Architecture
<!-- High-level architectural overview of the changes, design decisions, and new components created. -->
- **Key Changes:**
  - 
- **Dependencies Added / Updated:** None | `package-name@v1.0.0` (Audited for security & zero vulnerability)
- **FSD Structure Compliance:**
  - [ ] All UI, logic, and actions reside inside `src/_pages/<slice-name>/` slice by default.
  - [ ] Next.js routing files (`app/`) are simple barrel re-exports (`export { Page as default } from "@/_pages/..."`).
  - [ ] Public API boundaries are clean and exported via `index.ts`.

---

## 🧪 TDD & Test Verification
<!-- Details on Red-Green-Refactor execution and AAA testing pattern. -->
- **Test Seams:** Integration tests implemented at public interface seam(s).
- **Arrange-Act-Assert (AAA) Compliance:**
  - [ ] All test blocks are explicitly organized into `// Arrange`, `// Act`, `// Assert` phases.
  - [ ] Assertions verify observable behavior via public APIs with independent literal values.
  - [ ] Zero tautological logic, no implementation detail testing, no unneeded internal mocks.
- **Performance & Coverage Thresholds:**
  - [ ] Execution per test block is under **50ms**.
  - [ ] 100% coverage threshold maintained (`bun run test:coverage`).

---

## 🛡️ Risk Assessment & Rollback Strategy
- **Risk Level:** Low | Medium | High
- **Feature Flag Key:** `ff_<feature_name>` *(If applicable)*
- **Rollback Strategy:** Revert PR commit `#...` / Toggle feature flag to `false`.
- **Side Effect Audit:** Checked upstream/downstream integrations for zero breaking changes.

---

## 📸 Visual Proof & API Delta *(If Applicable)*
| Light Mode | Dark Mode | API Payload Delta |
| :---: | :---: | :---: |
| *(Screenshot/GIF)* | *(Screenshot/GIF)* | ```json\n// Schema delta\n``` |

---

## ✅ Pre-Merge Project Validation
- [ ] `bun run check:types` passes cleanly.
- [ ] `bun run check:architecture` (Steiger) passes with zero violations.
- [ ] `bun run check:all` passes.
- [ ] `bun run validate` completes with 100% success.
