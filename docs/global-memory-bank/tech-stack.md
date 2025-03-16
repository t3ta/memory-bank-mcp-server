# Technology Stack

tags: #tech-stack #infrastructure #dependencies

## Core Technologies

### Programming Language

- **TypeScript** - Strongly-typed JavaScript superset used throughout the application
  - Version: 4.9.x+
  - Features used: Advanced types, interfaces, generics, async/await

### Runtime Environment

- **Node.js** - JavaScript runtime
  - Version: 18.x LTS
  - Features used: ES modules, async I/O, file system API

## Backend Framework

The application purposely avoids heavy frameworks to maintain architectural purity. Instead, it uses:

- **Custom Clean Architecture Implementation** - Handcrafted architecture inspired by Uncle Bob's Clean Architecture

## Package Manager

- **Yarn** - Fast, reliable, and secure dependency management
  - Used for: Managing project dependencies and running scripts
  - Version: Latest
  - Features used: Workspaces, frozen lockfile, caching

## Libraries and Dependencies

### Core Dependencies

- **@modelcontextprotocol/sdk** - SDK for implementing Model Context Protocol server
  - Used for: Communication with AI models
  - Version: Latest

- **zod** - Schema validation library
  - Used for: Input validation, type checking
  - Version: 3.x

- **yargs** - Command-line argument parser
  - Used for: CLI interface
  - Version: 17.x

### Utilities

- **dayjs** - Date manipulation library
  - Used for: Date handling, formatting
  - Version: 1.x

- **uuid** - UUID generation
  - Used for: Generating unique identifiers
  - Version: 9.x

- **chalk** - Terminal string styling
  - Used for: Colorizing console output
  - Version: 5.x

## Development Tools

### Build Tools

- **tsc** - TypeScript compiler
  - Used for: Compiling TypeScript to JavaScript

- **tsup** - TypeScript bundler
  - Used for: Building production bundles
  - Version: Latest

### Testing

- **Jest** - Testing framework
  - Used for: Unit and integration tests
  - Version: 29.x

- **ts-jest** - TypeScript support for Jest
  - Used for: Running tests on TypeScript code
  - Version: Compatible with Jest version

### Linting & Formatting

- **ESLint** - JavaScript/TypeScript linter
  - Used for: Static code analysis
  - Version: 8.x
  - Configuration: Custom rules aligned with coding standards

- **Prettier** - Code formatter
  - Used for: Consistent code formatting
  - Version: 2.x
  - Configuration: 2-space indentation, single quotes, no semicolons

## Infrastructure

### Persistence

- **File System** - Node.js fs/promises API
  - Used for: Storing and retrieving memory bank documents
  - Implementation: Custom abstracting over Node.js fs API

### Configuration

- **Environment Variables** - Node.js process.env
  - Used for: Runtime configuration
  - Implementation: Custom ConfigProvider

- **Command Line Arguments** - Via yargs
  - Used for: CLI options
  - Implementation: Custom CLI interface

### Logging

- **Console-based Logging** - Custom logger
  - Used for: Application logging
  - Implementation: Custom logger with levels and formatting

## Architecture Components

### Domain Layer

- **Entities**: Core business objects
  - MemoryDocument, BranchInfo, Tag, etc.

- **Value Objects**: Immutable value-based objects
  - DocumentPath, DocumentContent, etc.

- **Repository Interfaces**: Data access abstractions
  - IBranchMemoryBankRepository, IGlobalMemoryBankRepository, etc.

### Application Layer

- **Use Cases**: Business operations
  - ReadDocumentUseCase, WriteDocumentUseCase, etc.

- **DTOs**: Data transfer objects
  - DocumentDTO, CoreFilesDTO, etc.

- **Interfaces**: Application service interfaces
  - IUseCase, etc.

### Infrastructure Layer

- **Repository Implementations**: Data access implementations
  - FileSystemBranchMemoryBankRepository, FileSystemGlobalMemoryBankRepository, etc.

- **External Services**: External system integrations
  - FileSystemService, etc.

- **Configuration**: Application configuration
  - ConfigProvider, etc.

### Interface Layer

- **Controllers**: Request handlers
  - BranchController, GlobalController, etc.

- **Presenters**: Response formatters
  - MCPResponsePresenter, etc.

- **Validators**: Input validation
  - Schema-based validation using Zod

## External Integrations

### MCP Interface

- **MCP Server** - Model Context Protocol server
  - Used for: Communication with AI assistants
  - Implementation: Based on @modelcontextprotocol/sdk

### GitHub Integration

- **GitHub Actions** - CI/CD automation
  - Used for: Automated testing, building, and deployment
  - Configuration: Workflows defined in `.github/workflows`
