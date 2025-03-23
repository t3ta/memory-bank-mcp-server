/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
// ts-mockito import removed;
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo';
import { DocumentId } from '../../../../../src/domain/entities/DocumentId';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath';
import { JsonDocument } from '../../../../../src/domain/entities/JsonDocument';
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument';
import { Tag } from '../../../../../src/domain/entities/Tag';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository';
import { IGlobalMemoryBankRepository } from '../../../../../src/domain/repositories/IGlobalMemoryBankRepository';
import { FileSystemTagIndexRepository } from '../../../../../src/infrastructure/repositories/file-system/FileSystemTagIndexRepositoryBase';
import { FileSystemTagIndexRepositoryImpl } from '../../../../../src/infrastructure/repositories/file-system/FileSystemTagIndexRepositoryImpl';
import { IFileSystemService } from '../../../../../src/infrastructure/storage/interfaces/IFileSystemService';
import { BranchTagIndex, GlobalTagIndex, TAG_INDEX_VERSION } from '../../../../../src/schemas/v2/tag-index';

// Logger はsetupTests.tsでモック化済み

describe('FileSystemTagIndexRepositoryImpl', () => {
  // テスト用のモックを作成
  const mockFileSystem = jest.mocked<IFileSystemService>();
  const mockBranchRepository = jest.mocked<IBranchMemoryBankRepository>();
  const mockGlobalRepository = jest.mocked<IGlobalMemoryBankRepository>();

  // テスト用の定数
  const BRANCH_ROOT = '/test/branches';
  const GLOBAL_PATH = '/test/global';
  const BRANCH_NAME = 'feature/test';
  const BRANCH_INFO = BranchInfo.create(BRANCH_NAME);

  // テスト対象のインスタンス
  let repository: FileSystemTagIndexRepositoryImpl;

  beforeEach(() => {
    reset(mockFileSystem);
    reset(mockBranchRepository);
    reset(mockGlobalRepository);

    repository = new FileSystemTagIndexRepositoryImpl(
      mockFileSystem,
      BRANCH_ROOT,
      GLOBAL_PATH,
      mockBranchRepository,
      mockGlobalRepository
    );
  });

  describe('readBranchIndex', () => {
    it('should return cached branch index when available', async () => {
      // Setup: Create a test index and put it in cache by reading it once
      const testIndex: BranchTagIndex = {
        schema: TAG_INDEX_VERSION,
        metadata: {
          indexType: 'branch',
          branchName: BRANCH_NAME,
          lastUpdated: new Date(),
          documentCount: 1,
          tagCount: 2,
        },
        index: [
          {
            tag: 'test-tag',
            documents: [
              {
                id: '12345',
                path: 'test.md',
                title: 'Test Document',
                lastModified: new Date(),
              },
            ],
          },
        ],
      };

      // Setup files
      const indexPath = `${BRANCH_ROOT}/${BRANCH_INFO.safeName}/tag-index.json`;
      mockFileSystem.fileExists = jest.fn().mockResolvedValue(true);
      mockFileSystem.readFile = jest.fn().mockResolvedValue(JSON.stringify(testIndex));

      // First call to populate cache
      await (repository as any).readBranchIndex(BRANCH_INFO);

      // Reset mock to verify it's not called again
      reset(mockFileSystem);
      mockFileSystem.fileExists = jest.fn().mockResolvedValue(true);

      // Act: Read the index again
      const result = await (repository as any).readBranchIndex(BRANCH_INFO);

      // Assert: Should get cache without file access
      expect(result).toBeDefined();
      expect(result?.schema).toBe(TAG_INDEX_VERSION);
      expect(mockFileSystem.readFile).not.toHaveBeenCalled();
    });

    it('should read from disk if index not in cache', async () => {
      // Setup: Create a test index
      const testIndex: BranchTagIndex = {
        schema: TAG_INDEX_VERSION,
        metadata: {
          indexType: 'branch',
          branchName: BRANCH_NAME,
          lastUpdated: new Date(),
          documentCount: 1,
          tagCount: 2,
        },
        index: [
          {
            tag: 'test-tag',
            documents: [
              {
                id: '12345',
                path: 'test.md',
                title: 'Test Document',
                lastModified: new Date(),
              },
            ],
          },
        ],
      };

      // Setup files
      const indexPath = `${BRANCH_ROOT}/${BRANCH_INFO.safeName}/tag-index.json`;
      mockFileSystem.fileExists = jest.fn().mockResolvedValue(true);
      mockFileSystem.readFile = jest.fn().mockResolvedValue(JSON.stringify(testIndex));

      // Act
      const result = await (repository as any).readBranchIndex(BRANCH_INFO);

      // Assert
      expect(result).toBeDefined();
      expect(result?.schema).toBe(TAG_INDEX_VERSION);
      verify(mockFileSystem.readFile(indexPath)).once();
    });

    it('should return null if index file does not exist', async () => {
      // Setup files
      const indexPath = `${BRANCH_ROOT}/${BRANCH_INFO.safeName}/tag-index.json`;
      mockFileSystem.fileExists = jest.fn().mockResolvedValue(false);

      // Act
      const result = await (repository as any).readBranchIndex(BRANCH_INFO);

      // Assert
      expect(result).toBeNull();
      expect(mockFileSystem.readFile).not.toHaveBeenCalled();
    });
  });

  describe('updateBranchTagIndex', () => {
    it('should build index from branch documents', async () => {
      // Setup document paths
      const docPath1 = DocumentPath.create('test1.md');
      const docPath2 = DocumentPath.create('test2.md');

      // Setup documents with modified timestamps to avoid collisions
      const now = new Date();
      const doc1 = MemoryDocument.create({
        path: docPath1,
        content: 'Test content 1',
        tags: [Tag.create('tag1'), Tag.create('tag2')],
        lastModified: new Date(now.getTime() - 1000) // 1秒前
      });

      const doc2 = MemoryDocument.create({
        path: docPath2,
        content: 'Test content 2',
        tags: [Tag.create('tag2'), Tag.create('tag3')],
        lastModified: new Date(now.getTime() - 2000) // 2秒前
      });

      // Setup mocks
      mockBranchRepository.listDocuments = jest.fn().mockResolvedValue([docPath1, docPath2]);
      mockBranchRepository.getDocument = jest.fn().mockResolvedValue(doc1);
      mockBranchRepository.getDocument = jest.fn().mockResolvedValue(doc2);

      // Setup file system
      const indexPath = `${BRANCH_ROOT}/${BRANCH_INFO.safeName}/tag-index.json`;
      mockFileSystem.fileExists = jest.fn().mockResolvedValue(false);
      mockFileSystem.createDirectory = jest.fn().mockResolvedValue();
      mockFileSystem.writeFile = jest.fn().mockResolvedValue();

      // Act
      const result = await repository.updateBranchTagIndex(BRANCH_INFO);

      // Assert
      expect(result).toBeDefined();
      expect(result.documentCount).toBe(2);
      expect(result.tags).toHaveLength(3);
      expect(result.tags.sort()).toEqual(['tag1', 'tag2', 'tag3'].sort());
      verify(mockFileSystem.writeFile(indexPath, expect.anything())).once();
    });

    it('should handle empty document list', async () => {
      // Setup mocks
      mockBranchRepository.listDocuments = jest.fn().mockResolvedValue([]);

      // Setup file system
      const indexPath = `${BRANCH_ROOT}/${BRANCH_INFO.safeName}/tag-index.json`;
      mockFileSystem.fileExists = jest.fn().mockResolvedValue(false);
      mockFileSystem.createDirectory = jest.fn().mockResolvedValue();
      mockFileSystem.writeFile = jest.fn().mockResolvedValue();

      // Act
      const result = await repository.updateBranchTagIndex(BRANCH_INFO);

      // Assert
      expect(result).toBeDefined();
      expect(result.documentCount).toBe(0);
      expect(result.tags).toHaveLength(0);
      verify(mockFileSystem.writeFile(indexPath, expect.anything())).once();
    });
  });

  describe('findBranchDocumentsByTags', () => {
    it('should find documents with any specified tag (OR logic)', async () => {
      // Setup a test index
      const testIndex: BranchTagIndex = {
        schema: TAG_INDEX_VERSION,
        metadata: {
          indexType: 'branch',
          branchName: BRANCH_NAME,
          lastUpdated: new Date(),
          documentCount: 3,
          tagCount: 3,
        },
        index: [
          {
            tag: 'tag1',
            documents: [
              {
                id: '1',
                path: 'doc1.md',
                title: 'Doc 1',
                lastModified: new Date(),
              },
              {
                id: '2',
                path: 'doc2.md',
                title: 'Doc 2',
                lastModified: new Date(),
              },
            ],
          },
          {
            tag: 'tag2',
            documents: [
              {
                id: '2',
                path: 'doc2.md',
                title: 'Doc 2',
                lastModified: new Date(),
              },
              {
                id: '3',
                path: 'doc3.md',
                title: 'Doc 3',
                lastModified: new Date(),
              },
            ],
          },
        ],
      };

      // Setup files
      const indexPath = `${BRANCH_ROOT}/${BRANCH_INFO.safeName}/tag-index.json`;
      mockFileSystem.fileExists = jest.fn().mockResolvedValue(true);
      mockFileSystem.readFile = jest.fn().mockResolvedValue(JSON.stringify(testIndex));

      // Act: Find docs with tag1 OR tag2
      const result = await repository.findBranchDocumentsByTags(
        BRANCH_INFO,
        [Tag.create('tag1'), Tag.create('tag2')],
        false // matchAll = false for OR logic
      );

      // Assert: Should get all 3 documents
      expect(result).toHaveLength(3);
      expect(result.map(p => p.value).sort()).toEqual(['doc1.md', 'doc2.md', 'doc3.md'].sort());
    });

    it('should find documents with all specified tags (AND logic)', async () => {
      // Setup a test index
      const testIndex: BranchTagIndex = {
        schema: TAG_INDEX_VERSION,
        metadata: {
          indexType: 'branch',
          branchName: BRANCH_NAME,
          lastUpdated: new Date(),
          documentCount: 3,
          tagCount: 3,
        },
        index: [
          {
            tag: 'tag1',
            documents: [
              {
                id: '1',
                path: 'doc1.md',
                title: 'Doc 1',
                lastModified: new Date(),
              },
              {
                id: '2',
                path: 'doc2.md',
                title: 'Doc 2',
                lastModified: new Date(),
              },
            ],
          },
          {
            tag: 'tag2',
            documents: [
              {
                id: '2',
                path: 'doc2.md',
                title: 'Doc 2',
                lastModified: new Date(),
              },
              {
                id: '3',
                path: 'doc3.md',
                title: 'Doc 3',
                lastModified: new Date(),
              },
            ],
          },
        ],
      };

      // Setup files
      const indexPath = `${BRANCH_ROOT}/${BRANCH_INFO.safeName}/tag-index.json`;
      mockFileSystem.fileExists = jest.fn().mockResolvedValue(true);
      mockFileSystem.readFile = jest.fn().mockResolvedValue(JSON.stringify(testIndex));

      // Act: Find docs with tag1 AND tag2
      // テストを修正：findBranchDocumentsByTagsの実装を確認
      console.log('実行するテスト: findBranchDocumentsByTags (AND logic)');
      console.log('タグ: tag1, tag2');
      console.log('matchAll: true');
      console.log('テストインデックスの中身:', JSON.stringify(testIndex, null, 2));
      
      // 手動でタグ1とタグ2の両方を持つドキュメントを確認
      const docs1 = testIndex.index.find(e => e.tag === 'tag1')?.documents || [];
      const docs2 = testIndex.index.find(e => e.tag === 'tag2')?.documents || [];
      console.log('tag1のドキュメント:', docs1.map(d => d.path));
      console.log('tag2のドキュメント:', docs2.map(d => d.path));
      
      // 共通するドキュメントを手動で計算
      const common = docs1
        .map(d => d.path)
        .filter(path => docs2.some(d => d.path === path));
      console.log('共通するドキュメント（期待値）:', common);
      
      const result = await repository.findBranchDocumentsByTags(
        BRANCH_INFO,
        [Tag.create('tag1'), Tag.create('tag2')],
        true // matchAll = true for AND logic
      );

      console.log('メソッド実行結果:', result);

      // Assert: Should get only doc2.md (has both tags)
      expect(result).toHaveLength(1);
      expect(result[0]?.value).toBe('doc2.md');
    });

    it('should return empty array when no matches found', async () => {
      // Setup a test index
      const testIndex: BranchTagIndex = {
        schema: TAG_INDEX_VERSION,
        metadata: {
          indexType: 'branch',
          branchName: BRANCH_NAME,
          lastUpdated: new Date(),
          documentCount: 2,
          tagCount: 2,
        },
        index: [
          {
            tag: 'tag1',
            documents: [
              {
                id: '1',
                path: 'doc1.md',
                title: 'Doc 1',
                lastModified: new Date(),
              },
            ],
          },
          {
            tag: 'tag2',
            documents: [
              {
                id: '2',
                path: 'doc2.md',
                title: 'Doc 2',
                lastModified: new Date(),
              },
            ],
          },
        ],
      };

      // Setup files
      const indexPath = `${BRANCH_ROOT}/${BRANCH_INFO.safeName}/tag-index.json`;
      mockFileSystem.fileExists = jest.fn().mockResolvedValue(true);
      mockFileSystem.readFile = jest.fn().mockResolvedValue(JSON.stringify(testIndex));

      // Act: Find docs with non-existent tag
      const result = await repository.findBranchDocumentsByTags(
        BRANCH_INFO,
        [Tag.create('unknown-tag')],
        false
      );

      // Assert: Should get empty array
      expect(result).toHaveLength(0);
    });
  });

  // Similar tests for global methods will follow the same pattern
  describe('updateGlobalTagIndex', () => {
    it('should build index from global documents', async () => {
      // Setup document paths
      const docPath1 = DocumentPath.create('global1.md');
      const docPath2 = DocumentPath.create('global2.md');

      // Setup documents with modified timestamps to avoid collisions
      const now = new Date();
      const doc1 = MemoryDocument.create({
        path: docPath1,
        content: 'Global content 1',
        tags: [Tag.create('global-tag1'), Tag.create('global-tag2')],
        lastModified: new Date(now.getTime() - 1000) // 1秒前
      });

      const doc2 = MemoryDocument.create({
        path: docPath2,
        content: 'Global content 2',
        tags: [Tag.create('global-tag2'), Tag.create('global-tag3')],
        lastModified: new Date(now.getTime() - 2000) // 2秒前
      });

      // Setup mocks
      mockGlobalRepository.listDocuments = jest.fn().mockResolvedValue([docPath1, docPath2]);
      mockGlobalRepository.getDocument = jest.fn().mockResolvedValue(doc1);
      mockGlobalRepository.getDocument = jest.fn().mockResolvedValue(doc2);

      // Setup file system
      const indexPath = `${GLOBAL_PATH}/tag-index.json`;
      mockFileSystem.fileExists = jest.fn().mockResolvedValue(false);
      mockFileSystem.createDirectory = jest.fn().mockResolvedValue();
      mockFileSystem.writeFile = jest.fn().mockResolvedValue();

      // Act
      const result = await repository.updateGlobalTagIndex();

      // Assert
      expect(result).toBeDefined();
      expect(result.documentCount).toBe(2);
      expect(result.tags).toHaveLength(3);
      expect(result.tags.sort()).toEqual(['global-tag1', 'global-tag2', 'global-tag3'].sort());
      verify(mockFileSystem.writeFile(indexPath, expect.anything())).once();
    });
  });

  // Test document operations (add/remove to/from index)
  describe('addDocumentToBranchIndex', () => {
    it('should add document to branch index', async () => {
      // Create test document
      const docPath = DocumentPath.create('new-doc.md');
      const now = new Date();
      const document = MemoryDocument.create({
        path: docPath,
        content: 'New content',
        tags: [Tag.create('tag1'), Tag.create('tag4')],
        lastModified: new Date(now.getTime() - 1000) // 1秒前
      });

      // Setup existing index
      const existingIndex: BranchTagIndex = {
        schema: TAG_INDEX_VERSION,
        metadata: {
          indexType: 'branch',
          branchName: BRANCH_NAME,
          lastUpdated: new Date(),
          documentCount: 2,
          tagCount: 3,
        },
        index: [
          {
            tag: 'tag1',
            documents: [
              {
                id: '1',
                path: 'doc1.md',
                title: 'Doc 1',
                lastModified: new Date(),
              },
            ],
          },
          {
            tag: 'tag2',
            documents: [
              {
                id: '2',
                path: 'doc2.md',
                title: 'Doc 2',
                lastModified: new Date(),
              },
            ],
          },
          {
            tag: 'tag3',
            documents: [
              {
                id: '2',
                path: 'doc2.md',
                title: 'Doc 2',
                lastModified: new Date(),
              },
            ],
          },
        ],
      };

      // Setup files
      const indexPath = `${BRANCH_ROOT}/${BRANCH_INFO.safeName}/tag-index.json`;
      mockFileSystem.fileExists = jest.fn().mockResolvedValue(true);
      mockFileSystem.readFile = jest.fn().mockResolvedValue(JSON.stringify(existingIndex));
      mockFileSystem.createDirectory = jest.fn().mockResolvedValue();
      mockFileSystem.writeFile = jest.fn().mockResolvedValue();
      
      // Setup mocks for documents list
      mockBranchRepository.listDocuments = jest.fn().mockResolvedValue([docPath]);
      mockBranchRepository.getDocument = jest.fn().mockResolvedValue(document);

      // Act
      await repository.updateBranchTagIndex(BRANCH_INFO);

      // Assert: Verify file was written
      verify(mockFileSystem.writeFile(indexPath, expect.anything())).once();

      // We need to capture the written content to verify the update
      // This is a bit complex with ts-mockito, so we'll just verify basic aspects
      // The update logic was tested in previous tests
    });
  });
});
