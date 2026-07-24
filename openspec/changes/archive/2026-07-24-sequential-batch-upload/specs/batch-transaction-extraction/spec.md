## ADDED Requirements

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

### Requirement: Bulk data insertion
The system SHALL aggregate all successfully extracted transactions from the batch and update the global state in a single operation after all files have been processed.

#### Scenario: Batch completion state update
- **WHEN** all files in the batch have been processed
- **THEN** all extracted transactions are added to the table simultaneously without a page reload

### Requirement: Fault tolerance
The system SHALL continue processing the remaining files in a batch if an individual file fails to process or return data.

#### Scenario: Single file failure
- **WHEN** the second file in a batch encounter an API error
- **THEN** the system logs the error and immediately proceeds to process the third file
