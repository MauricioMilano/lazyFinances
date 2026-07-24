# transaction-bulk-delete Specification

## Purpose
TBD - created by archiving change bulk-row-selection. Update Purpose after archive.
## Requirements
### Requirement: Row-level selection via checkbox column
The system SHALL provide a checkbox column on the left of the transactions table so users can select individual rows for bulk operations.

#### Scenario: Default empty selection
- **WHEN** the user opens the page and no row has been interacted with
- **THEN** every row's checkbox is unchecked and the bulk-action bar reports the total row count with no selection

#### Scenario: Toggling a single row
- **WHEN** the user clicks the checkbox of one row
- **THEN** that row's checkbox becomes checked, the row receives a selected background tint, and the bulk-action bar reflects one selected row

#### Scenario: Toggling a row off
- **WHEN** the user clicks the checkbox of a row that is already selected
- **THEN** the checkbox becomes unchecked, the row's selected background is removed, and the bulk-action bar reflects the updated count

#### Scenario: Per-row checkbox accessible label
- **WHEN** the row's checkbox is rendered
- **THEN** it carries an `aria-label` derived from the transaction description (or id when description is empty) so screen readers announce the row being selected

### Requirement: Bulk-action bar above the table
The system SHALL render a toolbar above the transactions table containing a selection summary on the left and an action button on the right, visible whenever the table has at least one row.

#### Scenario: Empty table hides the bar
- **WHEN** the transactions list is empty
- **THEN** the bulk-action bar is not rendered

#### Scenario: Non-empty table shows the bar
- **WHEN** the transactions list has one or more rows
- **THEN** the bulk-action bar is rendered with the total row count on the left and the action button on the right

#### Scenario: Selection summary updates
- **WHEN** the user toggles one or more checkboxes
- **THEN** the summary on the left of the bar updates to show `N of M selected` where N is the selected count and M is the total count

### Requirement: Adaptive action button label
The system SHALL render the bulk-action button label so that it always reflects the current selection state, never exposing a count mismatch.

#### Scenario: Zero selection shows remove-all label
- **WHEN** no rows are selected
- **THEN** the action button label is `Remove all rows`

#### Scenario: Full selection shows count only
- **WHEN** every row is selected (selectedCount equals totalCount) and totalCount is greater than zero
- **THEN** the action button label is `Remove N rows` with no `missing` suffix

#### Scenario: Partial selection shows count and missing
- **WHEN** at least one row is selected and at least one row is unselected
- **THEN** the action button label is `Remove N rows, M missing` where N is the selected count and M is `totalCount - selectedCount`

### Requirement: First click on zero-selection state selects all
The system SHALL treat a click on the bulk-action button while the selection is empty as a select-all operation rather than opening the confirmation.

#### Scenario: First click selects all
- **WHEN** the user clicks the bulk-action button and no rows are selected
- **THEN** every row's checkbox becomes checked and the bulk-action button label updates to `Remove N rows` (no missing suffix)

#### Scenario: Selection summary after select-all
- **WHEN** the user performs the first-click select-all
- **THEN** the bulk-action bar summary shows `M of M selected` where M is the total row count

### Requirement: Destructive confirmation gates the bulk delete
The system SHALL require destructive confirmation through `ConfirmModal` before any bulk delete takes effect, and SHALL clear the selection after a successful confirmation.

#### Scenario: Click with selections opens confirmation
- **WHEN** the user clicks the bulk-action button with at least one row selected
- **THEN** the `ConfirmModal` opens with `intent="destructive"`, a singular or plural title based on selection size, the standard destructive description, and a Delete/Cancel button pair

#### Scenario: Singular title for one selection
- **WHEN** exactly one row is selected and the user clicks the bulk-action button
- **THEN** the confirmation title is `Delete this transaction?`

#### Scenario: Plural title for multiple selections
- **WHEN** two or more rows are selected and the user clicks the bulk-action button
- **THEN** the confirmation title is `Delete N transactions?` where N is the selected count

#### Scenario: Confirming the bulk delete
- **WHEN** the user confirms the destructive `ConfirmModal`
- **THEN** `onDelete` is called for every selected row id, the table re-renders without those rows, the selection set is cleared, and the bulk-action bar returns to its zero-selection state

#### Scenario: Cancelling preserves the selection
- **WHEN** the user cancels the destructive `ConfirmModal`
- **THEN** no rows are removed, the selection set is preserved, and the bulk-action bar remains in its prior state

### Requirement: Per-row trash icon removed
The system SHALL NOT render the per-row trash icon in the transactions table; deletion is exclusively via the bulk-action flow described above.

#### Scenario: No per-row delete affordance
- **WHEN** the user hovers over any row
- **THEN** no per-row trash icon or delete button is shown on that row

