# Skills Folder

Rule for where skill definitions live in this project.

## Rule

Skill definitions (one folder per skill, each containing a `SKILL.md`) must be placed under `.agents/skills/`:

- `lazyFinances/.agents/skills/<skill-name>/SKILL.md`

Do **not** create new skill folders under `.opencode/skills/`. Skills are user-defined agent capabilities and belong in `.agents/skills/`.

## Why

- `.agents/` is the dedicated location for agent configuration in this project (skills here, prompts under `.agents/prompts/`).
- Keeping a single canonical path makes skill discovery and documentation predictable.
- `.opencode/skills/` previously held a duplicate copy of the `openspec-*` skills; this caused drift and was eventually removed. `.agents/skills/` is the only source of truth.

## Current layout

```
lazyFinances/.agents/skills/
  commit/
  create-pr/
  cve-scan/
  lazy-finance-add-tests/
  openspec-apply-change/
  openspec-archive-change/
  openspec-explore/
  openspec-propose/
  openspec-vault-link/
```

`.opencode/skills/` should not exist. If you find it there, the contents are stale and must be moved into `.agents/skills/` and the empty directory removed.
