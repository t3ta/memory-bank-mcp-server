# @memory-bank/mcp (v2.4.0)

This package provides the core implementation of the Memory-enabled Co-Pilot (MCP) server for managing project documentation and context.

## Overview

The MCP (Memory-enabled Co-Pilot) server is the central component of the Memory Bank system. It offers:

- Persistent storage for project knowledge and context using a file-system based approach.
- Branch-specific memory banks for isolated feature work context.
- A global memory bank for project-wide information accessible across branches.
- A structured JSON-based document format (`memory_document_v2` schema).
- A tagging system for organizing and retrieving information efficiently.
- An MCP interface allowing AI agents (like Claude) to interact with the memory banks via defined tools.

## Installation

This package is primarily intended to be used as an MCP server executable.

```bash
# Using yarn (within the monorepo)
# No direct installation needed if running from the monorepo root

# Using npm (if published)
npm install @memory-bank/mcp
```

## Usage as an MCP Server

The primary way to use this package is by running it as an MCP server, which can then be connected to by an MCP client (e.g., Claude Desktop or a custom integration).

### Running the Server

**Using NPX (Recommended for published package):**

```bash
# Replace @latest with the desired version if needed
npx @memory-bank/mcp@latest --docs /path/to/your/docs
```

**From Monorepo Source:**

```bash
# From the monorepo root directory
yarn workspace @memory-bank/mcp start --docs /path/to/your/docs
# Or for development with auto-reload:
yarn workspace @memory-bank/mcp dev --docs /path/to/your/docs
```

**Server Options:**

- `--docs, -d`: **Required.** Path to the project's documentation directory (containing `global-memory-bank` and `branch-memory-bank`). Specifying this (or using environment variables `MEMORY_BANK_ROOT` or `DOCS_ROOT`) enables **Project Mode**, which allows features like automatic Git branch detection.
- `--verbose, -v`: Enable verbose logging (default: false).
- `--language, -l`: Default language for templates ('en', 'ja' or 'zh', default: 'en').

### Interacting via MCP Tools

Once the server is running, clients interact with it using the defined MCP tools. Refer to the core tool manual (`docs/global-memory-bank/core/mcp-tool-manual.json`) for details on available tools like:

- `write_branch_memory_bank`: Writes a document to a branch. The `branch` parameter is optional in Project Mode (uses current Git branch).
- `read_branch_memory_bank`: Reads a document from a branch. The `branch` parameter is optional in Project Mode (uses current Git branch).
- `write_global_memory_bank`: Writes a document to the global memory bank.
- `read_global_memory_bank`: Reads a document from the global memory bank.
- `read_context`: Reads rules, branch memory bank, and global memory bank information at once.
- `search_documents_by_tags`: Searches for documents by tags in branch and/or global memory banks.

### New Unified Document Commands (v2.4.0+)

As of v2.4.0, new unified commands are available that provide a simpler interface for working with both branch and global memory banks:

- `write_document`: Writes a document to either branch or global memory bank based on the `scope` parameter.
- `read_document`: Reads a document from either branch or global memory bank based on the `scope` parameter.

These commands provide several advantages:
- Single interface for both branch and global operations
- Explicit scope selection (`scope: 'branch'` or `scope: 'global'`)
- Automatic branch detection in project mode
- Support for JSON patches when updating documents

Examples:

```javascript
// Writing to branch memory bank
const result = await write_document({
  scope: 'branch',
  branch: 'feature/my-branch', // Optional in project mode
  path: 'data/config.json',
  content: { key: 'value' },
  tags: ['config', 'feature'],
  docs: './docs'
});

// Reading from global memory bank
const result = await read_document({
  scope: 'global',
  path: 'core/config.json',
  docs: './docs'
});

// Updating with JSON patches
const result = await write_document({
  scope: 'branch',
  path: 'data/config.json',
  patches: [{ op: 'replace', path: '/key', value: 'new-value' }],
  docs: './docs'
});
```

## Architecture

The `@memory-bank/mcp` package follows clean architecture principles:

- **Domain Layer**: Core business logic, entities (e.g., `MemoryDocument`, `BranchInfo`), and interfaces.
- **Application Layer**: Use cases orchestrating domain logic (e.g., `WriteBranchDocumentUseCase`, `ReadContextUseCase`).
- **Interface Layer**: Controllers handling MCP requests and presenters formatting responses.
- **Infrastructure Layer**: Concrete implementations for external concerns like file system access (`FileSystem*Repository`), configuration, and indexing.

## Key Dependencies

- `@memory-bank/schemas`: JSON schema definitions for Memory Bank documents.
- `@modelcontextprotocol/sdk`: SDK for implementing MCP servers and clients.
- `rfc6902`: Used for applying JSON Patch operations (RFC 6902).
- `fs-extra`: Provides enhanced file system operations.
- `yargs`: Used for parsing command-line arguments for the server executable.
- `uuid`: Generates UUIDs.

## Development

```bash
# Install dependencies (from monorepo root)
yarn install

# Build the package
yarn workspace @memory-bank/mcp build

# Run the server in development mode (with auto-reload)
yarn workspace @memory-bank/mcp dev --docs /path/to/test/docs

# Run tests
yarn workspace @memory-bank/mcp test # Unit tests (if any)
yarn workspace @memory-bank/mcp test:integration # Integration tests
```

## License

MIT
