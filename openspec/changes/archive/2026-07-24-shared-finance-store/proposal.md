## Why

The current `useFinance` hook creates an independent React state instance per component. This means `ExtractionCard` and `Index.tsx` (which renders `AirtableTable`) hold separate state copies. When `ExtractionCard.addTransactions(...)` runs, only `ExtractionCard`'s state updates — `AirtableTable` never sees the new rows. The previous change happened to mask this because all writes were deferred to a single bulk commit at the end of a batch, but the underlying reactivity is broken.

Additionally, the table has no way to know that an upload is in progress. The only feedback is a toast notification. We want the table itself to reflect processing state so the user sees activity in the data area, not just a toast in the corner.

## What Changes

- **Shared store**: Replace the per-component `useFinance` hook with a Zustand-backed store so all components subscribe to the same source of truth.
- **Progressive commits**: Push extracted transactions to the store as each file completes, so the table grows in real-time rather than waiting for the entire batch.
- **Upload state in the store**: Track `isProcessing`, `current`, `total`, and `fileName` so any component can react to processing state.
- **Table loading indicator**: Add a progress bar in the table header showing "Processing 3 of 5" while a batch is active.
- **Persistence**: Use Zustand's `persist` middleware so transactions, accounts, and config survive page reloads. Upload state is ephemeral and never persisted.

## Capabilities

### New Capabilities
- `finance-store`: Centralized, persistent store for finance data with an ephemeral upload state slice.

### Modified Capabilities
- `batch-transaction-extraction`: The "Bulk data insertion" requirement becomes progressive (per-file commit), and a new requirement is added for table-level loading feedback.

## Impact

- **New files**: `src/store/finance.ts`
- **Modified files**: `src/hooks/use-finance.ts` (becomes a thin wrapper), `src/components/ExtractionCard.tsx`, `src/components/AirtableTable.tsx`, `src/pages/Index.tsx`
- **Dependencies**: Adds `zustand` to `package.json`
- **Specs**: Modifies `batch-transaction-extraction/spec.md` (commit semantics + new loading requirement). Adds `finance-store/spec.md`.
