import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
import { UpdateTagIndexUseCaseV2 } from '../../../../../src/application/usecases/common/UpdateTagIndexUseCaseV2.js';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../../../../src/domain/repositories/IGlobalMemoryBankRepository.js';
// import { mock } from 'jest-mock-extended'; // jest-mock-extended を削除
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument.js';
import { Tag } from '../../../../../src/domain/entities/Tag.js';
import { BranchTagIndex, GlobalTagIndex, TagEntry } from '@memory-bank/schemas'; // Import index types and TagEntry

describe('UpdateTagIndexUseCaseV2', () => {
  let useCase: UpdateTagIndexUseCaseV2;
  // jest.Mocked を削除し、手動モックの型を指定
  let mockBranchRepo: IBranchMemoryBankRepository;
  let mockGlobalRepo: IGlobalMemoryBankRepository;
  // let mockTagIndexRepo: jest.Mocked<any>; // 必要に応じて追加

  const branchName = 'feature/index-test-v2';
  const branchInfo = BranchInfo.create(branchName);

  const mockDoc1Path = DocumentPath.create('doc1-v2.json');
  const mockDoc2Path = DocumentPath.create('subdir/doc2-v2.md');
  const mockDoc1 = MemoryDocument.create({ path: mockDoc1Path, content: '{}', tags: [Tag.create('tagx'), Tag.create('tagy')], lastModified: new Date() }); // tagX -> tagx, tagY -> tagy
  const mockDoc2 = MemoryDocument.create({ path: mockDoc2Path, content: 'content', tags: [Tag.create('tagy'), Tag.create('tagz')], lastModified: new Date() }); // tagY -> tagy, tagZ -> tagz

  beforeEach(() => {
    // jest-mock-extended の代わりに vi.fn() で手動モックを作成する
    mockBranchRepo = {
      initialize: vi.fn(),
      exists: vi.fn(),
      getDocument: vi.fn(),
      saveDocument: vi.fn(),
      deleteDocument: vi.fn(),
      getRecentBranches: vi.fn(),
      listDocuments: vi.fn(),
      findDocumentsByTags: vi.fn(),
      validateStructure: vi.fn(),
      saveTagIndex: vi.fn(),
      getTagIndex: vi.fn(),
      findDocumentPathsByTagsUsingIndex: vi.fn(),
    };
    mockGlobalRepo = {
      initialize: vi.fn(),
      getDocument: vi.fn(),
      saveDocument: vi.fn(),
      deleteDocument: vi.fn(),
      listDocuments: vi.fn(),
      findDocumentsByTags: vi.fn(),
      validateStructure: vi.fn(),
      saveTagIndex: vi.fn(),
      getTagIndex: vi.fn(),
      findDocumentPathsByTagsUsingIndex: vi.fn(),
      updateTagsIndex: vi.fn(),
    };
    // mockTagIndexRepo = mock<any>();
    // useCase = new UpdateTagIndexUseCaseV2(mockGlobalRepo, mockBranchRepo, mockTagIndexRepo);
    useCase = new UpdateTagIndexUseCaseV2(mockGlobalRepo, mockBranchRepo); // まずは tagIndexRepo なしでテスト
    vi.clearAllMocks(); // jest -> vi
  });

  describe('Branch Scope', () => {
    it('should build and save branch tag index correctly when no existing index', async () => {
      // Arrange
      (mockBranchRepo.exists as Mock).mockResolvedValue(true); // as Mock 追加
      (mockBranchRepo.getTagIndex as Mock).mockResolvedValue(null); // as Mock 追加
      (mockBranchRepo.listDocuments as Mock).mockResolvedValue([mockDoc1Path, mockDoc2Path]); // as Mock 追加
      (mockBranchRepo.getDocument as Mock).mockImplementation(async (_argBranchInfo, argPath) => { // as Mock 追加
        if (argPath.equals(mockDoc1Path)) return mockDoc1;
        if (argPath.equals(mockDoc2Path)) return mockDoc2;
        return null;
      });

      // Act
      const result = await useCase.execute({ branchName });

      // Assert
      expect(mockBranchRepo.exists).toHaveBeenCalledWith(branchName);
      expect(mockBranchRepo.getTagIndex).toHaveBeenCalledWith(branchInfo); // fullRebuild=false なので呼ばれる
      expect(mockBranchRepo.listDocuments).toHaveBeenCalledWith(branchInfo);
      expect(mockBranchRepo.getDocument).toHaveBeenCalledTimes(2);
      expect(mockBranchRepo.saveTagIndex).toHaveBeenCalledTimes(1);

      // Verify the saved index content
      const savedIndex: BranchTagIndex = (mockBranchRepo.saveTagIndex as Mock).mock.calls[0][1]; // as Mock 追加
      expect(savedIndex.schema).toBe('tag_index_v1');
      expect(savedIndex.metadata.indexType).toBe('branch');
      expect(savedIndex.metadata.branchName).toBe(branchName);
      expect(savedIndex.metadata.documentCount).toBe(2);
      expect(savedIndex.metadata.tagCount).toBe(3);
      expect(savedIndex.index).toEqual(expect.arrayContaining([
        expect.objectContaining({ tag: 'tagx', documents: expect.arrayContaining([expect.objectContaining({ path: mockDoc1Path.value })]) }),
        expect.objectContaining({ tag: 'tagy', documents: expect.arrayContaining([expect.objectContaining({ path: mockDoc1Path.value }), expect.objectContaining({ path: mockDoc2Path.value })]) }),
        expect.objectContaining({ tag: 'tagz', documents: expect.arrayContaining([expect.objectContaining({ path: mockDoc2Path.value })]) }),
      ]));
      expect(savedIndex.index.find((i: TagEntry) => i.tag === 'tagx')?.documents).toHaveLength(1);
      expect(savedIndex.index.find((i: TagEntry) => i.tag === 'tagy')?.documents).toHaveLength(2);
      expect(savedIndex.index.find((i: TagEntry) => i.tag === 'tagz')?.documents).toHaveLength(1);


      // Verify the output
      expect(result.tags).toEqual(expect.arrayContaining(['tagx', 'tagy', 'tagz']));
      expect(result.tags).toHaveLength(3);
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.updateLocation).toBe(branchName);
      expect(result.updateInfo.fullRebuild).toBe(false);
    });

    it('should not call getTagIndex when fullRebuild is true', async () => {
       // Arrange
      (mockBranchRepo.exists as Mock).mockResolvedValue(true); // as Mock 追加
      (mockBranchRepo.listDocuments as Mock).mockResolvedValue([]); // as Mock 追加

      // Act
      await useCase.execute({ branchName, fullRebuild: true });

      // Assert
      expect(mockBranchRepo.getTagIndex).not.toHaveBeenCalled(); // fullRebuild=true なので呼ばれない
      expect(mockBranchRepo.saveTagIndex).toHaveBeenCalledTimes(1); // 保存はされる
    });

     it('should throw error if branch does not exist', async () => {
      // Arrange
      (mockBranchRepo.exists as Mock).mockResolvedValue(false); // as Mock 追加

      // Act & Assert
      // エラーメッセージが期待通りか直接チェックする
      await expect(useCase.execute({ branchName })).rejects.toThrow(
          `Branch "${branchName}" not found`
      );
      expect(mockBranchRepo.saveTagIndex).not.toHaveBeenCalled();
    });
  });

  describe('Global Scope', () => {
     it('should build and save global tag index correctly', async () => {
      // Arrange
      const mockGlobalPath = DocumentPath.create('global/doc-g.json');
      const mockGlobalDoc = MemoryDocument.create({ path: mockGlobalPath, content: '{}', tags: [Tag.create('globala')], lastModified: new Date() }); // globalA -> globala
      (mockGlobalRepo.getTagIndex as Mock).mockResolvedValue(null); // as Mock 追加
      (mockGlobalRepo.listDocuments as Mock).mockResolvedValue([mockGlobalPath]); // as Mock 追加
      (mockGlobalRepo.getDocument as Mock).mockResolvedValue(mockGlobalDoc); // as Mock 追加

      // Act
      const result = await useCase.execute({}); // グローバルスコープ

      // Assert
      expect(mockGlobalRepo.getTagIndex).toHaveBeenCalled();
      expect(mockGlobalRepo.listDocuments).toHaveBeenCalled();
      expect(mockGlobalRepo.getDocument).toHaveBeenCalledWith(mockGlobalPath);
      expect(mockGlobalRepo.saveTagIndex).toHaveBeenCalledTimes(1);

       // Verify the saved index content
      const savedIndex: GlobalTagIndex = (mockGlobalRepo.saveTagIndex as Mock).mock.calls[0][0]; // as Mock 追加
      expect(savedIndex.schema).toBe('tag_index_v1');
      expect(savedIndex.metadata.indexType).toBe('global');
      expect(savedIndex.metadata.documentCount).toBe(1);
      expect(savedIndex.metadata.tagCount).toBe(1);
      expect(savedIndex.index).toEqual(expect.arrayContaining([
        expect.objectContaining({ tag: 'globala', documents: expect.arrayContaining([expect.objectContaining({ path: mockGlobalPath.value })]) }),
      ]));

       // Verify the output
      expect(result.tags).toEqual(['globala']);
      expect(result.documentCount).toBe(1);
      expect(result.updateInfo.updateLocation).toBe('global');
      expect(result.updateInfo.fullRebuild).toBe(false);
    });
  });

  // TODO: Add tests for existing index (if diff logic is implemented, currently seems full build)
  // TODO: Add tests using mockTagIndexRepo
  // TODO: Add tests for repository errors
});
