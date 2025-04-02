# Memory Bank MCP Server 2.3.5

A Memory Bank implementation for managing project documentation and context
across sessions. This server helps Claude maintain consistent project knowledge
through global and branch-specific memory banks. Version 2.3.4 includes fixes
for JSON Patch handling and updates to core documentation.

This project is inspired by
[Cline Memory Bank](https://github.com/nickbaumann98/cline_docs/blob/main/prompting/custom%20instructions%20library/cline-memory-bank.md)
from the [nickbaumann98/cline_docs](https://github.com/nickbaumann98/cline_docs)
repository, which provides an excellent foundation for managing Claude's memory
in software projects.

## What's New in 2.3.5 (and recent versions)

### Core Functionality Enhancements (v2.3.x)

- **JSON Patch Fixes & Refactoring (v2.3.5)**: Resolved bugs related to JSON Patch application, tag updates, and date handling. Refactored patch handling to consistently use the `rfc6902` library via an adapter (`Rfc6902JsonPatchAdapter.ts`), removing the `fast-json-patch` dependency and ensuring consistent application logic across use cases.
- **Core Tool Manuals (v2.3.5)**: Added and updated a comprehensive English manual for core MCP tools, consolidating them into `docs/global-memory-bank/core/mcp-tool-manual.json`. Removed redundant information from individual manuals.
- **Configuration Option Unification (v2.3.5)**: Unified the command-line option for the documentation directory to `--docs` (previously `--docsRoot`) in the server startup script (`src/server.ts`) and README examples. (Note: MCP tool argument remains `docs`).
- **JSON Document Structure (v2.0.0)**: Introduced a JSON-based architecture for
  all documents, improving structure, validation, and programmatic access.
- **Enhanced API (v2.0.0)**: Added `read_context` tool, multilingual support
  (en, ja, zh), and template-based initialization.
- **Clean Architecture (v2.0.0)**: Refactored codebase following clean
  architecture principles for better maintainability and testability.
- **CLI Removal (v2.1.0)**: Removed the standalone CLI tool to focus on the MCP
  server interface.

### Testing and Development Improvements

- **Test Framework Migration**: Replaced ts-mockito with jest.fn() for better
  testing.
- **Logging Enhancements**: Replaced console.log with a dedicated logger across
  most files.

## Usage

### MCP Server

#### NPX (Recommended)

```bash
npx @memory-bank/mcp@latest --docsRoot /path/to/your/docs
```

With options:

```bash
npx @memory-bank/mcp@latest --docsRoot /path/to/your/docs --language ja --verbose
```

#### Installation (Optional)

If you prefer to install globally:

```bash
npm install -g @memory-bank/mcp
memory-bank-mcp --docsRoot /path/to/your/docs --help
```

#### Options

- **--docsRoot, -d**: Path to the project's documentation directory (required).
  This is where `global-memory-bank` and `branch-memory-bank` reside.
- **--verbose, -v**: Run with verbose logging (default: false).
- **--language, -l**: Default language for templates ('en', 'ja' or 'zh',
  default: 'en').

## Core Concepts

### Global Memory Bank

Manages project-wide knowledge (architecture, standards, glossary, etc.) in
`docs/global-memory-bank/`. Documents must be in JSON format following the
`memory_document_v2` schema.

Example structure:

```
docs/global-memory-bank/
  ├── core/
  │   └── mcp-tool-manual.json # Core tool manual (Updated in v2.3.5)
  ├── 02-architecture/
  │   └── system-overview.json
  ├── 04-guides/
  │   └── how-to-use-json-patch.json
  └── tags/
      └── _global_index.json
```

### Branch Memory Bank

Stores context specific to feature/fix branches in `docs/branch-memory-bank/`.
Documents must be in JSON format.

Example structure:

```
docs/branch-memory-bank/feature-login/
  ├── branchContext.json   # Branch purpose and stories
  ├── activeContext.json   # Current work state
  ├── systemPatterns.json  # Technical decisions
  └── progress.json        # Implementation status
```

## API (MCP Tools)

The server provides the following tools via the Model Context Protocol (MCP):

- **write_branch_memory_bank**

  - Creates or overwrites a document in the specified branch's memory bank.
  - Input (`arguments`):
    - `branch` (string, required): Target branch name (e.g., `feature/login`).
    - `path` (string, required): Document path within the branch (e.g.,
      `activeContext.json`).
    - `docs` (string, required): Path to the documentation root directory.
    - `content` (string or object, optional): Full document content (JSON).
      Mutually exclusive with `patches`.
    - `patches` (array, optional): JSON Patch operations (RFC 6902) for partial
      updates. Mutually exclusive with `content`. Document must exist for
      patching.
    - `tags` (array, optional): Array of strings to set as document tags. If
      omitted, tags will be empty.
  - Creates directories if needed. Initializes with templates if `content` and
    `patches` are omitted for standard paths (`branchContext.json`, etc.).

- **read_branch_memory_bank**

  - Reads a document from the specified branch's memory bank.
  - Input (`arguments`):
    - `branch` (string, required): Target branch name.
    - `path` (string, required): Document path within the branch.
    - `docs` (string, required): Path to the documentation root directory.
  - Returns: `document` object containing `path`, `content` (string), `tags`
    (array), and `lastModified` (ISO string).

- **write_global_memory_bank**

  - Creates, overwrites, or patches a document in the global memory bank.
  - Input (`arguments`):
    - `path` (string, required): Document path within the global bank (e.g.,
      `core/config.json`).
    - `docs` (string, required): Path to the documentation root directory.
    - `content` (string or object, optional): Full document content (JSON).
      Mutually exclusive with `patches`.
    - `patches` (array, optional): JSON Patch operations (RFC 6902). Mutually
      exclusive with `content`. Document must exist for patching.
    - `tags` (array, optional): Array of strings to set as document tags. If
      omitted, tags will be empty.
  - Creates directories if needed. Updates the global tag index.

- **read_global_memory_bank**

  - Reads a document from the global memory bank.
  - Input (`arguments`):
    - `path` (string, required): Document path within the global bank.
    - `docs` (string, required): Path to the documentation root directory.
  - Returns: `document` object containing `path`, `content` (string), `tags`
    (array), and `lastModified` (ISO string).

- **read_context**

  - Reads rules, branch memory bank, and global memory bank information at once.
  - Input (`arguments`):
    - `branch` (string, required): Current branch name.
    - `language` (string, required): Language code ('en', 'ja', or 'zh').
    - `docs` (string, required): Path to the documentation root directory.
  - Returns: Object with `rules` (object), `branchMemoryBank` (array of
    DocumentDTOs), and `globalMemoryBank` (array of DocumentDTOs).

- **search_documents_by_tags**
  - Searches for documents by tags across memory banks.
  - Input (`arguments`):
    - `tags` (array, required): Array of tag strings to search for.
    - `match` (string, optional): `and` or `or` (default: `or`).
    - `scope` (string, optional): `branch`, `global`, or `all` (default: `all`).
    - `branch` (string, optional): Required if `scope` is `branch` or `all`.
    - `docs` (string, required): Path to the documentation root directory.
  - Returns: Array of matching DocumentDTOs.

## Usage with Claude Desktop

### Setup

Add this configuration to your `claude_desktop_config.json`, replacing
`/path/to/your/docs` with the actual path to your project's documentation
directory:

```json
{
  "mcpServers": {
    "memory-bank": {
      "command": "npx",
      "args": ["-y", "@memory-bank/mcp@latest", "--docs", "/path/to/your/docs"],
      "env": {
        "MEMORY_BANK_LANGUAGE": "ja" // Optional: set default language
      }
    }
  }
}
```

Configuration options for the environment (`env`):

- `MEMORY_BANK_LANGUAGE`: Default language for templates ("en", "ja", or "zh",
  default: "en").

The `--docs` argument in `args` specifies the documentation root directly.

### System Prompt

Here's a recommended system prompt for utilizing the memory bank:

```
Follow these steps for each interaction:

1. Branch Context:
   - Always begin by checking the current git branch using available tools.
   - For feature/ or fix/ branches, load the branch memory bank using `read_context`.
   - Use the `docs` parameter in MCP tools to specify the correct documentation root if it differs from the server's startup configuration.

2. Memory Bank Access:
   - Read relevant documentation from global and branch memory banks (`read_global_memory_bank`, `read_branch_memory_bank`, `search_documents_by_tags`).
   - Keep context of project-wide standards and branch-specific work.
   - Maintain documentation structure and organization.

3. Documentation Updates:
   - Update branch memory bank (`write_branch_memory_bank`) when:
     a) Making code changes
     b) Adding new features
     c) Making technical decisions
     d) Discovering new patterns
   - Update global memory bank (`write_global_memory_bank`) for project-wide changes.
   - Use JSON Patch (`patches` parameter) for targeted updates when appropriate.

4. Memory Bank Maintenance:
   - Keep documentation organized and up-to-date.
   - Use proper JSON structures (`memory_document_v2` schema).
   - Tag documents appropriately using the `tags` parameter during writes.
   - Maintain clear hierarchies within the `docs` directory.
```

## Development

Clone and install dependencies:

```bash
git clone <repository-url>
cd memory-bank-mcp-server
yarn install # Use yarn
```

Run in development mode (starts the MCP server):

```bash
yarn dev
```

Build:

```bash
yarn build
```

Run tests:

```bash
yarn test # Runs unit tests
yarn test:integration # Runs integration tests
```

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment:

### Automated Testing

Tests are automatically run on:

- Pull requests to `develop` and `master` branches
- Direct pushes to `develop` and `master` branches

The test workflow currently runs against Node.js version `23.x` (based on
`.tool-versions`).

### Automated Release

When code is merged to the `master` branch:

1. Tests are run to verify the build.
2. A git tag is created based on the version in `packages/mcp/package.json`.
3. A GitHub Release is created with release notes.
4. The `@memory-bank/mcp` package is published to npm.

## License

This project is licensed under the MIT License. See the LICENSE file for
details.
