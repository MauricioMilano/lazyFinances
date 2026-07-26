---
tags:
  - change/improve-add-file
  - status/ready
  - capability/add-file-modal
---

## Why

The current "Upload Image" affordance in the import-statement card supports a single hidden `<input type="file" accept="image/*" multiple>` and forwards each selected file directly to the LM Studio vision endpoint. It has three usability gaps: (1) users cannot paste a file (Ctrl/Cmd+V) — a common flow when capturing a screenshot from another tool; (2) only image files are accepted, so common statement formats (PDF, CSV, JSON, XML, XLS, XLSX) are silently ignored; (3) there is no preview or way to remove a file before extraction runs, so mis-selected files are processed anyway and have to be cleaned out of the transactions table afterwards.

## What Changes

- Add an "Add file" modal that can be opened from the import-statement card and from a new button next to the "Add Row" action on the transactions table.
- The modal exposes three ingestion paths in one surface: drag-and-drop a file onto a drop zone, pick a file from disk (file picker), or paste a file with Ctrl/Cmd+V (`paste` event on the modal root).
- The modal accepts the full supported set: images (PNG, JPEG, WebP, GIF), PDF, CSV, JSON, XML, XLS, XLSX. Files outside this set are rejected with an inline reason; supported types are summarised in the modal footer.
- The modal maintains an in-flight list of attached files with thumbnails (image previews via object URL, document icons for non-image types) and a per-row remove action that does not require confirmation.
- A persistent thumbnail strip rendered alongside the transactions table mirrors the modal's attached set; a remove action here uses the existing `ConfirmModal` because it directly mutates the user's session state outside the modal.
- A new `useFileAttachments` hook owns the attachment state (session-only) and exposes add/remove/clear operations plus a `processAll` dispatcher that routes each file to the right parser (vision pipeline for images, native parsers for CSV/JSON/XML, SheetJS for XLS/XLSX, pdfjs-dist for PDF).
- The extraction card is reduced to a trigger only; the actual file ingestion and progress lives in the modal. The `useFinanceStore` upload slice is reused for cross-file progress reporting (unchanged).

## Capabilities

### New Capabilities

- `add-file-modal`: an "Add file" affordance that opens a modal with three ingestion paths (drop, pick, paste), manages an in-session attachment set with thumbnails, supports seven file formats (PNG/JPEG/WebP/GIF, PDF, CSV, JSON, XML, XLS/XLSX), exposes the same attachment set as a thumbnail strip alongside the transactions table, and removes attachments either directly (inside the modal) or behind a confirmation prompt (alongside the table).

### Modified Capabilities

- None. The modal-system, finance-store, security, and batch-transaction-extraction capabilities remain at requirement level; this change only adds new consumers of them.

## Impact

- **Components**:
  - `src/components/ExtractionCard.tsx` becomes a trigger-only card pointing to the new modal.
  - New `src/components/AddFileModal.tsx` (the modal with drop zone, picker, paste listener, attachment list, supported-types footer).
  - New `src/components/AttachmentStrip.tsx` (the thumbnail strip rendered above the transactions table).
  - `src/components/AirtableTable.tsx` (or its parent) renders `AttachmentStrip` and an "Add file" button next to the existing "Add Row" / "Export" actions.
- **Hooks**:
  - New `src/hooks/use-file-attachments.ts` (session-only attachment state, parser dispatcher).
- **Utils**:
  - New `src/utils/file-parsers.ts` with `parseCsv`, `parseJson`, `parseXml`, `parseXlsx`, `parsePdf` thin wrappers and a discriminated `ParsedFile` union.
  - `src/utils/ai-extraction.ts` unchanged but reused for images.
- **Dependencies** (new, dev/prod mix):
  - `xlsx` (SheetJS Community Edition) — runtime, XLS/XLSX parsing.
  - `pdfjs-dist` — runtime, PDF parsing.
  - CSV/JSON/XML use native browser APIs (`TextDecoder`, `JSON.parse`, `DOMParser`); no new deps.
- **Security**:
  - New file ingestion paths expand the untrusted-bytes surface; mitigated by per-file type validation (mime + extension sniff), CSV formula-injection escaping (`"="`, `"+"`, `"-"`, `"@"` prefixed fields rewritten with a leading apostrophe or filtered out), object-URL-only thumbnail rendering (no `dangerouslySetInnerHTML`), and a session-only retention policy (no file bytes persisted).
  - Adds two runtime dependencies (`xlsx`, `pdfjs-dist`); `pnpm cve:scan-deps` runs at every gate.

## Related

- [[design|Design]]
- [[tasks|Tasks]]
- [[specs/add-file-modal/spec|add-file-modal spec]]
- [[src/components/ui/modal.tsx]]
- [[src/components/ExtractionCard.tsx]]
- [[src/store/finance.ts]]
- [[docs/cve-methodology.md]]

## Security Considerations

### Threat model summary

The change widens the trusted-input surface from a single hidden `<input type=file accept="image/*">` to a modal that ingests user-supplied bytes from three different events (drop, picker, paste). All bytes stay in the browser; parsing is client-side only.

### Data classes

- File bytes (image, PDF, structured text/binary). Read and parsed in-browser only. Not persisted.
- Object URLs for thumbnails. Session-only.
- Parsed transactions consumed by the existing `addTransactions` path. Persisted via localStorage (PII; pre-existing HIGH finding stands, no new exposure introduced).
- Filenames + MIME types surfaced in the UI. Not persisted beyond component state.

### Trust boundaries

- Browser → user-provided bytes: each parser enforces type/extension validation and per-field sanitization (CSV formula guard, numeric coercion, ISO date normalization).
- Browser → LM Studio: unchanged vision flow. SSRF surface on the user-editable `baseUrl` remains in `Settings.tsx`; out of scope here.
- Browser → user-perceived UI: object URLs only, no `dangerouslySetInnerHTML`.

### Third-party trust

- `xlsx` (SheetJS Community Edition) — added runtime dep for XLS/XLSX parsing.
- `pdfjs-dist` (Mozilla) — added runtime dep for PDF text extraction.
- CSV/JSON/XML use native browser APIs; no new external trust.
- Both runtime deps will be scanned by `pnpm cve:scan-deps` on every gate; the change is blocked on CRITICAL findings.

### Persistence layer

- File bytes: not persisted. Attachment state lives in React component state, dies with the modal/page.
- Transactions: persisted unchanged via the existing `useFinanceStore.data` slice.

### Privilege escalation

- No auth, sessions, tokens, or RBAC touched.
- No DOM-injection vectors (no `innerHTML`, no `dangerouslySetInnerHTML`).
- File bytes are not evaluated or executed; parsers are pure deserializers.

### Mitigations

- CSV formula prefix escape on every output string cell.
- Object URL revocation on remove and unmount.
- Per-file type guard at intake (extension + MIME), hard-rejected outside the supported set.
- Modal uses the project's allowlisted compound `Modal`; no raw `Dialog`/`Drawer` imports.

### Residual risk

- SheetJS (`xlsx`) historically has had advisories; tracked by `pnpm cve:scan-deps`. If a HIGH without fix lands, the change is blocked from commit until a fixed version exists.
- Scanned (image-only) PDFs yield zero transactions because OCR is out of scope; the user is informed via toast. Future improvement.

### Overrides

(none)
