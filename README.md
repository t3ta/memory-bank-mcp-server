# Memory Bank MCP Server

A Memory Bank implementation for managing project documentation and context
across sessions using the Model Context Protocol (MCP). This server helps AI agents
like Claude maintain consistent project knowledge through global and branch-specific
memory banks stored in a structured JSON format.

This project is inspired by
[Cline Memory Bank](https://github.com/nickbaumann98/cline_docs/blob/main/prompting/custom%20instructions%20library/cline-memory-bank.md)
from the [nickbaumann98/cline_docs](https://github.com/nickbaumann98/cline_docs)
repository.

## Packages

This repository is a monorepo managed with Yarn Workspaces. It contains the following packages:

- **[`packages/mcp`](./packages/mcp/README.md)**: The core MCP server implementation. Contains the main logic for handling memory bank operations, MCP tool execution, and server startup.
- **[`packages/schemas`](./packages/schemas/README.md)**: Defines the JSON schemas used for memory bank documents (e.g., `memory_document_v2`).
- **[`packages/vscode-extension`](./packages/vscode-extension/README.md)**: A VSCode extension providing integration with the Memory Bank MCP server (details TBD).

## Getting Started

### Prerequisites

- Node.js (see `.tool-versions` for recommended version)
- Yarn (v1.x)

### Installation

Clone the repository and install dependencies from the root directory:

```bash
git clone https://github.com/t3ta/memory-bank-mcp-server.git
cd memory-bank-mcp-server
yarn install
```

### Running the MCP Server

You can run the MCP server directly from the monorepo:

```bash
# From the monorepo root directory
yarn workspace @memory-bank/mcp start --docs /path/to/your/docs
```

Replace `/path/to/your/docs` with the actual path to your project's documentation directory (where `global-memory-bank` and `branch-memory-bank` will reside or be created).

See the [`packages/mcp/README.md`](./packages/mcp/README.md) for more details on running the server and its options.

## Development

- **Build all packages:** `yarn build`
- **Run tests for all packages:** `yarn test`
- **Lint code:** `yarn lint`

Refer to the README file within each package directory for package-specific development instructions.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
