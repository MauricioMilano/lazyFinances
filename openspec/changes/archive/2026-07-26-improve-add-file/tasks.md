## 1. Dependencies

- [x] 1.1 Install `xlsx` and `pdfjs-dist` as runtime deps via `pnpm add xlsx pdfjs-dist`. Verify the lockfile updates cleanly. (Resolved: `xlsx@0.18.5`, `pdfjs-dist@6.1.200`)
- [x] 1.2 Run `pnpm cve:scan-deps` once after install and confirm no CRITICAL findings for either dep. (Exit 0; neither `xlsx` nor `pdfjs-dist` returned an entry — see Residual risk for the unchanged baseline.)

## 2. File parsers

- [x] 2.1 Create `src/utils/file-parsers.ts` exporting a `SupportedType` union (`'png'|'jpeg'|'webp'|'gif'|'pdf'|'csv'|'json'|'xml'|'xls'|'xlsx'`), an `inferSupportedType(file: File): SupportedType | null` helper that uses `file.type` and falls back to the extension, and a `ParsedTransactions` discriminated union of `{ type, transactions, warnings }`.
- [x] 2.2 Implement `parseCsv(file)` using native `file.text()` + a small RFC-4180 tokenizer; column header sniffing for `date|description|amount|category|accountId|type|status` with sensible fallbacks; CSV formula guard that prefixes leading `=`, `+`, `-`, `@` with an apostrophe.
- [x] 2.3 Implement `parseJson(file)` using native `file.text()` + `JSON.parse`; accept a top-level array of transaction-shaped objects.
- [x] 2.4 Implement `parseXml(file)` using native `file.text()` + `DOMParser`; accept `<transactions><transaction>…</transaction>…</transactions>` shape; never assign `innerHTML`.
- [x] 2.5 Implement `parseXlsx(file)` using `xlsx`'s `read(arrayBuffer, { type: 'array', cellDates: true })`; map rows by the same column header set; report skipped rows as warnings.
- [x] 2.6 Implement `parsePdf(file)` using `pdfjs-dist`'s `getDocument({ data: arrayBuffer }).promise`; iterate pages, join `getTextContent()` items, and look for transaction-shaped rows by line.
- [x] 2.7 Reuse the existing `extractTransactions` for the image-family handler (base64 read + LM Studio call).

## 3. Attachment state hook

- [x] 3.1 Create `src/hooks/use-file-attachments.ts` exposing `{ attachments, addFiles, remove, clear, processAll }`, where `attachments: Attachment[]` carries `{ id, file, name, size, type, previewUrl? }` and `previewUrl` is `URL.createObjectURL(file)` for image types only.
- [x] 3.2 Implement an internal `useEffect` cleanup that revokes every object URL created by this hook instance on unmount.
- [x] 3.3 Wire `processAll` to dispatch each attachment through `parseFile` (images use the vision wrapper, others use the new parsers), reuse the existing `useFinanceStore.upload` slice (`startProcessing`, `updateProgress`, `endProcessing`), and call `addTransactions` from `useFinance` with rows shaped as `Omit<Transaction,'id'>`.

## 4. UI — extraction card trigger

- [x] 4.1 Refactor `src/components/ExtractionCard.tsx` so it no longer owns a `<input type="file">`; render a single "Add file" `Button` opening the new modal.
- [x] 4.2 Update the card copy and styling so the trigger still works in dark/red theme; replace the photo-only hint with three affordance hints (drop, pick, paste).

## 5. UI — Add file modal

- [x] 5.1 Create `src/components/AddFileModal.tsx` composed from `Modal`/`Modal.Header`/`Modal.Body`/`Modal.Footer`. No raw primitive imports.
- [x] 5.2 Implement the drop zone: `onDragOver`/`onDragLeave` toggle a visual active state; `onDrop` extracts `DataTransferItemList` files and forwards to `addFiles`.
- [x] 5.3 Implement the file picker: a hidden `<input type="file" accept="…">` driven by a styled button; `accept` includes all seven supported families.
- [x] 5.4 Implement the paste listener on the modal root using `addEventListener('paste', …)` inside a `useEffect` with empty-deps cleanup.
- [x] 5.5 Render the in-modal attachment list with per-row thumbnail/icon, file name, file size (rounded to KB or MB), and an `×` remove button that calls `remove(id)`.
- [x] 5.6 Render a "Process 0 files" CTA in `Modal.Footer` (disabled when the list is empty) and a "Close" affordance.
- [x] 5.7 Render a supported-formats footer line ("Supports PNG, JPEG, WebP, GIF, PDF, CSV, JSON, XML, XLS, XLSX").

## 6. UI — attachment strip alongside the table

- [x] 6.1 Create `src/components/AttachmentStrip.tsx` rendering only when `attachments.length > 0`. 40×40 thumbnail tiles, file name on hover (tooltip), and an `×` button per tile that opens the `ConfirmModal` (destructive) before invoking `remove(id)`.
- [x] 6.2 Wire `AttachmentStrip` into the transactions section of `src/pages/Index.tsx`, between the section header and `<AirtableTable>`.
- [x] 6.3 Add a second "Add file" button beside "Add Row" / "Export" that opens the same `AddFileModal`. Both buttons share one `useFileAttachments` instance lifted to `Index.tsx`.

## 7. Tests

- [x] 7.1 Add `src/utils/__tests__/file-parsers.test.ts`: per-family happy paths (CSV, JSON, XML), CSV formula-escape, JSON/XML malformed input.
- [x] 7.2 Add `src/hooks/__tests__/use-file-attachments.test.tsx`: `addFiles` accepts/rejects by MIME; `remove` revokes object URL on image; `processAll` advances `upload` slice; `clear` empties the list.
- [x] 7.3 Add `src/components/__tests__/AddFileModal.test.tsx`: drop zone toggles active class; picker via hidden input; per-row `×` removes without confirmation; "Process 0 files" disabled when empty.
- [x] 7.4 Add `src/components/__tests__/AttachmentStrip.test.tsx`: empty list hides the strip; click on `×` opens `ConfirmModal`; confirm removes; cancel preserves.
- [x] 7.5 Update `src/components/__tests__/ExtractionCard.test.tsx` so the existing "uploads one file" assertion now triggers through the modal trigger.

## 8. Security gates

- [x] 8.1 Run `pnpm cve:scan-proposal` against the change; the proposal/design already carry `## Security Considerations`, expect exit 0. (Verified: exit 0.)
- [x] 8.2 Run `pnpm cve:full-audit` before commit. (Findings recorded in `docs/cve-reports/2026-07-26-apply-improve-add-file.md` and `design.md` overrides; no CRITICAL, no new HIGHs from this change.)
- [x] 8.3 Re-run `pnpm cve:scan-deps` after any dep update and rerun the full audit. (Done at task 1.2; exit 0; new deps add zero findings.)

## 9. Verify

- [x] 9.1 `pnpm lint` — no NEW warnings/errors from this change. (Baseline had 4 pre-existing errors in shadcn primitives & pre-existing utils; my code contributes 0 errors and 0 warnings.)
- [x] 9.2 `pnpm typecheck` exits 0.
- [x] 9.3 `pnpm test` exits 0. (11 files / 80 tests passing.)
- [x] 9.4 `pnpm build` exits 0.

## 10. Archive and deliver

- [ ] 10.1 Sync the delta spec into `openspec/specs/add-file-modal/spec.md`, then `openspec archive "improve-add-file" --yes`.
- [ ] 10.2 Run `pnpm cve:full-audit --phase=pre-commit --scope=improve-add-file` against the archived path; run `pnpm cve:trend` to refresh `docs/cve-reports/INDEX.md`; add the new report files to the intended commit.
- [ ] 10.3 Commit, push, and open the PR via the `create-pr` skill; PR body references the archived change path.
