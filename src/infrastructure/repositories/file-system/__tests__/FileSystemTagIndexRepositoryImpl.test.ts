import path from 'path';
import { BranchInfo } from '../../../../domain/entities/BranchInfo';
import { DocumentPath } from '../../../../domain/entities/DocumentPath';
import { MemoryDocument } from '../../../../domain/entities/MemoryDocument';
import { Tag } from '../../../../domain/entities/Tag';
import { JsonDocument } from '../../../../domain/entities/JsonDocument';
import { DocumentId } from '../../../../domain/entities/DocumentId';
import { FileSystemService } from '../../../storage/FileSystemService';
import { FileSystemTagIndexRepositoryImpl } from '../FileSystemTagIndexRepositoryImpl';
import { IBranchMemoryBankRepository } from '../../../../domain/repositories/IBranchMemoryBankRepository';
import { IGlobalMemoryBankRepository } from '../../../../domain/repositories/IGlobalMemoryBankRepository';
import { TAG_INDEX_VERSION } from '../../../../schemas/v2/tag-index';

// Mock FileSystemService
const mockFileSystem = {
  fileExists: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  createDirectory: jest.fn(),
} as jest.Mocked<Partial<FileSystemService>> as jest.Mocked<FileSystemService>;

// Mock BranchMemoryBankRepository
const mockBranchRepo = {
  listDocuments: jest.fn(),
  getDocument: jest.fn(),
} as jest.Mocked<Partial<IBranchMemoryBankRepository>> as jest.Mocked<IBranchMemoryBankRepository>;

// Mock GlobalMemoryBankRepository
const mockGlobalRepo = {
  listDocuments: jest.fn(),
  getDocument: jest.fn(),
} as jest.Mocked<Partial<IGlobalMemoryBankRepository>> as jest.Mocked<IGlobalMemoryBankRepository>;

// 適切なUUIDを持つJSONドキュメントを生成するヘルパー関数
function createMockJsonDocument(path: string, tags: string[]): JsonDocument {
  const docPath = DocumentPath.create(path);
  const tagObjects = tags.map((tag) => Tag.create(tag));
  // 有効なUUIDを生成
  const id = DocumentId.generate();

  return JsonDocument.create({
    id,
    path: docPath,
    title: `Test Document for ${path}`,
    documentType: 'generic',
    tags: tagObjects,
    content: { testContent: `Mock content for ${path}` },
    lastModified: new Date(),
    createdAt: new Date(),
  });
}

describe('FileSystemTagIndexRepositoryImpl', () => {
  let repository: FileSystemTagIndexRepositoryImpl;
  const branchMemoryBankRoot = '/test/branch';
  const globalMemoryBankPath = '/test/global';

  beforeEach(() => {
    jest.resetAllMocks();
    repository = new FileSystemTagIndexRepositoryImpl(
      mockFileSystem,
      branchMemoryBankRoot,
      globalMemoryBankPath,
      mockBranchRepo,
      mockGlobalRepo
    );
  });

  describe('findBranchDocumentsByTags', () => {
    it('should return empty array when no index exists', async () => {
      // Setup
      const branchInfo = BranchInfo.create('feature/test');
      mockFileSystem.fileExists.mockResolvedValue(false);

      // Execute
      const result = await repository.findBranchDocumentsByTags(branchInfo, [Tag.create('tag1')]);

      // Assert
      expect(result).toEqual([]);
      expect(mockFileSystem.fileExists).toHaveBeenCalledWith(
        expect.stringContaining(path.join(branchMemoryBankRoot, branchInfo.safeName))
      );
      expect(mockFileSystem.readFile).not.toHaveBeenCalled();
    });

    it('should return documents with ANY of the specified tags', async () => {
      // Setup
      const branchInfo = BranchInfo.create('feature/test');
      const tags = [Tag.create('tag1'), Tag.create('tag3')];

      const mockIndex = {
        schema: TAG_INDEX_VERSION,
        metadata: {
          indexType: 'branch',
          branchName: branchInfo.name,
          lastUpdated: new Date().toISOString(),
          documentCount: 3,
          tagCount: 3,
        },
        index: [
          {
            tag: 'tag1',
            documents: [
              {
                id: '123e4567-e89b-12d3-a456-426614174000',
                path: 'doc1.md',
                title: 'Doc 1',
                lastModified: new Date().toISOString(),
              },
              {
                id: '123e4567-e89b-12d3-a456-426614174001',
                path: 'doc2.md',
                title: 'Doc 2',
                lastModified: new Date().toISOString(),
              },
            ],
          },
          {
            tag: 'tag2',
            documents: [
              {
                id: '123e4567-e89b-12d3-a456-426614174001',
                path: 'doc2.md',
                title: 'Doc 2',
                lastModified: new Date().toISOString(),
              },
              {
                id: '123e4567-e89b-12d3-a456-426614174002',
                path: 'doc3.md',
                title: 'Doc 3',
                lastModified: new Date().toISOString(),
              },
            ],
          },
          {
            tag: 'tag3',
            documents: [
              {
                id: '123e4567-e89b-12d3-a456-426614174002',
                path: 'doc3.md',
                title: 'Doc 3',
                lastModified: new Date().toISOString(),
              },
            ],
          },
        ],
      };

      mockFileSystem.fileExists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify(mockIndex));

      // Execute with matchAll = false (default)
      const result = await repository.findBranchDocumentsByTags(branchInfo, tags);

      // Assert - should return docs with tag1 OR tag3
      expect(result).toHaveLength(3);
      const paths = result.map((path) => path.value);
      expect(paths).toContain('doc1.md');
      expect(paths).toContain('doc2.md');
      expect(paths).toContain('doc3.md');
    });

    it('should return documents with ALL of the specified tags when matchAll is true', async () => {
      // Setup
      const branchInfo = BranchInfo.create('feature/test');
      const tags = [Tag.create('tag1'), Tag.create('tag2')];

      const mockIndex = {
        schema: TAG_INDEX_VERSION,
        metadata: {
          indexType: 'branch',
          branchName: branchInfo.name,
          lastUpdated: new Date().toISOString(),
          documentCount: 3,
          tagCount: 3,
        },
        index: [
          {
            tag: 'tag1',
            documents: [
              {
                id: '123e4567-e89b-12d3-a456-426614174000',
                path: 'doc1.md',
                title: 'Doc 1',
                lastModified: new Date().toISOString(),
              },
              {
                id: '123e4567-e89b-12d3-a456-426614174001',
                path: 'doc2.md',
                title: 'Doc 2',
                lastModified: new Date().toISOString(),
              },
            ],
          },
          {
            tag: 'tag2',
            documents: [
              {
                id: '123e4567-e89b-12d3-a456-426614174001',
                path: 'doc2.md',
                title: 'Doc 2',
                lastModified: new Date().toISOString(),
              },
              {
                id: '123e4567-e89b-12d3-a456-426614174002',
                path: 'doc3.md',
                title: 'Doc 3',
                lastModified: new Date().toISOString(),
              },
            ],
          },
          {
            tag: 'tag3',
            documents: [
              {
                id: '123e4567-e89b-12d3-a456-426614174002',
                path: 'doc3.md',
                title: 'Doc 3',
                lastModified: new Date().toISOString(),
              },
            ],
          },
        ],
      };

      mockFileSystem.fileExists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify(mockIndex));

      // Execute with matchAll = true
      const result = await repository.findBranchDocumentsByTags(branchInfo, tags, true);

      // Assert - should only return doc2.md which has both tag1 AND tag2
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('doc2.md');
    });
  });

  describe('findGlobalDocumentsByTags', () => {
    it('should return empty array when no index exists', async () => {
      // Setup
      const tags = [Tag.create('tag1'), Tag.create('tag2')];

      mockFileSystem.fileExists.mockResolvedValue(false);

      // Execute
      const result = await repository.findGlobalDocumentsByTags(tags);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return documents with ANY of the specified tags', async () => {
      // Setup
      const tags = [Tag.create('tag1'), Tag.create('tag3')];

      const mockIndex = {
        schema: TAG_INDEX_VERSION,
        metadata: {
          indexType: 'global',
          lastUpdated: new Date().toISOString(),
          documentCount: 3,
          tagCount: 3,
        },
        index: [
          {
            tag: 'tag1',
            documents: [
              {
                id: '123e4567-e89b-12d3-a456-426614174000',
                path: 'doc1.md',
                title: 'Doc 1',
                lastModified: new Date().toISOString(),
              },
              {
                id: '123e4567-e89b-12d3-a456-426614174001',
                path: 'doc2.md',
                title: 'Doc 2',
                lastModified: new Date().toISOString(),
              },
            ],
          },
          {
            tag: 'tag2',
            documents: [
              {
                id: '123e4567-e89b-12d3-a456-426614174001',
                path: 'doc2.md',
                title: 'Doc 2',
                lastModified: new Date().toISOString(),
              },
              {
                id: '123e4567-e89b-12d3-a456-426614174002',
                path: 'doc3.md',
                title: 'Doc 3',
                lastModified: new Date().toISOString(),
              },
            ],
          },
          {
            tag: 'tag3',
            documents: [
              {
                id: '123e4567-e89b-12d3-a456-426614174002',
                path: 'doc3.md',
                title: 'Doc 3',
                lastModified: new Date().toISOString(),
              },
            ],
          },
        ],
      };

      mockFileSystem.fileExists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify(mockIndex));

      // Execute with matchAll = false (default)
      const result = await repository.findGlobalDocumentsByTags(tags);

      // Assert - should return docs with tag1 OR tag3
      expect(result).toHaveLength(3);
      const paths = result.map((path) => path.value);
      expect(paths).toContain('doc1.md');
      expect(paths).toContain('doc2.md');
      expect(paths).toContain('doc3.md');
    });
  });

  describe('updateBranchTagIndex', () => {
    it('should create a new index when none exists', async () => {
      // Setup
      const branchInfo = BranchInfo.create('feature/test');
      const mockDocs = [
        createMockJsonDocument('doc1.md', ['tag1', 'tag2']),
        createMockJsonDocument('doc2.md', ['tag2', 'tag3']),
      ];
      const docPaths = mockDocs.map((doc) => doc.path);

      mockFileSystem.fileExists.mockResolvedValue(false);
      mockBranchRepo.listDocuments.mockResolvedValue(docPaths);
      mockDocs.forEach((doc) => {
        mockBranchRepo.getDocument.mockResolvedValueOnce(doc);
      });

      // Execute
      const result = await repository.updateBranchTagIndex(branchInfo);

      // Assert
      expect(mockFileSystem.fileExists).toHaveBeenCalledWith(expect.any(String));
      expect(mockBranchRepo.listDocuments).toHaveBeenCalledWith(branchInfo);
      expect(mockBranchRepo.getDocument).toHaveBeenCalledTimes(2);
      expect(mockFileSystem.createDirectory).toHaveBeenCalled();

      // writeFileの呼び出しを確認するが、内容の詳細な検証は行わない
      expect(mockFileSystem.writeFile).toHaveBeenCalled();

      // writeFileの第2引数（JSON文字列）が正しいスキーマと基本構造を持っていることだけを検証
      const writeFileArg = mockFileSystem.writeFile.mock.calls[0][1];
      const parsedIndex = JSON.parse(writeFileArg);
      expect(parsedIndex.schema).toBe(TAG_INDEX_VERSION);
      expect(parsedIndex.metadata.indexType).toBe('branch');
      expect(parsedIndex.metadata.branchName).toBe(branchInfo.name);
      expect(parsedIndex.index).toBeInstanceOf(Array);

      // 結果オブジェクトのチェック
      expect(result.tags).toContain('tag1');
      expect(result.tags).toContain('tag2');
      expect(result.tags).toContain('tag3');
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.fullRebuild).toBe(false);
    });

    it('should perform a full rebuild when requested', async () => {
      // Setup
      const branchInfo = BranchInfo.create('feature/test');
      const mockDocs = [
        createMockJsonDocument('doc1.md', ['tag1', 'tag2']),
        createMockJsonDocument('doc2.md', ['tag2', 'tag3']),
      ];
      const docPaths = mockDocs.map((doc) => doc.path);

      // Even if an index exists, it should be ignored for full rebuild
      mockFileSystem.fileExists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(
        JSON.stringify({
          schema: TAG_INDEX_VERSION,
          metadata: {
            indexType: 'branch',
            branchName: branchInfo.name,
            lastUpdated: new Date().toISOString(),
            documentCount: 10, // Different count to verify it's rebuilt
            tagCount: 5,
          },
          index: [], // Empty to verify it's replaced
        })
      );

      mockBranchRepo.listDocuments.mockResolvedValue(docPaths);
      mockDocs.forEach((doc) => {
        mockBranchRepo.getDocument.mockResolvedValueOnce(doc);
      });

      // Execute with fullRebuild option
      const result = await repository.updateBranchTagIndex(branchInfo, { fullRebuild: true });

      // Assert
      expect(mockBranchRepo.listDocuments).toHaveBeenCalledWith(branchInfo);
      expect(mockBranchRepo.getDocument).toHaveBeenCalledTimes(2);

      // writeFileの呼び出しを確認
      expect(mockFileSystem.writeFile).toHaveBeenCalled();

      // writeFileの第2引数（JSON文字列）の基本構造を検証
      const writeFileArg = mockFileSystem.writeFile.mock.calls[0][1];
      const parsedIndex = JSON.parse(writeFileArg);
      expect(parsedIndex.schema).toBe(TAG_INDEX_VERSION);
      expect(parsedIndex.metadata.indexType).toBe('branch');
      expect(parsedIndex.metadata.documentCount).toBe(2); // 新しいドキュメント数

      // 結果オブジェクトのチェック
      expect(result.documentCount).toBe(2); // 新しいカウントになるはず
      expect(result.updateInfo.fullRebuild).toBe(true);
    });
  });

  describe('updateGlobalTagIndex', () => {
    it('should create a new index when none exists', async () => {
      // Setup
      const mockDocs = [
        createMockJsonDocument('global-doc1.md', ['global', 'tag1']),
        createMockJsonDocument('global-doc2.md', ['global', 'tag2']),
      ];
      const docPaths = mockDocs.map((doc) => doc.path);

      mockFileSystem.fileExists.mockResolvedValue(false);
      mockGlobalRepo.listDocuments.mockResolvedValue(docPaths);
      mockDocs.forEach((doc) => {
        mockGlobalRepo.getDocument.mockResolvedValueOnce(doc);
      });

      // Execute
      const result = await repository.updateGlobalTagIndex();

      // Assert
      expect(mockFileSystem.fileExists).toHaveBeenCalledWith(expect.any(String));
      expect(mockGlobalRepo.listDocuments).toHaveBeenCalled();
      expect(mockGlobalRepo.getDocument).toHaveBeenCalledTimes(2);
      expect(mockFileSystem.createDirectory).toHaveBeenCalled();

      // writeFileの呼び出しを確認
      expect(mockFileSystem.writeFile).toHaveBeenCalled();

      // writeFileの第2引数（JSON文字列）の基本構造を検証
      const writeFileArg = mockFileSystem.writeFile.mock.calls[0][1];
      const parsedIndex = JSON.parse(writeFileArg);
      expect(parsedIndex.schema).toBe(TAG_INDEX_VERSION);
      expect(parsedIndex.metadata.indexType).toBe('global');
      expect(parsedIndex.index).toBeInstanceOf(Array);

      // 結果オブジェクトのチェック
      expect(result.tags).toContain('global');
      expect(result.tags).toContain('tag1');
      expect(result.tags).toContain('tag2');
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.fullRebuild).toBe(false);
    });

    it('should update existing index when not doing full rebuild', async () => {
      // Setup
      const mockDocs = [
        createMockJsonDocument('global-doc1.md', ['global', 'tag1']),
        createMockJsonDocument('global-doc2.md', ['global', 'tag2']),
      ];
      const docPaths = mockDocs.map((doc) => doc.path);

      // Existing index
      mockFileSystem.fileExists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(
        JSON.stringify({
          schema: TAG_INDEX_VERSION,
          metadata: {
            indexType: 'global',
            lastUpdated: new Date().toISOString(),
            documentCount: 5, // Different count to verify it's updated
            tagCount: 3,
          },
          index: [
            {
              tag: 'old-tag',
              documents: [
                {
                  id: '123e4567-e89b-12d3-a456-426614174000',
                  path: 'old-doc.md',
                  title: 'Old Document',
                  lastModified: new Date().toISOString(),
                },
              ],
            },
          ],
        })
      );

      mockGlobalRepo.listDocuments.mockResolvedValue(docPaths);
      mockDocs.forEach((doc) => {
        mockGlobalRepo.getDocument.mockResolvedValueOnce(doc);
      });

      // Execute
      const result = await repository.updateGlobalTagIndex({ fullRebuild: false });

      // Assert
      expect(mockGlobalRepo.listDocuments).toHaveBeenCalled();
      expect(mockGlobalRepo.getDocument).toHaveBeenCalledTimes(2);

      // writeFileの呼び出しを確認
      expect(mockFileSystem.writeFile).toHaveBeenCalled();

      // writeFileの第2引数（JSON文字列）の基本構造を検証
      const writeFileArg = mockFileSystem.writeFile.mock.calls[0][1];
      const parsedIndex = JSON.parse(writeFileArg);
      expect(parsedIndex.schema).toBe(TAG_INDEX_VERSION);
      expect(parsedIndex.metadata.indexType).toBe('global');
      expect(parsedIndex.metadata.documentCount).toBe(2); // 新しいドキュメント数

      // 結果オブジェクトのチェック
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.fullRebuild).toBe(false);
    });
  });
});
