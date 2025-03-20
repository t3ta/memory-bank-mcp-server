import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { WriteGlobalDocumentUseCase } from '../../../../../src/application/usecases/global/WriteGlobalDocumentUseCase';
import { IGlobalMemoryBankRepository } from '../../../../../src/domain/repositories/IGlobalMemoryBankRepository';
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath';
import { Tag } from '../../../../../src/domain/entities/Tag';
import { DomainError } from '../../../../../src/shared/errors/DomainError';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../../../src/shared/errors/ApplicationError';

/**
 * Unit tests for WriteGlobalDocumentUseCase
 * 
 * These tests verify that the WriteGlobalDocumentUseCase correctly implements:
 * - Creating new documents in global memory bank
 * - Updating existing documents
 * - Preserving tags when only content is updated
 * - Input validation for document data
 * - Proper error handling and error wrapping
 * - Markdown writes prevention when disableMarkdownWrites is enabled
 * 
 * The test suite uses a mocked IGlobalMemoryBankRepository and fake timers
 * to ensure consistent behavior across test runs.
 */

// Mock repository
const mockGlobalRepository: jest.Mocked<IGlobalMemoryBankRepository> = {
  initialize: jest.fn(),
  getDocument: jest.fn(),
  saveDocument: jest.fn(),
  deleteDocument: jest.fn(),
  listDocuments: jest.fn(),
  findDocumentsByTags: jest.fn(),
  updateTagsIndex: jest.fn(),
  validateStructure: jest.fn(),
  saveTagIndex: jest.fn(),
  getTagIndex: jest.fn(),
  findDocumentPathsByTagsUsingIndex: jest.fn(),
};

describe('WriteGlobalDocumentUseCase', () => {
  let useCase: WriteGlobalDocumentUseCase;
  let useCaseWithMarkdownDisabled: WriteGlobalDocumentUseCase;

  // Test document data
  const testDocumentPath = 'test/document.md';
  const testDocumentContent = '# Test Document\n\nThis is a test document.';
  const testDocumentTags = ['test', 'document'];
  const testLastModified = new Date('2023-01-01T00:00:00.000Z');

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Mock current date in a predictable way
    jest.useFakeTimers();
    jest.setSystemTime(testLastModified);

    // Create use case with mock repository
    useCase = new WriteGlobalDocumentUseCase(mockGlobalRepository);
    
    // Create a use case with Markdown writing disabled
    useCaseWithMarkdownDisabled = new WriteGlobalDocumentUseCase(mockGlobalRepository, {
      disableMarkdownWrites: true
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should create a new document when it does not exist', async () => {
    // Arrange
    mockGlobalRepository.initialize.mockResolvedValue();
    mockGlobalRepository.getDocument.mockResolvedValue(null);
    mockGlobalRepository.saveDocument.mockResolvedValue();
    mockGlobalRepository.updateTagsIndex.mockResolvedValue();

    // Act
    const result = await useCase.execute({
      document: {
        path: testDocumentPath,
        content: testDocumentContent,
        tags: testDocumentTags,
      },
    });

    // Assert
    expect(result).toBeDefined();
    expect(result.document).toBeDefined();
    expect(result.document.path).toBe(testDocumentPath);
    expect(result.document.content).toBe(testDocumentContent);
    expect(result.document.tags).toEqual(testDocumentTags);
    expect(result.document.lastModified).toBe(testLastModified.toISOString());

    // Verify repository calls
    expect(mockGlobalRepository.initialize).toHaveBeenCalled();
    expect(mockGlobalRepository.getDocument).toHaveBeenCalledWith(
      expect.objectContaining({ value: testDocumentPath })
    );
    expect(mockGlobalRepository.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        content: testDocumentContent,
        tags: expect.arrayContaining([
          expect.objectContaining({ value: testDocumentTags[0] }),
          expect.objectContaining({ value: testDocumentTags[1] }),
        ]),
      })
    );
    expect(mockGlobalRepository.updateTagsIndex).toHaveBeenCalled();
  });

  it('should update an existing document', async () => {
    // Arrange
    const documentPath = DocumentPath.create(testDocumentPath);
    const existingDocument = MemoryDocument.create({
      path: documentPath,
      content: 'Old content',
      tags: [Tag.create('old')],
      lastModified: new Date('2022-01-01T00:00:00.000Z'),
    });

    mockGlobalRepository.initialize.mockResolvedValue();
    mockGlobalRepository.getDocument.mockResolvedValue(existingDocument);
    mockGlobalRepository.saveDocument.mockResolvedValue();
    mockGlobalRepository.updateTagsIndex.mockResolvedValue();

    // Act
    const result = await useCase.execute({
      document: {
        path: testDocumentPath,
        content: testDocumentContent,
        tags: testDocumentTags,
      },
    });

    // Assert
    expect(result).toBeDefined();
    expect(result.document).toBeDefined();
    expect(result.document.content).toBe(testDocumentContent);
    expect(result.document.tags).toEqual(testDocumentTags);
    expect(result.document.lastModified).toBe(testLastModified.toISOString());

    // Verify saveDocument was called with an updated document
    expect(mockGlobalRepository.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        content: testDocumentContent,
        tags: expect.arrayContaining([
          expect.objectContaining({ value: testDocumentTags[0] }),
          expect.objectContaining({ value: testDocumentTags[1] }),
        ]),
      })
    );
  });

  it('should update content while preserving tags if tags are not provided', async () => {
    // Arrange
    const documentPath = DocumentPath.create(testDocumentPath);
    const existingTags = [Tag.create('existing'), Tag.create('tags')];

    const existingDocument = MemoryDocument.create({
      path: documentPath,
      content: 'Old content',
      tags: existingTags,
      lastModified: new Date('2022-01-01T00:00:00.000Z'),
    });

    mockGlobalRepository.initialize.mockResolvedValue();
    mockGlobalRepository.getDocument.mockResolvedValue(existingDocument);
    mockGlobalRepository.saveDocument.mockResolvedValue();
    mockGlobalRepository.updateTagsIndex.mockResolvedValue();

    // Act
    const result = await useCase.execute({
      document: {
        path: testDocumentPath,
        content: testDocumentContent,
        // No tags provided
      },
    });

    // Assert
    expect(result).toBeDefined();
    expect(result.document).toBeDefined();
    expect(result.document.content).toBe(testDocumentContent);
    expect(result.document.tags).toEqual(existingTags.map((tag) => tag.value));

    // Verify saveDocument was called with a document that has updated content but preserved tags
    expect(mockGlobalRepository.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        content: testDocumentContent,
        tags: expect.arrayContaining([
          expect.objectContaining({ value: 'existing' }),
          expect.objectContaining({ value: 'tags' }),
        ]),
      })
    );
  });

  it('should throw ApplicationError when document is missing', async () => {
    // Act & Assert
    await expect(
      useCase.execute({
        document: null as any,
      })
    ).rejects.toThrow(ApplicationError);

    await expect(
      useCase.execute({
        document: null as any,
      })
    ).rejects.toThrow('Document is required');

    // Verify repository was not called
    expect(mockGlobalRepository.initialize).not.toHaveBeenCalled();
  });

  it('should throw ApplicationError when document path is empty', async () => {
    // Act & Assert
    await expect(
      useCase.execute({
        document: {
          path: '',
          content: testDocumentContent,
        },
      })
    ).rejects.toThrow(ApplicationError);

    await expect(
      useCase.execute({
        document: {
          path: '',
          content: testDocumentContent,
        },
      })
    ).rejects.toThrow('Document path is required');

    // Verify repository was not called
    expect(mockGlobalRepository.initialize).not.toHaveBeenCalled();
  });

  it('should throw ApplicationError when document content is missing', async () => {
    // Act & Assert
    await expect(
      useCase.execute({
        document: {
          path: testDocumentPath,
          content: null as any,
        },
      })
    ).rejects.toThrow(ApplicationError);

    await expect(
      useCase.execute({
        document: {
          path: testDocumentPath,
          content: null as any,
        },
      })
    ).rejects.toThrow('Document content is required');

    // Verify repository was not called
    expect(mockGlobalRepository.initialize).not.toHaveBeenCalled();
  });

  it('should throw ApplicationError when attempting to write to Markdown file with disableMarkdownWrites option', async () => {
    // Arrange
    mockGlobalRepository.initialize.mockResolvedValue();

    // Act & Assert
    await expect(
      useCaseWithMarkdownDisabled.execute({
        document: {
          path: testDocumentPath,  // This is a .md file
          content: testDocumentContent,
        },
      })
    ).rejects.toThrow(ApplicationError);

    await expect(
      useCaseWithMarkdownDisabled.execute({
        document: {
          path: testDocumentPath,
          content: testDocumentContent,
        },
      })
    ).rejects.toThrow('Writing to Markdown files is disabled');

    // Verify the error message contains the JSON alternative path
    await expect(
      useCaseWithMarkdownDisabled.execute({
        document: {
          path: testDocumentPath,
          content: testDocumentContent,
        },
      })
    ).rejects.toThrow('test/document.json');
  });

  it('should allow writing to JSON file with disableMarkdownWrites option', async () => {
    // Arrange
    const jsonPath = 'test/document.json';
    mockGlobalRepository.initialize.mockResolvedValue();
    mockGlobalRepository.getDocument.mockResolvedValue(null);
    mockGlobalRepository.saveDocument.mockResolvedValue();
    mockGlobalRepository.updateTagsIndex.mockResolvedValue();

    // Act
    const result = await useCaseWithMarkdownDisabled.execute({
      document: {
        path: jsonPath,
        content: '{"test": true}',
      },
    });

    // Assert
    expect(result).toBeDefined();
    expect(result.document).toBeDefined();
    expect(result.document.path).toBe(jsonPath);

    // Verify repository calls
    expect(mockGlobalRepository.initialize).toHaveBeenCalled();
    expect(mockGlobalRepository.saveDocument).toHaveBeenCalled();
  });

  it('should wrap unknown errors as ApplicationError', async () => {
    // Arrange
    const unknownError = new Error('Something went wrong');
    mockGlobalRepository.initialize.mockImplementation(() => {
      throw unknownError;
    });

    // Act & Assert
    await expect(
      useCase.execute({
        document: {
          path: testDocumentPath,
          content: testDocumentContent,
        },
      })
    ).rejects.toThrow(ApplicationError);

    await expect(
      useCase.execute({
        document: {
          path: testDocumentPath,
          content: testDocumentContent,
        },
      })
    ).rejects.toThrow(`Failed to write document: Something went wrong`);

    // Verify error is properly wrapped
    try {
      await useCase.execute({
        document: {
          path: testDocumentPath,
          content: testDocumentContent,
        },
      });

      // If we get here, it means the expected error wasn't thrown
      expect('No error was thrown').toBe('Error should have been thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationError);
      expect((error as ApplicationError).code).toBe(
        `APP_ERROR.${ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED}`
      );
      expect((error as ApplicationError).details).toEqual({ originalError: unknownError });
    }
  });

  it('should pass through domain errors without wrapping', async () => {
    // Arrange
    const domainError = new DomainError('INVALID_DOCUMENT_PATH', 'Invalid document path format');

    mockGlobalRepository.initialize.mockImplementation(() => {
      throw domainError;
    });

    // Act & Assert
    await expect(
      useCase.execute({
        document: {
          path: testDocumentPath,
          content: testDocumentContent,
        },
      })
    ).rejects.toBe(domainError); // Should be the exact same error instance

    await expect(
      useCase.execute({
        document: {
          path: testDocumentPath,
          content: testDocumentContent,
        },
      })
    ).rejects.toThrow('Invalid document path format');
  });
});
