# Changelog

## [Unreleased]

### Added

- Detecting and querying language standard libraries
- `keywords` field for binding multiple keywords to a single library ID
- Library detection fallback to language standard library when LSP is unavailable
- Library picker groups libraries by Recent/User/Preset sections
- Internationalization support (English/Chinese)
- Development tasks: `watch:tsc` (TypeScript watch) and `watch-tests` (Vitest watch)
- Launch configuration for temporary VS Code profile testing

### Changed

- Improved library search workflow
- Optimized keyword binding flow
- Dynamic sidebar title showing current library name
- Library picker now distinguishes preset and user libraries; manage mode only shows user libraries (presets cannot be deleted)
- User libraries now appear before preset libraries in the list
- Sidebar title updates immediately on search start, with rollback on failure
- Reduced max recent libraries from 5 to 1 (most recent only)
- Added JSON schema for `context7.libraries` and `context7.pathPatterns` settings
- Library settings now respect VS Code Profile scope (no longer forced to Global)

### Fixed

- Fixed incorrect library IDs in presets
- Fixed keyword binding logic

## [0.1.0] - Initial Release
