---
tags:
  - change/shared-finance-store
  - status/archived
  - capability/finance-store
  - capability/batch-transaction-extraction
---
## 1. Dependencies

- [x] 1.1 Install `zustand` via `pnpm add zustand`

## 2. Store Implementation

- [x] 2.1 Create [[src/store/finance.ts]] with a Zustand store
- [x] 2.2 Define `FinanceStore` interface with `data` slice (transactions, accounts, config) and `upload` slice (isProcessing, current, total, fileName)
- [x] 2.3 Implement data actions: `addTransaction`, `addTransactions`, `updateTransaction`, `deleteTransaction`
- [x] 2.4 Implement config actions: `updateConfig`, `addAccount`
- [x] 2.5 Implement upload lifecycle actions: `startProcessing`, `updateProgress`, `endProcessing`
- [x] 2.6 Configure `persist` middleware with `partialize` to persist only the `data` slice
- [x] 2.7 Use the existing `STORAGE_KEY` (`aether_finance_data`) for backwards compatibility

## 3. Hook Migration

- [x] 3.1 Refactor [[src/hooks/use-finance.ts]] to be a thin wrapper over the Zustand store using selectors
- [x] 3.2 Remove the local `useState`/`useEffect` localStorage logic
- [x] 3.3 Keep the same returned shape (`data`, `addTransaction`, `addTransactions`, `updateTransaction`, `deleteTransaction`, `updateConfig`, `addAccount`)

## 4. ExtractionCard Updates

- [x] 4.1 Remove local `isProcessing` state
- [x] 4.2 Call `startProcessing(totalFiles)` at the start of the upload
- [x] 4.3 Call `updateProgress(i + 1, file.name)` at the start of each loop iteration
- [x] 4.4 Move `addTransactions(fileResults)` inside the loop so transactions commit progressively
- [x] 4.5 Call `endProcessing()` in the `finally` block
- [x] 4.6 Update toast messages to reference per-file success counts

## 5. AirtableTable Updates

- [x] 5.1 Subscribe to the `upload` slice via `useFinanceStore`
- [x] 5.2 Render a progress bar in the table header when `upload.isProcessing` is true
- [x] 5.3 Show "Processing `{fileName}` ({current}/{total})" text alongside the progress bar
- [x] 5.4 Use the `Progress` component from `@/components/ui/progress`
- [x] 5.5 Hide the existing "No transactions yet" empty-state row when processing (we're not actually empty)

## 6. Spec Updates

- [x] 6.1 Modify [[../../specs/batch-transaction-extraction/spec|batch-transaction-extraction spec]]: change "Bulk data insertion" to "Progressive insertion" with per-file commits
- [x] 6.2 Add new requirement to [[../../specs/batch-transaction-extraction/spec|batch-transaction-extraction spec]]: "Table loading indicator" with header progress bar
- [x] 6.3 Create [[../../specs/finance-store/spec|finance-store spec]] with shared state, persistence, and ephemeral upload state requirements

## 7. Verification

- [x] 7.1 Verify cross-component reactivity: uploading in [[src/components/ExtractionCard.tsx]] updates the table in [[src/pages/Index.tsx]]
- [x] 7.2 Verify persistence: reload the page after adding transactions, data is restored
- [x] 7.3 Verify upload state resets on reload (no zombie "isProcessing" from a previous session)
- [x] 7.4 Verify progressive commits: with 3 files, the table grows 3 times during the batch
- [x] 7.5 Verify the header progress bar appears with correct `current`/`total` text
- [x] 7.6 Run `pnpm lint` and `pnpm build` (typecheck)


## Related

- [[proposal|Proposal]]
- [[design|Design]]
- [[specs/finance-store/spec|finance-store delta]]
- [[specs/batch-transaction-extraction/spec|batch-transaction-extraction delta]]
