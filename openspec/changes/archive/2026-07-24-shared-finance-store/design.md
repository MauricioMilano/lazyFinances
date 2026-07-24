---
tags:
  - change/shared-finance-store
  - status/archived
  - capability/finance-store
  - capability/batch-transaction-extraction
---
## Context

`useFinance` is a custom hook that returns state from `useState`. Each call creates a fresh state machine, so two components calling `useFinance` end up with two independent state instances that share nothing in memory. They do share a localStorage key, but localStorage is only read on initial mount and only written via `useEffect` — there is no subscription, so a write from one component does not trigger a re-render in another.

The previous change (`sequential-batch-upload`) deferred all data writes to the end of a batch and relied on toast feedback. The page reload from the original single-file flow was the only thing that ever made the table update, and that was removed. The trait wasn't visible because no one was watching the table during a batch — but the underlying cross-component reactivity problem is real.

To fix it properly, we need a shared store. Once the store is shared, we can also expose upload state from the same source of truth, which enables the table to render a loading indicator.

## Goals / Non-Goals

**Goals:**
- Single source of truth for finance data across all components
- Reactive table updates during batch processing
- Persisted data across page reloads
- Clear, calm visual indication of upload progress in the table
- Minimal change to call sites (preserve the `useFinance` API)

**Non-Goals:**
- Re-architecting the upload loop (already settled by `sequential-batch-upload`)
- Per-row loading states (the table is communicated to at the batch level)
- Optimistic UI with rollback (overkill for this scope)
- Real-time sync across browser tabs (single-tab use case)

## Decisions

### 1. Zustand for the store
- **Why**: Minimal boilerplate, idiomatic React, has `persist` middleware out of the box, ~3KB gzipped. The `react-query` dependency is already present but is for server state, not client state — wrong tool here.
- **Alternative**: React Context + reducer. Rejected: more ceremony, no built-in persistence, more boilerplate at every call site.
- **Alternative**: Module-level singleton with a custom hook. Rejected: works but custom code is harder to maintain than a well-known library.

### 2. Ephemeral upload state, persistent data state
- **Why**: If the user reloads mid-batch, the in-flight files are gone (the base64 strings never reach the new page). Trying to resume would be confusing. The `partialize` option in `persist` lets us persist only the `data` slice.
- **Alternative**: Persist upload state too. Rejected: stale or impossible-to-resume batches.

### 3. Progressive commits, not single bulk
- **Why**: Each file's transactions are pushed to the store as soon as `extractTransactions` resolves. The table grows in real time, which gives the user immediate feedback. It also makes the "loading state" meaningful — the table is genuinely mid-update between files.
- **Alternative**: Keep the single bulk commit (`addTransactions` once at the end). Rejected: hides activity, makes the loading state fake.
- **Trade-off**: One `localStorage` write per file instead of one per batch. Acceptable for typical batch sizes (3–10 files). If we see performance issues, we can debounce writes later.

### 4. Progress bar in the table header for loading state
- **Why**: Honest about progress (we know `current`/`total`), calm, doesn't hide existing data. The toast already provides the "look at me" feedback; the table gets a quiet, accurate ribbon.
- **Visual**: A thin `Progress` component (`value = (current / total) * 100`) plus text "Processing `{fileName}` ({current}/{total})", rendered in the table header row only when `isProcessing` is true.
- **Alternative**: Skeleton rows at the top of the table. Rejected: dishonest about row count (we don't know how many transactions each file will produce).
- **Alternative**: Spinner overlay over the table. Rejected: hides existing data, more visually aggressive than needed.

### 5. Backward-compatible `useFinance` hook
- **Why**: Existing call sites ([[src/pages/Index.tsx]], [[src/components/ExtractionCard.tsx]]) keep the same API. The hook re-exports the same shape from the Zustand store using selectors.
- **Alternative**: Refactor all call sites to use `useFinanceStore` directly. Rejected: more diff, no real benefit at this scale.

## Risks / Trade-offs

- **[Risk]**: Multiple `localStorage` writes per batch (one per file) could be slow on huge batches.
  - **Mitigation**: Acceptable for typical 3–10 file batches. Monitor; debounce later if needed.
- **[Risk]**: Adding a state-management dependency for a small app.
  - **Mitigation**: 3KB gzipped; pays for itself by solving a real cross-component reactivity problem.
- **[Risk]**: Persistence could write stale data if multiple tabs are open.
  - **Mitigation**: Single-tab use case per scope. Multi-tab sync is explicitly out of scope.


## Related

- [[proposal|Proposal]]
- [[tasks|Tasks]]
- [[specs/finance-store/spec|finance-store delta]]
- [[specs/batch-transaction-extraction/spec|batch-transaction-extraction delta]]
