import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { UpdateTagIndexUseCaseV2 } from '../../../../../src/application/usecases/common/UpdateTagIndexUseCaseV2';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath';
import { DomainError } from '../../../../../src/shared/errors/DomainError';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository';
import { IGlobalMemoryBankRepository } from '../../../../../src/domain/repositories/IGlobalMemoryBankRepository';
import {
  createTestDocument,
  createTestBranch,
  createTestTagIndex,
} from '../../../../../tests/helpers/test-data';

/**
 * Unit tests for UpdateTagIndexUseCaseV2
 * 
 * These tests verify that the UpdateTagIndexUseCaseV2 correctly implements:
 * - Building and updating tag indices for both global and branch memory banks
 * - Creating new indices when none exist
 * - Updating existing indices efficiently
 * - Handling full rebuild option for global and branch indices
 * - Proper error handling during document processing
 * - Input validation for branch names
 */

// Mock repositories
const mockBranchRepository: jest.Mocked<IBranchMemoryBankRepository> = {
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
};

const mockGlobalRepository: jest.Mocked<IGlobalMemoryBankRepository> = {
  initialize: jest.fn(),
  getDocument: jest.fn(),
  saveDocument: jest.fn(),
  deleteDocument: jest.fn(),
  listDocuments: jest.fn(),
  findDocumentsByTags: jest.fn(),
  updateTagsIndex: jest.fn(),
  saveTagIndex: jest.fn(),
  getTagIndex: jest.fn(),
  findDocumentPathsByTagsUsingIndex: jest.fn(),
  validateStructure: jest.fn(),
};

describe('UpdateTagIndexUseCaseV2', () => {
  let useCase: UpdateTagIndexUseCaseV2;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();

    // Create use case with mock repositories
    useCase = new UpdateTagIndexUseCaseV2(mockGlobalRepository, mockBranchRepository);
  });

  describe('Global tag index updates', () => {
    test('should create and save a global tag index', async () => {
      // Setup documents with tags
      const doc1 = createTestDocument('doc1.md', ['tag1', 'tag2']);
      const doc2 = createTestDocument('doc2.md', ['tag2', 'tag3']);
      const doc3 = createTestDocument('doc3.md', ['tag1', 'tag3']);

      // Setup repository mocks
      mockGlobalRepository.listDocuments.mockResolvedValue([doc1.path, doc2.path, doc3.path]);
      mockGlobalRepository.getDocument.mockImplementation((path: DocumentPath) => {
        const pathStr = path.value;
        if (pathStr === 'doc1.md') return Promise.resolve(doc1);
        if (pathStr === 'doc2.md') return Promise.resolve(doc2);
        if (pathStr === 'doc3.md') return Promise.resolve(doc3);
        return Promise.resolve(null);
      });
      mockGlobalRepository.getTagIndex.mockResolvedValue(null);

      // Call the use case
      const result = await useCase.execute({ fullRebuild: true });

      // Check result
      expect(result.tags).toContain('tag1');
      expect(result.tags).toContain('tag2');
      expect(result.tags).toContain('tag3');
      expect(result.documentCount).toBe(3);
      expect(result.updateInfo.fullRebuild).toBe(true);
      expect(result.updateInfo.updateLocation).toBe('global');

      // Verify that saveTagIndex was called
      expect(mockGlobalRepository.saveTagIndex).toHaveBeenCalledTimes(1);
    });

    test('should update existing global tag index when not doing full rebuild', async () => {
      // Setup existing tag index
      const existingTagIndex = createTestTagIndex(
        'global',
        {
          tag1: ['doc1.md', 'old-doc.md'],
          tag2: ['doc1.md'],
        },
        true
      );

      // Setup documents with tags (doc1 updated, old-doc removed, doc2 added)
      const doc1 = createTestDocument('doc1.md', ['tag1', 'tag3']); // tag2 removed, tag3 added
      const doc2 = createTestDocument('doc2.md', ['tag2', 'tag3']); // new document

      // Setup repository mocks
      mockGlobalRepository.listDocuments.mockResolvedValue([doc1.path, doc2.path]);
      mockGlobalRepository.getDocument.mockImplementation((path: DocumentPath) => {
        const pathStr = path.value;
        if (pathStr === 'doc1.md') return Promise.resolve(doc1);
        if (pathStr === 'doc2.md') return Promise.resolve(doc2);
        return Promise.resolve(null);
      });
      mockGlobalRepository.getTagIndex.mockResolvedValue(existingTagIndex);

      // Call the use case (not full rebuild)
      const result = await useCase.execute({ fullRebuild: false });

      // Check result
      expect(result.tags).toContain('tag1');
      expect(result.tags).toContain('tag2');
      expect(result.tags).toContain('tag3');
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.fullRebuild).toBe(false);

      // Verify saveTagIndex was called
      expect(mockGlobalRepository.saveTagIndex).toHaveBeenCalledTimes(1);
    });
  });

  describe('Branch tag index updates', () => {
    test('should throw error if branch does not exist', async () => {
      // Setup repository mocks
      mockBranchRepository.exists.mockResolvedValue(false);

      // Call the use case and expect error
      await expect(useCase.execute({ branchName: 'feature/nonexistent' })).rejects.toThrow(
        DomainError
      );
    });

    test('should create and save a branch tag index', async () => {
      // Setup branch
      const branchName = 'feature/test';
      const branchInfo = createTestBranch(branchName);

      // Setup documents with tags
      const doc1 = createTestDocument('doc1.md', ['tag1', 'tag2']);
      const doc2 = createTestDocument('doc2.md', ['tag2', 'tag3']);

      // Setup repository mocks
      mockBranchRepository.exists.mockResolvedValue(true);
      mockBranchRepository.listDocuments.mockResolvedValue([doc1.path, doc2.path]);
      mockBranchRepository.getDocument.mockImplementation((branch: BranchInfo, path: DocumentPath) => {
        const pathStr = path.value;
        if (pathStr === 'doc1.md') return Promise.resolve(doc1);
        if (pathStr === 'doc2.md') return Promise.resolve(doc2);
        return Promise.resolve(null);
      });
      mockBranchRepository.getTagIndex.mockResolvedValue(null);

      // Call the use case
      const result = await useCase.execute({ branchName, fullRebuild: true });

      // Check result
      expect(result.tags).toContain('tag1');
      expect(result.tags).toContain('tag2');
      expect(result.tags).toContain('tag3');
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.updateLocation).toBe(branchName);

      // Verify saveTagIndex was called
      expect(mockBranchRepository.saveTagIndex).toHaveBeenCalledTimes(1);
    });

    test('should handle errors during document processing', async () => {
      // Setup branch
      const branchName = 'feature/test';
      const branchInfo = createTestBranch(branchName);

      // Setup documents and a document that will cause an error
      const doc1 = createTestDocument('doc1.md', ['tag1']);
      const errorPath = DocumentPath.create('error-doc.md');

      // Setup repository mocks
      mockBranchRepository.exists.mockResolvedValue(true);
      mockBranchRepository.listDocuments.mockResolvedValue([doc1.path, errorPath]);
      mockBranchRepository.getDocument.mockImplementation((branch: BranchInfo, path: DocumentPath) => {
        const pathStr = path.value;
        if (pathStr === 'doc1.md') return Promise.resolve(doc1);
        if (pathStr === 'error-doc.md') throw new Error('Test error');
        return Promise.resolve(null);
      });
      mockBranchRepository.getTagIndex.mockResolvedValue(null);

      // Call the use case - should not throw despite error in document processing
      const result = await useCase.execute({ branchName, fullRebuild: true });

      // Check result - should still contain data from valid document
      expect(result.tags).toContain('tag1');
      expect(result.documentCount).toBe(2); // Both docs counted in total
      expect(mockBranchRepository.saveTagIndex).toHaveBeenCalledTimes(1);
    });
  });
});
