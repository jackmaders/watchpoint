---
name: implement
description: "Implement a piece of work based on a spec or set of tickets."
disable-model-invocation: true
---

Implement the work described by the user in the spec or tickets.

Use /tdd where possible, at pre-agreed seams.

Run typechecking regularly, single test files regularly, and the full test suite once at the end.

Once done, use /code-review to review the work.

After code review, commit your work to the current branch, push it, and create a GitHub pull request.

Before creating a single PR, check the substantive diff size (excluding migrations, tests, and snapshots). If greater than 300 lines, structure the changes into a stacked PR, where each PR in the stack fulfills those size criteria (using `/gh-stack`):

```bash
git diff origin/main...HEAD --numstat -- . ':!drizzle/**' ':!**/__tests__/**' ':!**/*.spec.*' ':!**/*.test.*' ':!**/*.snap' ':!**/__snapshots__/**' | awk '{s+=$1+$2} END {print s+0}'
```
