---
tags:
  - change/bulk-row-selection
  - capability/transaction-bulk-delete
---
## Why

Deleting transactions today is a one-at-a-time flow: hover a row, click the trash icon, confirm in a modal. Cleaning out a noisy table — or wiping it entirely to start fresh — is tedious and easy to miscount. The user needs a single, visible affordance to remove many rows at once, with the destructive confirmation that the new `ConfirmModal` already provides.

## What Changes

- **Checkbox column on `AirtableTable`** — A new leftmost column with a per-row checkbox plus a screen-reader label. The existing per-row trash icon is removed because it becomes redundant once selection exists.
- **Bulk-action bar above the table** — A toolbar showing the current selection count on the left and a single action button on the right that adapts its label to the selection state. The bar is hidden when the table is empty.
- **Adaptive button label** — The action button text reflects the current state in three modes:
  - `selectedCount === 0` → `Remove all rows` (clicking selects every row).
  - `selectedCount === totalCount` → `Remove N rows` (no missing counter).
  - `0 < selectedCount < totalCount` → `Remove N rows, M missing` where `M = totalCount - selectedCount`.
- **Destructive confirmation flow** — When `selectedCount > 0`, clicking the button opens the existing `ConfirmModal` with `intent="destructive"`, a singular/plural title, and a description. On confirm, the table iterates `selectedIds` and calls `onDelete(id)` for each, then clears the selection.
- **Visual selection state** — Selected rows render with a subtle background tint so the user can see what will be removed before confirming.

## Capabilities

### New Capabilities
- `transaction-bulk-delete`: Ability to select one, several, or all transactions in the table and remove them in a single destructive confirmation flow.

### Modified Capabilities
- None

## Impact

- **Modified files**
  - `src/components/AirtableTable.tsx` — Adds `selectedIds` state, the checkbox column, the bulk-action bar, and replaces the per-row trash icon with the bulk flow. Reuses the existing `ConfirmModal`.
- **No dependency changes** — All required primitives (`Checkbox` styling via native `accent-` utility, `Button`, `ConfirmModal`) are already in the project.
- **UX impact** — Users can now wipe or partially prune the table with a visible, self-describing affordance instead of repeated per-row hovers. Destructive confirmations are mandatory through `ConfirmModal`, matching the safety contract established by the unified modal change.


## Related

- [[design|Design]]
- [[tasks|Tasks]]
- [[specs/transaction-bulk-delete/spec|transaction-bulk-delete spec]]
