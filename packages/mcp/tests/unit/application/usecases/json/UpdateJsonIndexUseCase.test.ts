import { UpdateJsonIndexUseCase, UpdateJsonIndexInput, UpdateJsonIndexOutput } from '../../../../../src/application/usecases/json/UpdateJsonIndexUseCase';
import { IIndexService } from '../../../../../src/infrastructure/index/interfaces/IIndexService';
import { IJsonDocumentRepository } from '../../../../../src/domain/repositories/IJsonDocumentRepository';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo';
import { JsonDocument } from '../../../../../src/domain/entities/JsonDocument';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath';
import { DocumentId } from '../../../../../src/domain/entities/DocumentId';
import { Tag } from '../../../../../src/domain/entities/Tag';
import { DocumentVersionInfo } from '../../../../../src/domain/entities/DocumentVersionInfo';
import { IDocumentValidator } from '../../../../../src/domain/validation/IDocumentValidator';
import { jest } from '@jest/globals';

// Mocks
const mockIndexService: jest.Mocked<IIndexService> = {
  initializeIndex: jest.fn<() => Promise<void>>(),
  buildIndex: jest.fn<() => Promise<void>>(), // This will be used
  addToIndex: jest.fn<() => Promise<void>>(),
  removeFromIndex: jest.fn<() => Promise<void>>(),
  findById: jest.fn<() => Promise<any>>(),
  findByPath: jest.fn<() => Promise<any>>(),
  findByTags: jest.fn<() => Promise<any[]>>(),
  findByType: jest.fn<() => Promise<any[]>>(),
  listAll: jest.fn<() => Promise<any[]>>(), // This might be used if repo.listAll is called
  saveIndex: jest.fn<() => Promise<void>>(), // This will be used
  loadIndex: jest.fn<() => Promise<void>>(),
};

// Mock Repository (needed to provide documents for indexing)
const mockJsonDocumentRepository: jest.Mocked<IJsonDocumentRepository> = {
  findById: jest.fn<() => Promise<JsonDocument | null>>(),
  findByPath: jest.fn<() => Promise<JsonDocument | null>>(),
  findByTags: jest.fn<() => Promise<JsonDocument[]>>(),
  findByType: jest.fn<() => Promise<JsonDocument[]>>(),
  save: jest.fn<() => Promise<JsonDocument>>(),
  delete: jest.fn<() => Promise<boolean>>(),
  listAll: jest.fn<() => Promise<JsonDocument[]>>(), // This will be used
  exists: jest.fn<() => Promise<boolean>>(),
};

// Mock validator (needed for JsonDocument creation in mocks)
const mockValidator: jest.Mocked<IDocumentValidator> = {
  validateContent: jest.fn<(documentType: string, content: Record<string, unknown>) => boolean>().mockReturnValue(true),
  validateDocument: jest.fn<(document: unknown) => boolean>().mockReturnValue(true),
  validateMetadata: jest.fn<(metadata: Record<string, unknown>) => boolean>().mockReturnValue(true),
};

// Helper to create a mock JsonDocument
const createMockJsonDocument = (pathVal: string, tagsVal: string[]): JsonDocument => {
    const id = DocumentId.generate();
    const path = DocumentPath.create(pathVal);
    const tags = tagsVal.map(t => Tag.create(t));
    return JsonDocument.create({
        id,
        path,
        title: 'Mock Index Doc',
        documentType: 'generic',
        tags,
        content: { data: 'mock' },
        versionInfo: new DocumentVersionInfo({ version: 1, lastModified: new Date(), modifiedBy: 'mock' })
    });
};

describe('UpdateJsonIndexUseCase', () => {
  let useCase: UpdateJsonIndexUseCase;
  // No need for useCaseWithGlobal as this use case doesn't seem to have separate global logic path

  beforeEach(() => {
    jest.clearAllMocks();
    JsonDocument.setValidator(mockValidator); // Set validator for JsonDocument creation
    useCase = new UpdateJsonIndexUseCase(mockJsonDocumentRepository, mockIndexService); // Correct argument order
  });

  it('should update the index incrementally (addToIndex) for a specific branch by default', async () => {
    const branchName = 'feature/update-index';
    const input: UpdateJsonIndexInput = {
      branchName: branchName,
    };

    const expectedBranchInfo = BranchInfo.create(branchName);

    // Mock branch existence check
    mockJsonDocumentRepository.exists.mockResolvedValue(true);
    // Mock repository listAll to return some documents
    const mockDocs = [
      createMockJsonDocument('doc1.json', ['tag1']),
      createMockJsonDocument('doc2.json', ['tag2', 'tag1']),
    ];
    mockJsonDocumentRepository.listAll.mockResolvedValue(mockDocs);

    // Mock index service methods
    mockIndexService.buildIndex.mockResolvedValue(undefined);
    mockIndexService.saveIndex.mockResolvedValue(undefined);

    const result = await useCase.execute(input);

    // Verify repository listAll was called
    expect(mockJsonDocumentRepository.listAll).toHaveBeenCalledWith(expectedBranchInfo);

    // Verify index service addToIndex was called for each document
    expect(mockIndexService.addToIndex).toHaveBeenCalledTimes(mockDocs.length);
    expect(mockIndexService.addToIndex).toHaveBeenCalledWith(expectedBranchInfo, mockDocs[0]);
    expect(mockIndexService.addToIndex).toHaveBeenCalledWith(expectedBranchInfo, mockDocs[1]);
    expect(mockIndexService.buildIndex).not.toHaveBeenCalled(); // buildIndex should NOT be called
    // saveIndex is not called by this use case, the index service implementation handles saving internally maybe?
    // expect(mockIndexService.saveIndex).toHaveBeenCalledWith(expectedBranchInfo);

    // Verify the output indicates success
    // Verify the output (output structure changed based on use case code)
    expect(result.tags.sort()).toEqual(['tag1', 'tag2'].sort()); // Check unique tags
    expect(result.documentCount).toBe(mockDocs.length);
    expect(result.updateInfo.updateLocation).toBe(branchName);
    expect(result.updateInfo.fullRebuild).toBe(false); // Default is false
    expect(result.updateInfo.timestamp).toEqual(expect.any(String));
  });

  it('should handle incremental update when no documents are found', async () => {
     const branchName = 'feature/empty-branch';
    const input: UpdateJsonIndexInput = {
      branchName: branchName,
    };

    const expectedBranchInfo = BranchInfo.create(branchName);

    // Mock branch existence check
    mockJsonDocumentRepository.exists.mockResolvedValue(true);
    // Mock repository listAll to return empty array
    mockJsonDocumentRepository.listAll.mockResolvedValue([]);

    // Mock index service methods
    mockIndexService.buildIndex.mockResolvedValue(undefined);
    mockIndexService.saveIndex.mockResolvedValue(undefined);

    const result = await useCase.execute(input);

    // Verify repository listAll was called
    expect(mockJsonDocumentRepository.listAll).toHaveBeenCalledWith(expectedBranchInfo);

    // Verify index service addToIndex was called zero times
    expect(mockIndexService.addToIndex).not.toHaveBeenCalled();
    expect(mockIndexService.buildIndex).not.toHaveBeenCalled(); // buildIndex should NOT be called
    // expect(mockIndexService.saveIndex).toHaveBeenCalledWith(expectedBranchInfo); // saveIndex not called by use case

    // Verify the output indicates success with 0 documents
    // Verify the output indicates success with 0 documents and correct info
    expect(result.tags).toEqual([]);
    expect(result.documentCount).toBe(0);
    expect(result.updateInfo.updateLocation).toBe(branchName);
    expect(result.updateInfo.fullRebuild).toBe(false);
  });

  it('should perform a full rebuild when fullRebuild is true', async () => {
    const branchName = 'feature/full-rebuild';
    const input: UpdateJsonIndexInput = {
      branchName: branchName,
      fullRebuild: true, // Explicitly request full rebuild
    };

    const expectedBranchInfo = BranchInfo.create(branchName);

    // Mock branch existence check
    mockJsonDocumentRepository.exists.mockResolvedValue(true);
    // Mock repository listAll
    const mockDocs = [createMockJsonDocument('rebuild.json', ['rebuild-tag'])];
    mockJsonDocumentRepository.listAll.mockResolvedValue(mockDocs);

    // Mock index service methods for rebuild
    mockIndexService.buildIndex.mockResolvedValue(undefined);
    // mockIndexService.saveIndex.mockResolvedValue(undefined); // Not called by use case

    const result = await useCase.execute(input);

    // Verify repository listAll was called
    expect(mockJsonDocumentRepository.listAll).toHaveBeenCalledWith(expectedBranchInfo);

    // Verify index service buildIndex WAS called
    expect(mockIndexService.buildIndex).toHaveBeenCalledWith(expectedBranchInfo, mockDocs);
    expect(mockIndexService.addToIndex).not.toHaveBeenCalled(); // addToIndex should NOT be called

    // Verify the output indicates full rebuild
    expect(result.documentCount).toBe(mockDocs.length);
    expect(result.updateInfo.fullRebuild).toBe(true);
    expect(result.updateInfo.updateLocation).toBe(branchName);
  });

  // TODO: Add test cases for:
  // - Handling repository listAll errors
  // - Handling index service buildIndex errors
  // - Handling index service saveIndex errors
  // - Input validation (e.g., missing branchName)
});
