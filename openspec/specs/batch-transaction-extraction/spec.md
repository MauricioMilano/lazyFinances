---
tags:
  - capability/batch-transaction-extraction
---
# Specification: Batch Transaction Extraction

## Requirements

### Requirement: Multiple file selection
The system SHALL allow users to select multiple image files simultaneously from their device's file picker.

#### Scenario: Selecting multiple images
- **WHEN** the user clicks "Upload Image" and selects three valid image files
- **THEN** the browser file input accepts all three files for processing

### Requirement: Sequential processing queue
The system SHALL process the selected files one-by-one in the order they were selected, ensuring only one AI extraction request is active at any given time.

#### Scenario: Processing queue execution
- **WHEN** three files are uploaded
- **THEN** the system first processes File 1, waits for completion, then processes File 2, and finally File 3

### Requirement: Real-time progress tracking
The system SHALL provide visual feedback in the UI indicating the current progress of the batch operation (e.g., "Processing file 2 of 3").

#### Scenario: Progress feedback updates
- **WHEN** the system begins processing the second file in a batch of three
- **THEN** a persistent toast message updates to display "Processing file 2 of 3"

### Requirement: Progressive insertion
The system SHALL commit each file's extracted transactions to the shared store as soon as that file's extraction succeeds, rather than waiting for the entire batch to finish.

#### Scenario: Per-file commit during the batch
- **WHEN** the second file in a batch of three completes extraction
- **THEN** the transactions from that file are added to the table before the third file begins processing

#### Scenario: Failed files do not block commits
- **WHEN** the second file in a batch of three fails to extract
- **THEN** the transactions from the first file are still visible in the table, and the third file is processed next

### Requirement: Table loading indicator
The system SHALL display a progress bar in the table header while a batch is being processed, showing the current file and the total count.

#### Scenario: Progress bar visible during processing
- **WHEN** the system is processing the third file in a batch of five
- **THEN** the table header shows "Processing receipt-3.jpg (3/5)" with a progress bar at 60%

#### Scenario: Progress bar disappears when done
- **WHEN** the entire batch has finished processing
- **THEN** the progress bar is hidden and the table returns to its normal state

### Requirement: Fault tolerance
The system SHALL continue processing the remaining files in a batch if an individual file fails to process or return data.

#### Scenario: Single file failure
- **WHEN** the second file in a batch encounter an API error
- **THEN** the system logs the error and immediately proceeds to process the third file

## History

- [[../changes/archive/2026-07-24-shared-finance-store/proposal|2026-07-24]] — Progressive insertion + table loading indicator added
- [[../changes/archive/2026-07-23-shared-finance-store/proposal|2026-07-23]] — Progressive insertion + table loading indicator added (earlier version)
- [[../changes/archive/2026-07-24-sequential-batch-upload/proposal|2026-07-24]] — Initial capability: multi-file selection, sequential processing, bulk data insertion, fault tolerance
