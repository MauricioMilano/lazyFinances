---
tags:
  - change/openspec-vault-link
  - status/active
  - capability/vault-linking
---
## 1. Skill Definition

- [x] 1.1 Author `.opencode/skills/openspec-vault-link/SKILL.md` with the full step spec (input, steps, output, guardrails)
- [x] 1.2 Mirror the same file at `lazyFinances/.opencode/skills/openspec-vault-link/SKILL.md`
- [x] 1.3 Mirror the same file at `lazyFinances/.agents/skills/openspec-vault-link/SKILL.md`
- [x] 1.4 Verify the three copies are byte-identical (`diff`)

## 2. Auto-Trigger Integration

- [x] 2.1 Add a "Vault link" step at the end of `.opencode/skills/openspec-archive-change/SKILL.md`
- [x] 2.2 Mirror in `lazyFinances/.opencode/skills/openspec-archive-change/SKILL.md`
- [x] 2.3 Mirror in `lazyFinances/.agents/skills/openspec-archive-change/SKILL.md`
- [x] 2.4 Add a "Vault link" step at the end of `.opencode/skills/openspec-apply-change/SKILL.md`
- [x] 2.5 Mirror in `lazyFinances/.opencode/skills/openspec-apply-change/SKILL.md`
- [x] 2.6 Mirror in `lazyFinances/.agents/skills/openspec-apply-change/SKILL.md`

## 3. MOC and Context Folder

- [x] 3.1 Create `lazyFinances/_context/` folder
- [x] 3.2 Create `lazyFinances/_context/README.md` with the convention explanation
- [x] 3.3 Create `openspec/INDEX.md` with three sections: Active, Archived (grouped by month), Specifications

## 4. Retroactive Migration

- [x] 4.1 Run `openspec-vault-link --all --dry-run` and review the preview
- [x] 4.2 Confirm with the user, then run for real
- [x] 4.3 Verify no orphans remain for OpenSpec content (`find_orphaned_notes` scoped to `openspec/`)
- [x] 4.4 Verify the MOC renders correctly in Obsidian

## 5. Verification

- [x] 5.1 Click a task wikilink in an archive — confirm it jumps to the source file
- [x] 5.2 Click a spec's "History" entry — confirm it jumps to the archived change
- [x] 5.3 Open `openspec/INDEX.md` — confirm all active/archived/specs entries are present and clickable
- [x] 5.4 Tag pane shows `change/<name>`, `capability/<name>`, `status/<state>` tags
- [x] 5.5 Bookmarks pane shows the registered bookmarks (or warning was logged if patch failed)
- [x] 5.6 Run the skill twice on the same change — confirm idempotent (no duplicate links)


## Related

- [[proposal|Proposal]]
- [[design|Design]]
- [[specs/vault-linking/spec|vault-linking delta spec]]
