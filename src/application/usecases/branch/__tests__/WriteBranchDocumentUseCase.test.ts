import { WriteBranchDocumentUseCase } from '../WriteBranchDocumentUseCase';
import { IBranchMemoryBankRepository } from '../../../../domain/repositories/IBranchMemoryBankRepository';
import { MemoryDocument } from '../../../../domain/entities/MemoryDocument';
import { BranchInfo } from '../../../../domain/entities/BranchInfo';
import { DocumentPath } from '../../../../domain/entities/DocumentPath';
import { Tag } from '../../../../domain/entities/Tag';
import { DomainError } from '../../../../shared/errors/DomainError';
import { ApplicationError, ApplicationErrorCodes } from '../../../../shared/errors/ApplicationError';

// Mock repository
const mockBranchRepository: jest.Mocked<IBranchMemoryBankRepository> = {
  exists: jest.fn(),
  initialize: jest.fn(),
  getDocument: jest.fn(),
  saveDocument: jest.fn(),
  deleteDocument: jest.fn(),
  listDocuments: jest.fn(),
  findDocumentsByTags: jest.fn(),
  getRecentBranches: jest.fn(),
  validateStructure: jest.fn()
};

describe('WriteBranchDocumentUseCase', () => {
  let useCase: WriteBranchDocumentUseCase;
  
  // Test document data
  const testBranchName = 'feature/test';
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
    useCase = new WriteBranchDocumentUseCase(mockBranchRepository);
  });
  
  afterEach(() => {
    jest.useRealTimers();
  });
  
  it('should create a new document when it does not exist', async () => {
    // Arrange
    mockBranchRepository.exists.mockResolvedValue(true);
    mockBranchRepository.getDocument.mockResolvedValue(null);
    mockBranchRepository.saveDocument.mockResolvedValue();
    
    // Act
    const result = await useCase.execute({
      branchName: testBranchName,
      document: {
        path: testDocumentPath,
        content: testDocumentContent,
        tags: testDocumentTags
      }
    });
    
    // Assert
    expect(result).toBeDefined();
    expect(result.document).toBeDefined();
    expect(result.document.path).toBe(testDocumentPath);
    expect(result.document.content).toBe(testDocumentContent);
    expect(result.document.tags).toEqual(testDocumentTags);
    expect(result.document.lastModified).toBe(testLastModified.toISOString());
    
    // Verify repository was called with correct parameters
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(testBranchName);
    expect(mockBranchRepository.getDocument).toHaveBeenCalledWith(
      expect.objectContaining({ name: testBranchName }),
      expect.objectContaining({ value: testDocumentPath })
    );
    
    // Verify saveDocument was called with a document containing the correct data
    expect(mockBranchRepository.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({ name: testBranchName }),
      expect.objectContaining({
        content: testDocumentContent,
        tags: expect.arrayContaining([
          expect.objectContaining({ value: testDocumentTags[0] }),
          expect.objectContaining({ value: testDocumentTags[1] })
        ])
      })
    );
  });
  
  it('should initialize the branch if it does not exist', async () => {
    // Arrange
    mockBranchRepository.exists.mockResolvedValue(false);
    mockBranchRepository.initialize.mockResolvedValue();
    mockBranchRepository.getDocument.mockResolvedValue(null);
    mockBranchRepository.saveDocument.mockResolvedValue();
    
    // Act
    await useCase.execute({
      branchName: testBranchName,
      document: {
        path: testDocumentPath,
        content: testDocumentContent,
        tags: testDocumentTags
      }
    });
    
    // Assert
    expect(mockBranchRepository.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ name: testBranchName })
    );
  });
  
  it('should update an existing document', async () => {
    // Arrange
    const branchInfo = BranchInfo.create(testBranchName);
    const documentPath = DocumentPath.create(testDocumentPath);
    const tags = testDocumentTags.map(tag => Tag.create(tag));
    
    const existingDocument = MemoryDocument.create({
      path: documentPath,
      content: 'Old content',
      tags: [Tag.create('old')],
      lastModified: new Date('2022-01-01T00:00:00.000Z')
    });
    
    mockBranchRepository.exists.mockResolvedValue(true);
    mockBranchRepository.getDocument.mockResolvedValue(existingDocument);
    mockBranchRepository.saveDocument.mockResolvedValue();
    
    // Act
    const result = await useCase.execute({
      branchName: testBranchName,
      document: {
        path: testDocumentPath,
        content: testDocumentContent,
        tags: testDocumentTags
      }
    });
    
    // Assert
    expect(result).toBeDefined();
    expect(result.document).toBeDefined();
    expect(result.document.content).toBe(testDocumentContent);
    expect(result.document.tags).toEqual(testDocumentTags);
    
    // Verify saveDocument was called with an updated document
    expect(mockBranchRepository.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({ name: testBranchName }),
      expect.objectContaining({
        content: testDocumentContent,
        tags: expect.arrayContaining([
          expect.objectContaining({ value: testDocumentTags[0] }),
          expect.objectContaining({ value: testDocumentTags[1] })
        ])
      })
    );
  });
  
  it('should update content while preserving tags if tags are not provided', async () => {
    // Arrange
    const branchInfo = BranchInfo.create(testBranchName);
    const documentPath = DocumentPath.create(testDocumentPath);
    const existingTags = [Tag.create('existing'), Tag.create('tags')];
    
    const existingDocument = MemoryDocument.create({
      path: documentPath,
      content: 'Old content',
      tags: existingTags,
      lastModified: new Date('2022-01-01T00:00:00.000Z')
    });
    
    mockBranchRepository.exists.mockResolvedValue(true);
    mockBranchRepository.getDocument.mockResolvedValue(existingDocument);
    mockBranchRepository.saveDocument.mockResolvedValue();
    
    // Act
    const result = await useCase.execute({
      branchName: testBranchName,
      document: {
        path: testDocumentPath,
        content: testDocumentContent
        // No tags provided
      }
    });
    
    // Assert
    expect(result).toBeDefined();
    expect(result.document).toBeDefined();
    expect(result.document.content).toBe(testDocumentContent);
    expect(result.document.tags).toEqual(existingTags.map(tag => tag.value));
    
    // Verify saveDocument was called with a document that has updated content but preserved tags
    expect(mockBranchRepository.saveDocument).toHaveBeenCalledWith(
      expect.objectContaining({ name: testBranchName }),
      expect.objectContaining({
        content: testDocumentContent,
        tags: expect.arrayContaining([
          expect.objectContaining({ value: 'existing' }),
          expect.objectContaining({ value: 'tags' })
        ])
      })
    );
  });
  
  it('should throw ApplicationError when branch name is empty', async () => {
    // Act & Assert
    await expect(useCase.execute({
      branchName: '',
      document: {
        path: testDocumentPath,
        content: testDocumentContent
      }
    })).rejects.toThrow(ApplicationError);
    
    await expect(useCase.execute({
      branchName: '',
      document: {
        path: testDocumentPath,
        content: testDocumentContent
      }
    })).rejects.toThrow('Branch name is required');
    
    // Verify repository was not called
    expect(mockBranchRepository.exists).not.toHaveBeenCalled();
  });
  
  it('should throw ApplicationError when document is missing', async () => {
    // Act & Assert
    await expect(useCase.execute({
      branchName: testBranchName,
      document: null as any
    })).rejects.toThrow(ApplicationError);
    
    await expect(useCase.execute({
      branchName: testBranchName,
      document: null as any
    })).rejects.toThrow('Document is required');
  });
  
  it('should throw ApplicationError when document path is empty', async () => {
    // Act & Assert
    await expect(useCase.execute({
      branchName: testBranchName,
      document: {
        path: '',
        content: testDocumentContent
      }
    })).rejects.toThrow(ApplicationError);
    
    await expect(useCase.execute({
      branchName: testBranchName,
      document: {
        path: '',
        content: testDocumentContent
      }
    })).rejects.toThrow('Document path is required');
  });
  
  it('should throw ApplicationError when document content is missing', async () => {
    // Act & Assert
    await expect(useCase.execute({
      branchName: testBranchName,
      document: {
        path: testDocumentPath,
        content: null as any
      }
    })).rejects.toThrow(ApplicationError);
    
    await expect(useCase.execute({
      branchName: testBranchName,
      document: {
        path: testDocumentPath,
        content: null as any
      }
    })).rejects.toThrow('Document content is required');
  });
  
  it('should wrap unknown errors as ApplicationError', async () => {
    // Arrange
    const unknownError = new Error('Something went wrong');
    mockBranchRepository.exists.mockImplementation(() => {
      throw unknownError;
    });
    
    // Act & Assert
    await expect(useCase.execute({
      branchName: testBranchName,
      document: {
        path: testDocumentPath,
        content: testDocumentContent
      }
    })).rejects.toThrow(ApplicationError);
    
    await expect(useCase.execute({
      branchName: testBranchName,
      document: {
        path: testDocumentPath,
        content: testDocumentContent
      }
    })).rejects.toThrow(`Failed to write document: Something went wrong`);
    
    // Verify error is properly wrapped
    try {
      await useCase.execute({
        branchName: testBranchName,
        document: {
          path: testDocumentPath,
          content: testDocumentContent
        }
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
      'INVALID_BRANCH_NAME',
      'Invalid branch name format'
    );
    
    mockBranchRepository.exists.mockImplementation(() => {
      throw domainError;
    });
    
    // Act & Assert
    await expect(useCase.execute({
      branchName: testBranchName,
      document: {
        path: testDocumentPath,
        content: testDocumentContent
      }
    })).rejects.toBe(domainError); // Should be the exact same error instance
    
    await expect(useCase.execute({
      branchName: testBranchName,
      document: {
        path: testDocumentPath,
        content: testDocumentContent
      }
    })).rejects.toThrow('Invalid branch name format');
  });
});
