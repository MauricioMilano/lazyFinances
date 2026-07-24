---
tags:
  - change/sequential-batch-upload
  - status/archived
  - capability/batch-transaction-extraction
---
## Why

Currently, the application only supports uploading a single image for transaction extraction. This is inefficient for users with multiple receipts or statements. Additionally, the existing implementation triggers a hard page reload after a single success, which would interrupt a multi-file process.

## What Changes

- **Multiple File Selection**: Update the upload interface to allow selecting multiple images simultaneously.
- **Sequential Processing**: Implement a processing queue that handles files one-by-one to avoid rate-limiting or resource exhaustion on local AI models.
- **Batch State Management**: Update the finance hook to support bulk transaction additions to prevent excessive re-renders and local storage writes.
- **Progressive Feedback**: Replace individual success alerts with a persistent, progress-aware UI (toast) that tracks the batch status.
- **Graceful Error Handling**: If a single file fails to process, the system will log the error and continue to the next file in the batch.
- **Reactive Updates**: Remove the manual `window.location.reload()` in favor of reactive state updates.

## Capabilities

### New Capabilities
- `batch-transaction-extraction`: Ability to process multiple financial documents in a single session with status tracking and error resilience.

### Modified Capabilities
- None

## Impact

- **Components**: [[src/components/ExtractionCard.tsx]] will be significantly refactored for the loop and toast logic.
- **Hooks**: [[src/hooks/use-finance.ts]] will receive a new `addTransactions` method.
- **Performance**: Improved responsiveness when importing large sets of data.
- **UX**: Constant feedback during long-running batch operations.


## Related

- [[design|Design]]
- [[tasks|Tasks]]
- [[specs/batch-transaction-extraction/spec|batch-transaction-extraction spec]]
