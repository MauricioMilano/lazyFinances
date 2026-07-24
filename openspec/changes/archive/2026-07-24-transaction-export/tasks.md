---
tags:
  - change/transaction-export
  - status/archived
  - capability/data-export
---
## 1. Serializer utilities

- [x] 1.1 Create [[src/utils/export.ts]] with `toJSON(transactions: Transaction[]): string` that emits the envelope `{ schemaVersion: 1, exportedAt: <ISO 8601>, source: "lazy-finance", count: transactions.length, transactions: [...] }` with each transaction's eight fields preserved as-is.
- [x] 1.2 Add `toCSV(transactions: Transaction[]): string` to [[src/utils/export.ts]] that prepends a UTF-8 BOM, uses CRLF line endings, emits the header `id,date,description,amount,category,account_id,type,status`, writes `accountId` as the `account_id` column, and applies RFC 4180 quoting (wrap fields containing `,`, `"`, `\r`, or `\n` in double quotes; double internal quotes).
- [x] 1.3 Add `toXML(transactions: Transaction[]): string` to [[src/utils/export.ts]] that emits an `<?xml version="1.0" encoding="UTF-8"?>` declaration, a root `<export schemaVersion="1" exportedAt="..." source="lazy-finance" count="...">` element, a `<transactions>` child, and one `<transaction ...attributes/>` per row with all eight fields as attributes (including `accountId` as `accountId`), escaping `<`, `>`, `&`, `'`, `"` in attribute values.
- [x] 1.4 Add `downloadFile(filename: string, content: string, mimeType: string): void` to [[src/utils/export.ts]] that creates a `Blob`, generates an object URL, programmatically clicks a temporary anchor with the `download` attribute set, and revokes the object URL after the click.

## 2. Export button component

- [x] 2.1 Create [[src/components/ExportButton.tsx]] exporting an `ExportButton` component that takes `{ transactions: Transaction[] }`. It renders a shadcn `DropdownMenu` whose trigger is a `Button` with the existing `Download` icon and "Export" label. The menu contains three `DropdownMenuItem`s: "Export as JSON", "Export as CSV", "Export as XML", each calling `downloadFile` with the matching serializer and the filename `lazy-finance-transactions-${YYYY-MM-DD}.{ext}` derived from local time.
- [x] 2.2 In `ExportButton`, apply `disabled` to the trigger button when `transactions.length === 0` so the menu cannot be opened with no data to export.

## 3. Integration

- [x] 3.1 In [[src/pages/Index.tsx]], remove the existing decorative Export button (lines 89-96, the `<Button>` containing the `Download` icon and "Export" label with no `onClick`) and replace it with `<ExportButton transactions={data.transactions} />`. Remove the now-unused `Download` import from the `lucide-react` import line.

## 4. Verification

- [x] 4.1 Run `npm run lint` and resolve any lint errors introduced by the new files.
- [x] 4.2 Run `npm run build` and confirm the project builds without errors.


## Related

- [[proposal|Proposal]]
- [[design|Design]]
- [[specs/data-export/spec|data-export spec]]
