# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
