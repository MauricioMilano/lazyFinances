---
name: commit
description: Create commits with a 30-char max title and a body whose paragraphs are kept as single lines (no soft-wrapping inside a phrase). Load when the user asks to commit, write a commit, or produce a commit message.
license: MIT
compatibility: Local machine skill — requires git.
metadata:
  author: personal
  version: "1.0"
---

# Commit Style

You are an expert git workflow assistant. Before staging or committing, detect the current project context and the current branch, then produce commits that follow the rules below.

## 1. Detect context

- Run `pwd` (or trust the working directory) to know which project you are in.
- Run `git branch --show-current` to grab the branch name and check for a ticket prefix (e.g. `DOS-1234`, `JIRA-42`).
- Run `git status` to see modified, deleted, untracked files. Run `git diff` and `git diff --cached` to read the actual changes.

## 2. Group changes

- Cluster file changes into logical commits (e.g. "rename feature X", "update schema for Y").
- A single commit per logical change. Multiple commits when the changes are unrelated.

## 3. Title rules

- **Maximum 30 characters** total (including any ticket prefix).
- Present tense, imperative mood: `Add`, `Fix`, `Update`, `Remove`, `Refactor`.
- No trailing period.
- If the branch name starts with a clear ticket prefix (e.g. `DOS-1234-...`), include it at the start of the title and count it against the 30-char limit:

```
DOS-1234 Add Field tests
DOS-1234 Fix pagination off-by-one
```

- If no prefix can be derived, ask the user for one or commit without a prefix.

## 4. Body rules

- Skip the body when the title is enough.
- When more context is needed, write the body as **paragraphs**.
- **A paragraph is a single continuous line.** Never break a phrase across lines for visual width. Do not soft-wrap.
- Use a blank line to start a new paragraph.
- Prefer one paragraph per distinct idea. Multiple paragraphs are fine when the change has several contexts.

```text
Add Field component tests

Cover the new validation rules and the disabled state.
Mock the network layer so the tests stay fast.
```

In the example above, the body is two paragraphs. Each paragraph is a single line. The blank line between them is the only separator.

## 5. Final format

```text
<title up to 30 chars>

<paragraph 1, single line>

<paragraph 2, single line>
```

- Blank line between title and body.
- Blank line between body paragraphs.
- No blank line at the end.

## 6. Execution

- Stage only the files that belong to the current commit: `git add <files>`.
- Commit with `git commit -m "<title>"` plus `-m "<paragraph>"` for each body paragraph, or use a heredoc when preferred.
- Do not push unless explicitly asked.

## 7. Anti-patterns

These are not acceptable.

- Title longer than 30 characters:

```text
Add unit tests for all components in the Field directory with proper mocking
```

- Body with a phrase broken across lines (this is the same paragraph, but the lines were split for width):

```text
Description of the commit in here
We break the line and continue to a new paragraph, but then
we break the line again just to keep that previous phrase, and it
shouldn't because it's the same phrase yet.
We only break lines to create a new paragraph.
```

The body above should be rewritten as one paragraph per line:

```text
Description of the commit in here
We break the line and continue to a new paragraph, but then we break the line again just to keep that previous phrase, and it shouldn't because it's the same phrase yet.
We only break lines to create a new paragraph.
```

## 8. Summary

Report back to the user with:
- Each commit created (hash + title).
- The grouping logic when several commits were produced.
