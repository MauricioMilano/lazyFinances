---
name: create-pr
description: Open a Pull Request with a short title, a structured description, the file tree of changes, and the list of commits. Auto-assigns the PR to the current GitHub user. Load when the user asks to open, create, or send a PR.
license: MIT
compatibility: Local machine skill — requires git and the gh CLI authenticated against the target repo.
metadata:
  author: personal
  version: "1.0"
---

# Create Pull Request Pipeline

You are an expert git workflow assistant. The goal is to open a Pull Request that follows the workspace commit conventions: a short title, a structured description, and the assignee set to the current GitHub user.

## 1. Detect context

Before doing anything, ground yourself in the project:

- Confirm you are inside a git repo: `git rev-parse --is-inside-work-tree`.
- Read the current branch: `git branch --show-current`.
- Identify the default branch: `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`.
- Identify the current GitHub user (this is the assignee): `gh api user --jq .login`.
- Read the repo slug: `gh repo view --json nameWithOwner --jq .nameWithOwner`.

## 2. Check readiness

Stop and ask the user before opening the PR if any of these are true:

- There are unstaged or uncommitted changes: `git status --porcelain` is non-empty.
- The branch has not been pushed yet (no upstream). Offer `git push -u origin <branch>` first.
- A PR already exists for the branch: `gh pr view --json url --jq .url`. If one exists, return its URL instead of creating a duplicate.

If everything is clean, continue.

## 3. Gather the data for the PR

Collect everything you need before writing the description.

### Commits

- Find the merge base: `git merge-base <default-branch> <current-branch>`.
- List commits in chronological order: `git log <merge-base>..<current-branch> --pretty=format:"- %s"`.
- Capture the full messages (with bodies) for the description: `git log <merge-base>..<current-branch> --pretty=format:"%h%n%s%n%b%n---"`.

### File tree change

- Get the list of changed files with status: `git diff <merge-base>...<current-branch> --name-status`.
- Render a compact tree grouped by top-level directory. For each changed file, show the relative path and a status marker (`A` added, `M` modified, `D` deleted, `R` renamed, `C` copied). Do not dump full diffs; the tree is a map of the change surface.

Example shape:

```text
src/
  M components/Field.tsx
  A components/Field.test.tsx
  M lib/validation.ts
docs/
  M workspace.md
```

### Diff stats

- `git diff <merge-base>...<current-branch> --stat` to pull line counts for the description summary.

## 4. Write the title

- Maximum 30 characters total.
- Present tense, imperative mood: `Add`, `Fix`, `Update`, `Remove`, `Refactor`.
- No trailing period.
- If the branch name begins with a ticket prefix (e.g. `DOS-1234`), keep it inside the 30-char budget.
- The title is the title of the branch's main change in one line.

## 5. Write the description

Use the structure below. Each section is a paragraph block. **Paragraphs are single lines** — never soft-wrap a phrase (see the `commit` skill for the rule). Use blank lines to separate paragraphs.

```text
## Summary

<one paragraph: what this PR does and why, in present tense, written for a reviewer who has no context>

## Changes

<one paragraph per logical group of changes, mirroring the commit grouping. Each paragraph stays on a single line.>

## File tree

<the compact tree from step 3, fenced as a code block>

## Commits

<bullet list of commits from step 3, newest first or oldest first — pick one and stay consistent. Use the full subject line, no truncation.>

## Notes

<optional: anything a reviewer should know up front — risks, follow-ups, screenshots, links.>
```

Rules:

- No section may be empty. Drop `Notes` when there is nothing to add.
- Do not include diffs, code blocks of the changes themselves, or CI output. The PR diff view covers that.
- Keep the summary to one paragraph. The reader should understand the change in under 30 seconds.

## 6. Assignee

- Assign the PR to the current GitHub user from step 1.
- Use `gh pr create --assignee "<user>"` or pass `--assignee` along with the other flags.

## 7. Create the PR

Push the branch if needed, then create the PR. Preferred invocation:

```bash
git push -u origin <branch> 2>/dev/null || true
gh pr create \
  --base <default-branch> \
  --head <branch> \
  --title "<title>" \
  --body "<description>" \
  --assignee "<user>"
```

Write the description to a temp file if it is long, and pass `--body-file <path>` to avoid shell escaping issues.

## 8. Confirm

After creation, return:

- The PR URL from `gh pr view --json url --jq .url`.
- The title used.
- The assignee set.
- A short recap of the file tree and commit count.

## 9. Anti-patterns

- Title longer than 30 characters.
- Description that soft-wraps a paragraph across lines.
- Reusing the body of a single commit as the whole PR description — the PR description is a rollup, not a copy.
- Forgetting the assignee, or hardcoding someone else's handle.
- Opening the PR with uncommitted local changes still in the working tree.
