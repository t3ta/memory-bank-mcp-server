import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { UpdateTagIndexUseCaseV2 } from '../UpdateTagIndexUseCaseV2.js';
import { IBranchMemoryBankRepository } from '../../../../domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../../../domain/repositories/IGlobalMemoryBankRepository.js';
import { BranchInfo } from '../../../../domain/entities/BranchInfo.js';
import { MemoryDocument } from '../../../../domain/entities/MemoryDocument.js';
import { DocumentPath } from '../../../../domain/entities/DocumentPath.js';
import { Tag } from '../../../../domain/entities/Tag.js';
import { TagIndex } from '../../../../schemas/tag-index/tag-index-schema.js';
import { DomainError } from '../../../../shared/errors/DomainError.js';

// Mock implementations
const mockBranchRepo = jest.mocked<IBranchMemoryBankRepository>({
  exists: jest.fn(),
  initialize: jest.fn(),
  getDocument: jest.fn(),
  saveDocument: jest.fn(),
  deleteDocument: jest.fn(),
  listDocuments: jest.fn(),
  findDocumentsByTags: jest.fn(),
  getRecentBranches: jest.fn(),
  validateStructure: jest.fn(),
  saveTagIndex: jest.fn(),
  getTagIndex: jest.fn(),
  findDocumentPathsByTagsUsingIndex: jest.fn(),
});

const mockGlobalRepo = jest.mocked<IGlobalMemoryBankRepository>({
  initialize: jest.fn(),
  getDocument: jest.fn(),
  saveDocument: jest.fn(),
  deleteDocument: jest.fn(),
  listDocuments: jest.fn(),
  findDocumentsByTags: jest.fn(),
  updateTagsIndex: jest.fn(),
  validateStructure: jest.fn(),
  saveTagIndex: jest.fn(),
  getTagIndex: jest.fn(),
  findDocumentPathsByTagsUsingIndex: jest.fn(),
});

// Create test documents
const createTestDocument = (
  path: string,
  tags: string[],
  content: string = `# Test Document\n\ntags: ${tags.map((t) => `#${t}`).join(' ')}\n\nContent`
): MemoryDocument => {
  return MemoryDocument.create({
    path: DocumentPath.create(path),
    content,
    tags: tags.map((t) => Tag.create(t)),
    lastModified: new Date(),
  });
};

describe('UpdateTagIndexUseCaseV2', () => {
  let useCase: UpdateTagIndexUseCaseV2;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new UpdateTagIndexUseCaseV2(mockGlobalRepo, mockBranchRepo);
  });

  describe('Global tag index updates', () => {
    test('should create and save a global tag index', async () => {
      // Setup documents with tags
      const doc1 = createTestDocument('doc1.md', ['tag1', 'tag2']);
      const doc2 = createTestDocument('doc2.md', ['tag2', 'tag3']);
      const doc3 = createTestDocument('doc3.md', ['tag1', 'tag3']);

      // Setup repository mocks
      mockGlobalRepo.listDocuments.mockResolvedValue([
        doc1.path,
        doc2.path,
        doc3.path,
      ]);
      mockGlobalRepo.getDocument.mockImplementation(async (path) => {
        if (path.value === 'doc1.md') return doc1;
        if (path.value === 'doc2.md') return doc2;
        if (path.value === 'doc3.md') return doc3;
        return null;
      });
      mockGlobalRepo.getTagIndex.mockResolvedValue(null);

      // Call the use case
      const result = await useCase.execute({ fullRebuild: true });

      // Check result
      expect(result.tags).toContain('tag1');
      expect(result.tags).toContain('tag2');
      expect(result.tags).toContain('tag3');
      expect(result.documentCount).toBe(3);
      expect(result.updateInfo.fullRebuild).toBe(true);
      expect(result.updateInfo.updateLocation).toBe('global');

      // Verify that saveTagIndex was called with correct data
      expect(mockGlobalRepo.saveTagIndex).toHaveBeenCalledTimes(1);
      const tagIndex = mockGlobalRepo.saveTagIndex.mock.calls[0][0];
      expect(tagIndex.schema).toBe('tag_index_v1');
      expect(tagIndex.metadata.context).toBe('global');
      expect(tagIndex.metadata.documentCount).toBe(3);
      
      // Check that index has correct mappings
      expect(tagIndex.index['tag1']).toContain('doc1.md');
      expect(tagIndex.index['tag1']).toContain('doc3.md');
      expect(tagIndex.index['tag1']).not.toContain('doc2.md');
      
      expect(tagIndex.index['tag2']).toContain('doc1.md');
      expect(tagIndex.index['tag2']).toContain('doc2.md');
      expect(tagIndex.index['tag2']).not.toContain('doc3.md');
      
      expect(tagIndex.index['tag3']).toContain('doc2.md');
      expect(tagIndex.index['tag3']).toContain('doc3.md');
      expect(tagIndex.index['tag3']).not.toContain('doc1.md');
    });

    test('should update existing global tag index when not doing full rebuild', async () => {
      // Setup existing tag index
      const existingTagIndex: TagIndex = {
        schema: 'tag_index_v1',
        metadata: {
          updatedAt: '2023-01-01T00:00:00.000Z',
          documentCount: 2,
          fullRebuild: true,
          context: 'global',
        },
        index: {
          tag1: ['doc1.md', 'old-doc.md'],
          tag2: ['doc1.md'],
        },
      };

      // Setup documents with tags (doc1 updated, old-doc removed, doc2 added)
      const doc1 = createTestDocument('doc1.md', ['tag1', 'tag3']); // tag2 removed, tag3 added
      const doc2 = createTestDocument('doc2.md', ['tag2', 'tag3']); // new document

      // Setup repository mocks
      mockGlobalRepo.listDocuments.mockResolvedValue([doc1.path, doc2.path]);
      mockGlobalRepo.getDocument.mockImplementation(async (path) => {
        if (path.value === 'doc1.md') return doc1;
        if (path.value === 'doc2.md') return doc2;
        return null;
      });
      mockGlobalRepo.getTagIndex.mockResolvedValue(existingTagIndex);

      // Call the use case (not full rebuild)
      const result = await useCase.execute({ fullRebuild: false });

      // Check result
      expect(result.tags).toContain('tag1');
      expect(result.tags).toContain('tag2');
      expect(result.tags).toContain('tag3');
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.fullRebuild).toBe(false);

      // Verify saveTagIndex was called
      expect(mockGlobalRepo.saveTagIndex).toHaveBeenCalledTimes(1);
      const tagIndex = mockGlobalRepo.saveTagIndex.mock.calls[0][0];
      
      // Check that the index has been correctly updated
      expect(tagIndex.index['tag1']).toContain('doc1.md');
      expect(tagIndex.index['tag1']).not.toContain('doc2.md');
      
      expect(tagIndex.index['tag2']).toContain('doc2.md');
      
      expect(tagIndex.index['tag3']).toContain('doc1.md');
      expect(tagIndex.index['tag3']).toContain('doc2.md');
    });
  });

  describe('Branch tag index updates', () => {
    test('should throw error if branch does not exist', async () => {
      mockBranchRepo.exists.mockResolvedValue(false);

      await expect(useCase.execute({ branchName: 'feature/nonexistent' })).rejects.toThrow(DomainError);
    });

    test('should create and save a branch tag index', async () => {
      // Setup branch
      const branchName = 'feature/test';
      const branchInfo = BranchInfo.create(branchName);

      // Setup documents with tags
      const doc1 = createTestDocument('doc1.md', ['tag1', 'tag2']);
      const doc2 = createTestDocument('doc2.md', ['tag2', 'tag3']);

      // Setup repository mocks
      mockBranchRepo.exists.mockResolvedValue(true);
      mockBranchRepo.listDocuments.mockResolvedValue([doc1.path, doc2.path]);
      mockBranchRepo.getDocument.mockImplementation(async (branch, path) => {
        if (path.value === 'doc1.md') return doc1;
        if (path.value === 'doc2.md') return doc2;
        return null;
      });
      mockBranchRepo.getTagIndex.mockResolvedValue(null);

      // Call the use case
      const result = await useCase.execute({ branchName, fullRebuild: true });

      // Check result
      expect(result.tags).toContain('tag1');
      expect(result.tags).toContain('tag2');
      expect(result.tags).toContain('tag3');
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.updateLocation).toBe(branchName);

      // Verify saveTagIndex was called
      expect(mockBranchRepo.saveTagIndex).toHaveBeenCalledTimes(1);
      const tagIndex = mockBranchRepo.saveTagIndex.mock.calls[0][0];
      expect(tagIndex.metadata.context).toBe(branchName);
      
      // Check index mappings
      expect(tagIndex.index['tag1']).toContain('doc1.md');
      expect(tagIndex.index['tag1']).not.toContain('doc2.md');
      
      expect(tagIndex.index['tag2']).toContain('doc1.md');
      expect(tagIndex.index['tag2']).toContain('doc2.md');
      
      expect(tagIndex.index['tag3']).toContain('doc2.md');
      expect(tagIndex.index['tag3']).not.toContain('doc1.md');
    });

    test('should handle errors during document processing', async () => {
      // Setup branch
      const branchName = 'feature/test';
      const branchInfo = BranchInfo.create(branchName);

      // Setup documents and a document that will cause an error
      const doc1 = createTestDocument('doc1.md', ['tag1']);
      const errorPath = DocumentPath.create('error-doc.md');

      // Setup repository mocks
      mockBranchRepo.exists.mockResolvedValue(true);
      mockBranchRepo.listDocuments.mockResolvedValue([doc1.path, errorPath]);
      mockBranchRepo.getDocument.mockImplementation(async (branch, path) => {
        if (path.value === 'doc1.md') return doc1;
        if (path.value === 'error-doc.md') throw new Error('Test error');
        return null;
      });
      mockBranchRepo.getTagIndex.mockResolvedValue(null);

      // Call the use case - should not throw despite error in document processing
      const result = await useCase.execute({ branchName, fullRebuild: true });

      // Check result - should still contain data from valid document
      expect(result.tags).toContain('tag1');
      expect(result.documentCount).toBe(2); // Both docs counted in total
      expect(mockBranchRepo.saveTagIndex).toHaveBeenCalled();
    });
  });
});
