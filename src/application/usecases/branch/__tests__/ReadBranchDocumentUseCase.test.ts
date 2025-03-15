import { ReadBranchDocumentUseCase } from '../ReadBranchDocumentUseCase';
import { IBranchMemoryBankRepository } from '../../../../domain/repositories/IBranchMemoryBankRepository';
import { MemoryDocument } from '../../../../domain/entities/MemoryDocument';
import { BranchInfo } from '../../../../domain/entities/BranchInfo';
import { DocumentPath } from '../../../../domain/entities/DocumentPath';
import { Tag } from '../../../../domain/entities/Tag';
import { DomainError, DomainErrorCodes } from '../../../../shared/errors/DomainError';
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

describe('ReadBranchDocumentUseCase', () => {
  let useCase: ReadBranchDocumentUseCase;
  
  // Test document data
  const testBranchName = 'feature/test';
  const testDocumentPath = 'test/document.md';
  const testDocumentContent = '# Test Document\n\nThis is a test document.';
  const testDocumentTags = ['test', 'document'];
  const testLastModified = new Date('2023-01-01T00:00:00.000Z');
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create use case with mock repository
    useCase = new ReadBranchDocumentUseCase(mockBranchRepository);
  });
  
  it('should successfully read a document', async () => {
    // Arrange
    const branchInfo = BranchInfo.create(testBranchName);
    const documentPath = DocumentPath.create(testDocumentPath);
    const tags = testDocumentTags.map(tag => Tag.create(tag));
    
    const testDocument = MemoryDocument.create({
      path: documentPath,
      content: testDocumentContent,
      tags,
      lastModified: testLastModified
    });
    
    // Mock repository responses
    mockBranchRepository.exists.mockResolvedValue(true);
    mockBranchRepository.getDocument.mockResolvedValue(testDocument);
    
    // Act
    const result = await useCase.execute({
      branchName: testBranchName,
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
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(testBranchName);
    expect(mockBranchRepository.getDocument).toHaveBeenCalledWith(
      expect.objectContaining({ name: testBranchName }),
      expect.objectContaining({ value: testDocumentPath })
    );
  });
  
  it('should throw ApplicationError when branch name is empty', async () => {
    // Act & Assert
    await expect(useCase.execute({
      branchName: '',
      path: testDocumentPath
    })).rejects.toThrow(ApplicationError);
    
    await expect(useCase.execute({
      branchName: '',
      path: testDocumentPath
    })).rejects.toThrow('Branch name is required');
    
    // Verify repository was not called
    expect(mockBranchRepository.exists).not.toHaveBeenCalled();
    expect(mockBranchRepository.getDocument).not.toHaveBeenCalled();
  });
  
  it('should throw ApplicationError when document path is empty', async () => {
    // Act & Assert
    await expect(useCase.execute({
      branchName: testBranchName,
      path: ''
    })).rejects.toThrow(ApplicationError);
    
    await expect(useCase.execute({
      branchName: testBranchName,
      path: ''
    })).rejects.toThrow('Document path is required');
    
    // Verify repository was not called
    expect(mockBranchRepository.exists).not.toHaveBeenCalled();
    expect(mockBranchRepository.getDocument).not.toHaveBeenCalled();
  });
  
  it('should throw DomainError when branch does not exist', async () => {
    // Arrange
    mockBranchRepository.exists.mockResolvedValue(false);
    
    // Act & Assert
    await expect(useCase.execute({
      branchName: testBranchName,
      path: testDocumentPath
    })).rejects.toThrow(DomainError);
    
    await expect(useCase.execute({
      branchName: testBranchName,
      path: testDocumentPath
    })).rejects.toThrow(`Branch "${testBranchName}" not found`);
    
    // Verify repository was called correctly
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(testBranchName);
    expect(mockBranchRepository.getDocument).not.toHaveBeenCalled();
  });
  
  it('should throw DomainError when document does not exist', async () => {
    // Arrange
    mockBranchRepository.exists.mockResolvedValue(true);
    mockBranchRepository.getDocument.mockResolvedValue(null);
    
    // Act & Assert
    await expect(useCase.execute({
      branchName: testBranchName,
      path: testDocumentPath
    })).rejects.toThrow(DomainError);
    
    await expect(useCase.execute({
      branchName: testBranchName,
      path: testDocumentPath
    })).rejects.toThrow(`Document "${testDocumentPath}" not found in branch "${testBranchName}"`);
    
    // Verify repository was called correctly
    expect(mockBranchRepository.exists).toHaveBeenCalledWith(testBranchName);
    expect(mockBranchRepository.getDocument).toHaveBeenCalled();
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
      path: testDocumentPath
    })).rejects.toThrow(ApplicationError);
    
    await expect(useCase.execute({
      branchName: testBranchName,
      path: testDocumentPath
    })).rejects.toThrow(`Failed to read document: Something went wrong`);
    
    // Verify error is properly wrapped
    try {
      await useCase.execute({
        branchName: testBranchName,
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
      DomainErrorCodes.INVALID_BRANCH_NAME,
      'Invalid branch name format'
    );
    
    mockBranchRepository.exists.mockImplementation(() => {
      throw domainError;
    });
    
    // Act & Assert
    await expect(useCase.execute({
      branchName: testBranchName,
      path: testDocumentPath
    })).rejects.toBe(domainError); // Should be the exact same error instance
    
    await expect(useCase.execute({
      branchName: testBranchName,
      path: testDocumentPath
    })).rejects.toThrow('Invalid branch name format');
  });
});
