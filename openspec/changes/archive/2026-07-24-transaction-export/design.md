---
tags:
  - change/transaction-export
  - status/archived
  - capability/data-export
---
## Context

The Transactions table renders an Export button at `src/pages/Index.tsx:89` with no `onClick` handler. There is no other export code in the codebase — `grep` for `Blob`, `download`, `exportTo`, etc. returns nothing. Users want to get their transactions out for analysis in other tools (spreadsheets, other finance apps, accountants).

The data lives in a Zustand store ([[src/store/finance.ts]]) persisted to `localStorage` via `zustand/middleware`'s `persist`. Consumers read it via `useFinance()` ([[src/hooks/use-finance.ts]]), which exposes `data.transactions` as a plain array. There is no backend — everything is client-side, so export is a pure browser-side serialization + `Blob` + `URL.createObjectURL` + anchor-click pattern.

UI conventions are already established: shadcn components (Button, Dialog, DropdownMenu, Select, Card), `lucide-react` icons, `sonner` toasts, Tailwind utilities. The ExportButton should follow these patterns.

## Goals / Non-Goals

**Goals:**
- Make the existing Export button functional without altering its visual placement.
- Offer three output formats — JSON, CSV, XML — each producing a complete, well-formed, lossless-within-scope representation of all transactions.
- Handle special characters (commas, quotes, newlines, `<>&`, unicode) correctly in every format.
- Be obvious when there's nothing to export (disabled state, not silent failure).

**Non-Goals:**
- Exporting accounts, AI config, or any non-transaction data. The `accountId` is exported as a bare UUID; consumers needing account names must join manually.
- Re-import / round-trip support. Export is one-way. (The JSON envelope includes `schemaVersion` to keep the door open without committing to it.)
- Date-range filtering, category filtering, or "export selected rows." All transactions are exported.
- Import functionality. Out of scope for this change.
- Server-side export, streaming, or chunked output. Personal-finance transaction counts are small (hundreds to low thousands); synchronous in-memory serialization is fine.
- Pretty-printing of JSON. Minified JSON keeps file size down for no-cost benefit; consumers can re-format.

## Decisions

### 1. Three serializers in one utility module, not three

**Choice**: One file [[src/utils/export.ts]] exporting `toJSON`, `toCSV`, `toXML`, and `downloadFile`.

**Why**: Each format is ~20-40 lines. Three separate files would be over-organized. They share an input signature (`Transaction[]`) and have no shared logic — co-locating makes the module discoverable and the format choices comparable side-by-side.

**Alternative considered**: A `formats/` subdirectory with `json.ts`, `csv.ts`, `xml.ts`. Rejected — adds import noise (`import { toCSV } from '@/utils/formats/csv'`) for trivial wins.

### 2. JSON envelope with metadata

**Choice**: Wrap transactions in `{ schemaVersion, exportedAt, source, count, transactions[] }`.

**Why**: Lets us evolve the format later (add fields, rename, restructure) without breaking consumers. Costs ~50 bytes per file. The `count` field is redundant with `transactions.length` but lets consumers validate before parsing the array.

**Alternative considered**: Bare array `[...]`. Simpler but commits us to a frozen format. The envelope is a one-line overhead per consumer.

### 3. CSV conventions

**Choice**:
- Headers: lowercase snake_case (`id`, `date`, `description`, `amount`, `category`, `account_id`, `type`, `status`) — matches the in-app field names closely; `account_id` is the only rename (`accountId` → `account_id`) for spreadsheet-friendliness.
- Date: ISO `YYYY-MM-DD` — sortable, locale-independent.
- Amount: absolute (matches storage); `type` column disambiguates income/expense.
- Type and status columns: kept — they cannot be derived from any other field.
- BOM (`\ufeff`) prepended — Excel detects UTF-8 instead of mis-rendering accented characters.
- Line endings: `\r\n` — RFC 4180, what Excel emits on save.
- Field quoting: RFC 4180 — quote fields containing `,`, `"`, `\n`, or `\r`; double internal quotes.

**Why these specifics**: They're the lowest-surprise set for the common consumer (someone opening the CSV in Numbers/Excel/Sheets). ISO dates sort correctly as strings; BOM prevents the Excel mojibake trap.

### 4. XML: attributes on a single element

**Choice**: One `<transaction ...attributes/>` per row, no nested child elements, root `<export>` with metadata attributes.

**Why**: Keeps the XML small and trivially parseable. Attributes are appropriate because each transaction is a flat record with scalar fields — there's no nested structure to express. Using attributes (instead of `<date>2026-07-15</date>` children) keeps each transaction on one line and makes diff/grep easier.

**Alternative considered**: Children for every field. More "canonical" XML but noisier and harder to scan. Rejected.

### 5. Filename convention

**Choice**: `lazy-finance-transactions-YYYY-MM-DD.{json,csv,xml}`.

**Why**: Date-stamped so multiple exports in a session don't collide. The prefix matches the project name (`lazyFinances/`) and how users refer to the app.

**Note**: The persisted storage key in [[src/store/finance.ts]] (`aether_finance_data`) is intentionally left untouched in this change. Renaming it would invalidate existing users' local storage and is a separate migration concern.

**Alternative considered**: Including time (`...-HH-MM-SS...`). Overkill for a user clicking a button once or twice a session.

### 6. Disabled state when empty

**Choice**: `ExportButton` receives `transactions` as a prop and applies `disabled` on the trigger button when `transactions.length === 0`.

**Why**: Silent failure (click → nothing) is the worst UX. Visual disabled state matches the pattern used elsewhere (e.g., `disabled={isProcessing}` on the upload button in `ExtractionCard.tsx:103`).

**Alternative considered**: Showing a toast on click when empty. Worse — the user has to read a toast to learn what the disabled button already tells them.

### 7. Pure client-side download via Blob + anchor

**Choice**: Build a `Blob`, call `URL.createObjectURL`, programmatically click a temporary `<a>` with the `download` attribute, then revoke the object URL.

**Why**: This is the standard pattern. No dependencies required. Works in every modern browser. The `download` attribute sets the filename without server round-trips.

### 8. DropdownMenu over three separate buttons

**Choice**: A single Export button opens a `DropdownMenu` with three items: "Export as JSON", "Export as CSV", "Export as XML".

**Why**: Matches the existing UI density. Three side-by-side text buttons next to "Add Row" would crowd the row. `DropdownMenu` is already a shadcn component used elsewhere in the project; no new dependency.

## Risks / Trade-offs

- **Orphaned `accountId` UUIDs** in exported files. A consumer who opens the CSV in a spreadsheet sees raw UUIDs like `1`, `2`, etc. (currently the seed IDs from `src/lib/defaults.ts`) with no account name alongside. → Acceptable for v1; documented in the spec. A future change could add an "Include account names" toggle or export accounts alongside.

- **No round-trip / re-import**. If a user wants to edit in Excel and bring the data back, they can't. → Acceptable for v1 (no import feature exists). The JSON envelope's `schemaVersion` keeps the door open.

- **Special-character correctness is tested only by example** in the serializers. Real-world inputs (newlines in descriptions, `&` in vendor names) must be exercised by tests at implementation time. → Task list includes explicit edge-case test cases.

- **`URL.revokeObjectURL` timing**. If revoked before the download triggers (some browsers), the download fails silently. → Use the well-known pattern of clicking the anchor synchronously then revoking on the next microtask (or `setTimeout(..., 0)`).

- **Large transaction lists**. Synchronous serialization of, say, 10k transactions is fine; 100k starts to be noticeable. → Not a concern at personal-finance scale; noted as a future consideration if usage patterns change.


## Related

- [[proposal|Proposal]]
- [[tasks|Tasks]]
- [[specs/data-export/spec|data-export spec]]
