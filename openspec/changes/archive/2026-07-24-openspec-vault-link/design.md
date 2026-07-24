---
tags:
  - change/openspec-vault-link
  - status/active
  - capability/vault-linking
---
# Design: openspec-vault-link

## Context

The vault at `lazyFinances/` doubles as the project's working directory (the React app lives at `lazyFinances/src/`). This is unusual but convenient: it means Obsidian wikilinks can target source files directly. `[[src/store/finance.ts]]` is a real, clickable link to a real file.

The current state has zero wikilinks between any of the 25 OpenSpec notes. Vault tools like the graph view and backlinks pane are useless because there's nothing to traverse. This change makes them useful without altering the content or folder structure of OpenSpec artifacts — only adding navigational metadata.

The vault has three layers where connection matters:
1. **Within a change folder** — proposal, design, tasks, and delta specs should reference each other and the source files tasks touch.
2. **Across changes** — canonical specs in `openspec/specs/` should record which archived changes touched them, so reading a spec surfaces its full history.
3. **Into the rest of the vault** — a single MOC at `openspec/INDEX.md` indexes everything in the OpenSpec folder. Larger context docs live in `lazyFinances/_context/` and are linked from the MOC.

Tags and bookmarks are secondary navigation aids. Tags add discoverability through the Obsidian tag pane. Bookmarks add a fast-access UI layer. Both are kept lightweight so the system stays easy to maintain.

## Goals / Non-Goals

**Goals:**
- Every artifact in an OpenSpec change links to every other artifact in the same change.
- Every task that mentions a source file links to that source file via a wikilink.
- Every canonical spec records every change that touched it in a `## History` section.
- A single MOC at `openspec/INDEX.md` indexes all OpenSpec content.
- Frontmatter tags (`change/<name>`, `capability/<name>`, `status/<state>`) make filtering trivial.
- The skill works both standalone (retroactive fix) and auto-triggered (forward maintenance).
- The skill is idempotent: running it twice produces the same state as running it once.

**Non-Goals:**
- Building a full knowledge-management system. The vault is a workspace, not a wiki.
- Auto-linking git commits or PRs. Source paths in tasks are enough; deeper git integration is out of scope.
- Multiple MOCs at different layers. One MOC is enough; more layers = more maintenance for less navigation value.
- Replacing the existing `openspec-archive-change` / `openspec-apply-change` skills. Those stay; this skill is additive.
- Migrating source code comments or README content into the vault. Out of scope.

## Decisions

### 1. New skill name: `openspec-vault-link`
- **Why**: Matches the `openspec-<verb>-<noun>` shape of siblings (`openspec-archive-change`, `openspec-apply-change`, etc.). "Vault" reflects the Obsidian-side work; "link" reflects the primary action.
- **Rejected**: `openspec-vault-wire` (less standard), `openspec-link-vault` (verb-first breaks the family pattern).

### 2. Three copies of the skill
- **Why**: The existing OpenSpec skills live in three locations (root `.opencode/skills/`, `lazyFinances/.opencode/skills/`, `lazyFinances/.agents/skills/`). Adding the new skill only to one would create an inconsistency where the skill is reachable from some configs but not others.
- **Trade-off**: 3× maintenance. Mitigated because the skill file is short and the three copies are kept identical.

### 3. Single MOC at `openspec/INDEX.md`
- **Why**: A single root-level MOC for the OpenSpec folder is enough to navigate every change and every spec. Deeper MOC hierarchies (per capability, per archive) add upkeep without enough navigation benefit at this scale.
- **Rejected**: Per-capability MOCs (extra files for marginal navigation gain), per-archive MOCs (each archive folder is already small and self-contained).

### 4. Source-path detection rule
- **Why**: Tasks reference source files in plain text. We link them only if (a) the path starts with a known project directory (`src/`, `pages/`, `components/`, `hooks/`, `lib/`, `utils/`, `store/`, `types/`, `test/`, `tests/`, `public/`, `app/`, `coverage/`) AND (b) the file actually exists in the vault.
- **Rejected**: Link anything that looks like a path (too noisy — would link `pnpm build`, `node_modules/...`, `@/components/ui/progress` aliases, URLs).
- **Rejected**: Link nothing in tasks (misses the biggest navigation win).

### 5. Tags via frontmatter
- **Why**: Frontmatter tags integrate with Obsidian's tag pane and Dataview queries. Three tag shapes:
  - `change/<name>` — on every artifact inside a change folder.
  - `capability/<name>` — on artifacts that touch a capability spec; also on canonical specs themselves.
  - `status/archived` or `status/active` — on artifacts inside a change folder.
- **Rejected**: Inline `#tags` only (less queryable), no tags (loses the pane).

### 6. Bookmarks via direct workspace.json patch (no alternative)
- **Why**: Investigation showed the Obsidian MCP exposes only interactive bookmark commands (`bookmarks:bookmark-current-view`, etc.) — all modal, none that takes a path parameter. Direct `.obsidian/workspace.json` patching is the only programmatic path.
- **How**: Read workspace.json → parse → ensure `bookmarks.items` array exists → append a folder entry with `type: "folder"`, `path`, `ctime`, `title` → atomic write via temp-file + rename. Before writing, copy the original to `.obsidian/workspace.json.backup-<timestamp>`.
- **Validation**: After write, JSON.parse the result. If it fails, restore the backup and treat as a non-fatal failure (log warning, continue).
- **Idempotency**: Skip if a bookmark with the same `path` already exists.
- **Rejected**: Skip bookmarks (user explicitly requested them as a connection mechanism), use the interactive commands (would require user prompts, not automatable).

### 7. Idempotent operation
- **Why**: Running the skill twice on the same change must not duplicate links, tags, bookmarks, or MOC entries. Detection of "already linked" is done by checking for the exact target wikilink or exact frontmatter tag.
- **Rejected**: Throw an error if the change is already linked (breaks auto-trigger idempotency).

### 8. Different source-file rules for active vs. archived changes
- **Why**: Archived changes have fully implemented files — a missing path means something went wrong (renamed/deleted). Active changes have files that don't exist yet — linking them gives Obsidian's "create this file" affordance on click.
- **Rule**:
  - **Archived**: link only if the file exists in the vault. Skip and log a warning if not.
  - **Active**: link regardless of existence. Obsidian renders missing targets with a "Create" prompt.
- **Rejected**: Always require existence (loses the active-change affordance), never require existence (lets archived changes accumulate broken links).

### 9. History section in canonical specs is newest-first
- **Why**: Matches git log, Obsidian's backlinks ordering, and the "what changed most recently" mental model. Users looking at a spec usually want to know the latest evolution first.
- **Rejected**: Ascending order (reads chronologically but loses recency at the top).

### 10. MOC includes a Project section
- **Why**: The OpenSpec MOC is the navigational hub for engineering knowledge. Root-level project docs (`README.md`, `AI_RULES.md`) are part of that knowledge — they're the "what is this project" docs that any new reader finds first. Including them in the MOC makes them reachable from the same navigation surface without making them part of OpenSpec proper.
- **Rejected**: Leave root docs out of the MOC (they remain reachable only via file explorer), or wikilink the MOC from the root docs without modifying the MOC structure (asymmetric, harder to discover from the OpenSpec side).

### 11. Frontmatter tags as YAML list
- **Why**: `tags: [change/<name>, capability/<name>, status/<state>]` is the standard Obsidian frontmatter format. Hierarchical namespaces (`change/`, `capability/`, `status/`) render as a tree in the tag pane (workspace.json has `useHierarchy: true`).
- **Rejected**: Nested object (richer for Dataview but less standard), inline `#tags` only (loses the tag pane affordance).

### 12. Two co-existing link patterns per artifact
- **Why**: Each artifact gets both:
  - **Inline wikilinks** — backticked source paths in tasks.md / proposal.md / design.md are replaced in place. This matches how readers scan: a task says "Create X", and X is right there as a clickable link.
  - **Footer `## Related` section** — sibling artifacts (proposal ↔ design ↔ tasks ↔ delta specs) are listed at the bottom. This gives an aggregated sibling view that doesn't appear naturally inline.
- **Rejected**:
  - Footer only (cleaner style but indirect — reader has to scroll past prose to find siblings).
  - Inline only (most compact but loses the aggregated sibling view).

### 13. workspace.json race handling — best-effort with safety net
- **Why**: The MCP plugin runs inside Obsidian, so any time the skill runs, Obsidian IS running. Detecting/refusing based on Obsidian state is impossible. The pragmatic answer is best-effort write with strong safety:
  1. **Backup** the original to `.obsidian/workspace.json.backup-<timestamp>` before any mutation.
  2. **Atomic write** via temp file + `fsync` + `rename`.
  3. **Post-write JSON validation** — re-read and `JSON.parse` the result. If it fails, restore from backup.
  4. **Idempotency check** — skip if a bookmark with the same path already exists.
  5. **One-liner output** — print "If Obsidian is open, the bookmarks pane will refresh when you refocus it."
- **Race window**: The narrow window between our read and write could lose a user-added bookmark if they add one during the skill run. Accepted as a small, recoverable risk.
- **Rejected**: Detect and refuse (impossible — MCP runs in Obsidian), skip bookmarks entirely (user explicitly requested them).

## Risks / Trade-offs

- **[Risk]**: workspace.json bookmark patch could corrupt Obsidian state if format changes between versions.
  - **Mitigation**: Read-then-validate-then-write with a timestamped backup next to the file. If JSON.parse fails after the patch, restore the backup.
- **[Risk]**: Source-path linking could over-link things that look like paths but aren't.
  - **Mitigation**: Strict prefix allowlist + existence check.
- **[Risk]**: Three copies of the skill can drift.
  - **Mitigation**: Skill is short and rarely edited; cross-check is a simple `diff`. Consider adding a CI check later if drift becomes a real problem.
- **[Risk]**: Retroactive migration rewrites four archives in one pass. If something goes wrong mid-migration, the vault is half-migrated.
  - **Mitigation**: `--dry-run` is the default. User confirms before write. Each change is migrated independently so partial failures are bounded.


## Related

- [[proposal|Proposal]]
- [[tasks|Tasks]]
- [[specs/vault-linking/spec|vault-linking delta spec]]
