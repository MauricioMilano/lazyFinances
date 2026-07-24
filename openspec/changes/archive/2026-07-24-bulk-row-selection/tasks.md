---
tags:
  - change/bulk-row-selection
  - capability/transaction-bulk-delete
---
## 1. State and helpers

- [x] 1.1 Add `selectedIds: Set<string>` state in `AirtableTable.tsx`, initialized to an empty Set.
- [x] 1.2 Add `confirmBulkOpen: boolean` state for the destructive confirmation gate.
- [x] 1.3 Add a pure module-scope helper `getBulkActionLabel(selectedCount, totalCount)` returning `Remove all rows`, `Remove N rows`, or `Remove N rows, M missing` per the spec.
- [x] 1.4 Add a `toggleRow(id)` callback that adds/removes an id from `selectedIds` immutably.

## 2. Bulk-action bar

- [x] 2.1 Render the bar above the table inside the same container, hidden when `transactions.length === 0`.
- [x] 2.2 Show `N of M selected` on the left when at least one row is selected, otherwise show `M rows` (or `1 row` when M is 1).
- [x] 2.3 Render the action button on the right with the adaptive label and `variant="destructive"` when `selectedCount > 0`, otherwise `variant="outline"`. Disable the button while the table is empty.

## 3. Checkbox column

- [x] 3.1 Add a leading `<TableHead>` with a `sr-only` "Select" label.
- [x] 3.2 Add a leading `<TableCell>` per row containing a native `<input type="checkbox">` bound to `selectedIds.has(t.id)` and `toggleRow(t.id)`. Use `aria-label` derived from `t.description || t.id`.
- [x] 3.3 Apply `bg-[#f8fafc]` to a row when its id is in `selectedIds`.
- [x] 3.4 Remove the prior per-row trash icon column (`TableHead` + `TableCell` with the `Trash2` button) and the `confirmDeleteId` state plus its ConfirmModal wiring.

## 4. Bulk delete flow

- [x] 4.1 Implement `handleBulkActionClick`: when `selectedCount === 0` populate `selectedIds` with every transaction id; otherwise open `confirmBulkOpen`.
- [x] 4.2 Implement `handleBulkConfirm` that iterates `Array.from(selectedIds).forEach((id) => onDelete(id))` and then clears `selectedIds` to an empty Set.
- [x] 4.3 Render the existing `<ConfirmModal>` controlled by `confirmBulkOpen` with `intent="destructive"`, `confirmLabel="Delete"`, `cancelLabel="Cancel"`, description `This action cannot be undone.`, and a title that is `Delete this transaction?` when `selectedCount === 1` and `Delete N transactions?` otherwise.

## 5. Verification

- [x] 5.1 Run `pnpm lint` and confirm no new errors.
- [x] 5.2 Run `pnpm build` and confirm the bundle builds cleanly.
- [x] 5.3 Manually walk through the three label transitions on a populated table (initial `Remove all rows` → first click selects all → label becomes `Remove N rows` → uncheck two → label becomes `Remove N-2 rows, 2 missing` → click opens ConfirmModal → confirm removes the rows and clears the selection).
- [x] 5.4 Manually confirm that cancelling the ConfirmModal preserves the selection and that no rows are removed.


## Related

- [[proposal|Proposal]]
- [[design|Design]]
- [[specs/transaction-bulk-delete/spec|transaction-bulk-delete spec]]
