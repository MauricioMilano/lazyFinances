## Why

The current `useFinance` hook creates an independent React state instance per component. This means `ExtractionCard` and `Index.tsx` (which renders `AirtableTable`) hold separate state copies. When `ExtractionCard.addTransactions(...)` runs, only `ExtractionCard`'s state updates — `AirtableTable` never sees the new rows. The previous change happened to mask this because all writes were deferred to a single bulk commit at the end of a batch, but the underlying reactivity is broken.

Additionally, the table has no way to know that an upload is in progress. The only feedback is a toast notification. We want the table itself to reflect processing state so the user sees activity in the data area, not just a toast in the corner.

## What Changes

- **Shared store**: Replace the per-component `useFinance` hook with a Zustand-backed store so all components subscribe to the same source of truth.
- **Progressive commits**: Push extracted transactions to the store as each file completes, so the table grows in real-time rather than waiting for the entire batch.
- **Upload state in the store**: Track `isProcessing`, `current`, `total`, and `fileName` so any component can react to processing state.
- **Table loading indicator**: Add a progress bar in the table header showing "Processing 3 of 5" while a batch is active.
- **Separate AI config store**: Move `LMStudioConfig` into its own Zustand store with its own persistence key, so the AI configuration concern is decoupled from finance data.
- **Defaults extracted**: `DEFAULT_ACCOUNTS` is moved to a constants file (`src/lib/defaults.ts`) instead of living in the finance store.
- **Persistence**: Use Zustand's `persist` middleware so transactions, accounts, and AI config survive page reloads. Upload state is ephemeral and never persisted. On first load, the AI config migrates from the old combined `aether_finance_data` key to its own `aether_ai_config` key.

## Capabilities

### New Capabilities
- `finance-store`: Centralized, persistent store for finance data (transactions, accounts) with an ephemeral upload state slice.
- `ai-config-store`: Centralized, persistent store for the LM Studio configuration (baseUrl, apiKey, model).

### Modified Capabilities
- `batch-transaction-extraction`: The "Bulk data insertion" requirement becomes progressive (per-file commit), and a new requirement is added for table-level loading feedback.
- `finance-store`: The store no longer holds `config` or `updateConfig`; defaults are no longer declared in the store file.

## Impact

- **New files**: `src/store/finance.ts`, `src/store/ai-config.ts`, `src/hooks/use-ai-config.ts`, `src/lib/defaults.ts`
- **Modified files**: `src/hooks/use-finance.ts` (loses `updateConfig`; data slice drops `config`), `src/components/ExtractionCard.tsx` (reads config from the AI config store), `src/components/Settings.tsx` (uses the AI config store directly, drops props), `src/components/AirtableTable.tsx`, `src/pages/Index.tsx`
- **Dependencies**: Adds `zustand` to `package.json`
- **Specs**: Modifies `batch-transaction-extraction/spec.md` and `finance-store/spec.md`. Adds `ai-config-store/spec.md`.
- **Persistence**: Two localStorage keys after this change — `aether_finance_data` (transactions, accounts) and `aether_ai_config` (LM Studio config). One-time migration of config out of the old combined key.
