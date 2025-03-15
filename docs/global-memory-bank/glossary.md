# Glossary

tags: #glossary #terminology #definitions

## Domain Terminology

### Memory Bank
A structured collection of documentation in a Markdown format that maintains context and institutional knowledge for AI assistants. Memory banks allow for persistent storage of information across conversations.

### Memory Document
An individual document within a memory bank, typically stored as a Markdown file with metadata such as tags and last modified date.

### Branch Memory Bank
A memory bank associated with a specific feature or fix branch. Branch memory banks contain information specific to the development work in that branch.

### Global Memory Bank
A memory bank that contains project-wide information shared across all branches, such as architecture documentation, coding standards, and glossaries.

### Core Files
A set of standard files that exist in every branch memory bank, providing structure and consistency:
- `branchContext.md`: Defines the purpose and goals of the branch
- `activeContext.md`: Contains current work, recent changes, and next steps
- `systemPatterns.md`: Documents technical decisions and patterns
- `progress.md`: Tracks implemented features and pending work

### Tag
A label attached to memory documents to enable categorization and searching. Tags help in organizing and finding related information across documents.

### Tag Index
A data structure that maps tags to the documents containing those tags, enabling efficient tag-based search.

## Technical Terminology

### Clean Architecture
A software architecture pattern that separates concerns into concentric layers, with domain logic at the center and infrastructure details at the periphery. This separation allows for better testability, maintainability, and flexibility.

### Domain Layer
The innermost layer of clean architecture containing the business logic and domain models. It has no dependencies on other layers or external frameworks.

### Application Layer
The layer that coordinates the domain objects to perform tasks. It contains use cases and depends only on the domain layer.

### Infrastructure Layer
The layer that provides implementations for external concerns such as data storage, external APIs, and configuration. It depends on the domain and application layers.

### Interface Layer
The layer that handles the interaction with users or external systems. It includes controllers, presenters, and validators.

### Entity
A domain object with an identity and lifecycle. Entities encapsulate business rules and can change over time while maintaining their identity.

### Value Object
An immutable domain object without an identity, where equality is based on attribute values rather than identity.

### Repository
A component that abstracts data access logic and provides a collection-like interface for accessing domain entities.

### Use Case
A specific business operation or application feature represented as a class that orchestrates domain objects to perform a task.

### DTO (Data Transfer Object)
An object designed to carry data between processes or layers, typically used to transfer data between application and interface layers.

### Controller
A component that handles incoming requests, delegates work to appropriate use cases, and returns responses.

### Presenter
A component that formats the output of use cases into a format suitable for the interface layer.

### DI (Dependency Injection)
A design pattern where objects receive their dependencies from an external source rather than creating them directly.

### MCP (Model Context Protocol)
A communication protocol used for interacting with AI models, enabling structured exchange of information and tool calls.

## Acronyms and Abbreviations

### API
Application Programming Interface - A set of rules and protocols that allows different software applications to communicate with each other.

### DTO
Data Transfer Object - An object designed to carry data between processes or layers.

### DI
Dependency Injection - A design pattern where objects receive their dependencies rather than creating them.

### DDD
Domain-Driven Design - An approach to software development that focuses on the core domain and domain logic.

### SRP
Single Responsibility Principle - A principle stating that a class should have only one reason to change.

### TDD
Test-Driven Development - A software development process relying on a very short development cycle where requirements are turned into specific test cases before the software is improved.

### MCP
Model Context Protocol - A protocol for structured communication with AI models.

### CLI
Command Line Interface - A text-based interface used to interact with software by typing commands.

### SOLID
Five design principles (Single responsibility, Open-closed, Liskov substitution, Interface segregation, Dependency inversion) intended to make object-oriented designs more understandable, flexible, and maintainable.

## Project-Specific Concepts

### Branch Naming Convention
Branches are named with prefixes indicating their purpose:
- `feature/` - For new features
- `fix/` - For bug fixes

### Active Context
The current state of work on a branch, including current tasks, recent changes, active decisions, and next steps.

### Technical Decision
A documented decision about a technical aspect of the project, including context, the decision made, and its consequences.

### System Pattern
A recurring solution to a common problem within the system, documented for reuse and knowledge sharing.

### Memory Bank Path
The file system path where memory bank documents are stored, with a standard structure for global and branch-specific documents.

### Memory Bank MCP Server
The server application that provides a Model Context Protocol interface for interacting with memory banks.

### Workspace
The root directory containing the project code and documentation.

### Memory Root
The root directory containing all memory banks for a workspace.

### Document Path
The relative path of a document within a memory bank.

### Tag System
The mechanism for associating documents with tags and searching for documents by tag.
