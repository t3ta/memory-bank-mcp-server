import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { ReadGlobalDocumentUseCase, ReadGlobalDocumentInput } from '../../../../../src/application/usecases/global/ReadGlobalDocumentUseCase.js';
import { ReadDocumentUseCase, ReadDocumentOutput } from '../../../../../src/application/usecases/common/ReadDocumentUseCase.js';
import { DomainError, DomainErrorCodes } from '../../../../../src/shared/errors/DomainError.js';
import { ApplicationError, ApplicationErrorCodes } from '../../../../../src/shared/errors/ApplicationError.js';

// Mock for ReadDocumentUseCase
const mockReadDocumentUseCase = {
  execute: vi.fn(),
} as unknown as ReadDocumentUseCase;

// Mock validator is not needed anymore as we use MemoryDocument directly
/* const mockValidator: jest.Mocked<IDocumentValidator> = {
  validateContent: jest.fn<(documentType: string, content: Record<string, unknown>) => boolean>().mockReturnValue(true),
  validateDocument: jest.fn<(document: unknown) => boolean>().mockReturnValue(true),
  validateMetadata: jest.fn<(metadata: Record<string, unknown>) => boolean>().mockReturnValue(true),
}; */

// Helper functions for creating mocks were removed as they're no longer needed with the new architecture


describe('ReadGlobalDocumentUseCase Unit Tests', () => {
  let useCase: ReadGlobalDocumentUseCase;

  beforeEach(() => {
    vi.clearAllMocks(); // jest -> vi
    // JsonDocument.setValidator(mockValidator); // Validator not needed directly here
    useCase = new ReadGlobalDocumentUseCase(mockReadDocumentUseCase); // Use the correct ReadDocumentUseCase mock
  });

  it('should read an existing global document successfully', async () => {
    const docPathStr = 'core/config.json';
    const input: ReadGlobalDocumentInput = {
      path: docPathStr,
    };

    // Create mock response from ReadDocumentUseCase
    const expectedContent = { setting: true };
    const mockResponse: ReadDocumentOutput = {
      document: {
        path: docPathStr,
        content: expectedContent,
        tags: ['global', 'config'],
        lastModified: new Date().toISOString(),
      }
    };

    // Setup the mock to return our expected response
    (mockReadDocumentUseCase.execute as Mock).mockResolvedValue(mockResponse);

    const result = await useCase.execute(input);

    // Verify ReadDocumentUseCase was called correctly with scope='global'
    expect(mockReadDocumentUseCase.execute).toHaveBeenCalledWith({
      scope: 'global',
      path: docPathStr
    });

    // Verify the output matches the expected response
    expect(result).not.toBeNull();
    expect(result.document).toBeDefined();
    expect(result.document).toEqual(mockResponse.document);
  }); // Add missing closing bracket for the first 'it' block

  it('should throw DomainError when the global document is not found', async () => {
    const docPathStr = 'core/non-existent.json';
    const input: ReadGlobalDocumentInput = {
      path: docPathStr,
    };

    // Create a domain error for document not found
    const documentNotFoundError = new DomainError(
      DomainErrorCodes.DOCUMENT_NOT_FOUND,
      `Document not found: ${docPathStr}`
    );

    // Mock ReadDocumentUseCase to throw the domain error
    (mockReadDocumentUseCase.execute as Mock).mockRejectedValue(documentNotFoundError);

    // Expect the use case to reject with a DomainError and check the code
    expect.assertions(2); // Expect two assertions in this test (instanceof, code)
    try {
      await useCase.execute(input);
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe(`DOMAIN_ERROR.${DomainErrorCodes.DOCUMENT_NOT_FOUND}`);
    }
  });

  it('should throw ApplicationError when ReadDocumentUseCase throws an error', async () => {
     const docPathStr = 'core/error.json';
    const input: ReadGlobalDocumentInput = {
      path: docPathStr,
    };

    const repositoryError = new ApplicationError(
      ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
      'Failed to read document',
      new Error('Database connection failed')
    );

    // Mock ReadDocumentUseCase to reject with an error
    (mockReadDocumentUseCase.execute as Mock).mockRejectedValue(repositoryError);
    
    // Expect the use case to reject with an ApplicationError and check the code and cause
    expect.assertions(3); // Expect three assertions in this test (instanceof, code, cause)
    try {
      await useCase.execute(input);
    } catch (error) {
       expect(error).toBeInstanceOf(ApplicationError);
       expect((error as ApplicationError).code).toBe(`APP_ERROR.${ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED}`);
       expect((error as ApplicationError).cause).toBe(repositoryError.cause);
    }
  });

  // TODO: Add test cases for:
  // - Input validation (missing path)
});
