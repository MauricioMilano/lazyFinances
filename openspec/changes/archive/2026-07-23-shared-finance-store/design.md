---
tags:
  - change/shared-finance-store
  - status/archived
  - capability/finance-store
  - capability/batch-transaction-extraction
  - capability/ai-config-store
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

### 2. Two stores, not one
- `useFinanceStore` owns transactions, accounts, and ephemeral upload state.
- `useAIConfigStore` owns the `LMStudioConfig` (baseUrl, apiKey, model).
- **Why**: The AI configuration is a separate concern (configuration of an external service) from finance data (the user's data). Each has its own persistence key and lifecycle. Splitting them keeps the finance store focused on user data and avoids the "kitchen sink" store pattern.
- **Alternative**: Keep `config` in the finance store. Rejected: it conflates data and configuration; updating the AI endpoint should not touch the user's transactions at all.
- **Alternative**: Combine everything into one slice with `persist` handling both. Rejected: would require composite keys and complex `partialize`; not worth the coupling.

### 3. One-time migration of config out of the combined key
- The previous single store wrote everything to `aether_finance_data` including the config. After this change, the finance store drops the config slice and the AI config store lives under a new key `aether_ai_config`.
- **Why**: Existing users have their config under the old key. Without migration, they'd lose their settings.
- **Migration strategy**: on first load of `useAIConfigStore`, if `aether_ai_config` is absent and the old key contains a `data.config`, use that config as the initial state. The next write to the AI config store will move it permanently to the new key. Idempotent.

### 4. Ephemeral upload state, persistent data state
- **Why**: If the user reloads mid-batch, the in-flight files are gone (the base64 strings never reach the new page). Trying to resume would be confusing. The `partialize` option in `persist` lets us persist only the `data` slice.
- **Alternative**: Persist upload state too. Rejected: stale or impossible-to-resume batches.

### 5. Progressive commits, not single bulk
- **Why**: Each file's transactions are pushed to the store as soon as `extractTransactions` resolves. The table grows in real time, which gives the user immediate feedback. It also makes the "loading state" meaningful — the table is genuinely mid-update between files.
- **Alternative**: Keep the single bulk commit (`addTransactions` once at the end). Rejected: hides activity, makes the loading state fake.
- **Trade-off**: One `localStorage` write per file instead of one per batch. Acceptable for typical batch sizes (3–10 files). If we see performance issues, we can debounce writes later.

### 6. Progress bar in the table header for loading state
- **Why**: Honest about progress (we know `current`/`total`), calm, doesn't hide existing data. The toast already provides the "look at me" feedback; the table gets a quiet, accurate ribbon.
- **Visual**: A thin `Progress` component (`value = (current / total) * 100`) plus text "Processing `{fileName}` ({current}/{total})", rendered in the table header row only when `isProcessing` is true.
- **Alternative**: Skeleton rows at the top of the table. Rejected: dishonest about row count (we don't know how many transactions each file will produce).
- **Alternative**: Spinner overlay over the table. Rejected: hides existing data, more visually aggressive than needed.

### 7. Backward-compatible `useFinance` and `useAIConfig` hooks
- **Why**: Existing call sites keep roughly the same shape. The hooks re-export the same surface from their respective stores using selectors.
- **Alternative**: Refactor all call sites to use `useFinanceStore` / `useAIConfigStore` directly. Rejected: more diff, no real benefit at this scale.

### 8. `DEFAULT_ACCOUNTS` lives in [[src/lib/defaults.ts]]
- **Why**: It's a single constant, not a store concern. Keeping it in the finance store made the store file double as a defaults file. Extracting it makes the store's responsibility clearer.
- **Alternative**: Inline the default accounts at the use site. Rejected: would scatter knowledge of the seed data.
- **Alternative**: Create a separate accounts store. Rejected: accounts are part of the finance data, not a separate domain.

## Risks / Trade-offs

- **[Risk]**: Multiple `localStorage` writes per batch (one per file) could be slow on huge batches.
  - **Mitigation**: Acceptable for typical 3–10 file batches. Monitor; debounce later if needed.
- **[Risk]**: Adding a state-management dependency for a small app.
  - **Mitigation**: 3KB gzipped; pays for itself by solving a real cross-component reactivity problem.
- **[Risk]**: Persistence could write stale data if multiple tabs are open.
  - **Mitigation**: Single-tab use case per scope. Multi-tab sync is explicitly out of scope.
- **[Risk]**: Migration of AI config from the old key may be skipped if a user has a corrupted old payload.
  - **Mitigation**: The migration reads defensively (`try/catch`, type checks). If the old key is missing or malformed, the user falls back to `DEFAULT_CONFIG` and can reconfigure in Settings.


## Related

- [[proposal|Proposal]]
- [[tasks|Tasks]]
- [[specs/finance-store/spec|finance-store delta]]
- [[specs/batch-transaction-extraction/spec|batch-transaction-extraction delta]]
- [[specs/ai-config-store/spec|ai-config-store delta]]
