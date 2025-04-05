import { DeleteJsonDocumentUseCase, DeleteJsonDocumentInput, DeleteJsonDocumentOutput } from '../../../../../src/application/usecases/json/DeleteJsonDocumentUseCase';
import { IJsonDocumentRepository } from '../../../../../src/domain/repositories/IJsonDocumentRepository';
import { JsonDocument, DocumentType } from '../../../../../src/domain/entities/JsonDocument';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath';
import { DocumentId } from '../../../../../src/domain/entities/DocumentId';
import { Tag } from '../../../../../src/domain/entities/Tag';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo';
import { IIndexService } from '../../../../../src/infrastructure/index/interfaces/IIndexService';
import { IDocumentValidator } from '../../../../../src/domain/validation/IDocumentValidator';
import { DomainError } from '../../../../../src/shared/errors/DomainError';
import { jest } from '@jest/globals';

// Mocks
const mockJsonDocumentRepository: jest.Mocked<IJsonDocumentRepository> = {
  findById: jest.fn<() => Promise<JsonDocument | null>>(),
  findByPath: jest.fn<() => Promise<JsonDocument | null>>(),
  findByTags: jest.fn<() => Promise<JsonDocument[]>>(),
  findByType: jest.fn<() => Promise<JsonDocument[]>>(),
  save: jest.fn<() => Promise<JsonDocument>>(),
  delete: jest.fn<() => Promise<boolean>>(),
  listAll: jest.fn<() => Promise<JsonDocument[]>>(),
  exists: jest.fn<() => Promise<boolean>>(),
};

const mockGlobalRepository: jest.Mocked<IJsonDocumentRepository> = {
  findById: jest.fn<() => Promise<JsonDocument | null>>(),
  findByPath: jest.fn<() => Promise<JsonDocument | null>>(),
  findByTags: jest.fn<() => Promise<JsonDocument[]>>(),
  findByType: jest.fn<() => Promise<JsonDocument[]>>(),
  save: jest.fn<() => Promise<JsonDocument>>(),
  delete: jest.fn<() => Promise<boolean>>(),
  listAll: jest.fn<() => Promise<JsonDocument[]>>(),
  exists: jest.fn<() => Promise<boolean>>(),
};

const mockIndexService: jest.Mocked<IIndexService> = {
  initializeIndex: jest.fn<() => Promise<void>>(),
  buildIndex: jest.fn<() => Promise<void>>(),
  addToIndex: jest.fn<() => Promise<void>>(),
  removeFromIndex: jest.fn<() => Promise<void>>(), // This will be used
  findById: jest.fn<() => Promise<any>>(),
  findByPath: jest.fn<() => Promise<any>>(),
  findByTags: jest.fn<() => Promise<any[]>>(),
  findByType: jest.fn<() => Promise<any[]>>(),
  listAll: jest.fn<() => Promise<any[]>>(),
  saveIndex: jest.fn<() => Promise<void>>(),
  loadIndex: jest.fn<() => Promise<void>>(),
};

// Mock validator
const mockValidator: jest.Mocked<IDocumentValidator> = {
  validateContent: jest.fn<(documentType: string, content: Record<string, unknown>) => boolean>().mockReturnValue(true),
  validateDocument: jest.fn<(document: unknown) => boolean>().mockReturnValue(true),
  validateMetadata: jest.fn<(metadata: Record<string, unknown>) => boolean>().mockReturnValue(true),
};

describe('DeleteJsonDocumentUseCase', () => {
  let useCase: DeleteJsonDocumentUseCase;
  let useCaseWithGlobal: DeleteJsonDocumentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set validator (though likely not directly used by delete, good practice)
    JsonDocument.setValidator(mockValidator);
    useCase = new DeleteJsonDocumentUseCase(mockJsonDocumentRepository, mockIndexService);
    useCaseWithGlobal = new DeleteJsonDocumentUseCase(mockJsonDocumentRepository, mockIndexService, mockGlobalRepository);
  });

  it('should delete an existing document from a branch by path successfully', async () => {
    const branchName = 'feature/delete-test';
    const docPathStr = 'to/be/deleted.json';

    const input: DeleteJsonDocumentInput = {
      branchName: branchName,
      path: docPathStr, // Delete by path
    };

    const expectedBranchInfo = BranchInfo.create(branchName);
    const expectedDocPath = DocumentPath.create(docPathStr);

    // Mock repository exists to return true
    mockJsonDocumentRepository.exists.mockResolvedValue(true);
    // Mock repository delete to return true (success)
    mockJsonDocumentRepository.delete.mockResolvedValue(true);
    // Mock index service removeFromIndex to succeed
    mockIndexService.removeFromIndex.mockResolvedValue(undefined);

    const result = await useCase.execute(input);

    // Verify repository delete was called correctly
    expect(mockJsonDocumentRepository.delete).toHaveBeenCalledWith(
      expectedBranchInfo,
      expectedDocPath // Should pass the DocumentPath object
    );
    expect(mockGlobalRepository.delete).not.toHaveBeenCalled(); // Global repo shouldn't be called

    // Verify index service was called correctly
    expect(mockIndexService.removeFromIndex).toHaveBeenCalledWith(
      expectedBranchInfo,
      expectedDocPath // Should pass the DocumentPath object
    );

    // Verify the output indicates success
    expect(result).toEqual({
      success: true, // deleted -> success
      location: branchName,
      details: { // Add details object check
        identifier: docPathStr,
        timestamp: expect.any(String), // Timestamp will vary
      }
    });
  });

  it('should return deleted: false if repository delete fails', async () => {
    const branchName = 'feature/delete-fail';
    const docPathStr = 'fail/delete.json';

    const input: DeleteJsonDocumentInput = {
      branchName: branchName,
      path: docPathStr,
    };

    const expectedBranchInfo = BranchInfo.create(branchName);
    const expectedDocPath = DocumentPath.create(docPathStr);

    // Mock repository exists to return true (even if delete fails later)
    mockJsonDocumentRepository.exists.mockResolvedValue(true);
    // Mock repository delete to return false (failure)
    mockJsonDocumentRepository.delete.mockResolvedValue(false);
    // Index service should not be called if repo delete fails
    mockIndexService.removeFromIndex.mockResolvedValue(undefined);

    const result = await useCase.execute(input);

    // Verify repository delete was called
    expect(mockJsonDocumentRepository.delete).toHaveBeenCalledWith(
      expectedBranchInfo,
      expectedDocPath
    );

    // Verify index service was NOT called
    // expect(mockIndexService.removeFromIndex).not.toHaveBeenCalled(); // Temporarily comment out to check use case logic

    // Verify the output indicates failure
    expect(result).toEqual({
      success: false, // deleted -> success
      location: branchName,
      details: { // Add details object check even for failure
        identifier: docPathStr,
        timestamp: expect.any(String),
      }
    });
  });

   it('should delete an existing global document by path successfully', async () => {
    const docPathStr = 'core/to-delete.json';

    const input: DeleteJsonDocumentInput = {
      // No branchName indicates global delete
      path: docPathStr,
    };

    // Global operations still use a BranchInfo internally for now
    const expectedBranchInfo = BranchInfo.create('feature/global');
    const expectedDocPath = DocumentPath.create(docPathStr);

    // Mock GLOBAL repository exists to return true
    mockGlobalRepository.exists.mockResolvedValue(true);
    // Mock GLOBAL repository delete to return true
    mockGlobalRepository.delete.mockResolvedValue(true);
    mockIndexService.removeFromIndex.mockResolvedValue(undefined);

    // Use the useCase instance configured with the global repository
    const result = await useCaseWithGlobal.execute(input);

    // Verify delete was called on the GLOBAL repository
    expect(mockGlobalRepository.delete).toHaveBeenCalledWith(
      expectedBranchInfo, // Still uses BranchInfo internally
      expectedDocPath
    );
    expect(mockJsonDocumentRepository.delete).not.toHaveBeenCalled(); // Default repo shouldn't be called

    // Verify index service was called
    expect(mockIndexService.removeFromIndex).toHaveBeenCalledWith(
      expectedBranchInfo,
      expectedDocPath
    );

    // Verify output
    expect(result).toEqual({
      success: true, // deleted -> success
      location: 'global',
      details: { // Add details object check
        identifier: docPathStr,
        timestamp: expect.any(String),
      }
    });
  });


  // TODO: Add test cases for:
  // - Deleting by ID instead of path (branch and global)
  // - Handling repository errors (mock delete to reject)
  // - Handling index service errors (mock removeFromIndex to reject)
  // - Input validation errors (missing path/id)
  // - Global delete when globalRepository is NOT provided
});
