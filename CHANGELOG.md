# Changelog

## [Unreleased]

### Added

- Detecting and querying language standard libraries
- `keywords` field for binding multiple keywords to a single library ID
- Library detection fallback to language standard library when LSP is unavailable
- Display of recently used libraries
- Internationalization support (English/Chinese)

### Changed

- Improved library search workflow
- Optimized keyword binding flow
- Dynamic sidebar title showing current library name
- Library picker now distinguishes preset and user libraries; manage mode only shows user libraries (presets cannot be deleted)
- User libraries now appear before preset libraries in the list

### Fixed

- Fixed incorrect library IDs in presets
- Fixed keyword binding logic

## [0.1.0] - Initial Release
