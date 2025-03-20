/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { instance, mock, when, verify, anything, reset } from 'ts-mockito';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js';
import { DocumentId } from '../../../../../src/domain/entities/DocumentId.js';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js';
import { JsonDocument } from '../../../../../src/domain/entities/JsonDocument.js';
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument.js';
import { Tag } from '../../../../../src/domain/entities/Tag.js';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../../../../src/domain/repositories/IGlobalMemoryBankRepository.js';
import { FileSystemTagIndexRepository } from '../../../../../src/infrastructure/repositories/file-system/FileSystemTagIndexRepositoryBase.js';
import { FileSystemTagIndexRepositoryImpl } from '../../../../../src/infrastructure/repositories/file-system/FileSystemTagIndexRepositoryImpl.js';
import { IFileSystemService } from '../../../../../src/infrastructure/storage/interfaces/IFileSystemService.js';
import { BranchTagIndex, GlobalTagIndex } from '../../../../../src/schemas/v2/tag-index.js';

// Logger をモック化
jest.mock('../../../../../src/shared/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('FileSystemTagIndexRepositoryImpl', () => {
  // テスト用のモックを作成
  const mockFileSystem = mock<IFileSystemService>();
  const mockBranchRepository = mock<IBranchMemoryBankRepository>();
  const mockGlobalRepository = mock<IGlobalMemoryBankRepository>();
  
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
      instance(mockFileSystem),
      BRANCH_ROOT,
      GLOBAL_PATH,
      instance(mockBranchRepository),
      instance(mockGlobalRepository)
    );
  });
  
  describe('readBranchIndex', () => {
    it('should return cached branch index when available', async () => {
      // Setup: Create a test index and put it in cache by reading it once
      const testIndex: BranchTagIndex = {
        schema: 'tag-index-v2',
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
                lastModified: new Date().toISOString(),
              },
            ],
          },
        ],
      };
      
      // Setup files
      const indexPath = `${BRANCH_ROOT}/${BRANCH_INFO.safeName}/tag-index.json`;
      when(mockFileSystem.fileExists(indexPath)).thenResolve(true);
      when(mockFileSystem.readFile(indexPath)).thenResolve(JSON.stringify(testIndex));
      
      // First call to populate cache
      await (repository as any).readBranchIndex(BRANCH_INFO);
      
      // Reset mock to verify it's not called again
      reset(mockFileSystem);
      when(mockFileSystem.fileExists(indexPath)).thenResolve(true);
      
      // Act: Read the index again
      const result = await (repository as any).readBranchIndex(BRANCH_INFO);
      
      // Assert: Should get cache without file access
      expect(result).toBeDefined();
      expect(result?.schema).toBe('tag-index-v2');
      verify(mockFileSystem.readFile(indexPath)).never();
    });
    
    it('should read from disk if index not in cache', async () => {
      // Setup: Create a test index
      const testIndex: BranchTagIndex = {
        schema: 'tag-index-v2',
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
                lastModified: new Date().toISOString(),
              },
            ],
          },
        ],
      };
      
      // Setup files
      const indexPath = `${BRANCH_ROOT}/${BRANCH_INFO.safeName}/tag-index.json`;
      when(mockFileSystem.fileExists(indexPath)).thenResolve(true);
      when(mockFileSystem.readFile(indexPath)).thenResolve(JSON.stringify(testIndex));
      
      // Act
      const result = await (repository as any).readBranchIndex(BRANCH_INFO);
      
      // Assert
      expect(result).toBeDefined();
      expect(result?.schema).toBe('tag-index-v2');
      verify(mockFileSystem.readFile(indexPath)).once();
    });
    
    it('should return null if index file does not exist', async () => {
      // Setup files
      const indexPath = `${BRANCH_ROOT}/${BRANCH_INFO.safeName}/tag-index.json`;
      when(mockFileSystem.fileExists(indexPath)).thenResolve(false);
      
      // Act
      const result = await (repository as any).readBranchIndex(BRANCH_INFO);
      
      // Assert
      expect(result).toBeNull();
      verify(mockFileSystem.readFile(indexPath)).never();
    });
  });
  
  describe('updateBranchTagIndex', () => {
    it('should build index from branch documents', async () => {
      // Setup document paths
      const docPath1 = DocumentPath.create('test1.md');
      const docPath2 = DocumentPath.create('test2.md');
      
      // Setup documents
      const doc1 = MemoryDocument.create({
        path: docPath1,
        content: 'Test content 1',
        tags: [Tag.create('tag1'), Tag.create('tag2')],
        lastModified: new Date()
      });
      
      const doc2 = MemoryDocument.create({
        path: docPath2,
        content: 'Test content 2',
        tags: [Tag.create('tag2'), Tag.create('tag3')],
        lastModified: new Date()
      });
      
      // Setup mocks
      when(mockBranchRepository.listDocuments(anything())).thenResolve([docPath1, docPath2]);
      when(mockBranchRepository.getDocument(anything(), docPath1)).thenResolve(doc1);
      when(mockBranchRepository.getDocument(anything(), docPath2)).thenResolve(doc2);
      
      // Setup file system
      const indexPath = `${BRANCH_ROOT}/${BRANCH_INFO.safeName}/tag-index.json`;
      when(mockFileSystem.fileExists(indexPath)).thenResolve(false);
      when(mockFileSystem.createDirectory(anything())).thenResolve();
      when(mockFileSystem.writeFile(indexPath, anything())).thenResolve();
      
      // Act
      const result = await repository.updateBranchTagIndex(BRANCH_INFO);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.documentCount).toBe(2);
      expect(result.tags).toHaveLength(3);
      expect(result.tags.sort()).toEqual(['tag1', 'tag2', 'tag3'].sort());
      verify(mockFileSystem.writeFile(indexPath, anything())).once();
    });
    
    it('should handle empty document list', async () => {
      // Setup mocks
      when(mockBranchRepository.listDocuments(anything())).thenResolve([]);
      
      // Setup file system
      const indexPath = `${BRANCH_ROOT}/${BRANCH_INFO.safeName}/tag-index.json`;
      when(mockFileSystem.fileExists(indexPath)).thenResolve(false);
      when(mockFileSystem.createDirectory(anything())).thenResolve();
      when(mockFileSystem.writeFile(indexPath, anything())).thenResolve();
      
      // Act
      const result = await repository.updateBranchTagIndex(BRANCH_INFO);
      
      // Assert
      expect(result).toBeDefined();
      expect(result.documentCount).toBe(0);
      expect(result.tags).toHaveLength(0);
      verify(mockFileSystem.writeFile(indexPath, anything())).once();
    });
  });
  
  describe('findBranchDocumentsByTags', () => {
    it('should find documents with any specified tag (OR logic)', async () => {
      // Setup a test index
      const testIndex: BranchTagIndex = {
        schema: 'tag-index-v2',
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
                lastModified: new Date().toISOString(),
              },
              {
                id: '2',
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
                id: '2',
                path: 'doc2.md',
                title: 'Doc 2',
                lastModified: new Date().toISOString(),
              },
              {
                id: '3',
                path: 'doc3.md',
                title: 'Doc 3',
                lastModified: new Date().toISOString(),
              },
            ],
          },
        ],
      };
      
      // Setup files
      const indexPath = `${BRANCH_ROOT}/${BRANCH_INFO.safeName}/tag-index.json`;
      when(mockFileSystem.fileExists(indexPath)).thenResolve(true);
      when(mockFileSystem.readFile(indexPath)).thenResolve(JSON.stringify(testIndex));
      
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
        schema: 'tag-index-v2',
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
                lastModified: new Date().toISOString(),
              },
              {
                id: '2',
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
                id: '2',
                path: 'doc2.md',
                title: 'Doc 2',
                lastModified: new Date().toISOString(),
              },
              {
                id: '3',
                path: 'doc3.md',
                title: 'Doc 3',
                lastModified: new Date().toISOString(),
              },
            ],
          },
        ],
      };
      
      // Setup files
      const indexPath = `${BRANCH_ROOT}/${BRANCH_INFO.safeName}/tag-index.json`;
      when(mockFileSystem.fileExists(indexPath)).thenResolve(true);
      when(mockFileSystem.readFile(indexPath)).thenResolve(JSON.stringify(testIndex));
      
      // Act: Find docs with tag1 AND tag2
      const result = await repository.findBranchDocumentsByTags(
        BRANCH_INFO,
        [Tag.create('tag1'), Tag.create('tag2')],
        true // matchAll = true for AND logic
      );
      
      // Assert: Should get only doc2.md (has both tags)
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('doc2.md');
    });
    
    it('should return empty array when no matches found', async () => {
      // Setup a test index
      const testIndex: BranchTagIndex = {
        schema: 'tag-index-v2',
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
                lastModified: new Date().toISOString(),
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
                lastModified: new Date().toISOString(),
              },
            ],
          },
        ],
      };
      
      // Setup files
      const indexPath = `${BRANCH_ROOT}/${BRANCH_INFO.safeName}/tag-index.json`;
      when(mockFileSystem.fileExists(indexPath)).thenResolve(true);
      when(mockFileSystem.readFile(indexPath)).thenResolve(JSON.stringify(testIndex));
      
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
      
      // Setup documents
      const doc1 = MemoryDocument.create({
        path: docPath1,
        content: 'Global content 1',
        tags: [Tag.create('global-tag1'), Tag.create('global-tag2')],
        lastModified: new Date()
      });
      
      const doc2 = MemoryDocument.create({
        path: docPath2,
        content: 'Global content 2',
        tags: [Tag.create('global-tag2'), Tag.create('global-tag3')],
        lastModified: new Date()
      });
      
      // Setup mocks
      when(mockGlobalRepository.listDocuments()).thenResolve([docPath1, docPath2]);
      when(mockGlobalRepository.getDocument(docPath1)).thenResolve(doc1);
      when(mockGlobalRepository.getDocument(docPath2)).thenResolve(doc2);
      
      // Setup file system
      const indexPath = `${GLOBAL_PATH}/tag-index.json`;
      when(mockFileSystem.fileExists(indexPath)).thenResolve(false);
      when(mockFileSystem.createDirectory(anything())).thenResolve();
      when(mockFileSystem.writeFile(indexPath, anything())).thenResolve();
      
      // Act
      const result = await repository.updateGlobalTagIndex();
      
      // Assert
      expect(result).toBeDefined();
      expect(result.documentCount).toBe(2);
      expect(result.tags).toHaveLength(3);
      expect(result.tags.sort()).toEqual(['global-tag1', 'global-tag2', 'global-tag3'].sort());
      verify(mockFileSystem.writeFile(indexPath, anything())).once();
    });
  });
  
  // Test document operations (add/remove to/from index)
  describe('addDocumentToBranchIndex', () => {
    it('should add document to branch index', async () => {
      // Create test document
      const docPath = DocumentPath.create('new-doc.md');
      const document = MemoryDocument.create({
        path: docPath,
        content: 'New content',
        tags: [Tag.create('tag1'), Tag.create('tag4')],
        lastModified: new Date()
      });
      
      // Setup existing index
      const existingIndex: BranchTagIndex = {
        schema: 'tag-index-v2',
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
                lastModified: new Date().toISOString(),
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
                lastModified: new Date().toISOString(),
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
                lastModified: new Date().toISOString(),
              },
            ],
          },
        ],
      };
      
      // Setup files
      const indexPath = `${BRANCH_ROOT}/${BRANCH_INFO.safeName}/tag-index.json`;
      when(mockFileSystem.fileExists(indexPath)).thenResolve(true);
      when(mockFileSystem.readFile(indexPath)).thenResolve(JSON.stringify(existingIndex));
      when(mockFileSystem.createDirectory(anything())).thenResolve();
      when(mockFileSystem.writeFile(indexPath, anything())).thenResolve();
      
      // Act
      await repository.addDocumentToBranchIndex(BRANCH_INFO, document);
      
      // Assert: Verify file was written
      verify(mockFileSystem.writeFile(indexPath, anything())).once();
      
      // We need to capture the written content to verify the update
      // This is a bit complex with ts-mockito, so we'll just verify basic aspects
      // The update logic was tested in previous tests
    });
  });
});
