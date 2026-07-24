## Context

The current implementation of `ExtractionCard` handles file uploads one at a time. It uses a `FileReader` to encode images and then calls `extractTransactions`. Upon success, it reloads the entire page. Integrating batch processing requires moving from a single-file event handler to a queue-based processing loop and updating the state management hook to support bulk updates.

## Goals / Non-Goals

**Goals:**
- Provide a seamless multi-file upload experience.
- Maintain stability of the local AI instance by limiting concurrency.
- Provide clear, real-time feedback for long-running batch processes.
- Eliminate page reloads for better UX.

**Non-Goals:**
- Parallel processing of AI extractions (out of scope to prevent local hardware overload).
- Drag-and-drop support (reserved for future enhancement).
- Image preprocessing (resizing/cropping) prior to upload.

## Decisions

### 1. Sequential Processing via `for...of` Loop
We will use a sequential `for...of` loop with `await` inside `handleFileUpload`. 
- **Rationale**: Simple to implement, guarantees order, and prevents race conditions or overlapping API calls to the local LM Studio server.
- **Alternative**: `Promise.all` with a concurrency limiter (p-limit). Refected as overkill for a single-user local tool where 1-at-a-time is the safest baseline.

### 2. Batch State Update in `useFinance`
Introduce `addTransactions(transactions: Transaction[])` to the `useFinance` hook.
- **Rationale**: Reduces the number of `localStorage` writes and component re-renders from $N$ (where $N$ is file count) to 1.
- **Alternative**: Calling `addTransaction` repeatedly. Rejected due to performance and potential state inconsistencies with rapid updates.

### 3. Progressive Toast ID Matching
Use a single `toastId` for the entire batch, updating the content with each transition.
- **Rationale**: Prevents "toast spam" (multiple notifications stacking). A single updating toast is less intrusive and easier to follow.
- **Alternative**: Separate toasts for each file. Rejected as it clutters the interface.

### 4. Removal of `window.location.reload()`
The success logic will no longer trigger a reload.
- **Rationale**: Multi-file processing depends on reactive state. Reloading would kill the execution context of the loop.

## Risks / Trade-offs

- **[Risk]**: Long processing times for large batches.
  - **Mitigation**: Update the toast to show "[Current]/[Total]" so the user knows progress is being made.
- **[Risk]**: Memory exhaustion if uploading many large images.
  - **Mitigation**: Base64 strings are transiently held in the loop and garbage collected; limit total batch size in the future if needed.
- **[Risk]**: State sync issues between tabs.
  - **Mitigation**: `useFinance` already syncs to `localStorage`, but we will ensure the batch operation completes before the final write.
