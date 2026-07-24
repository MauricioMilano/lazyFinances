---
tags:
  - change/openspec-vault-link
  - status/active
  - capability/vault-linking
---
# Change: openspec-vault-link

## Why

The Obsidian vault (`lazyFinances/`) contains 25 OpenSpec-related notes and **all 25 are orphans** — there is not a single wikilink between them. A reader who finds a task in an archive cannot jump to the design that motivated it, the spec it implements, or the source file it touches.

This severs the vault from its primary job as a navigable knowledge graph. It also leaves the React project that lives in the same folder as the vault (`lazyFinances/src/...`) invisible from the docs that describe and plan its changes — a missed opportunity, since Obsidian wikilinks can target source files directly.

The fix is structural: introduce a dedicated skill that wires every OpenSpec change into the vault (wikilinks between artifacts, links from tasks to source files, frontmatter tags, bookmarks, and a single MOC), and apply that skill both to new changes (auto-triggered from `openspec-archive-change` and `openspec-apply-change`) and to the four existing archives (one-shot migration).

## What Changes

- **New skill**: `openspec-vault-link` — adds wikilinks between proposal/design/tasks/specs, links tasks to source files mentioned in them, tags notes via frontmatter, registers Obsidian bookmarks, and refreshes the OpenSpec MOC.
- **Skill integration**: `openspec-archive-change` and `openspec-apply-change` invoke `openspec-vault-link` at the end of their workflow so new changes are wired automatically.
- **Single MOC**: `openspec/INDEX.md` is created as the only MOC. It lists active changes, archived changes (grouped by month), and specifications. Everything in the OpenSpec folder is reachable from it.
- **Context folder**: `lazyFinances/_context/` is created with a README explaining what belongs there (architecture, decision logs, cross-cutting docs).
- **Retroactive migration**: All four existing archives (`2026-07-23-shared-finance-store`, `2026-07-24-shared-finance-store`, `2026-07-24-sequential-batch-upload`, `2026-07-24-transaction-export`) are wired by a one-shot run of the skill.

## Capabilities

### New Capabilities
- `vault-linking`: The Obsidian vault containing OpenSpec notes must be navigable as a connected graph — artifacts within a change link to each other and to source files, the canonical spec links to every change that touched it, and a single MOC indexes the whole OpenSpec folder.

### Modified Capabilities
- None.

## Impact

- **New files**:
  - [[../../../.opencode/skills/openspec-vault-link/SKILL|SKILL.md]] at `.opencode/skills/openspec-vault-link/SKILL.md` (root workspace copy)
  - `lazyFinances/.opencode/skills/openspec-vault-link/SKILL.md` (vault copy)
  - `lazyFinances/.agents/skills/openspec-vault-link/SKILL.md` (agents copy)
  - [[../INDEX|openspec/INDEX.md]] (the MOC)
  - [[../../../_context/README|_context/README.md]] (context folder starter)
- **Modified files**:
  - `.opencode/skills/openspec-archive-change/SKILL.md` (add auto-trigger step)
  - `.opencode/skills/openspec-apply-change/SKILL.md` (add auto-trigger step)
  - Same two files mirrored inside `lazyFinances/.opencode/skills/` and `lazyFinances/.agents/skills/`
  - `openspec/changes/archive/2026-07-23-shared-finance-store/{proposal,design,tasks}.md` and delta specs
  - `openspec/changes/archive/2026-07-24-shared-finance-store/...` (same)
  - `openspec/changes/archive/2026-07-24-sequential-batch-upload/...` (same)
  - `openspec/changes/archive/2026-07-24-transaction-export/...` (same)
  - `openspec/specs/{finance-store,data-export,ai-config-store,batch-transaction-extraction}/spec.md` (add History sections + tags)
  - `lazyFinances/.obsidian/workspace.json` (best-effort bookmark registration, with backup + fallback)
- **Dependencies**: Obsidian MCP for `find_orphaned_notes`, `get_vault_file`, `patch_vault_file`, `set_note_property`, `list_bookmarks`, `list_vault_files`, `search_and_replace`. The skill reads workspace.json directly for bookmark registration.
- **No breaking changes**: All modifications are additive — wikilinks added, tags added, bookmarks registered, MOC created. Existing prose stays intact.


## Related

- [[design|Design]]
- [[tasks|Tasks]]
- [[specs/vault-linking/spec|vault-linking delta spec]]
