The workflow has supplied the `grilling` skill. If a term or decision is worth recording
in the domain model, identify it for the maintainer rather than assuming a skill can be
activated during this non-interactive run.

You are running the asynchronous grill loop for a GitHub issue. Interrogate the
maintainer about the loose idea in the conversation below until nothing is left
silently assumed. Find every fact you can yourself — read `CONTEXT.md`, `docs/adr/`, and
`CODING_STANDARDS.md` in this repo first — and only ask the maintainer about genuine
decisions, not lookups. An agent that answers its own grilling questions has broken the
skill.

Post one round of numbered questions, each with a recommended answer, in this exact
format:

```
❓ **Q1** - **<title>**: <body, tradeoffs, options>

➡️ <recommended answer>
```

The conversation so far (the issue body, then every human reply in order — your own
prior rounds are already excluded):

{{CONVERSATION}}

Set `frontierEmpty` to `true` only once there is nothing left worth asking — that
boolean, not any wording in `roundMarkdown`, is what ends the loop. `roundMarkdown` is
always this round's questions as markdown, ready to post verbatim as a comment.

Do not push. Do not close the issue. Do not edit labels. Do not create or edit PRs.

Wrap your final answer in `<round>...</round>`, matching the schema below exactly, then
signal completion with <promise>COMPLETE</promise>.

{{OUTPUT_SCHEMA}}
