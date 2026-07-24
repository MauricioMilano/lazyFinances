# Context

This folder holds project-level context documents — things larger than a single OpenSpec change that explain *what this project is* and *why it's shaped this way*.

## What goes here

- **Architecture overviews** — how the system fits together
- **Decision records (ADRs)** — significant choices and their reasoning
- **Domain glossary** — terms specific to this project (e.g., what counts as a "transaction")
- **Conventions** — coding patterns, naming rules, testing philosophy
- **Onboarding notes** — what a new contributor needs to know first

## What does NOT go here

- **OpenSpec changes** — those live in `openspec/changes/` (see [[openspec/INDEX|OpenSpec Index]])
- **Daily notes** — those live in your Daily Notes plugin location
- **Scratch / throwaway** — use a `scratch/` folder or temp files instead
- **Source code** — that lives in `src/`

## Convention

- One document per topic. Don't merge unrelated things into a single file.
- Link related docs together with wikilinks — this folder should form its own small graph.
- If a context doc contradicts an OpenSpec change, the change wins (changes are dated; context is the steady-state explanation).
- Naming: kebab-case filenames, no dates in the name (history lives in git).

## Related

- [[openspec/INDEX|OpenSpec Index]] — the navigation hub for the OpenSpec workflow
- [[README|Aether Finance README]] — what this project does
- [[AI_RULES|AI Rules]] — conventions enforced when working with the codebase
