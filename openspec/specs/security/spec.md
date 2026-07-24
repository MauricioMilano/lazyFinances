# security Specification

## Purpose
TBD - created by archiving change cve-methodology. Update Purpose after archive.
## Requirements
### Requirement: Severity ladder for security findings
The system SHALL classify every CVE finding into one of four severities — CRITICAL, HIGH, MEDIUM, LOW — defined in `docs/cve-methodology.md`. CRITICAL findings indicate an exploitable vulnerability or exposed credential that MUST be fixed before code lands. HIGH findings indicate a known attack vector or missing control that MUST be fixed unless explicitly overridden in the change's `design.md`. MEDIUM findings indicate a deviation from best practice that the system SHALL warn about. LOW findings indicate a hygiene issue the system SHALL log for trend tracking.

#### Scenario: CRITICAL finding blocks every gate
- **WHEN** any scan produces a CRITICAL finding
- **THEN** the affected gate rejects the change (commit is blocked, task is not marked done, proposal is flagged missing threat model)

#### Scenario: HIGH finding requires explicit override
- **WHEN** any scan produces a HIGH finding
- **THEN** the affected gate rejects the change unless the finding's identifier appears in a `## Security Overrides` block of the current change's `design.md` with rationale text

#### Scenario: MEDIUM finding warns but does not block
- **WHEN** any scan produces a MEDIUM finding
- **THEN** the affected gate continues, the finding appears in the report, and the trend dashboard records the count

#### Scenario: LOW finding logs only
- **WHEN** any scan produces a LOW finding
- **THEN** the affected gate continues and the finding is recorded in the report and trend dashboard

### Requirement: Security gate at every OpenSpec phase
The system SHALL apply security checks at four OpenSpec gates: `explore`, `propose`, `apply`, and `commit`. Each gate SHALL map to a specific scan mode defined in the methodology doc. The `explore` gate SHALL prompt with threat-model questions during AI-driven exploration. The `propose` gate SHALL verify the change's `proposal.md` and `design.md` carry a `## Security Considerations` block. The `apply` gate SHALL run a full audit of the working tree. The `commit` gate SHALL run a scan of the staged diff via the installed `pre-commit` hook.

#### Scenario: explore gate prompts threat questions
- **WHEN** the AI runs the `cve-scan` skill during an `explore` session for a change
- **THEN** the skill prompts with five threat-model questions: data touched, trust boundaries crossed, third-party trust, persistence layer, and privilege escalation surface

#### Scenario: propose gate verifies Security Considerations block
- **WHEN** the AI runs `pnpm cve:scan-proposal` against an active change directory
- **THEN** the scan returns HIGH if either `proposal.md` or `design.md` lacks a `## Security Considerations` heading

#### Scenario: apply gate runs full audit
- **WHEN** the AI runs `pnpm cve:full-audit` during the `apply` phase
- **THEN** the scan produces a Markdown report at `docs/cve-reports/YYYY-MM-DD-apply-<change-name>.md` listing all findings

#### Scenario: commit gate blocks on staged CRITICAL
- **WHEN** the user runs `git commit` and the staged diff contains a CRITICAL finding
- **THEN** the pre-commit hook exits non-zero with the finding printed to stderr and the commit is rejected

### Requirement: Dependency CVE scanning via pnpm audit
The system SHALL run `pnpm audit --json` to detect known CVEs in the project's dependency tree. The `scan-deps.mjs` script SHALL format the JSON output into a Markdown report. Findings SHALL surface as CRITICAL when a CVE has a published exploit and a fix version exists, HIGH when a CVE has a fix version exists, MEDIUM when a CVE has no fix version yet, and LOW when the audit reports only dev-tool advisories on unused paths.

#### Scenario: dep scan runs at full audit
- **WHEN** `pnpm cve:full-audit` runs
- **THEN** `scan-deps.mjs` executes `pnpm audit --json` and writes a `## Dependency Findings` section to the report

#### Scenario: dep scan exits clean on no vulnerabilities
- **WHEN** `pnpm audit` returns zero vulnerabilities
- **THEN** the report's `## Dependency Findings` section records `0 findings` and the scan exits 0

### Requirement: Secret scanning via gitleaks
The system SHALL invoke `gitleaks protect --staged --redact --no-banner` as part of the staged-diff scan. If `gitleaks` is not installed on the host, the scanner SHALL print a warning and continue with the pattern scanner. Every secret finding SHALL be classified CRITICAL.

#### Scenario: gitleaks detects a staged AWS key
- **WHEN** the staged diff contains a string matching AWS access key format
- **THEN** `gitleaks` exits non-zero, the hook exits non-zero, and the commit is blocked

#### Scenario: gitleaks missing on host
- **WHEN** `command -v gitleaks` returns non-zero on the host
- **THEN** `scan-staged.mjs` prints `[cve-scan] gitleaks not found. Install: brew install gitleaks` and continues to the pattern scan

### Requirement: Pattern scanning against editable rule table
The system SHALL scan the staged diff (or full working tree in apply) against the regex patterns in `.opencode/skills/cve-scan/patterns.json`. Each pattern entry SHALL carry `id`, `regex`, `severity`, `rationale`, and `cwe`. Default patterns SHALL include `eval`, `Function(`, `innerHTML`, `outerHTML`, `dangerouslySetInnerHTML`, `dangerouslySetInnerHTML`, `child_process`, `exec(`, `execSync(`, `document.write`, and `new Function`.

#### Scenario: pattern scan detects eval in staged diff
- **WHEN** a staged file adds a line containing `eval(` outside of a string literal
- **THEN** the scanner reports a CRITICAL finding with the file, line number, and matched text

#### Scenario: pattern table is editable without code change
- **WHEN** a user adds a new entry to `patterns.json` with a unique `id`
- **THEN** the next run of `pnpm cve:scan-staged` includes the new pattern without modifying scanner code

### Requirement: Proposal and design threat-model block
Every active change's `proposal.md` and `design.md` SHALL carry a `## Security Considerations` heading with at least one paragraph describing the threat model for the change. The `scan-proposal.mjs` script SHALL detect the heading and exit 0; absence SHALL trigger a HIGH finding.

#### Scenario: change with Security Considerations passes propose gate
- **WHEN** `pnpm cve:scan-proposal` runs against a change whose `proposal.md` contains `## Security Considerations`
- **THEN** the script exits 0

#### Scenario: change without Security Considerations fails propose gate
- **WHEN** `pnpm cve:scan-proposal` runs against a change whose `proposal.md` lacks `## Security Considerations`
- **THEN** the script exits non-zero and reports a HIGH finding naming the missing file

### Requirement: Security override block in design.md
A change's `design.md` MAY carry a `## Security Overrides` block listing finding identifiers (e.g., `dep-cve-GHSA-xxxx`, `pattern-eval-src/utils/x.ts:42`) with rationale text. The scanner SHALL skip findings listed in this block, regardless of severity, and the report SHALL record the override in a `## Overrides` section.

#### Scenario: HIGH finding is overridden
- **WHEN** a HIGH finding's identifier appears in the change's `## Security Overrides` block
- **THEN** the scanner records the override in the report and the gate does not block

#### Scenario: CRITICAL finding cannot be overridden
- **WHEN** a CRITICAL finding's identifier appears in the change's `## Security Overrides` block
- **THEN** the scanner records the override attempt in the report but the gate still blocks (CRITICAL has no override path)

### Requirement: Report archival and trend dashboard
Every scan that produces findings SHALL write a Markdown report to `docs/cve-reports/YYYY-MM-DD-<phase>-<scope>.md` containing the scan metadata, a findings table, an overrides section (if any), and a delta versus the previous report of the same scope. A `docs/cve-reports/INDEX.md` file SHALL aggregate all reports into a single trend table. `pnpm cve:trend` SHALL regenerate `INDEX.md` by reading every report in the directory.

#### Scenario: full audit writes a report file
- **WHEN** `pnpm cve:full-audit` completes
- **THEN** a file exists at `docs/cve-reports/YYYY-MM-DD-apply-<change-name>.md` containing the findings table

#### Scenario: trend dashboard aggregates reports
- **WHEN** `pnpm cve:trend` runs
- **THEN** `docs/cve-reports/INDEX.md` is overwritten with one row per report, showing date, change, phase, and counts of CRITICAL/HIGH/MEDIUM/LOW

#### Scenario: baseline report seeds the trend
- **WHEN** `pnpm cve:full-audit --baseline` runs for the first time on the project
- **THEN** the report is written to `docs/cve-reports/YYYY-MM-DD-baseline.md` and appears as the first row in the regenerated `INDEX.md`

### Requirement: Pre-commit hook installation via simple-git-hooks
The system SHALL install a `pre-commit` git hook that runs `pnpm cve:scan-staged` on every commit. The hook configuration SHALL live in `package.json` under the `simple-git-hooks` key, and `simple-git-hooks` SHALL run on `prepare` so that every `pnpm install` re-wires the hook for the current clone.

#### Scenario: pre-commit hook blocks commit on CRITICAL
- **WHEN** the user stages a diff that contains a CRITICAL pattern finding
- **THEN** the `pre-commit` hook exits non-zero and `git commit` aborts

#### Scenario: pre-commit hook survives clone
- **WHEN** a new clone of the repository runs `pnpm install`
- **THEN** `simple-git-hooks` creates `.git/hooks/pre-commit` invoking `pnpm cve:scan-staged`

#### Scenario: --no-verify bypasses the hook
- **WHEN** the user runs `git commit --no-verify`
- **THEN** the pre-commit hook does not execute and the commit proceeds

### Requirement: AI mandate to run full audit before task close
The project's `AI_RULES.md` SHALL state that `pnpm cve:full-audit` must run with no CRITICAL or unoverridden HIGH findings before any task in `tasks.md` is marked done. This mirrors the existing test mandate and applies during the `apply` phase.

#### Scenario: AI marks a task done without running the audit
- **WHEN** an AI marks a task `[x]` in `tasks.md` without first running `pnpm cve:full-audit`
- **THEN** the missing audit is a process violation visible to reviewers

### Requirement: External tool documentation in methodology doc
The `docs/cve-methodology.md` document SHALL list every external tool the methodology depends on (`gitleaks`, `pnpm audit`, `simple-git-hooks`), with installation commands for macOS (`brew install gitleaks`), Linux (apt/brew equivalent), and Windows (note that gitleaks may require WSL or manual download). The doc SHALL also list the fallback behavior when each tool is missing.

#### Scenario: methodology doc lists gitleaks install command
- **WHEN** a developer reads `docs/cve-methodology.md`
- **THEN** the doc contains a `## Tools` section with a `### gitleaks` subsection including the `brew install gitleaks` command for macOS

#### Scenario: methodology doc describes fallback when gitleaks is missing
- **WHEN** a developer reads the `## Tools` section
- **THEN** the doc states that missing `gitleaks` produces a warning and the pattern scanner still runs

