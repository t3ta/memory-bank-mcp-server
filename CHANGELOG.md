# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.1] - 2025-04-10 (@memory-bank/mcp)

### Fixed
- Issue #123: Clarified branch parameter behavior in tool definitions.
- Issue #114: Optimized read_context response for large memory banks.
- Issue #113: Migrated JSON Patch library from RFC 6902 to fast-json-patch for improved performance.

## [2.4.0] - 2025-04-04 (@memory-bank/mcp)

### Added
- Automatically detect branch name in project mode and for memory bank operations.
- Unified Write UseCase specifications.
- Add comprehensive test coverage analysis for integration tests.
- Add initial context and progress documentation for issue #71.

### Fixed
- Issue #71: Resolved issues related to branch memory bank operations, including handling JSON objects in content.
- Issue #75: Fixed inconsistencies in write use case specifications.
- Issue #76: Addressed problems with global document writing and updated descriptions for memory bank tools, making the `branch` parameter optional.
- Resolve potential issues where branch context could be unintentionally overwritten.
- Resolve various test errors.

### Changed
- Apply Facade pattern to `FileSystemBranchMemoryBankRepository` for improved code structure.
- Clean up comments and improve code readability across multiple files.
- Remove commented-out test cases.

## [2.3.0] - 2025-04-01 (@memory-bank/mcp)

### Added
- Implement document search by tags functionality.
- Add GitHub Actions workflows for individual package releases (`release-mcp.yml`, `release-schemas.yml`, `release-vscode.yml`).

### Changed
- **BREAKING CHANGE:** Refactor project structure into a monorepo, splitting core logic into `@memory-bank/mcp` and `@memory-bank/schemas` packages.
- **BREAKING CHANGE:** Improve error handling and logging framework.
- Update internal version constant to `2.3.0`.
- Refactor global memory bank organization.
- Improve CI/CD pipeline configurations.
- Configure pre-push hook for linting using Husky.
- Change release strategy from `master` branch trigger to individual package tag triggers.

### Removed
- **BREAKING CHANGE:** Remove CLI functionality.
- Remove `list_tools` functionality.
- Remove unused code detected by `ts-prune`.
- Remove the old consolidated release workflow (`.github/workflows/release.yml`).

## [1.0.0] - 2025-04-01 (@memory-bank/schemas)

### Added
- Initial release of the schema definitions package.
- Add schemas for search index.
- Enhance schema definitions for various document types.

## [0.1.0] - 2025-04-01 (memory-bank-vscode-extension)

### Added
- Initial implementation of the VSCode extension.
- Add features for document viewing, editing, and Markdown preview (including Mermaid and syntax highlighting).
- Add functionality to display the current Git branch name.
- Add functionality to automatically attach the `.vsix` file to GitHub releases via workflow.

### Fixed
- Fix custom editor activation issue for Memory Bank JSON files.

---
<!-- Older releases below -->

