import { ReadGlobalDocumentUseCase } from '../ReadGlobalDocumentUseCase.js';
import { IGlobalMemoryBankRepository } from '../../../../domain/repositories/IGlobalMemoryBankRepository.js';
import { MemoryDocument } from '../../../../domain/entities/MemoryDocument.js';
import { DocumentPath } from '../../../../domain/entities/DocumentPath.js';
import { Tag } from '../../../../domain/entities/Tag.js';
import { DomainError, DomainErrorCodes } from '../../../../shared/errors/DomainError.js';
import { ApplicationError, ApplicationErrorCodes } from '../../../../shared/errors/ApplicationError.js';

// Mock repository
const mockGlobalRepository: jest.Mocked<IGlobalMemoryBankRepository> = {
  initialize: jest.fn(),
  getDocument: jest.fn(),
  saveDocument: jest.fn(),
  deleteDocument: jest.fn(),
  listDocuments: jest.fn(),
  findDocumentsByTags: jest.fn(),
  updateTagsIndex: jest.fn(),
  validateStructure: jest.fn()
};

describe('ReadGlobalDocumentUseCase', () => {
  let useCase: ReadGlobalDocumentUseCase;
  
  // Test document data
  const testDocumentPath = 'test/document.md';
  const testDocumentContent = '# Test Document\n\nThis is a test document.';
  const testDocumentTags = ['test', 'document'];
  const testLastModified = new Date('2023-01-01T00:00:00.000Z');
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create use case with mock repository
    useCase = new ReadGlobalDocumentUseCase(mockGlobalRepository);
  });
  
  it('should successfully read a document', async () => {
    // Arrange
    const documentPath = DocumentPath.create(testDocumentPath);
    const tags = testDocumentTags.map(tag => Tag.create(tag));
    
    const testDocument = MemoryDocument.create({
      path: documentPath,
      content: testDocumentContent,
      tags,
      lastModified: testLastModified
    });
    
    // Mock repository responses
    mockGlobalRepository.getDocument.mockResolvedValue(testDocument);
    
    // Act
    const result = await useCase.execute({
      path: testDocumentPath
    });
    
    // Assert
    expect(result).toBeDefined();
    expect(result.document).toBeDefined();
    expect(result.document.path).toBe(testDocumentPath);
    expect(result.document.content).toBe(testDocumentContent);
    expect(result.document.tags).toEqual(testDocumentTags);
    expect(result.document.lastModified).toBe(testLastModified.toISOString());
    
    // Verify repository was called with correct parameters
    expect(mockGlobalRepository.getDocument).toHaveBeenCalledWith(
      expect.objectContaining({ value: testDocumentPath })
    );
  });
  
  it('should throw ApplicationError when document path is empty', async () => {
    // Act & Assert
    await expect(useCase.execute({
      path: ''
    })).rejects.toThrow(ApplicationError);
    
    await expect(useCase.execute({
      path: ''
    })).rejects.toThrow('Document path is required');
    
    // Verify repository was not called
    expect(mockGlobalRepository.getDocument).not.toHaveBeenCalled();
  });
  
  it('should throw DomainError when document does not exist', async () => {
    // Arrange
    mockGlobalRepository.getDocument.mockResolvedValue(null);
    
    // Act & Assert
    await expect(useCase.execute({
      path: testDocumentPath
    })).rejects.toThrow(DomainError);
    
    await expect(useCase.execute({
      path: testDocumentPath
    })).rejects.toThrow(`Document "${testDocumentPath}" not found in global memory bank`);
    
    // Verify repository was called correctly
    expect(mockGlobalRepository.getDocument).toHaveBeenCalled();
  });
  
  it('should wrap unknown errors as ApplicationError', async () => {
    // Arrange
    const unknownError = new Error('Something went wrong');
    mockGlobalRepository.getDocument.mockImplementation(() => {
      throw unknownError;
    });
    
    // Act & Assert
    await expect(useCase.execute({
      path: testDocumentPath
    })).rejects.toThrow(ApplicationError);
    
    await expect(useCase.execute({
      path: testDocumentPath
    })).rejects.toThrow(`Failed to read document: Something went wrong`);
    
    // Verify error is properly wrapped
    try {
      await useCase.execute({
        path: testDocumentPath
      });
      
      // If we get here, it means the expected error wasn't thrown
      expect("No error was thrown").toBe("Error should have been thrown");
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationError);
      expect((error as ApplicationError).code).toBe(`APP_ERROR.${ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED}`);
      expect((error as ApplicationError).details).toEqual({ originalError: unknownError });
    }
  });
  
  it('should pass through domain errors without wrapping', async () => {
    // Arrange
    const domainError = new DomainError(
      DomainErrorCodes.INVALID_DOCUMENT_PATH,
      'Invalid document path format'
    );
    
    mockGlobalRepository.getDocument.mockImplementation(() => {
      throw domainError;
    });
    
    // Act & Assert
    await expect(useCase.execute({
      path: testDocumentPath
    })).rejects.toBe(domainError); // Should be the exact same error instance
    
    await expect(useCase.execute({
      path: testDocumentPath
    })).rejects.toThrow('Invalid document path format');
  });
});
