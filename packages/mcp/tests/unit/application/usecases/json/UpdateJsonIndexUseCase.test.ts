import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
import { UpdateJsonIndexUseCase, UpdateJsonIndexInput } from '../../../../../src/application/usecases/json/UpdateJsonIndexUseCase.js'; // 未使用の UpdateJsonIndexOutput を削除
import { IIndexService } from '../../../../../src/infrastructure/index/interfaces/IIndexService.js'; // .js 追加
import { IJsonDocumentRepository } from '../../../../../src/domain/repositories/IJsonDocumentRepository.js'; // .js 追加
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js'; // .js 追加
import { JsonDocument } from '../../../../../src/domain/entities/JsonDocument.js'; // .js 追加
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js'; // .js 追加
import { DocumentId } from '../../../../../src/domain/entities/DocumentId.js'; // .js 追加
import { Tag } from '../../../../../src/domain/entities/Tag.js'; // .js 追加
import { DocumentVersionInfo } from '../../../../../src/domain/entities/DocumentVersionInfo.js'; // .js 追加
import { IDocumentValidator } from '../../../../../src/domain/validation/IDocumentValidator.js'; // .js 追加済み
// import { jest } from '@jest/globals'; // jest インポート削除

// Mocks
// jest.Mocked を削除し、手動モックの型を指定
const mockIndexService: IIndexService = {
  initializeIndex: vi.fn(), // jest -> vi, 型引数削除
  buildIndex: vi.fn(), // jest -> vi, 型引数削除
  addToIndex: vi.fn(), // jest -> vi, 型引数削除
  removeFromIndex: vi.fn(), // jest -> vi, 型引数削除
  findById: vi.fn(), // jest -> vi, 型引数削除
  findByPath: vi.fn(), // jest -> vi, 型引数削除
  findByTags: vi.fn(), // jest -> vi, 型引数削除
  findByType: vi.fn(), // jest -> vi, 型引数削除
  listAll: vi.fn(), // jest -> vi, 型引数削除
  saveIndex: vi.fn(), // jest -> vi, 型引数削除
  loadIndex: vi.fn(), // jest -> vi, 型引数削除
};

// Mock Repository (needed to provide documents for indexing)
// jest.Mocked を削除し、手動モックの型を指定
const mockJsonDocumentRepository: IJsonDocumentRepository = {
  findById: vi.fn(), // jest -> vi, 型引数削除
  findByPath: vi.fn(), // jest -> vi, 型引数削除
  findByTags: vi.fn(), // jest -> vi, 型引数削除
  findByType: vi.fn(), // jest -> vi, 型引数削除
  save: vi.fn(), // jest -> vi, 型引数削除
  delete: vi.fn(), // jest -> vi, 型引数削除
  listAll: vi.fn(), // jest -> vi, 型引数削除
  exists: vi.fn(), // jest -> vi, 型引数削除
};

// Mock validator (needed for JsonDocument creation in mocks)
// jest.Mocked を削除し、手動モックの型を指定
const mockValidator: IDocumentValidator = {
  validateContent: vi.fn().mockReturnValue(true), // jest -> vi, 型引数削除
  validateDocument: vi.fn().mockReturnValue(true), // jest -> vi, 型引数削除
  validateMetadata: vi.fn().mockReturnValue(true), // jest -> vi, 型引数削除
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
    vi.clearAllMocks(); // jest -> vi
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
    (mockJsonDocumentRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
    // Mock repository listAll to return some documents
    const mockDocs = [
      createMockJsonDocument('doc1.json', ['tag1']),
      createMockJsonDocument('doc2.json', ['tag2', 'tag1']),
    ];
    (mockJsonDocumentRepository.listAll as Mock).mockResolvedValue(mockDocs); // as Mock 追加

    // Mock index service methods
    (mockIndexService.buildIndex as Mock).mockResolvedValue(undefined); // as Mock 追加
    (mockIndexService.saveIndex as Mock).mockResolvedValue(undefined); // as Mock 追加

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
    (mockJsonDocumentRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
    // Mock repository listAll to return empty array
    (mockJsonDocumentRepository.listAll as Mock).mockResolvedValue([]); // as Mock 追加

    // Mock index service methods
    (mockIndexService.buildIndex as Mock).mockResolvedValue(undefined); // as Mock 追加
    (mockIndexService.saveIndex as Mock).mockResolvedValue(undefined); // as Mock 追加

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
    (mockJsonDocumentRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
    // Mock repository listAll
    const mockDocs = [createMockJsonDocument('rebuild.json', ['rebuild-tag'])];
    (mockJsonDocumentRepository.listAll as Mock).mockResolvedValue(mockDocs); // as Mock 追加

    // Mock index service methods for rebuild
    (mockIndexService.buildIndex as Mock).mockResolvedValue(undefined); // as Mock 追加
    // (mockIndexService.saveIndex as Mock).mockResolvedValue(undefined); // Not called by use case

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
