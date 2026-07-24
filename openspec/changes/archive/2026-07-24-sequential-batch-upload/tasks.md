---
tags:
  - change/sequential-batch-upload
  - status/archived
  - capability/batch-transaction-extraction
---
## 1. Data Layer (Hooks)

- [x] 1.1 Add `addTransactions` method to `useFinance` hook for bulk updates.
- [x] 1.2 Update the `setData` logic to handle an array of new transactions.

## 2. Component Logic (ExtractionCard)

- [x] 2.1 Update the file input to support `multiple` selection.
- [x] 2.2 Refactor `handleFileUpload` to extract processing logic into a sequential loop.
- [x] 2.3 Implement the `FileReader` promise logic inside the loop for each file.
- [x] 2.4 Add sequential calls to `extractTransactions` with `await`.
- [x] 2.5 集成 batch results accumulation during the loop.

## 3. UI/UX (Feedback)

- [x] 3.1 Implement progress-aware toast updates ("Processing file X of Y").
- [x] 3.2 Add conditional toast success/error messages based on batch results.
- [x] 3.3 Remove the hard page reload from the success handler.
- [x] 3.4 Ensure the "Upload" button and input are properly disabled during batch processing.

## 4. Error Handling

- [x] 4.1 Implement `try...catch` within the loop to allow remaining files to process after a single failure.
- [x] 4.2 Add error logging and partial success notifications.


## Related

- [[proposal|Proposal]]
- [[design|Design]]
- [[specs/batch-transaction-extraction/spec|batch-transaction-extraction spec]]
