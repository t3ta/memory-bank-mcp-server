# Coding Standards

tags: #standards #best-practices #typescript #clean-code

## General Guidelines

### Code Organization

1. **Follow Clean Architecture**: Respect the separation of concerns between layers:
   - Domain layer should have no external dependencies
   - Application layer depends only on Domain layer
   - Infrastructure and Interface layers depend on inner layers

2. **File Structure**:
   - One class/interface per file
   - File name should match the class/interface name
   - Use PascalCase for class/interface file names
   - Use camelCase for utility/module file names

3. **Module Organization**:
   - Group related files in directories
   - Use index.ts files for exporting public interfaces
   - Keep directory structure aligned with architectural layers

### Naming Conventions

1. **General**:
   - Use descriptive names that reveal intent
   - Avoid abbreviations except for widely accepted ones
   - Be consistent with naming patterns

2. **Specific Types**:
   - **Classes**: PascalCase, noun or noun phrase (e.g., `MemoryDocument`)
   - **Interfaces**: PascalCase, noun or noun phrase, consider prefixing with `I` (e.g., `IRepository`)
   - **Methods**: camelCase, verb or verb phrase (e.g., `getDocument`)
   - **Variables**: camelCase, noun or noun phrase (e.g., `documentPath`)
   - **Constants**: UPPER_SNAKE_CASE for true constants (e.g., `MAX_FILE_SIZE`)
   - **Files**: Same as the primary export (e.g., `MemoryDocument.ts`)

3. **Domain-Specific**:
   - **Entities**: PascalCase, noun (e.g., `MemoryDocument`)
   - **Value Objects**: PascalCase, descriptive noun (e.g., `DocumentPath`)
   - **Use Cases**: PascalCase, verb + noun + "UseCase" (e.g., `ReadDocumentUseCase`)
   - **DTOs**: PascalCase, noun + "DTO" (e.g., `DocumentDTO`)
   - **Repositories**: PascalCase, noun + "Repository" (e.g., `BranchMemoryBankRepository`)

### Commenting

1. **Documentation**:
   - All comments in source code need to be in English
   - Use JSDoc for classes, interfaces, methods, and non-obvious properties
   - Include parameter and return type descriptions
   - Document exceptions/errors that can be thrown

2. **Code Comments**:
   - Comment "why", not "what" or "how"
   - Keep comments current with code changes
   - Use TODO/FIXME with explanation when necessary

3. **Example**:
   ```typescript
   /**
    * Finds documents that match the given tags
    *
    * @param branchInfo Branch information
    * @param tags Tags to search for
    * @param matchAll If true, documents must have all tags; if false, any tag is sufficient
    * @returns Promise resolving to array of matching documents
    * @throws {DomainError} If tags are invalid
    */
   async findDocumentsByTags(
     branchInfo: BranchInfo,
     tags: Tag[],
     matchAll: boolean = false
   ): Promise<MemoryDocument[]> {
     // Implementation
   }
   ```

## TypeScript-Specific Guidelines

### Type Safety

1. **Types and Interfaces**:
   - Prefer interfaces for public APIs
   - Use types for unions, intersections, and mapped types
   - Define shared types in dedicated files

2. **Avoid Any**:
   - Minimize use of `any`
   - Use `unknown` when type is not known
   - Use proper type guards to narrow types

3. **Null Handling**:
   - Use optional parameters/properties rather than null
   - Be explicit about null/undefined handling
   - Consider using the Maybe/Option pattern for nullable values

### TypeScript Features

1. **Generics**:
   - Use generics to create reusable components
   - Provide clear, descriptive names for type parameters
   - Consider constraints when appropriate

2. **Enums**:
   - Use string enums for better debugging and serialization
   - Define enums close to where they are used

3. **Interfaces vs Types**:
   - Prefer `interface` for public APIs and objects with methods
   - Use `type` for unions, primitives, tuples, and function types
   - Be consistent with your choice

4. **Advanced Types**:
   - Leverage mapped types, conditional types, and utility types
   - Document complex type manipulations

## Clean Code Practices

### Functions

1. **Single Responsibility**:
   - Functions should do one thing and do it well
   - Keep functions small (generally < 20 lines)
   - Extract complex logic into helper functions

2. **Parameter Lists**:
   - Limit number of parameters (≤ 3 is ideal)
   - Use object parameters for multiple optional parameters
   - Consider function overloading for different parameter sets

3. **Error Handling**:
   - Use typed errors when possible
   - Provide meaningful error messages
   - Document error conditions

### Classes

1. **Design**:
   - Follow the Single Responsibility Principle
   - Keep classes focused and cohesive
   - Prefer composition over inheritance

2. **Organization**:
   - Group related methods together
   - Public methods first, then protected, then private
   - Properties first, then constructor, then methods

3. **Encapsulation**:
   - Make fields private when appropriate
   - Provide accessor methods when needed
   - Use readonly for immutable properties

## Architecture-Specific Guidelines

### Domain Layer

1. **Entities**:
   - Make entities rich with business logic
   - Implement validation logic within entities
   - Use factory methods for complex object creation

2. **Value Objects**:
   - Make value objects immutable
   - Implement equality based on properties
   - Validate values in constructor

3. **Repository Interfaces**:
   - Define clear, domain-oriented methods
   - Avoid leaking implementation details
   - Use domain entities as input/output types

### Application Layer

1. **Use Cases**:
   - One class per use case
   - Implement the `IUseCase` interface
   - Clearly define input/output DTOs
   - Handle errors and validation

2. **DTOs**:
   - Keep DTOs simple and focused on data transfer
   - Use meaningful property names
   - Include JSDoc comments for properties
   - Use appropriate TypeScript types

### Infrastructure Layer

1. **Repository Implementations**:
   - Implement domain repository interfaces
   - Handle data mapping and persistence concerns
   - Isolate external dependencies

2. **External Services**:
   - Wrap external dependencies in service classes
   - Implement domain interfaces
   - Handle errors and translate to domain errors

### Interface Layer

1. **Controllers**:
   - Focus on request handling and delegation
   - Validate input before passing to use cases
   - Map application errors to appropriate responses

2. **Presenters**:
   - Transform application output to response format
   - Handle formatting and localization concerns
   - Keep presenters focused and simple

## Testing Guidelines

1. **Unit Tests**:
   - Test domain layer thoroughly
   - Mock dependencies for isolated testing
   - Focus on behavior, not implementation details

2. **Integration Tests**:
   - Test across architectural boundaries
   - Use real implementations for key components
   - Focus on component interaction

3. **Test Organization**:
   - Mirror source code structure
   - Use descriptive test names
   - Follow Arrange-Act-Assert pattern

## Code Examples

### Entity Example

```typescript
export class MemoryDocument {
  private readonly props: MemoryDocumentProps;

  private constructor(props: MemoryDocumentProps) {
    this.props = props;
  }

  public static create(props: MemoryDocumentProps): MemoryDocument {
    // Validation logic
    if (!props.path || !props.content) {
      throw new DomainError(
        DomainErrorCodes.INVALID_ENTITY,
        'Memory document must have a path and content'
      );
    }

    return new MemoryDocument(props);
  }

  public get path(): DocumentPath {
    return this.props.path;
  }

  public get content(): string {
    return this.props.content;
  }

  public get tags(): Tag[] {
    return [...this.props.tags]; // Return copy to maintain immutability
  }

  public get lastModified(): Date {
    return new Date(this.props.lastModified);
  }

  // Business logic
  public hasTag(tag: Tag): boolean {
    return this.props.tags.some(t => t.equals(tag));
  }

  public addTag(tag: Tag): MemoryDocument {
    if (this.hasTag(tag)) {
      return this;
    }

    return new MemoryDocument({
      ...this.props,
      tags: [...this.props.tags, tag],
      lastModified: new Date()
    });
  }

  public updateContent(content: string): MemoryDocument {
    if (content === this.props.content) {
      return this;
    }

    return new MemoryDocument({
      ...this.props,
      content,
      lastModified: new Date()
    });
  }
}
```

### Use Case Example

```typescript
export class ReadBranchDocumentUseCase implements IUseCase<ReadBranchDocumentInput, ReadBranchDocumentOutput> {
  constructor(
    private readonly branchRepository: IBranchMemoryBankRepository
  ) {}

  async execute(input: ReadBranchDocumentInput): Promise<ReadBranchDocumentOutput> {
    try {
      // Validate input
      if (!input.branchName) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Branch name is required'
        );
      }

      if (!input.path) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Document path is required'
        );
      }

      // Create domain objects
      const branchInfo = BranchInfo.create(input.branchName);
      const documentPath = DocumentPath.create(input.path);

      // Check if branch exists
      const branchExists = await this.branchRepository.exists(input.branchName);

      if (!branchExists) {
        throw new DomainError(
          DomainErrorCodes.BRANCH_NOT_FOUND,
          `Branch "${input.branchName}" not found`
        );
      }

      // Get document from repository
      const document = await this.branchRepository.getDocument(branchInfo, documentPath);

      // Check if document exists
      if (!document) {
        throw new DomainError(
          DomainErrorCodes.DOCUMENT_NOT_FOUND,
          `Document "${input.path}" not found in branch "${input.branchName}"`
        );
      }

      // Transform to DTO
      return {
        document: {
          path: document.path.value,
          content: document.content,
          tags: document.tags.map(tag => tag.value),
          lastModified: document.lastModified.toISOString()
        }
      };
    } catch (error) {
      // Re-throw domain and application errors
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      // Wrap other errors
      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to read document: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }
}
```

### Controller Example

```typescript
export class BranchController implements IBranchController {
  constructor(
    private readonly readBranchDocumentUseCase: ReadBranchDocumentUseCase,
    private readonly writeBranchDocumentUseCase: WriteBranchDocumentUseCase,
    private readonly presenter: MCPResponsePresenter
  ) {}

  async readDocument(branchName: string, path: string): Promise<MCPResponse<DocumentDTO>> {
    try {
      logger.info(`Reading document from branch ${branchName}: ${path}`);

      const result = await this.readBranchDocumentUseCase.execute({
        branchName,
        path
      });

      return this.presenter.present(result.document);
    } catch (error) {
      return this.handleError(error);
    }
  }

  private handleError(error: any): MCPResponse {
    if (error instanceof DomainError ||
        error instanceof ApplicationError ||
        error instanceof InfrastructureError) {
      return this.presenter.presentError(error);
    }

    // Unknown error
    return this.presenter.presentError(
      new ApplicationError(
        'UNEXPECTED_ERROR',
        error instanceof Error ? error.message : 'An unexpected error occurred',
        { originalError: error }
      )
    );
  }
}
```
