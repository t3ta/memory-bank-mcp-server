# Memory Bank MCP Server 2.1.0

A Memory Bank implementation for managing project documentation and context across sessions. This server helps Claude maintain consistent project knowledge through global and branch-specific memory banks. Version 2.1.0 introduces JSON-only document storage, removing Markdown support completely for better structure and validation.

This project is inspired by [Cline Memory Bank](https://github.com/nickbaumann98/cline_docs/blob/main/prompting/custom%20instructions%20library/cline-memory-bank.md) from the [nickbaumann98/cline_docs](https://github.com/nickbaumann98/cline_docs) repository, which provides an excellent foundation for managing Claude's memory in software projects.

## What's New in 2.1.0

### JSON Patch Support (RFC 6902)

Memory Bank 2.1.0 adds partial document update capability via JSON Patch (RFC 6902):

- **Efficient Document Updates**: Apply targeted changes without full document replacement
- **Complete RFC 6902 Support**: All operations (add, remove, replace, move, copy, test) fully implemented
- **Built-in Validation**: Automatic validation of patch operations before applying
- **Array Operations**: Full support for array manipulation (append, insert, remove elements)
- **Atomic Operations**: All patches in a request are applied as a single transaction

Example usage:

```javascript
// Example patch operations
const patches = [
  { op: "add", path: "/content/newProperty", value: "New Value" },
  { op: "replace", path: "/metadata/title", value: "Updated Title" },
  { op: "remove", path: "/content/deprecated" },
  { op: "add", path: "/content/items/-", value: "New Item" }  // Add to array end
];

// Apply patches to a document
write_branch_memory_bank({
  branch: "feature/my-feature",
  path: "myDocument.json",
  patches: patches  // Using patches instead of content
});
```

### Complete Migration to JSON

Memory Bank 2.1.0 completes the migration to JSON-based documents:

- **Markdown support has been completely removed**
- All documents must use JSON format
- Improved validation and structure through JSON schemas
- Better programmatic access and data consistency

### Migration Tools

To help users transition from Markdown to JSON:

- The `migrate` command converts existing Markdown files to JSON
- Automatic backup of original files before conversion
- Schema validation ensures proper format

### Multiple Workspace Support

Memory Bank 2.1.0 introduces the ability to work with multiple project workspaces:

- New `--workspace` / `-w` command-line option for specifying project workspace directory
- MCP tools now accept `workspace` and `docs` parameters to work with different projects
- Priority-based path resolution (tool parameter > CLI option > environment variable > default)
- Enhanced flexibility for managing multiple projects with a single server instance

## Usage

### MCP Server

#### NPX (Recommended)
```bash
npx memory-bank-mcp-server
```

With options:
```bash
npx memory-bank-mcp-server --language ja --verbose
```

#### Installation (Optional)

If you prefer to install globally:
```bash
npm install -g memory-bank-mcp-server
memory-bank-mcp-server --help
```

### CLI Tool

The package also includes a CLI tool for direct memory bank operations from your terminal.

#### NPX Usage
```bash
npx memory-bank read-global architecture.md
npx memory-bank write-global tech-stack.md -f ./tech-stack.md
npx memory-bank read-branch feature/login activeContext.md
npx memory-bank recent-branches
```

#### Installation
```bash
npm install -g memory-bank-mcp-server
memory-bank --help
```

#### Available Commands

- **read-global** `<path>`: Read a document from the global memory bank
- **write-global** `<path> [content]`: Write a document to the global memory bank
- **read-branch** `<branch> <path>`: Read a document from a branch memory bank
- **write-branch** `<branch> <path> [content]`: Write a document to a branch memory bank
- **read-core-files** `<branch>`: Read all core files from a branch memory bank
- **recent-branches** `[limit]`: Get recent branches

#### Options

- **--workspace, -w**: Path to workspace directory (default: current directory)
- **--docs, -d**: Path to docs directory (default: './docs' or '{workspace}/docs')
- **--verbose, -v**: Run with verbose logging (default: false)
- **--language, -l**: Language for templates ('en', 'ja' or 'zh', default: 'en')
- **--file, -f**: Read content from file (for write commands)
- **--format**: Output format for read-core-files ('json' or 'pretty', default: 'pretty')

## What's New in 2.0

### JSON-based Document Structure

Memory Bank 2.0 introduces a new JSON-based architecture for all documents, providing:

- Better structure and validation through schema-based documents
- Enhanced programmatic accessibility
- Improved search and filtering capabilities
- Future-proof design for database integration

JSON documents follow this structure:

```json
{
  "schema": "memory_document_v2",
  "metadata": {
    "id": "unique-id",
    "title": "Document Title",
    "documentType": "document_type",
    "path": "relative/path.json",
    "tags": ["tag1", "tag2"],
    "lastModified": "2025-03-17T00:00:00Z",
    "createdAt": "2025-03-17T00:00:00Z",
    "version": 1
  },
  "content": {
    // Document type-specific content
  }
}
```

### Enhanced API

- New `read_context` command for fetching combined information
- Multilingual support (English, Japanese, Chinese)
- Template-based document initialization
- Improved error handling and validation

### Clean Architecture Implementation

The codebase has been refactored to follow clean architecture principles:

- Domain-centric design with explicit layers
- Separation of concerns for better testability
- Framework-agnostic core business logic
- Improved maintainability and extensibility

## Core Concepts

### Global Memory Bank

The Global Memory Bank manages project-wide knowledge that persists across all branches:

- Architecture documentation
- Coding standards
- Domain models
- Project glossary
- Technical stack information
- User documentation

Example structure:

```
docs/global-memory-bank/
  ├── architecture.json      # System architecture
  ├── coding-standards.json  # Coding conventions
  ├── domain-models.json     # Domain model definitions
  ├── glossary.json          # Terminology
  ├── tech-stack.json        # Technology stack
  ├── user-guide.json        # User guide
  └── tags/                  # Information organization
```

> Note: As of version 2.1.0, only .json format is supported.

### Branch Memory Bank

Branch Memory Banks store context specific to feature or fix branches:

- Branch context and purpose
- Active development state
- System patterns and decisions
- Implementation progress

Example structure:

```
docs/branch-memory-bank/feature-login/
  ├── branchContext.json   # Branch purpose and stories
  ├── activeContext.json   # Current work state
  ├── systemPatterns.json  # Technical decisions
  └── progress.json        # Implementation status
```

> Note: As of version 2.1.0, only .json format is supported.

## API

### Tools

- **write_branch_memory_bank**
  - Write a document to the current branch's memory bank
  - Input:
    - `path` (string): Document path
    - `content` (string, optional): Document content (full replacement)
    - `patches` (array, optional): JSON Patch operations to apply (cannot be used with content)
    - `branch` (string, required): Branch name
    - `workspace` (string, optional): Path to workspace directory
    - `docs` (string, optional): Path to docs directory
  - Creates directories as needed
  - Initializes with templates if content is empty
  - Supports partial updates with JSON Patch
  - Can work with different workspace/docs locations than the server default

- **read_branch_memory_bank**
  - Read a document from the current branch's memory bank
  - Input:
    - `path` (string): Document path
    - `branch` (string, required): Branch name
    - `workspace` (string, optional): Path to workspace directory
    - `docs` (string, optional): Path to docs directory
  - Returns document content and metadata
  - Can work with different workspace/docs locations than the server default

- **write_global_memory_bank**
  - Write a document to the global memory bank
  - Input:
    - `path` (string): Document path
    - `content` (string, optional): Document content (full replacement)
    - `patches` (array, optional): JSON Patch operations to apply (cannot be used with content)
    - `workspace` (string, optional): Path to workspace directory
    - `docs` (string, optional): Path to docs directory
  - Creates directories as needed
  - Updates tags index automatically
  - Supports partial updates with JSON Patch
  - Can work with different workspace/docs locations than the server default

- **read_global_memory_bank**
  - Read a document from the global memory bank
  - Input:
    - `path` (string): Document path
  - Returns document content and metadata

- **read_context**
  - Read all context information (rules, branch memory bank, global memory bank) at once
  - Input:
    - `branch` (string): Branch name (required if includeBranchMemory is true)
    - `language` (string): Language code ('en', 'ja', or 'zh', default: 'ja')
    - `includeRules` (boolean): Whether to include rules (default: true)
    - `includeBranchMemory` (boolean): Whether to include branch memory bank (default: true)
    - `includeGlobalMemory` (boolean): Whether to include global memory bank (default: true)
  - Returns combined context information from requested sources

- **read_rules**
  - Read the memory bank rules in specified language
  - Input:
    - `language` (string): Language code ("en", "ja", or "zh")
  - Returns rules documentation


## Usage with Claude Desktop

### Setup

Add one of these configurations to your claude_desktop_config.json:

### NPX (Recommended)
```json
{
  "mcpServers": {
    "memory-bank": {
      "command": "npx",
      "args": ["-y", "memory-bank-mcp-server"],
      "env": {
        "MEMORY_BANK_ROOT": "/path/to/docs",
        "MEMORY_BANK_LANGUAGE": "ja"
      }
    }
  }
}
```

### Global Installation
```json
{
  "mcpServers": {
    "memory-bank": {
      "command": "memory-bank-mcp-server",
      "env": {
        "MEMORY_BANK_ROOT": "/path/to/docs",
        "MEMORY_BANK_LANGUAGE": "ja"
      }
    }
  }
}
```


Configuration options:

- `WORKSPACE_ROOT`: Root directory for the project workspace (default: current directory)
- `MEMORY_BANK_ROOT`: Root directory for memory bank storage (default: `docs` in workspace)
- `MEMORY_BANK_LANGUAGE`: Default language for templates ("en", "ja", or "zh", default: "en")

#### Working with Multiple Projects

You can specify the workspace directory when starting the server:

```json
{
  "mcpServers": {
    "memory-bank": {
      "command": "npx",
      "args": ["-y", "memory-bank-mcp-server", "--workspace", "/path/to/project"],
      "env": {
        "MEMORY_BANK_LANGUAGE": "ja"
      }
    }
  }
}
```

Alternatively, with the `read_context` and other MCP tools, you can work with different projects in the same session:

```
read_context(branch: "feature/my-branch", workspace: "/path/to/other/project")
```

Path resolution follows this priority order:
1. Tool parameters (highest priority)
2. Command-line options
3. Environment variables
4. Default values (current directory and ./docs)

### System Prompt

Here's a recommended system prompt for utilizing the memory bank:

```
Follow these steps for each interaction:

1. Branch Context:
   - Always begin by checking the current git branch
   - For feature/ or fix/ branches, load the branch memory bank
   - Initialize memory bank with templates if not present

2. Memory Bank Access:
   - Read relevant documentation from global and branch memory banks
   - Keep context of project-wide standards and branch-specific work
   - Maintain documentation structure and organization

3. Documentation Updates:
   - Update branch memory bank when:
     a) Making code changes
     b) Adding new features
     c) Making technical decisions
     d) Discovering new patterns
   - Update global memory bank for project-wide changes
   - Use JSON Patch for targeted updates when appropriate

4. Memory Bank Maintenance:
   - Keep documentation organized and up-to-date
   - Use proper templates and structures
   - Tag documents appropriately
   - Maintain clear hierarchies
```

## Development

Clone and install dependencies:

```bash
git clone <repository-url>
cd memory-bank-mcp-server
npm install
```

Run in development mode:

```bash
npm run dev
```

Build:

```bash
npm run build
```

## CI/CD Pipeline

This project uses GitHub Actions for continuous integration and deployment:

### Automated Testing

Tests are automatically run on:
- Pull requests to `develop` and `master` branches
- Direct pushes to `develop` and `master` branches

The test workflow runs against multiple Node.js versions (16.x, 18.x, 20.x) to ensure compatibility.

### Automated Release

When code is merged to the `master` branch:
1. Tests are run to verify the build
2. A git tag is created based on the version in package.json
3. A GitHub Release is created with release notes
4. The package is published to npm

### Manual Version Bumping

To bump the version before a release:
1. Go to the Actions tab in GitHub
2. Select the "Version Bump" workflow
3. Click "Run workflow"
4. Choose the version bump type (patch, minor, or major)
5. Select the branch to bump the version on (typically `develop`)

This will create a commit with the updated version number in package.json.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
