---
tags:
  - change/bulk-row-selection
  - capability/transaction-bulk-delete
---
## Context

The transactions table in `AirtableTable.tsx` exposes a single per-row trash icon that opens `ConfirmModal` (introduced in the `unified-modal-component` change) for destructive confirmation. To delete N rows the user repeats the hover-click-confirm cycle N times, with no bulk affordance. The previous change already established `ConfirmModal` as the only path for destructive flows, so this change reuses it and stays within the same safety contract.

Selection state needs to live in the table component itself because no other surface needs to know about it. The bulk-action bar lives inside `AirtableTable` rather than in the parent page so the selection state and the button that drives it share a scope.

## Goals / Non-Goals

**Goals:**
- One visible affordance for removing any number of rows, from one to all.
- An adaptive button label that makes the action unambiguous at every selection state.
- Destructive confirmation through `ConfirmModal` on every bulk delete.
- Selected rows are visually distinct before the user commits.

**Non-Goals:**
- Select-all from a header checkbox — the `Remove all rows` button covers it and avoids duplicating the affordance.
- A "select all rows that match this filter" smart select — out of scope for this change.
- Bulk edit / bulk categorization — only bulk delete is in scope.
- Optimistic UI / undo for bulk delete — confirmed destructive action is terminal in this app.

## Decisions

### 1. Selection state lives in `AirtableTable`
The `selectedIds: Set<string>` state and `confirmBulkOpen: boolean` state both live inside the component. No props change.

- **Rationale**: Nothing outside the table needs to read the selection; lifting it up would force a new prop surface for no consumer benefit.
- **Alternative considered**: Lift selection into `useFinance` so the bulk bar could live in `Index.tsx` next to `Add Row` / `Export`. Rejected because the existing controls in `Index.tsx` are stateless and lifting selection up would force a controlled-component pattern for no real win.

### 2. Button label logic is a pure function
`getBulkActionLabel(selectedCount, totalCount)` lives at module scope, takes two numbers, returns a string. No React, no state.

- **Rationale**: Easy to test in isolation and trivially reusable if the table ever splits into subcomponents.
- **Alternative considered**: Inline conditional inside JSX. Rejected because the three branches are dense and easy to break; an extracted function makes the contract obvious.

### 3. First-click-on-empty behavior is "select all", not "confirm"
When `selectedCount === 0`, clicking the button populates `selectedIds` with every row id. A second click opens `ConfirmModal`.

- **Rationale**: This is the only way a single button can both mean "select everything" and "delete what I've selected" without an extra gesture. The state transition is unambiguous because the label visibly changes after the first click.
- **Alternative considered**: A separate "Select all" button in addition to "Delete N rows". Rejected as redundant — the same button flips modes via its label.

### 4. Bulk delete iterates `selectedIds` and calls `onDelete` per id
`onDelete` is unchanged. The bulk handler is `Array.from(selectedIds).forEach((id) => onDelete(id))`.

- **Rationale**: Reuses the existing `useFinance` deletion path (single-item) for every row. No new store API, no new transaction semantics, no risk of bypass.
- **Alternative considered**: A `deleteTransactions(ids: string[])` batch API on `useFinance`. Rejected because the spec only requires delete; a batch API would also need separate transactional / undo considerations that this change does not introduce.

### 5. ConfirmModal title is singular when `selectedCount === 1`, plural otherwise
The destructive flow says `Delete this transaction?` for one row and `Delete N transactions?` for two or more.

- **Rationale**: Matches how the rest of the app talks about single vs. bulk operations (e.g. the existing single-row title), and avoids awkward grammar in pluralization.
- **Alternative considered**: Always plural. Rejected because `Delete 1 transactions?` reads as a typo.

### 6. Per-row trash icon is removed
The trash icon column is deleted from `TableHead` / `TableRow`.

- **Rationale**: Two delete affordances for the same row create ambiguity about which is the canonical path. The bulk flow already covers single-row deletion (check one row → click `Remove 1 row` → confirm).
- **Alternative considered**: Keep both. Rejected as redundant; the existing `confirmDeleteId` state and per-row ConfirmModal wiring is removed in the same change.

### 7. Selected rows render with `bg-[#f8fafc]`
Matches the existing table hover color but is applied unconditionally when selected.

- **Rationale**: Reuses the existing surface token so the visual change is unobtrusive and on-brand. A heavier selected tint would compete with the row hover and the in-progress upload banner.
- **Alternative considered**: A primary-tinted selected state (`bg-[#254fad]/5`). Rejected — too much contrast for an editorial layout.

## Risks / Trade-offs

- **[Risk] Selection set goes stale when `transactions` shrinks underneath it**
  If a row is deleted by something other than the bulk flow (today: nothing — but tomorrow: bulk edit, sync, etc.) the id stays in `selectedIds` and is silently skipped by `Array.from(selectedIds).forEach(onDelete)`.
  - **Mitigation**: Clear `selectedIds` on every bulk confirm. If a future flow deletes rows out-of-band, filter `selectedIds` against the current `transactions` ids with a `useMemo` or `useEffect`.

- **[Risk] Click on `Remove all rows` then immediate `Remove N rows` creates a fast double-tap path**
  A user could accidentally double-click and trigger an unintended confirmation.
  - **Mitigation**: The first click only populates selection; the destructive `ConfirmModal` opens on the second click. The modal blocks outside interaction, so a third click cannot fire until the user resolves it.

- **[Risk] `Array.from(set).forEach` is N+1 state updates**
  Every `onDelete(id)` triggers a re-render and a `localStorage` write.
  - **Mitigation**: Acceptable for the expected batch sizes (a few dozen rows). If the user deletes hundreds at once, the `useFinance` store can grow a batch delete later without changing this contract.

- **[Risk] Button label `Remove all rows` reads as a promise, not a state**
  A first-time user may expect the click to delete rather than to select.
  - **Mitigation**: The label flips to `Remove N rows` immediately after the first click, and the destructive `ConfirmModal` gates the actual delete. A `data-testid` and tooltip on hover could be added later if user testing reveals confusion.

## Migration Plan

1. Update `AirtableTable.tsx` with the new state, checkbox column, bulk-action bar, label helper, and bulk-confirm handler. Remove the per-row trash icon and the prior `confirmDeleteId` state.
2. Build and lint.
3. Manually verify the three label transitions on a populated table: `Remove all rows` → select two rows → `Remove 2 rows, N-2 missing` → uncheck one → `Remove 1 row, N-1 missing` → click → confirm in `ConfirmModal` → rows disappear, bar resets.
4. Rollback: a single revert of `AirtableTable.tsx` returns the table to its previous per-row trash icon flow; no other files are touched.

## Open Questions

- None. The interaction contract is fully specified and the destructive flow reuses the existing `ConfirmModal`.


## Related

- [[proposal|Proposal]]
- [[tasks|Tasks]]
- [[specs/transaction-bulk-delete/spec|transaction-bulk-delete spec]]
