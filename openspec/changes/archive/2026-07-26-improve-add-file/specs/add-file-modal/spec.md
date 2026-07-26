## ADDED Requirements

### Requirement: Add file modal opening
The system SHALL provide an "Add file" modal accessible from both the import-statement card and the transactions section. The modal MUST be implemented as a consumer of the existing compound `Modal` (no raw `Dialog`/`Drawer`/`AlertDialog`/`Sheet` imports).

#### Scenario: Trigger opens the modal from the extraction card
- **WHEN** the user clicks the "Add file" button inside the import-statement card
- **THEN** the modal opens in the responsive primitive (`Modal` chooses Dialog vs Drawer from the viewport) with the title "Add file" and the supported-formats footer visible

#### Scenario: Trigger opens the modal from the transactions section
- **WHEN** the user clicks the "Add file" button next to "Add Row" and "Export" above the transactions table
- **THEN** the same modal opens, sharing the same session attachment list as the trigger from the extraction card

#### Scenario: Modal close reverts the internal paste listener
- **WHEN** the user closes the modal via the X affordance or the Escape key
- **THEN** the modal unmounts, any active `paste` listener on the modal root is removed, and no object URL remains attached

### Requirement: Three ingestion paths in one modal
The modal SHALL expose drag-and-drop, file picker, and Ctrl/Cmd+V paste as equally supported ingestion paths. Drag, picker, and paste SHALL funnel through the same attachment-state dispatcher.

#### Scenario: Drag-and-drop adds files to the attachment list
- **WHEN** the user drags one or more files over the drop zone and releases them inside the zone
- **THEN** each accepted file becomes a new attachment with a thumbnail (object URL for images, icon for documents), unsupported files produce an inline toast naming each rejected file, and the drop zone returns to its idle state

#### Scenario: File picker adds files to the attachment list
- **WHEN** the user activates "Pick from device" inside the modal and selects one or more files from the OS picker
- **THEN** each accepted file becomes a new attachment following the same rules as the drag-and-drop path

#### Scenario: Ctrl/Cmd+V paste adds the clipboard file
- **WHEN** the user pastes with Ctrl+V (or Cmd+V on macOS) while the modal root has focus and the clipboard contains a file payload
- **THEN** the file becomes a new attachment with an auto-derived name (e.g. `pasted-image-<timestamp>.<ext>`) and the textarea/editor remains scrollable without losing focus

#### Scenario: Multiple ingestion paths in the same session
- **WHEN** the user adds files via drag, then picks more, then pastes
- **THEN** all attachments appear in one combined list in the order they were ingested

### Requirement: Supported file types and processing
The modal SHALL accept and fully process seven file families: PNG, JPEG, WebP, GIF (images); PDF; CSV; JSON; XML; XLS and XLSX. Files outside this set SHALL be rejected with an inline toast that names the rejected file.

#### Scenario: Image files route through the vision pipeline
- **WHEN** the user attaches a PNG, JPEG, WebP, or GIF and triggers processing
- **THEN** each file is converted to base64 and forwarded to the configured LM Studio vision endpoint, the result is mapped to `Partial<Transaction>` rows and added to the transactions table

#### Scenario: PDF files are text-extracted
- **WHEN** the user attaches a PDF and triggers processing
- **THEN** the PDF is text-extracted page-by-page, each detected transaction line is mapped to a transaction row, and pages with no text yield a per-page toast notice

#### Scenario: CSV files are parsed natively
- **WHEN** the user attaches a CSV and triggers processing
- **THEN** the file is parsed via a native RFC-4180-aware reader, columns are mapped by header sniffing (with sensible fallbacks), and a leading `=`, `+`, `-`, or `@` in any string field is rewritten with a leading apostrophe to prevent formula injection

#### Scenario: JSON files are parsed natively
- **WHEN** the user attaches a JSON file whose top-level value is an array of objects with transaction-shaped fields (date, description, amount, category, accountId, type, status)
- **THEN** the array is mapped to transactions and added to the table; malformed rows are skipped with a per-file toast summary

#### Scenario: XML files are parsed natively
- **WHEN** the user attaches an XML file with a `<transactions>` root containing `<transaction>` children with the same shape as the JSON case
- **THEN** the children are mapped to transactions; non-conforming XML is rejected with an inline reason

#### Scenario: XLS and XLSX files are parsed via SheetJS
- **WHEN** the user attaches an XLS or XLSX and triggers processing
- **THEN** the first sheet is read, the header row is sniffed, data rows are mapped to transactions, and rows missing required columns are skipped with a count reported in a toast

### Requirement: In-modal attachment list with thumbnails
The modal SHALL show the in-flight attachment list with a thumbnail per item (image object URL for image files; document icon for the other families), the file name, file size rounded to KB/MB, and a remove action per row.

#### Scenario: Image attachment shows preview
- **WHEN** the modal displays an attached PNG file
- **THEN** the row renders a small `<img>` whose `src` is the object's `URL.createObjectURL(file)` value, with `alt` equal to the file name

#### Scenario: Non-image attachment shows type icon
- **WHEN** the modal displays an attached PDF, CSV, JSON, XML, XLS, or XLSX file
- **THEN** the row renders a family-specific icon (PDF, sheet, curly braces, angle brackets, table) and no object URL is created

#### Scenario: Per-row remove action
- **WHEN** the user clicks the remove (×) affordance on a row inside the modal
- **THEN** the row is removed without confirmation, any image object URL is revoked, and the modal remains open

### Requirement: Attachment strip alongside the transactions table
The transactions section SHALL render an attachment strip that mirrors the modal's session attachment list. The strip SHALL render thumbnails (40×40px) using the same object-URL logic as the modal. A remove affordance in the strip SHALL open the destructive `ConfirmModal` (the existing project pattern) before removing the item.

#### Scenario: Strip mirrors modal additions
- **WHEN** the user adds attachments via the modal and closes it
- **THEN** the strip alongside the table displays the same thumbnails in the same order

#### Scenario: Strip remove requires confirmation
- **WHEN** the user clicks the remove (×) affordance on a thumbnail inside the strip
- **THEN** the `ConfirmModal` opens with title "Remove this attachment?" and an intent="destructive" confirm; the item is only removed after the user confirms

#### Scenario: Strip is empty when no attachments
- **WHEN** the session attachment list is empty
- **THEN** the strip is hidden (not rendered) above the transactions table

### Requirement: Progress and failure reporting
The modal AND the strip SHALL share the existing `useFinanceStore.upload` slice to report progress per file across the whole batch. Per-file failures SHALL be surfaced without aborting the batch.

#### Scenario: Progress bar advances per file
- **WHEN** the user clicks "Process all" and there are N attachments in the modal
- **THEN** the existing upload slice is updated to `isProcessing: true, total: N`, and as each file completes the slice advances to `current: i+1` with `fileName: <name>`; both the modal and the strip show the updated progress

#### Scenario: Successful attachments persist in the strip with an imported indicator
- **WHEN** the user finishes processing a batch
- **THEN** every attachment that produced transactions remains in the strip alongside the transactions table, marked with an imported indicator, so the user can see which files were added and remove them with the destructive confirmation if needed; only an explicit removal or a "Clear all" clears the imported entries

#### Scenario: Per-file failure does not abort the batch
- **WHEN** one file in the batch fails to parse or returns zero transactions
- **THEN** the failure is counted, logged to the console with the file name, the file remains in the attachment list (as not-imported), and processing continues with the next file

### Requirement: Type and security guardrails
The modal SHALL validate every file at intake. PDF, XLS, XLSX dependencies SHALL be runtime dependencies and SHALL be scanned by `pnpm cve:scan-deps` on every gate; the proposal/design SHALL block the change if any scan produces a CRITICAL finding.

#### Scenario: Extension/MIME mismatch is rejected
- **WHEN** a file's declared MIME type and extension do not both map to a supported family
- **THEN** the file is rejected at intake, never enters the attachment list, and an inline toast names the rejected file

#### Scenario: Formula injection in CSV is escaped
- **WHEN** a parsed CSV row contains a string cell whose first character is `=`, `+`, `-`, or `@`
- **THEN** the output cell is prefixed with a literal apostrophe (`'=`) so spreadsheet applications treat it as text, not a formula

#### Scenario: Object URLs are revoked on remove and unmount
- **WHEN** a user removes an attachment or the modal unmounts
- **THEN** every object URL created for an attachment from that lifecycle is revoked via `URL.revokeObjectURL`
