## MODIFIED Requirements

### Requirement: Progressive insertion
The system SHALL commit each file's extracted transactions to the shared store as soon as that file's extraction succeeds, rather than waiting for the entire batch to finish.

#### Scenario: Per-file commit during the batch
- **WHEN** the second file in a batch of three completes extraction
- **THEN** the transactions from that file are added to the table before the third file begins processing

#### Scenario: Failed files do not block commits
- **WHEN** the second file in a batch of three fails to extract
- **THEN** the transactions from the first file are still visible in the table, and the third file is processed next

## ADDED Requirements

### Requirement: Table loading indicator
The system SHALL display a progress bar in the table header while a batch is being processed, showing the current file and the total count.

#### Scenario: Progress bar visible during processing
- **WHEN** the system is processing the third file in a batch of five
- **THEN** the table header shows "Processing receipt-3.jpg (3/5)" with a progress bar at 60%

#### Scenario: Progress bar disappears when done
- **WHEN** the entire batch has finished processing
- **THEN** the progress bar is hidden and the table returns to its normal state
