# @memory-bank/mcp

Memory-enabled Co-Pilot (MCP) server for managing project documentation and context across sessions.

## Overview

The MCP (Memory-enabled Co-Pilot) server is the core component of the Memory Bank system. It provides:

- Persistent storage of project knowledge and context
- Branch-specific memory banks for feature work
- Global memory bank for project-wide information
- JSON-based document structure
- Tag system for efficient information retrieval

## Installation

```bash
# Using yarn
yarn add @memory-bank/mcp

# Using npm
npm install @memory-bank/mcp
```

## Usage

### As a CLI tool

```bash
# Read all context information
memory-bank-mcp-server read-context --branch feature/my-feature --language en

# Read from global memory bank
memory-bank-mcp-server read-global-memory --path core/glossary.json

# Write to branch memory bank
memory-bank-mcp-server write-branch-memory --branch feature/my-feature --path progress.json --content '{"schema":"memory_document_v2",...}'
```

### As a library

```typescript
import { MemoryBankMCPServer } from '@memory-bank/mcp';

// Initialize
const mcp = new MemoryBankMCPServer({
  memoryBankRoot: './docs'
});

// Read context
const context = await mcp.readContext({
  branch: 'feature/my-feature',
  docs: './docs',
  language: 'en'
});

// Write to memory bank
await mcp.writeBranchMemoryBank({
  branch: 'feature/my-feature',
  path: 'progress.json',
  content: '{"schema":"memory_document_v2",...}'
});
```

## Architecture

The MCP server follows a clean architecture approach:

- **Domain Layer**: Core business logic and entities
- **Application Layer**: Use cases that orchestrate the domain entities
- **Interface Layer**: Controllers and presenters
- **Infrastructure Layer**: External implementations like file system repositories

## Dependencies

- `@memory-bank/schemas`: JSON schema definitions for Memory Bank documents
- `@modelcontextprotocol/sdk`: Model Context Protocol SDK
- `fast-json-patch`: JSON Patch operations (RFC 6902)
- `uuid`: Generate UUIDs for documents

## Development

```bash
# Install dependencies
yarn install

# Build
yarn build

# Run development server
yarn dev

# Run tests
yarn test
```

## License

MIT
