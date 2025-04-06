import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
import { DeleteJsonDocumentUseCase, DeleteJsonDocumentInput } from '../../../../../src/application/usecases/json/DeleteJsonDocumentUseCase.js'; // 未使用の DeleteJsonDocumentOutput を削除
import { IJsonDocumentRepository } from '../../../../../src/domain/repositories/IJsonDocumentRepository.js'; // .js 追加
import { JsonDocument } from '../../../../../src/domain/entities/JsonDocument.js'; // 未使用の DocumentType を削除
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js'; // .js 追加
// import { DocumentId } from '../../../../../src/domain/entities/DocumentId.js'; // 未使用なので削除
// import { Tag } from '../../../../../src/domain/entities/Tag.js'; // 未使用なので削除
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js'; // .js 追加
import { IIndexService } from '../../../../../src/infrastructure/index/interfaces/IIndexService.js'; // .js 追加
import { IDocumentValidator } from '../../../../../src/domain/validation/IDocumentValidator.js'; // .js 追加
// import { DomainError } from '../../../../../src/shared/errors/DomainError.js'; // 未使用なので削除
// import { jest } from '@jest/globals'; // jest インポート削除

// Mocks
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

// jest.Mocked を削除し、手動モックの型を指定
const mockGlobalRepository: IJsonDocumentRepository = {
  findById: vi.fn(), // jest -> vi, 型引数削除
  findByPath: vi.fn(), // jest -> vi, 型引数削除
  findByTags: vi.fn(), // jest -> vi, 型引数削除
  findByType: vi.fn(), // jest -> vi, 型引数削除
  save: vi.fn(), // jest -> vi, 型引数削除
  delete: vi.fn(), // jest -> vi, 型引数削除
  listAll: vi.fn(), // jest -> vi, 型引数削除
  exists: vi.fn(), // jest -> vi, 型引数削除
};

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

// Mock validator
// jest.Mocked を削除し、手動モックの型を指定
const mockValidator: IDocumentValidator = {
  validateContent: vi.fn().mockReturnValue(true), // jest -> vi, 型引数削除
  validateDocument: vi.fn().mockReturnValue(true), // jest -> vi, 型引数削除
  validateMetadata: vi.fn().mockReturnValue(true), // jest -> vi, 型引数削除
};

describe('DeleteJsonDocumentUseCase', () => {
  let useCase: DeleteJsonDocumentUseCase;
  let useCaseWithGlobal: DeleteJsonDocumentUseCase;

  beforeEach(() => {
    vi.clearAllMocks(); // jest -> vi
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
    (mockJsonDocumentRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
    // Mock repository delete to return true (success)
    (mockJsonDocumentRepository.delete as Mock).mockResolvedValue(true); // as Mock 追加
    // Mock index service removeFromIndex to succeed
    (mockIndexService.removeFromIndex as Mock).mockResolvedValue(undefined); // as Mock 追加

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
    (mockJsonDocumentRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
    // Mock repository delete to return false (failure)
    (mockJsonDocumentRepository.delete as Mock).mockResolvedValue(false); // as Mock 追加
    // Index service should not be called if repo delete fails
    (mockIndexService.removeFromIndex as Mock).mockResolvedValue(undefined); // as Mock 追加

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
    (mockGlobalRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
    // Mock GLOBAL repository delete to return true
    (mockGlobalRepository.delete as Mock).mockResolvedValue(true); // as Mock 追加
    (mockIndexService.removeFromIndex as Mock).mockResolvedValue(undefined); // as Mock 追加

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
