# data-export Specification

## Purpose
TBD - created by archiving change transaction-export. Update Purpose after archive.
## Requirements
### Requirement: Export transactions in selected format
The system SHALL provide an export control on the Transactions page that downloads all current transactions as a file in a user-selected format (JSON, CSV, or XML).

#### Scenario: User exports as JSON
- **WHEN** the user opens the export menu and selects "Export as JSON"
- **THEN** the system downloads a file containing all transactions in JSON format

#### Scenario: User exports as CSV
- **WHEN** the user opens the export menu and selects "Export as CSV"
- **THEN** the system downloads a file containing all transactions in CSV format

#### Scenario: User exports as XML
- **WHEN** the user opens the export menu and selects "Export as XML"
- **THEN** the system downloads a file containing all transactions in XML format

#### Scenario: All transactions are included
- **WHEN** the user triggers an export
- **THEN** every transaction currently in the store is included in the output

### Requirement: Disabled export when there are no transactions
The system SHALL disable the export control when the transaction list is empty.

#### Scenario: Empty transaction list
- **WHEN** the user views the Transactions page with zero transactions
- **THEN** the export control is visibly disabled and cannot be opened

#### Scenario: Non-empty transaction list
- **WHEN** the user has at least one transaction
- **THEN** the export control is enabled

### Requirement: JSON export format
When exporting as JSON, the system SHALL produce a UTF-8 file whose root value is an object with exactly these fields: `schemaVersion` (number, currently `1`), `exportedAt` (ISO 8601 timestamp string), `source` (string `"lazy-finance"`), `count` (number equal to `transactions.length`), and `transactions` (array of transaction objects preserving all eight fields).

#### Scenario: JSON envelope shape
- **WHEN** the user exports as JSON
- **THEN** the file content parses as a JSON object with the five envelope fields, with `transactions` holding one object per stored transaction

### Requirement: CSV export format
When exporting as CSV, the system SHALL produce a UTF-8 file beginning with a byte-order mark (`U+FEFF`), using CRLF line endings, with a header row of `id,date,description,amount,category,account_id,type,status`, followed by one data row per transaction. Fields containing comma, double-quote, CR, or LF SHALL be wrapped in double quotes; internal double quotes SHALL be escaped by doubling. The `accountId` field SHALL be written as the `account_id` column.

#### Scenario: CSV header row
- **WHEN** the user exports as CSV
- **THEN** the first line is the column header `id,date,description,amount,category,account_id,type,status`

#### Scenario: CSV field quoting for commas
- **WHEN** a transaction description contains a comma (e.g., `"Coffee, latte"`)
- **THEN** that field is wrapped in double quotes in the output row

#### Scenario: CSV field quoting for newlines
- **WHEN** a transaction description contains a newline character
- **THEN** that field is wrapped in double quotes in the output row

#### Scenario: CSV quote escaping
- **WHEN** a transaction description contains a double-quote character
- **THEN** the internal quote is escaped by doubling and the field is wrapped in double quotes

### Requirement: XML export format
When exporting as XML, the system SHALL produce a well-formed UTF-8 XML document with an `<?xml version="1.0" encoding="UTF-8"?>` declaration, a single root `<export>` element carrying `schemaVersion`, `exportedAt`, `source="lazy-finance"`, and `count` attributes, and a `<transactions>` child element containing exactly one `<transaction>` element per stored transaction. Each `<transaction>` element SHALL carry attributes for all eight transaction fields (`id`, `date`, `description`, `amount`, `category`, `accountId`, `type`, `status`).

#### Scenario: XML structure
- **WHEN** the user exports as XML
- **THEN** the file parses as well-formed XML with the documented root, child, and element structure

#### Scenario: XML attribute escaping
- **WHEN** a transaction description contains `<`, `>`, or `&`
- **THEN** those characters are escaped as `&lt;`, `&gt;`, `&amp;` in the corresponding attribute value

### Requirement: Filename convention
The system SHALL name exported files `lazy-finance-transactions-YYYY-MM-DD.{json,csv,xml}` using the local export date.

#### Scenario: JSON filename
- **WHEN** the user exports as JSON on 2026-07-23 local time
- **THEN** the downloaded file is named `lazy-finance-transactions-2026-07-23.json`

#### Scenario: CSV filename extension
- **WHEN** the user exports as CSV
- **THEN** the downloaded file has the `.csv` extension and the date-stamped prefix

#### Scenario: XML filename extension
- **WHEN** the user exports as XML
- **THEN** the downloaded file has the `.xml` extension and the date-stamped prefix

### Requirement: Export scope is transactions only
The system SHALL export only transaction records. Accounts, AI configuration, and any other persisted data SHALL NOT be included. The `accountId` field on each transaction SHALL be exported as the raw identifier value stored in the application (currently a UUID or seed string), with no lookup against the accounts collection.

#### Scenario: No account metadata in export
- **WHEN** the user exports transactions
- **THEN** the output does not contain account names, balances, or currencies — only the `accountId` field per transaction

### Requirement: Field values are preserved losslessly
For every transaction field (`id`, `date`, `description`, `amount`, `category`, `accountId`, `type`, `status`), the value written to the export SHALL equal the value stored in the application. The system SHALL NOT transform amounts (no sign flipping), reformat dates, or truncate descriptions.

#### Scenario: Amount is not sign-flipped
- **WHEN** a transaction has amount `5.25` and type `expense` in the store
- **THEN** the exported amount is `5.25` and the exported type is `expense`

#### Scenario: Date is not reformatted
- **WHEN** a transaction has date `2026-07-15` in the store
- **THEN** the exported date is `2026-07-15` (ISO `YYYY-MM-DD`) in all three formats

