# Memory Bank MCP Server

This project is inspired by [Cline Memory Bank](https://github.com/nickbaumann98/cline_docs/blob/main/prompting/custom%20instructions%20library/cline-memory-bank.md) from the [nickbaumann98/cline_docs](https://github.com/nickbaumann98/cline_docs) repository, which provides an excellent foundation for managing Claude's memory in software projects.

A Memory Bank implementation for managing project documentation and context across sessions. This server helps Claude maintain consistent project knowledge through global and branch-specific memory banks.

## Usage

### NPX (Recommended)
```bash
npx memory-bank-mcp-server
```

With options:
```bash
npx memory-bank-mcp-server --language ja --verbose
```

### Installation (Optional)

If you prefer to install globally:
```bash
npm install -g memory-bank-mcp-server
memory-bank-mcp-server --help
```

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
  ├── architecture.md      # System architecture
  ├── coding-standards.md  # Coding conventions
  ├── domain-models.md     # Domain model definitions
  ├── glossary.md          # Terminology
  ├── tech-stack.md        # Technology stack
  ├── user-guide.md        # User guide
  └── tags/                # Information organization
```

### Branch Memory Bank

Branch Memory Banks store context specific to feature or fix branches:

- Branch context and purpose
- Active development state
- System patterns and decisions
- Implementation progress

Example structure:

```
docs/branch-memory-bank/feature-login/
  ├── branchContext.md   # Branch purpose and stories
  ├── activeContext.md   # Current work state
  ├── systemPatterns.md  # Technical decisions
  └── progress.md        # Implementation status
```

## API

### Tools

- **write_branch_memory_bank**
  - Write a document to the current branch's memory bank
  - Input:
    - `path` (string): Document path
    - `content` (string): Document content
    - `branch` (string): Branch name
  - Creates directories as needed
  - Initializes with templates if content is empty

- **read_branch_memory_bank**
  - Read a document from the current branch's memory bank
  - Input:
    - `path` (string): Document path
    - `branch` (string): Branch name
  - Returns document content and metadata

- **write_global_memory_bank**
  - Write a document to the global memory bank
  - Input:
    - `path` (string): Document path
    - `content` (string): Document content
  - Creates directories as needed
  - Updates tags index automatically

- **read_global_memory_bank**
  - Read a document from the global memory bank
  - Input:
    - `path` (string): Document path
  - Returns document content and metadata

- **read_branch_core_files**
  - Read all core files from the branch memory bank
  - Input:
    - `branch` (string): Branch name
  - Returns content and metadata for:
    - branchContext.md
    - activeContext.md
    - systemPatterns.md
    - progress.md

- **read_global_core_files**
  - Read all core files from the global memory bank
  - Returns content and metadata for:
    - architecture.md
    - coding-standards.md
    - domain-models.md
    - glossary.md
    - tech-stack.md
    - user-guide.md

- **read_rules**
  - Read the memory bank rules in specified language
  - Input:
    - `language` (string): Language code ("en" or "ja")
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

- `MEMORY_BANK_ROOT`: Root directory for memory bank storage (default: `docs` in workspace)
- `MEMORY_BANK_LANGUAGE`: Default language for templates ("en" or "ja", default: "en")

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
