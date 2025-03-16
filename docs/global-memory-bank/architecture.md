# System Architecture

tags: #architecture #system-design #clean-architecture #onion-architecture

## Overview

Memory Bank MCP Server implements a clean architecture (also known as onion architecture) design pattern. This architecture separates the application into concentric layers, with domain logic at the center and infrastructure details at the periphery. This separation allows for better testability, maintainability, and flexibility.

## Core Principles

1. **Dependency Rule**: Dependencies always point inward. Inner layers don't know about outer layers.
2. **Domain-Centric**: The domain (business logic) is at the center of the architecture.
3. **Separation of Concerns**: Each layer has a specific responsibility.
4. **Framework Independence**: The core business logic doesn't depend on frameworks.
5. **Testability**: The architecture makes the system easy to test.

## Architectural Layers

The application is structured into the following layers, from innermost to outermost:

### 1. Domain Layer

The domain layer is the core of the application, containing:

- **Entities**: Core business objects (e.g., MemoryDocument, BranchInfo, Tag)
- **Value Objects**: Immutable objects with equality based on attributes (e.g., DocumentPath)
- **Repository Interfaces**: Abstractions for data access
- **Domain Services**: Domain-specific business logic

This layer has no dependencies on other layers or external frameworks.

### 2. Application Layer

The application layer coordinates the domain objects to perform tasks:

- **Use Cases**: Implementations of specific business operations
- **DTOs**: Data Transfer Objects for input/output mapping
- **Interfaces**: Abstractions used by the application layer

This layer depends only on the domain layer.

### 3. Infrastructure Layer

The infrastructure layer provides implementations for external concerns:

- **Repositories**: Implementations of domain repository interfaces
- **Storage Services**: File system interactions, database access
- **Configuration**: Application configuration management
- **External Integrations**: Interactions with external systems

This layer depends on the domain and application layers.

### 4. Interface Layer

The interface layer handles the interaction with users or external systems:

- **Controllers**: Handle incoming requests
- **Presenters**: Format data for output
- **Validators**: Validate input data

This layer depends on the application layer.

### 5. Main Layer

The main layer is the composition root and entry point of the application:

- **Dependency Injection**: Setup of the DI container
- **Configuration**: Application-wide configuration
- **Bootstrapping**: Startup logic

This layer depends on all other layers.

## Components

### Primary Components

- **Dependency Injection Container**: Manages dependencies across the application
- **Controllers**: BranchController, GlobalController
- **Use Cases**: ReadBranchDocumentUseCase, WriteGlobalDocumentUseCase, etc.
- **Repositories**: FileSystemBranchMemoryBankRepository, FileSystemGlobalMemoryBankRepository
- **Entities**: MemoryDocument, BranchInfo, Tag
- **Value Objects**: DocumentPath
- **Services**: FileSystemService, ConfigProvider

### Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                          Main Layer                            │
│                                                                │
│    ┌────────────────────────────────────────────────────┐     │
│    │                   Interface Layer                   │     │
│    │                                                     │     │
│    │    ┌────────────────────────────────────────┐      │     │
│    │    │            Application Layer            │      │     │
│    │    │                                         │      │     │
│    │    │    ┌────────────────────────────┐      │      │     │
│    │    │    │        Domain Layer         │      │      │     │
│    │    │    │                             │      │      │     │
│    │    │    │  - Entities                 │      │      │     │
│    │    │    │  - Value Objects            │      │      │     │
│    │    │    │  - Repository Interfaces    │      │      │     │
│    │    │    │  - Domain Services          │      │      │     │
│    │    │    └────────────────────────────┘      │      │     │
│    │    │                                         │      │     │
│    │    │  - Use Cases                            │      │     │
│    │    │  - DTOs                                 │      │     │
│    │    │  - Application Services                 │      │     │
│    │    └────────────────────────────────────────┘      │     │
│    │                                                     │     │
│    │  - Controllers                                      │     │
│    │  - Presenters                                       │     │
│    │  - Validators                                       │     │
│    └────────────────────────────────────────────────────┘     │
│                                                                │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │                   Infrastructure Layer                    │ │
│  │                                                           │ │
│  │  - Repository Implementations                             │ │
│  │  - Storage Services                                       │ │
│  │  - External Integrations                                  │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                │
│  - Dependency Injection                                        │
│  - Bootstrapping                                               │
└────────────────────────────────────────────────────────────────┘
```

## Design Decisions

### Clean Architecture Adoption

**Context**: The original codebase was difficult to maintain and extend, with tightly coupled components and unclear separation of concerns.

**Decision**: We adopted clean architecture to create a more maintainable and testable codebase.

**Consequences**:
- Improved separation of concerns
- Enhanced testability
- Better maintainability
- More explicit dependencies
- Initial development overhead for setting up architectural boundaries

### Repository Pattern

**Context**: The original code had data access logic scattered throughout manager classes.

**Decision**: We implemented the repository pattern to abstract data access.

**Consequences**:
- Centralized data access logic
- Ability to swap storage mechanisms
- Easier mocking for tests
- Clear separation of data access from business logic

### Domain-Driven Design Elements

**Context**: The domain concepts were not clearly modeled in the original code.

**Decision**: We applied DDD principles to model core domain concepts as entities and value objects.

**Consequences**:
- Richer domain model
- Encapsulation of business rules in the domain
- More intuitive code organization
- Better alignment with business requirements

### Dependency Injection

**Context**: Original code had direct dependencies between components, making testing difficult.

**Decision**: Implemented a dependency injection container to manage dependencies.

**Consequences**:
- Reduced coupling between components
- Improved testability
- More explicit dependencies
- Enhanced configurability

## Migration Strategy

The migration from the old architecture to clean architecture follows a phased approach:

1. Define domain layer (entities, value objects, repository interfaces)
2. Implement application layer (use cases, DTOs)
3. Implement infrastructure layer (repository implementations, services)
4. Implement interface layer (controllers, presenters)
5. Update entry point to use the new architecture
6. Phase out old code gradually
7. Add comprehensive tests
8. Update documentation

## Further Reading

- [Clean Architecture by Robert C. Martin](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design by Eric Evans](https://domainlanguage.com/ddd/)
- [Onion Architecture by Jeffrey Palermo](https://jeffreypalermo.com/2008/07/the-onion-architecture-part-1/)
