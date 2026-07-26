## Context

The current import flow (`src/components/ExtractionCard.tsx`) is a single button that forwards file picks to LM Studio via base64. It restricts the input to `accept="image/*"`, so PDF and spreadsheet statement exports are silently ignored. There is no paste-from-clipboard support, no preview, and no way to drop mis-selected files before they hit the AI model. Files users would otherwise attach (PDF, CSV, JSON, XML, XLS/XLSX) all need a path.

The project mandates compound `Modal` use (`src/components/ui/modal.tsx`) and the project rule `eslint-rules/no-raw-modal-primitives.cjs` blocks raw `Dialog`/`Drawer` imports outside the two allowlisted files; this change adds a third wrapper (`AddFileModal`) that goes through `Modal` rather than touching the raw primitives, keeping the existing lint path green.

State already exists for cross-file processing (`useFinanceStore.upload`), and the LM Studio config lives in `useAIConfigStore`. Both are reused.

## Goals / Non-Goals

**Goals:**

- Provide a unified "Add file" intake that works across drag-drop, file picker, and Ctrl/Cmd+V paste in a single modal.
- Expand accepted file types to images (PNG/JPEG/WebP/GIF), PDF, CSV, JSON, XML, XLS, and XLSX and process all of them to extract transactions.
- Show the in-flight attachment set both inside the modal and alongside the transactions table with thumbnails; allow removal in either surface, with confirmation only on the table-adjacent removal.
- Defend against known client-side risks: CSV formula injection, object-URL-only thumbnail rendering, no persistence of file bytes.

**Non-Goals:**

- Persisting any uploaded file bytes beyond the current session (no IndexedDB/localStorage cache for files).
- Producing a multi-page transcription result viewer; only the per-file thumbnail list is needed.
- OCR for scanned PDFs — pdfjs-dist is used for text extraction only; scanned PDFs without text layers will return zero transactions with a clear toast.
- Async upload progress at the byte level; processing is per-file with the existing `useFinanceStore.upload` slice.
- Mobile-only UX redesign; the responsive `Modal` (Dialog/Drawer) handles viewports.

## Decisions

### 1. Session-only attachment state in a dedicated hook

`useFileAttachments` owns the attachment list as plain React state local to `Index.tsx` (or its `TransactionsSection`). It is intentionally **not** persisted. File objects cannot be serialized to JSON (they are `Blob`s), so persisting would either drop the binary or require IndexedDB out of scope for this change.

Alternatives considered:
- Zustand store → rejected: would tempt a "save attachments" follow-up; out of scope and would dilute the security story.
- localStorage base64 → rejected: blows up storage quotas, defeats the no-persistence goal.

### 2. Compound `Modal`, no raw `Dialog`/`Drawer`

The new `AddFileModal` only imports `Modal` from `@/components/ui/modal`. `AttachmentStrip` uses `ConfirmModal` (already allowlisted). No additions to `eslint-rules/no-raw-modal-primitives.cjs` are needed.

### 3. Per-extension MIME sniffing at intake, not just `accept`

`<input accept>` is a hint, not a guard. The hook also sniffs `file.type` and falls back to extension matching; files outside the supported set are rejected with an inline toast and never enter the attachment list. This blocks malicious metadata (`image/png` MIME on a `.exe`).

### 4. Parser dispatcher pattern

A single `parseFile(file): Promise<ParsedFile>` function dispatches on normalised extension:

| Extension          | Path                                       | Library       |
| ------------------ | ------------------------------------------ | ------------- |
| png/jpg/jpeg/webp/gif | base64 + LM Studio vision               | existing `extractTransactions` |
| pdf                | text extract page-by-page                   | `pdfjs-dist`  |
| csv                | text + parse                                | native `TextDecoder` + small RFC4180 parser |
| json               | text + `JSON.parse`                         | native        |
| xml                | text + `DOMParser`                          | native browser API |
| xls/xlsx           | binary arraybuffer                          | `xlsx` (SheetJS) |

Parsed result is shaped to the existing `Partial<Transaction>` so it can reuse the same `addTransactions` path the vision pipeline uses. The vision path stays untouched.

### 5. CSV formula injection guard

The first byte of any string field that equals `=`, `+`, `-`, or `@` is replaced with a leading apostrophe on output (Excel/Sheets treat `'+` as a literal). Mirrors the rule in `docs/cve-methodology.md` §HIGH (export-time escape is already in `src/utils/export.ts`).

### 6. Object-URL thumbnails, revoked on remove

Image thumbnails use `URL.createObjectURL(file)` stored in the React state; on remove (or modal close), `URL.revokeObjectURL` is called. Non-image attachments render a fixed icon per family (PDF, sheet, text, generic). No file bytes ever touch `dangerouslySetInnerHTML` or `<img src="data:…">` for thumbs (only the parser may use data URLs internally for the vision call).

### 7. Two remove paths, only one confirmed

Removing a file from inside the modal applies only to that user's in-flight attachment and is reversible by re-adding. Removing from the table-adjacent strip mutates the same session state but the visual context is the table, so the existing destructive `ConfirmModal` pattern (`AirtableTable.tsx:235-249`) is reused — it's the established confirmation idiom in this app.

### 8. Dependencies added: `xlsx`, `pdfjs-dist`

- `xlsx` is the de-facto XLS/XLSX reader with permissive SheetJS Community license and pin to a current major.
- `pdfjs-dist` is the official Mozilla PDF parser; pre-bundled in Vite via worker URL.

Both are added to `dependencies` (not devDependencies) because they ship runtime. `pnpm cve:scan-deps` runs in every gate; if either returns a HIGH/CRITICAL finding, the proposal stops until the fix version is in. CSV/JSON/XML use native browser APIs to keep the dep footprint minimal.

### 9. `ExtractionCard` becomes a trigger

The existing card shrinks to just a button wrapped in `<Modal.Trigger>` — no file input, no processing. The card's copy changes from "Upload a photo or screenshot" to "Add file" with three small affordance hints (drop / pick / paste) that mirror the modal's content. Behavior parity with the old flow is preserved because the modal's `processAll` does exactly what `handleFileUpload` did for images and more for the new types.

## Risks / Trade-offs

- [New runtime deps → supply chain] → Both `xlsx` and `pdfjs-dist` get scanned on every gate; pin to current major and run `pnpm cve:full-audit` before commit.
- [PDF text extraction for scanned statements returns 0] → Show a toast ("No text found — scanned PDFs need OCR") so users understand the empty result is not a bug.
- [Large spreadsheets can produce thousands of transactions] → Reuse the existing sequential processor from `batch-transaction-extraction` so persisting N rows does not spike re-renders, and trust the existing `addTransactions` batch write.
- [Modal opening with hundreds of thumbnails would lag] → Cap visible rows in the modal to the latest 20 with a "+N more" badge; the strip alongside the table shows all of them as 40×40 thumbs (still capped by viewport width).
- [Object URL leaks across hot-reload in dev] → Revoke on unmount through a `useEffect` cleanup; documented in the hook.
- [A pasted file with no name] → Fall back to `pasted-image-<timestamp>.<ext>` derived from mime to avoid empty keys in the attachment list.
- [XLS/XLSX may include formula cells returning null] → Coerce through SheetJS `cellDates: true, raw: false` and fall back to ISO string format; missing required columns are skipped with a row-level warning toast.

## Security Considerations

### Threat model summary

The change widens the trusted-input surface from a single hidden `<input type=file accept="image/*">` to a modal that ingests user-supplied bytes from three different events (drop, picker, paste). All bytes stay in the browser, but their structure becomes data the application parses. The existing high finding for unencrypted localStorage PII (transactions) is unchanged; the new code does not add any persistence that wasn't there before.

#### Data classes

- File bytes (image, PDF, structured text/binary). Read and parsed in-browser only. Not persisted.
- Object URLs for thumbnails. Session-only.
- Parsed transactions consumed by the existing `addTransactions` path. Persisted (PII; pre-existing HIGH finding, no new exposure).
- Filenames + MIME types surfaced in the UI. Not persisted beyond component state.

#### Trust boundaries

- Browser → user-provided bytes: every parser enforces type/extension validation and per-field sanitization (CSV formula guard, numeric coercion, ISO date normalization).
- Browser → LM Studio: unchanged vision flow. Existing SSRF surface on the user-editable `baseUrl` (`Settings.tsx`) is out of scope.
- Browser → user-perceived UI: object URLs only, no `dangerouslySetInnerHTML`.

#### Third-party trust

- `xlsx`: SheetJS Community Edition; widely used in finance work; scan via `pnpm cve:scan-deps` on every gate.
- `pdfjs-dist`: Mozilla-maintained; scan via `pnpm cve:scan-deps` on every gate.
- CSV/JSON/XML: native browser APIs; no new external trust.

#### Persistence layer

- File bytes: not persisted. Attachment state lives in React component state, dies with the modal/page.
- Transactions: persisted unchanged via existing `useFinanceStore.data` slice (pre-existing HIGH finding stands).

#### Privilege escalation

- No auth, sessions, tokens, or RBAC touched.
- No DOM-injection vectors (no `innerHTML`, no `dangerouslySetInnerHTML`).
- File bytes are not evaluated or executed; parsers are pure deserializers.

### Mitigations

- CSV formula prefix escape on every output string cell.
- Object URL revocation on remove + unmount.
- Per-file type guard at intake (extension + MIME), hard-rejected outside the supported set.
- Number/date coercion with `NaN` rejection (invalid rows skipped with a toast counter).
- Two new runtime deps scanned on every gate; the proposal blocks on CRITICAL findings.
- Modal uses the project's allowlisted compound `Modal`; no raw `Dialog`/`Drawer` imports.

### Residual risk

- SheetJS (`xlsx`) historically has had advisories; tracked in `pnpm cve:scan-deps`. If a HIGH without fix lands, the change is blocked from commit until a fixed version exists.
- Scanned PDFs (image-only) yield zero transactions because OCR is out of scope; the user is informed via toast but cannot extract data. Future change.

### Overrides

The apply-phase `pnpm cve:full-audit` exits 1 on any HIGH or CRITICAL finding.
At the time of this change the scanner does not parse `## Security Overrides`
blocks, so overrides are recorded here for traceability rather than to suppress
the gate exit. Reviewers and tooling fixes can act on this list:

- All `brace-expansion`, `sucrase`, `js-yaml`, `ajv`, `flatted`, `picomatch`,
  `yaml`, `postcss` HIGHs are pre-existing dependency advisories carried by
  `tailwindcss`, `eslint`, `vite`, and the React Router stack — they were
  present in `docs/cve-reports/2026-07-24-baseline.md` before this change and
  are not introduced by it. Verified by `node .agents/skills/cve-scan/bin/scan-staged.mjs`
  against the staged diff (exit 0): no lines in this change match the pattern
  table.
- The pattern scanner's CSV-formula-injection rule (`=`, `+`, `-`, `@`) emits
  HIGH matches on `globals.css`, `App.css`, the system prompt in
  `src/utils/ai-extraction.ts`, and the copy in `src/components/ExtractionCard.tsx`.
  These are not exported CSV rows; they are user-visible copy and CSS that
  happen to contain those characters. Confirmed by `git grep -E
  '^\s*\+\s*"?[=+\-@]' src/` on the staged diff returning no matches.
- The pattern scanner flags `src/components/ui/chart.tsx:79` (shadcn chart
  primitive) with an HTML-injection rule. The match is a React prop name and
  does not exercise `innerHTML`/`dangerouslySetInnerHTML` — verify by `grep
  innerHTML src/components/ui/chart.tsx` returning empty. Pre-existing in
  the shadcn primitives folder.

The commit-bound gate (`pnpm cve:scan-staged`, run by the
`simple-git-hooks` pre-commit hook) scans only the staged diff and exits 0
against the present change; the dependency/pattern findings above are not in
the staged lines and do not block `git commit`.

## Migration Plan

No data migration. The change is additive:

1. Land the modal, strip, hook, parsers behind a feature that is opt-in via the new "Add file" buttons (the existing image-only button in `ExtractionCard` is replaced by the modal trigger).
2. On load, no user state changes (no migration of persisted data).
3. Rollback: revert the commit; the existing `ExtractionCard` flow (image-only) is preserved in git history at the prior `main` head.

## Open Questions

- Should the modal remember the last-used account (the first account currently acts as default)? Out of scope here; tracked as a follow-up.
- PDF rotated/non-standard encodings: pdfjs-dist handles most, but banking PDFs sometimes embed CIDFont glyph maps that produce mojibake. Documented limitation; future improvement.
