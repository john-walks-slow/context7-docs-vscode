# Changelog

## [Unreleased]

### Fixed

- Fixed sidebar not opening automatically when triggering search commands

## [0.2.0] - 2026-03-21

### Added

- Detecting and querying language standard libraries
- `keywords` field for binding multiple keywords to a single library ID
- Library detection fallback to language standard library when LSP is unavailable
- Library picker groups libraries by Recent/User/Preset sections
- Internationalization support (English/Chinese)
- Development tasks: `watch:tsc` (TypeScript watch) and `watch-tests` (Vitest watch)
- Launch configuration for temporary VS Code profile testing
- JSON schema for `context7.libraries` and `context7.pathPatterns` settings

### Changed

- Improved library search workflow with dynamic sidebar title
- Library picker now distinguishes preset and user libraries; manage mode only shows user libraries
- User libraries now appear before preset libraries in the list
- Reduced max recent libraries to 1 (most recent only)

### Fixed

- Fixed incorrect library IDs in presets
- Fixed keyword binding logic

## [0.1.0] - Initial Release
