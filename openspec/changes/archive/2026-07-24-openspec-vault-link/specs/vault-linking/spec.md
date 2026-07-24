---
tags:
  - change/openspec-vault-link
  - status/active
  - capability/vault-linking
---

## ADDED Requirements

### Requirement: Artifact interlinking within a change
Every artifact inside an OpenSpec change folder (proposal.md, design.md, tasks.md, delta specs in specs/<capability>/spec.md) SHALL include a footer `## Related` section that wikilinks to every other artifact in the same change folder.

#### Scenario: Reading a proposal exposes the design
- **WHEN** a reader opens a change's proposal.md
- **THEN** they can navigate to the design, the tasks, and any delta specs via wikilinks in the footer's `## Related` section

#### Scenario: Reading tasks exposes the design and proposal
- **WHEN** a reader opens a change's tasks.md
- **THEN** they can navigate to the proposal, the design, and any delta specs via wikilinks in the footer's `## Related` section

#### Scenario: Re-running on a wired artifact does not duplicate links
- **WHEN** the skill runs on a change whose artifacts already have a `## Related` section with all sibling wikilinks
- **THEN** no duplicate wikilinks are added

### Requirement: Tasks link to source files
The tasks.md of a change SHALL include wikilinks for every source-file path it mentions, where the path is within the project's source tree (`src/`, `pages/`, `components/`, `hooks/`, `lib/`, `utils/`, `store/`, `types/`, `test/`, `tests/`, `public/`, `app/`, `coverage/`) and the file exists in the vault.

#### Scenario: A task mentioning a source file becomes a wikilink
- **WHEN** tasks.md contains the text `src/store/finance.ts`
- **THEN** it is rendered as `[[src/store/finance.ts]]` and clicking it opens the file in Obsidian

#### Scenario: A task mentioning a command is not linked
- **WHEN** tasks.md contains `pnpm test` or `pnpm build`
- **THEN** it is left as plain text (no wikilink)

#### Scenario: A task mentioning a missing path is not linked
- **WHEN** tasks.md in an archived change contains a path-shaped string that does not exist in the vault
- **THEN** it is left as plain text (no wikilink to nowhere) and a warning is logged

#### Scenario: Active change tasks link to not-yet-created files
- **WHEN** tasks.md in an active change contains a path-shaped string for a file that does not yet exist in the vault
- **THEN** it is still rendered as a wikilink, so that clicking it in Obsidian surfaces the file-create affordance

### Requirement: Canonical specs carry a History
Every canonical spec at `openspec/specs/<capability>/spec.md` SHALL end with a `## History` section listing every archived change that introduced or modified a delta spec for the same capability, each entry being a wikilink to the archived change folder.

#### Scenario: Reading a spec exposes its change history
- **WHEN** a reader opens a canonical spec
- **THEN** the bottom of the file lists every archived change that touched this capability, ordered by date descending (newest first)

### Requirement: Single MOC indexes the OpenSpec folder
A file at `openspec/INDEX.md` SHALL exist as the single MOC for the OpenSpec folder. It SHALL contain four sections, in this order: Active changes, Archived changes (grouped by month), Specifications, Project (linking `README.md` and `AI_RULES.md`). Each entry SHALL be a wikilink to the corresponding folder or file.

#### Scenario: The MOC is reachable from the OpenSpec root
- **WHEN** a reader opens `openspec/INDEX.md`
- **THEN** they see Active, Archived, Specifications, and Project sections with clickable links

### Requirement: Frontmatter tags categorize changes and capabilities
Every artifact inside an OpenSpec change folder SHALL carry frontmatter tags: `change/<name>`, `status/active` or `status/archived`, and one `capability/<name>` tag per capability the change touches. Canonical specs SHALL carry `capability/<name>` frontmatter tag.

#### Scenario: Tags appear in the Obsidian tag pane
- **WHEN** a reader opens the Obsidian tag pane
- **THEN** tags under `change/`, `capability/`, and `status/` namespaces are visible and filterable

### Requirement: Bookmarks register for archived changes
The skill SHALL attempt to register an Obsidian bookmark pointing at the change folder of every archived change it processes, by patching `.obsidian/workspace.json` directly with the following safety guarantees: a timestamped backup is written before any mutation; the write is atomic (temp file + fsync + rename); the result is validated by re-reading and JSON-parsing after the write. If any of these steps fails, the skill SHALL log a warning and continue without blocking other operations.

#### Scenario: A bookmark appears for an archived change
- **WHEN** the skill runs successfully on an archived change
- **THEN** the Obsidian bookmarks pane shows a folder bookmark for that change

#### Scenario: Bookmark failure does not block the skill
- **WHEN** the workspace.json patch fails for any reason (parse error, validation failure, write error)
- **THEN** the skill restores from the timestamped backup, logs the failure, and proceeds with the rest of its work

### Requirement: Idempotent operation
Running `openspec-vault-link` on the same change twice SHALL produce the same final state as running it once. No duplicate wikilinks, tags, bookmarks, or MOC entries SHALL appear after a second run.

#### Scenario: Re-running on a wired change is a no-op
- **WHEN** the skill is run on a change that has already been wired
- **THEN** no file content changes (other than formatting), no new bookmarks are registered, no MOC entries are duplicated

### Requirement: Auto-trigger integration
`openspec-archive-change` and `openspec-apply-change` SHALL invoke `openspec-vault-link` on the affected change as the final step of their workflow.

#### Scenario: Archiving a change wires it automatically
- **WHEN** a user runs `openspec-archive-change <name>`
- **THEN** the change is moved to the archive folder AND wired into the vault before the operation reports success

### Requirement: Context folder for non-OpenSpec docs
A folder at `lazyFinances/_context/` SHALL hold context documents that are larger than a single change (architecture, decision logs, cross-cutting concerns). The folder SHALL contain a README explaining what belongs there.

#### Scenario: Context docs are visually separated from OpenSpec content
- **WHEN** a reader browses the vault root
- **THEN** `_context/` is visible as a top-level folder and its README explains the convention


## Related

- [[../../proposal|Proposal]]
- [[../../design|Design]]
- [[../../tasks|Tasks]]
