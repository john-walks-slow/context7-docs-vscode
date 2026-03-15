# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-15

### Added

- Smart library detection using LSP definition provider
- Library management (add, edit, remove custom libraries)
- Syntax highlighting with Shiki
- Result caching (5-minute TTL)
- MCP anonymous access support
- Comprehensive unit tests (95 test cases)

### Changed

- **BREAKING**: Migrated API key storage to VS Code SecretStorage
  - Old `context7.apiKey` setting is automatically migrated
  - API keys are now stored securely
- Refactored architecture with service layer
  - `LibraryService` for library management
  - `SearchService` for search and highlighting
  - `SearchCache` for result caching
- Updated to ESLint 9 flat config
- Improved type safety (eliminated all `any` types)

### Fixed

- Library detection now respects source file language
- Proper handling of scoped npm packages

## [0.0.1] - Initial Release

### Added

- Basic documentation search via Context7 API
- Sidebar panel for results
- Code snippets with copy functionality
- API key configuration