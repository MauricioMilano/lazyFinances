## Why

The Transactions table has an "Export" button with a download icon, but clicking it does nothing — it has no `onClick` handler. The button is decorative only (`src/pages/Index.tsx:89`). Users currently have no way to get their transaction data out of the app for analysis in other tools.

## What Changes

- Add a working export control next to the "Add Row" button that lets the user download all transactions in one of three formats: JSON, CSV, or XML.
- Add a small serializer module (`src/utils/export.ts`) with three pure functions (`toJSON`, `toCSV`, `toXML`) plus a `downloadFile` helper.
- Add an `ExportButton` component (`src/components/ExportButton.tsx`) using shadcn's `DropdownMenu` to present the three format choices.
- Wire `ExportButton` into `Index.tsx`, replacing the non-functional button.
- Disable the export button when there are no transactions to export.

## Capabilities

### New Capabilities
- `data-export`: Ability to download the user's transactions as JSON, CSV, or XML for use in other tools.

### Modified Capabilities
- None. The existing `finance-store` spec covers state management and persistence; export is a read-only operation that does not change store behavior.

## Impact

- **New files**:
  - `src/utils/export.ts` — serializers + `downloadFile` helper.
  - `src/components/ExportButton.tsx` — dropdown UI.
- **Modified files**:
  - `src/pages/Index.tsx` — replace the decorative button with `<ExportButton transactions={data.transactions} />`.
- **Dependencies**: none. Uses existing `DropdownMenu` shadcn component, existing `sonner` toast (if needed for error feedback), existing `lucide-react` icons.
- **Scope**: transactions only. `accountId` is exported as a raw UUID; accounts are not exported. This is documented in the spec.
- **No breaking changes**. No existing behavior is altered — only a previously-broken button becomes functional.
