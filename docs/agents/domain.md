# Domain Docs

## Glossary

Read the root [`GLOSSARY.md`](../../GLOSSARY.md) when exploring or changing
project behavior. Use its canonical terms in code, documentation, and discussion.

When a change introduces or changes a project-specific concept, update the
glossary in the same change. Review new concepts and overloaded terms in
behavior, data models, APIs, tests, and documentation. Add concepts whose
meaning is specific to this application, including repo-defined engineering
distinctions; if the meaning is unclear, ask rather than inventing a definition.

Keep each entry to a one- or two-sentence definition of what the concept is.
Choose one canonical term and list meaningful synonyms under `_Avoid_`. Group
terms under headings when the glossary develops distinct areas. Include
engineering terms when this repository assigns them a specific meaning or uses
them to distinguish concepts; leave generic programming vocabulary, feature
specifications, and unresolved ideas out of the glossary.

## Architecture decisions

Record a decision in `docs/adr/` only when it is hard to reverse, surprising
without context, and the result of a real trade-off. Create the directory when
the first decision needs recording.

## Decision changes

When an accepted decision changes, search for its old terminology, assumptions,
and references across documentation, the glossary, agent instructions, and
skills. Reconcile conflicting guidance in the same change, including outdated
examples and navigation pointers. Update or remove glossary entries whose
meaning no longer applies.

Preserve historical ADR reasoning, but mark superseded decisions in the original
ADR's status and link to the replacement. For partially superseded decisions,
identify which parts remain current. Record a new ADR only when the criteria
above apply; ordinary documentation corrections do not require one.

Before completion, account for each conflicting reference found: update it,
label it as historical with a pointer to current guidance, or report an
unresolved conflict explicitly.
