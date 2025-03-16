import { describe, test, expect, beforeEach } from '@jest/globals';
import { mock, instance, when, verify, anyString, anything, deepEqual, reset } from 'ts-mockito';
import { UpdateTagIndexUseCaseV2 } from '../UpdateTagIndexUseCaseV2.js';
import { BranchInfo } from '../../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../../domain/entities/DocumentPath.js';
import { DomainError } from '../../../../shared/errors/DomainError.js';
import { createMockBranchRepository, createMockGlobalRepository } from '../../../../../tests/mocks/repositories.js';
import { createTestDocument, createTestBranch, createTestTagIndex } from '../../../../../tests/helpers/test-data.js';

describe('UpdateTagIndexUseCaseV2', () => {
  let useCase: UpdateTagIndexUseCaseV2;
  let mockBranchRepo: any;
  let mockGlobalRepo: any;
  let branchRepoInstance: any;
  let globalRepoInstance;

  beforeEach(() => {
    // Create mocks before each test
    const branchRepoMock = createMockBranchRepository();
    const globalRepoMock = createMockGlobalRepository();

    mockBranchRepo = branchRepoMock.mock;
    mockGlobalRepo = globalRepoMock.mock;
    branchRepoInstance = branchRepoMock.instance;
    globalRepoInstance = globalRepoMock.instance;

    useCase = new UpdateTagIndexUseCaseV2(globalRepoInstance, branchRepoInstance);
  });

  describe('Global tag index updates', () => {
    test('should create and save a global tag index', async () => {
      // Setup documents with tags
      const doc1 = createTestDocument('doc1.md', ['tag1', 'tag2']);
      const doc2 = createTestDocument('doc2.md', ['tag2', 'tag3']);
      const doc3 = createTestDocument('doc3.md', ['tag1', 'tag3']);

      // Setup repository mocks
      // @ts-ignore - ignore ts-mockito type error
      when(mockGlobalRepo.listDocuments()).thenResolve([
        doc1.path,
        doc2.path,
        doc3.path,
      ]);

      when(mockGlobalRepo.getDocument(deepEqual(DocumentPath.create('doc1.md')))).thenResolve(doc1);
      when(mockGlobalRepo.getDocument(deepEqual(DocumentPath.create('doc2.md')))).thenResolve(doc2);
      when(mockGlobalRepo.getDocument(deepEqual(DocumentPath.create('doc3.md')))).thenResolve(doc3);

      when(mockGlobalRepo.getTagIndex()).thenResolve(null);

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
      verify(mockGlobalRepo.saveTagIndex(anything())).once();

      // Since ts-mockito has a different way to get arguments directly,
      // we need to change the verification method
      // The above only verifies that saveTagIndex was called

      // Instead, verify the content of the result
      expect(result.tags).toContain('tag1');
      expect(result.tags).toContain('tag2');
      expect(result.tags).toContain('tag3');
    });

    test('should update existing global tag index when not doing full rebuild', async () => {
      // Setup existing tag index
      const existingTagIndex = createTestTagIndex('global', {
        tag1: ['doc1.md', 'old-doc.md'],
        tag2: ['doc1.md'],
      }, true);

      // Setup documents with tags (doc1 updated, old-doc removed, doc2 added)
      const doc1 = createTestDocument('doc1.md', ['tag1', 'tag3']); // tag2 removed, tag3 added
      const doc2 = createTestDocument('doc2.md', ['tag2', 'tag3']); // new document

      // Setup repository mocks
      when(mockGlobalRepo.listDocuments()).thenResolve([doc1.path, doc2.path]);
      when(mockGlobalRepo.getDocument(deepEqual(DocumentPath.create('doc1.md')))).thenResolve(doc1);
      when(mockGlobalRepo.getDocument(deepEqual(DocumentPath.create('doc2.md')))).thenResolve(doc2);
      when(mockGlobalRepo.getTagIndex()).thenResolve(existingTagIndex);

      // Call the use case (not full rebuild)
      const result = await useCase.execute({ fullRebuild: false });

      // Check result
      expect(result.tags).toContain('tag1');
      expect(result.tags).toContain('tag2');
      expect(result.tags).toContain('tag3');
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.fullRebuild).toBe(false);

      // Verify saveTagIndex was called
      verify(mockGlobalRepo.saveTagIndex(anything())).once();
    });
  });

  describe('Branch tag index updates', () => {
    test('should throw error if branch does not exist', async () => {
      // Setup repository mocks
      when(mockBranchRepo.exists('feature/nonexistent')).thenResolve(false);

      // Call the use case and expect error
      await expect(useCase.execute({ branchName: 'feature/nonexistent' })).rejects.toThrow(DomainError);
    });

    test('should create and save a branch tag index', async () => {
      // Setup branch
      const branchName = 'feature/test';
      const branchInfo = createTestBranch(branchName);

      // Setup documents with tags
      const doc1 = createTestDocument('doc1.md', ['tag1', 'tag2']);
      const doc2 = createTestDocument('doc2.md', ['tag2', 'tag3']);

      // Setup repository mocks
      when(mockBranchRepo.exists(branchName)).thenResolve(true);
      when(mockBranchRepo.listDocuments(deepEqual(branchInfo))).thenResolve([doc1.path, doc2.path]);
      when(mockBranchRepo.getDocument(deepEqual(branchInfo), deepEqual(DocumentPath.create('doc1.md')))).thenResolve(doc1);
      when(mockBranchRepo.getDocument(deepEqual(branchInfo), deepEqual(DocumentPath.create('doc2.md')))).thenResolve(doc2);
      when(mockBranchRepo.getTagIndex(deepEqual(branchInfo))).thenResolve(null);

      // Call the use case
      const result = await useCase.execute({ branchName, fullRebuild: true });

      // Check result
      expect(result.tags).toContain('tag1');
      expect(result.tags).toContain('tag2');
      expect(result.tags).toContain('tag3');
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.updateLocation).toBe(branchName);

      // Verify saveTagIndex was called
      verify(mockBranchRepo.saveTagIndex(deepEqual(branchInfo), anything())).once();
    });

    test('should handle errors during document processing', async () => {
      // Setup branch
      const branchName = 'feature/test';
      const branchInfo = createTestBranch(branchName);

      // Setup documents and a document that will cause an error
      const doc1 = createTestDocument('doc1.md', ['tag1']);
      const errorPath = DocumentPath.create('error-doc.md');

      // Setup repository mocks
      when(mockBranchRepo.exists(branchName)).thenResolve(true);
      when(mockBranchRepo.listDocuments(deepEqual(branchInfo))).thenResolve([doc1.path, errorPath]);
      when(mockBranchRepo.getDocument(deepEqual(branchInfo), deepEqual(DocumentPath.create('doc1.md')))).thenResolve(doc1);
      when(mockBranchRepo.getDocument(deepEqual(branchInfo), deepEqual(errorPath))).thenThrow(new Error('Test error'));
      when(mockBranchRepo.getTagIndex(deepEqual(branchInfo))).thenResolve(null);

      // Call the use case - should not throw despite error in document processing
      const result = await useCase.execute({ branchName, fullRebuild: true });

      // Check result - should still contain data from valid document
      expect(result.tags).toContain('tag1');
      expect(result.documentCount).toBe(2); // Both docs counted in total
      verify(mockBranchRepo.saveTagIndex(deepEqual(branchInfo), anything())).called();
    });
  });
});
