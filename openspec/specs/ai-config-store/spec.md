---
tags:
  - capability/ai-config-store
---
# Specification: AI Config Store

## Requirements

### Requirement: Shared AI config state
The system SHALL expose the LM Studio configuration (baseUrl, apiKey, model) via a dedicated shared store that any component can subscribe to.

#### Scenario: Settings and ExtractionCard read the same config
- **WHEN** the user updates the configuration in the Settings dialog
- **THEN** the new configuration is immediately visible to `ExtractionCard` on its next render without any prop drilling

#### Scenario: Independent from finance data
- **WHEN** a transaction mutation is dispatched
- **THEN** components subscribed only to the AI config store do not re-render

### Requirement: Persisted AI config
The system SHALL persist the LM Studio configuration to local storage under a dedicated key (`aether_ai_config`) and rehydrate it on page load.

#### Scenario: Config survives reload
- **WHEN** the user updates the base URL and reloads the page
- **THEN** the new base URL is restored from local storage

#### Scenario: Distinct from finance data persistence
- **WHEN** a transaction is added
- **THEN** only the finance data store writes to `aether_finance_data`; the AI config store is not touched

### Requirement: One-time migration from the combined key
On first load, if `aether_ai_config` is absent and the legacy `aether_finance_data` key contains a `state.data.config` payload, the AI config store SHALL initialize with the migrated config. The migration is idempotent and runs at most once.

#### Scenario: User upgrades with a previously saved config
- **WHEN** the user previously had a config saved under `aether_finance_data` and the new `aether_ai_config` key is empty
- **THEN** the AI config store initializes with the migrated config and writes it to `aether_ai_config` on the next mutation

#### Scenario: No legacy data
- **WHEN** no legacy data exists or it cannot be parsed
- **THEN** the AI config store falls back to the built-in `DEFAULT_CONFIG` and the user can reconfigure via Settings

### Requirement: AI config actions
The system SHALL expose an `updateConfig(config: LMStudioConfig)` action on the AI config store that replaces the entire config in a single write.

#### Scenario: Updating the config
- **WHEN** `updateConfig` is called with a new config object
- **THEN** the new config is reflected in the store and persisted to `aether_ai_config`

#### Scenario: Local edits are batched on save
- **WHEN** the user types in the Settings dialog
- **THEN** the underlying store is not updated until the user explicitly clicks "Save changes"

## History

- [[../changes/archive/2026-07-23-shared-finance-store/proposal|2026-07-23]] — Initial capability: dedicated AI config store extracted from finance store, with one-time migration from the old combined key
