---
name: openspec-vault-link
description: Wire an OpenSpec change into the Obsidian vault — add wikilinks between artifacts, link tasks to source files, tag notes, register bookmarks, and refresh the OpenSpec MOC. Use after archive/apply, or standalone to retrofit existing changes.
license: MIT
compatibility: Requires openspec CLI + Obsidian MCP tools (`list_vault_files`, `get_vault_file`, `patch_vault_file`, `set_note_property`, `search_and_replace`, `find_orphaned_notes`) + read/write access to `.obsidian/workspace.json`.
metadata:
  author: personal-workspace
  version: "1.0"
---

Wire an OpenSpec change into the Obsidian vault so every artifact, source file, and spec is reachable from any other through wikilinks, tags, bookmarks, or the central MOC.

**Input**:
- `<change-name>` — process a single change (active under `openspec/changes/<name>/` or archived under `openspec/changes/archive/...`)
- `--all` — process every change folder under `openspec/changes/` and `openspec/changes/archive/`
- `--dry-run` (default `true`) — preview changes without writing
- `--skip-tags` — do not modify frontmatter
- `--skip-bookmarks` — do not touch `.obsidian/workspace.json`
- `--skip-moc` — do not rewrite `openspec/INDEX.md`

If both `<change-name>` and `--all` are omitted, run `openspec list --json` and prompt via **AskUserQuestion** to pick a change. Filter to changes whose `proposal.md` lacks a `change/<name>` frontmatter tag (skip already-wired).

**Cwd note**: The Obsidian vault root is the cwd of this skill (`./openspec/` and `./_context/` resolve from here). Paths in this document are relative to the vault root unless stated otherwise.

**Steps**

1. **Resolve targets**

   - If `--all`: enumerate every folder under `./openspec/changes/` (top-level = active) and `./openspec/changes/archive/` (subdirs = archived). For each, check whether `proposal.md` already has `change/<folder-name>` in its frontmatter tags. Skip those that do.
   - If `<change-name>`: locate the folder. Prefer active under `./openspec/changes/<name>/`; fall back to `./openspec/changes/archive/*<name>/`. If ambiguous, prompt.
   - For each target, record: `folderPath`, `changeName`, `status` (`active` | `archived`), `proposalPath`, `designPath`, `tasksPath`, `deltaSpecs` (list of `./specs/<capability>/spec.md` if present), `capabilities` (extracted from delta-spec folder names).

2. **Wire artifact interlinks (footer `## Related`)**

   For each artifact in the change folder, ensure a `## Related` section at the bottom (create if missing). Populate with one bullet per sibling artifact:
   ```
   - [[<sibling-path>|<Display Name>]]
   ```
   Mapping:
   - `proposal.md` → links to `design.md`, `tasks.md`, each delta spec (display name = the basename without `.md`).
   - `design.md` → links to `proposal.md`, `tasks.md`, each delta spec.
   - `tasks.md` → links to `proposal.md`, `design.md`, each delta spec.
   - A delta spec (`./specs/<capability>/spec.md`) → links to its canonical sibling at `./specs/<capability>/spec.md` AND to `proposal.md`, `design.md`, `tasks.md` of the change.

   Use `patch_vault_file` with `targetType: "heading"` targeting `Related` (or the closest existing section), with `createTargetIfMissing: true`. If `Related` exists but lines are missing, prepend missing lines to it (do not duplicate lines that already point to the right target).

   Idempotency: read the file first, skip any wikilink target that already appears anywhere in the file.

3. **Wire tasks → source files (inline replacement)**

   For `proposal.md`, `design.md`, AND `tasks.md`, find backtick-wrapped strings matching the regex:
   ```
   `([a-z][a-zA-Z0-9_/-]+\.(ts|tsx|js|jsx|json|md|css|html|yaml|yml))`
   ```
   Apply three gates per match:
   1. **Prefix allowlist**: must start with one of `src/`, `pages/`, `components/`, `hooks/`, `lib/`, `utils/`, `store/`, `types/`, `test/`, `tests/`, `public/`, `app/`, `coverage/`. Reject `@/...` aliases.
   2. **Status-conditional existence**:
      - If `status == "archived"`: the path must exist in the vault (`list_vault_files` finds it). Otherwise skip and log a warning naming the missing path.
      - If `status == "active"`: skip this check (Obsidian will offer a "create" prompt on click).
   3. **Idempotency**: skip if `[[<path>]]` already appears anywhere in the file.

   Pass: replace `` `<path>` `` with `[[<path>]]` (preserve surrounding whitespace and punctuation exactly). Use `search_and_replace` with the backtick-wrapped form as the pattern and the wikilink as the replacement. Run per-file.

4. **Append `## History` to canonical specs**

   For each capability in `target.capabilities`:
   - Read `./openspec/specs/<capability>/spec.md` via `get_vault_file`.
   - Find or create the `## History` section near the bottom (before any frontmatter, after the last requirement).
   - If the line `[[<archive-folder>/proposal|<change-name> (<YYYY-MM-DD>)]]` already appears in the section, skip.
   - Else, insert a new bullet at the **top** of the History list (newest-first), formatted:
     ```
     - [[<archive-folder>/proposal|<change-name> (<YYYY-MM-DD>)]] — <one-line summary from proposal "Why" first sentence, trimmed to ~80 chars>
     ```
   - Use `patch_vault_file` with `targetType: "heading"` and `operation: "append"` (then reorder, or use `prepend` to put the new entry first).

5. **Apply frontmatter tags** (unless `--skip-tags`)

   For each artifact in the change folder (`proposal.md`, `design.md`, `tasks.md`, each delta spec), use `set_note_property` to set:
   ```yaml
   tags:
     - change/<change-name>
     - status/<active|archived>
     - capability/<capability>     # one entry per capability touched
   ```
   Call `set_note_property` per tag (idempotent: it skips if the value already exists in a YAML list).

   For each canonical spec touched (in step 4), set:
   ```yaml
   tags:
     - capability/<capability>
   ```

   To detect "already present", use `get_note_property` first; skip the set if the value already exists.

6. **Register Obsidian bookmarks** (unless `--skip-bookmarks`, and only for archived changes)

   For each archived change folder:
   - Read `<vault>/.obsidian/workspace.json` (the file lives in the vault root's `.obsidian/`).
   - If it fails to parse, log a warning and skip this step entirely.
   - Copy the file to `<vault>/.obsidian/workspace.json.backup-<ISO timestamp>`.
   - Parse the JSON. If `bookmarks` is missing, add `bookmarks: { items: [] }`.
   - If an item with `type: "folder"` and `path: "<change-folder-path>"` already exists in `bookmarks.items`, skip.
   - Else append:
     ```json
     {
       "type": "folder",
       "ctime": <Date.now()>,
       "path": "<change-folder-path>",
       "title": "<change-name> (<YYYY-MM-DD>)"
     }
     ```
   - Write atomically: serialize → write to temp file `<vault>/.obsidian/workspace.json.tmp` → `fsync` → `rename` over original.
   - Re-read and `JSON.parse` the result. If invalid, restore from backup and log warning.
   - Print: `If Obsidian is open, the bookmarks pane will refresh when you refocus it.`

7. **Refresh `openspec/INDEX.md`** (unless `--skip-moc`)

   - Read `./openspec/INDEX.md` if it exists, else create from the template below.
   - If creating, write the four-section template.
   - If updating, parse the existing sections and update entries in place. Preserve any content outside the four managed sections.
   - **Active**: one line per active change folder, `- [[<name>/proposal|<name>]]`.
   - **Archived**: grouped by `### YYYY-MM`, one line per archive folder in that month. Sort months descending, entries within each month ascending.
   - **Specifications**: one line per capability folder under `./openspec/specs/`, `- [[<capability>/spec|<capability>]]`. Sorted alphabetically.
   - **Project**: `- [[README|Aether Finance README]]` and `- [[AI_RULES|AI Rules]]`. Keep these as the last two lines of the file (after Project heading).
   - Idempotency: skip an entry if its exact wikilink already appears under the right heading.

8. **Output summary**

   For each target:
   ```
   ✓ <change-name> (<status>)
     artifacts wired: <N>
     source paths linked: <N>     (active: includes proposed; archived: only existing)
     tags applied: <N>
     bookmarks: registered | already-present | skipped (<reason>)
     MOC: added | already-present | skipped (<reason>)
   ```

   Aggregate at the end:
   ```
   ## Vault Link Complete
   Changes processed: <N>
   Source paths linked: <N>
   Tags applied: <N>
   Bookmarks registered: <N> | skipped: <N>
   MOC refreshed: true
   ```

**Template: `openspec/INDEX.md`** (for first creation)

```markdown
---
tags:
  - moc/openspec
---

# OpenSpec Index

Single MOC for the OpenSpec folder in this vault. For project-wide context docs (architecture, decisions, conventions), see [[_context/README|Context]].

## Active

<!-- auto-generated: wikilinks to active change folders -->

## Archived

<!-- auto-generated: wikilinks grouped by month, newest month first -->

## Specifications

<!-- auto-generated: wikilinks to canonical specs, alphabetical -->

## Project

- [[README|Aether Finance README]]
- [[AI_RULES|AI Rules]]
```

**Guardrails**
- Default to `--dry-run`. Require explicit confirmation before any write that touches existing content. Print a one-line preview before applying.
- Never modify a file's existing prose. Only: append `## Related` sections, append tags, insert History entries, replace backticked source paths, create the MOC.
- Backtick regex replacement must preserve surrounding whitespace and punctuation exactly. Use `search_and_replace` with anchored patterns; never regex-substitute blindly.
- Each change is all-or-nothing: if any step fails for a change, log the failure with the change name and the step number, then continue with the next change. Do not leave a single change in a half-wired state.
- Self-referential links are forbidden: a canonical spec never links to itself; a delta spec never links to itself.
- The bookmark step must always be preceded by a backup and followed by JSON validation. If validation fails, restore from backup and treat as a non-fatal warning.
- When in doubt about a path match (ambiguous prefix, unusual extension, path inside a non-source directory), leave it as backticked text and move on. Better to under-link than to link wrongly.
- All output paths in messages are relative to the vault root.
