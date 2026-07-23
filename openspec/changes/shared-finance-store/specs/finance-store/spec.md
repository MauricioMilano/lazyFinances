## ADDED Requirements

### Requirement: Shared state across components
The system SHALL expose finance data (transactions, accounts, config) and upload state (isProcessing, current, total, fileName) via a single shared store that all components subscribe to.

#### Scenario: Multiple components observe the same state
- **WHEN** two components subscribe to the same store
- **THEN** a mutation from one component is observed by the other on its next render

#### Scenario: Subscribers do not re-render on unrelated state changes
- **WHEN** a component subscribes only to the `upload` slice
- **THEN** a transaction mutation does not cause that component to re-render

### Requirement: Persisted data slice
The system SHALL persist the `data` slice (transactions, accounts, config) to local storage and rehydrate it on page load.

#### Scenario: Data survives reload
- **WHEN** the user adds transactions and reloads the page
- **THEN** the transactions are restored from local storage

### Requirement: Ephemeral upload state
The system SHALL NOT persist the `upload` slice to local storage. On rehydration, the upload state is initialized to its default values (`isProcessing: false`, `current: 0`, `total: 0`, `fileName: ''`).

#### Scenario: Upload state resets on reload
- **WHEN** the user uploads images and reloads mid-batch
- **THEN** the upload state is reset to its initial values and no zombie processing is visible

### Requirement: Store actions
The system SHALL expose actions for: adding a single transaction, adding a batch of transactions, updating a transaction, deleting a transaction, updating config, adding an account, and controlling the upload lifecycle (`startProcessing`, `updateProgress`, `endProcessing`).

#### Scenario: Progressive transaction commits
- **WHEN** `addTransactions` is called multiple times during a batch
- **THEN** each call prepends its transactions to the existing list, immediately visible to subscribers

#### Scenario: Upload lifecycle is bounded
- **WHEN** `startProcessing(total)` is called
- **THEN** `isProcessing` becomes true and `total` is set to the given value
- **WHEN** `endProcessing()` is called
- **THEN** `isProcessing` becomes false and `current`/`total`/`fileName` are reset
