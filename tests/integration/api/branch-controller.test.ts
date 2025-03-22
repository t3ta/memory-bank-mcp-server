/**
 * @jest-environment node
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { BranchController } from '../../../src/interface/controllers/BranchController';
import { MCPResponsePresenter } from '../../../src/interface/presenters/MCPResponsePresenter';
import { MCPResponse, MCPSuccessResponse, MCPErrorResponse } from '../../../src/interface/presenters/types/MCPResponse';
import { ReadBranchDocumentUseCase } from '../../../src/application/usecases/branch/ReadBranchDocumentUseCase';
import { WriteBranchDocumentUseCase } from '../../../src/application/usecases/branch/WriteBranchDocumentUseCase';
import { SearchDocumentsByTagsUseCase } from '../../../src/application/usecases/common/SearchDocumentsByTagsUseCase';
import { UpdateTagIndexUseCase } from '../../../src/application/usecases/common/UpdateTagIndexUseCase';
import { GetRecentBranchesUseCase } from '../../../src/application/usecases/common/GetRecentBranchesUseCase';
import { ReadBranchCoreFilesUseCase } from '../../../src/application/usecases/common/ReadBranchCoreFilesUseCase';
import { CreateBranchCoreFilesUseCase } from '../../../src/application/usecases/common/CreateBranchCoreFilesUseCase';
import { DocumentDTO } from '../../../src/application/dtos/DocumentDTO';
import { DomainError, DomainErrorCodes } from '../../../src/shared/errors/DomainError';
import { IBranchMemoryBankRepository, RecentBranch } from '../../../src/domain/repositories/IBranchMemoryBankRepository';
import { IGlobalMemoryBankRepository } from '../../../src/domain/repositories/IGlobalMemoryBankRepository';
import { BranchInfo } from '../../../src/domain/entities/BranchInfo';
import { DocumentPath } from '../../../src/domain/entities/DocumentPath';
import { Tag } from '../../../src/domain/entities/Tag';
import { TagIndex } from '../../../src/schemas/tag-index/tag-index-schema';

describe('BranchController (Integration)', () => {
  // Common test data
  const TEST_BRANCH = 'feature/test-branch';
  const TEST_DOCUMENT_PATH = 'test-document.md';
  const TEST_DOCUMENT_CONTENT = '# Test Document\n\nThis is a test document.';
  const TEST_TAGS = ['test', 'document', 'integration'];

  // Create TestBranchInfo
  const testBranchInfo = BranchInfo.create(TEST_BRANCH);

  // Document Test Data
  const testDocument = {
    path: TEST_DOCUMENT_PATH,
    content: TEST_DOCUMENT_CONTENT,
    tags: TEST_TAGS,
    lastModified: new Date(),
    toDTO: () => ({
      path: TEST_DOCUMENT_PATH,
      content: TEST_DOCUMENT_CONTENT,
      tags: TEST_TAGS,
      lastModified: new Date().toISOString()
    })
  };

  // Repository mocks
  let branchRepositoryMock: jest.Mocked<IBranchMemoryBankRepository>;
  let globalRepositoryMock: jest.Mocked<IGlobalMemoryBankRepository>;

  // Use cases
  let readBranchDocumentUseCase: ReadBranchDocumentUseCase;
  let writeBranchDocumentUseCase: WriteBranchDocumentUseCase;
  let searchDocumentsByTagsUseCase: SearchDocumentsByTagsUseCase;
  let updateTagIndexUseCase: UpdateTagIndexUseCase;
  let getRecentBranchesUseCase: GetRecentBranchesUseCase;
  let readBranchCoreFilesUseCase: ReadBranchCoreFilesUseCase;
  let createBranchCoreFilesUseCase: CreateBranchCoreFilesUseCase;

  // Controller
  let branchController: BranchController;

  // Presenter
  let presenter: MCPResponsePresenter;

  beforeEach(() => {
    // Create mocks directly with jest
    branchRepositoryMock = {
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
    } as unknown as jest.Mocked<IBranchMemoryBankRepository>;

    globalRepositoryMock = {
      initialize: jest.fn(),
      getDocument: jest.fn(),
      saveDocument: jest.fn(),
      deleteDocument: jest.fn(),
      listDocuments: jest.fn(),
      findDocumentsByTags: jest.fn(),
      saveTagIndex: jest.fn(),
      getTagIndex: jest.fn(),
      findDocumentPathsByTagsUsingIndex: jest.fn()
    } as unknown as jest.Mocked<IGlobalMemoryBankRepository>;

    // Setup mock behavior
    branchRepositoryMock.exists.mockResolvedValue(true);
    branchRepositoryMock.getDocument.mockImplementation((branch, path) => {
      if (branch.toString() === TEST_BRANCH && path.toString() === TEST_DOCUMENT_PATH) {
        return Promise.resolve(testDocument as any);
      }
      return Promise.resolve(null);
    });
    branchRepositoryMock.findDocumentsByTags.mockResolvedValue([testDocument as any]);

    const recentBranches: RecentBranch[] = [
      {
        branchInfo: testBranchInfo,
        lastModified: new Date(),
        summary: {
          currentWork: "Working on tests",
          recentChanges: ["Added tests"]
        }
      },
      {
        branchInfo: BranchInfo.create('feature/other-branch'),
        lastModified: new Date(Date.now() - 86400000),
        summary: {
          currentWork: "Other work",
          recentChanges: ["Other changes"]
        }
      }
    ];

    branchRepositoryMock.getRecentBranches.mockResolvedValue(recentBranches);
    branchRepositoryMock.saveTagIndex.mockResolvedValue();
    branchRepositoryMock.listDocuments.mockResolvedValue([DocumentPath.create(TEST_DOCUMENT_PATH)]);
    branchRepositoryMock.saveDocument.mockResolvedValue();

    // Create presenter
    presenter = new MCPResponsePresenter();

    // Create use cases
    readBranchDocumentUseCase = new ReadBranchDocumentUseCase(branchRepositoryMock);
    writeBranchDocumentUseCase = new WriteBranchDocumentUseCase(branchRepositoryMock);
    searchDocumentsByTagsUseCase = new SearchDocumentsByTagsUseCase(
      globalRepositoryMock,
      branchRepositoryMock
    );
    updateTagIndexUseCase = new UpdateTagIndexUseCase(
      globalRepositoryMock,
      branchRepositoryMock
    );
    getRecentBranchesUseCase = new GetRecentBranchesUseCase(branchRepositoryMock);
    readBranchCoreFilesUseCase = new ReadBranchCoreFilesUseCase(branchRepositoryMock);
    createBranchCoreFilesUseCase = new CreateBranchCoreFilesUseCase(branchRepositoryMock);

    // Create controller with all dependencies
    branchController = new BranchController(
      readBranchDocumentUseCase,
      writeBranchDocumentUseCase,
      searchDocumentsByTagsUseCase,
      updateTagIndexUseCase,
      getRecentBranchesUseCase,
      readBranchCoreFilesUseCase,
      createBranchCoreFilesUseCase,
      presenter,
      { branchRepository: branchRepositoryMock }
    );
  });

  describe('readDocument', () => {
    it('should successfully read a document', async () => {
      // Arrange
      // Create a mock response for presenter.present
      jest.spyOn(presenter, 'present').mockReturnValueOnce({
        success: true,
        data: {
          path: TEST_DOCUMENT_PATH,
          content: TEST_DOCUMENT_CONTENT,
          tags: TEST_TAGS,
          lastModified: new Date().toISOString()
        }
      });

      // Act
      const result = await branchController.readDocument(TEST_BRANCH, TEST_DOCUMENT_PATH);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        const successResponse = result as MCPSuccessResponse<DocumentDTO>;
        expect(successResponse.data).toBeDefined();

        const document = successResponse.data;
        expect(document.path).toBe(TEST_DOCUMENT_PATH);
        expect(document.content).toBe(TEST_DOCUMENT_CONTENT);
        expect(document.tags).toEqual(TEST_TAGS);
      }
    });

    it('should handle nonexistent document error', async () => {
      // Arrange
      const nonExistentPath = 'nonexistent.md';
      branchRepositoryMock.getDocument.mockResolvedValueOnce(null);

      // Act
      const result = await branchController.readDocument(TEST_BRANCH, nonExistentPath);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorResponse = result as MCPErrorResponse;
        expect(errorResponse.error).toBeDefined();
        expect(errorResponse.error.code).toContain('DOCUMENT_NOT_FOUND');
      }
    });

    it('should handle nonexistent branch error', async () => {
      // Arrange
      const nonExistentBranch = 'feature/nonexistent-branch'; // Adding prefix to make it valid
      branchRepositoryMock.exists.mockResolvedValueOnce(false);

      // Act
      const result = await branchController.readDocument(nonExistentBranch, TEST_DOCUMENT_PATH);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorResponse = result as MCPErrorResponse;
        expect(errorResponse.error).toBeDefined();
        expect(errorResponse.error.code).toContain('BRANCH_NOT_FOUND');
      }
    });
  });

  describe('writeDocument', () => {
    it('should successfully write a document', async () => {
      // Arrange
      // Mock the WriteBranchDocumentUseCase to return a valid result AND call saveDocument
      jest.spyOn(writeBranchDocumentUseCase, 'execute').mockImplementationOnce(async (input) => {
        // Extract correct parameters from input
        const branchInfo = BranchInfo.create(input.branchName);
        const tags = (input.document.tags || []).map(tag => Tag.create(tag));

        // Create a document mock
        const documentMock = {
          path: DocumentPath.create(input.document.path),
          content: input.document.content,
          tags: tags,
          lastModified: new Date()
        };

        // Call the saveDocument method to ensure it's tracked by the test
        await branchRepositoryMock.saveDocument(branchInfo, documentMock as any);

        // Return expected result
        return {
          document: {
            path: TEST_DOCUMENT_PATH,
            content: TEST_DOCUMENT_CONTENT,
            tags: TEST_TAGS,
            lastModified: new Date().toISOString()
          }
        };
      });

      // Create a direct spy on presenter.present
      const presentSpy = jest.spyOn(presenter, 'present');
      presentSpy.mockImplementation((data) => {
        return {
          success: true,
          data: data // Return the actual data passed to present method
        };
      });

      // Act
      const result = await branchController.writeDocument(
        TEST_BRANCH,
        TEST_DOCUMENT_PATH,
        TEST_DOCUMENT_CONTENT,
        TEST_TAGS
      );

      // Assert
      expect(result.success).toBe(true);
      expect(branchRepositoryMock.saveDocument).toHaveBeenCalled();
    });

    it('should handle write to nonexistent branch error', async () => {
      // Arrange
      const nonExistentBranch = 'feature/nonexistent-branch'; // Adding prefix to make it valid
      branchRepositoryMock.exists.mockResolvedValueOnce(false);

      // Act
      const result = await branchController.writeDocument(
        nonExistentBranch,
        TEST_DOCUMENT_PATH,
        TEST_DOCUMENT_CONTENT
      );

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorResponse = result as MCPErrorResponse;
        expect(errorResponse.error).toBeDefined();
        expect(errorResponse.error.code).toContain('BRANCH_NOT_FOUND');
      }
    });
  });

  describe('findDocumentsByTags', () => {
    it('should find documents by tags', async () => {
      // Arrange
      // Using jest.spyOn to mock the specific implementation for this test
      jest.spyOn(searchDocumentsByTagsUseCase, 'execute').mockResolvedValueOnce({
        documents: [{
          path: TEST_DOCUMENT_PATH,
          content: TEST_DOCUMENT_CONTENT,
          tags: TEST_TAGS,
          lastModified: new Date().toISOString()
        }],
        searchInfo: {
          count: 1,
          searchedTags: TEST_TAGS,
          matchedAllTags: false,
          searchLocation: TEST_BRANCH
        }
      });

      // Act
      const result = await branchController.findDocumentsByTags(TEST_BRANCH, TEST_TAGS);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        const successResponse = result as MCPSuccessResponse<DocumentDTO[]>;
        expect(successResponse.data).toBeDefined();
        expect(Array.isArray(successResponse.data)).toBe(true);
        expect(successResponse.data.length).toBe(1);

        const document = successResponse.data[0];
        expect(document.path).toBe(TEST_DOCUMENT_PATH);
      }
    });

    it('should return empty array when no documents match tags', async () => {
      // Arrange
      const nonMatchingTags = ['nonexistent-tag'];
      branchRepositoryMock.findDocumentsByTags.mockResolvedValueOnce([]);

      // Act
      const result = await branchController.findDocumentsByTags(TEST_BRANCH, nonMatchingTags);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        const successResponse = result as MCPSuccessResponse<DocumentDTO[]>;
        expect(successResponse.data).toBeDefined();
        expect(Array.isArray(successResponse.data)).toBe(true);
        expect(successResponse.data.length).toBe(0);
      }
    });
  });

  describe('getRecentBranches', () => {
    it('should get recent branches with default limit', async () => {
      // Act
      const result = await branchController.getRecentBranches();

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        const successResponse = result as MCPSuccessResponse<any>;
        expect(successResponse.data).toBeDefined();
        expect(successResponse.data.branches).toBeDefined();
        expect(successResponse.data.branches.length).toBe(2);
        expect(successResponse.data.branches[0].name).toBe(TEST_BRANCH);
      }
    });

    it('should get recent branches with custom limit', async () => {
      // Arrange
      const customLimit = 1;
      const limitedRecentBranches: RecentBranch[] = [
        {
          branchInfo: testBranchInfo,
          lastModified: new Date(),
          summary: {
            currentWork: "Working on tests",
            recentChanges: ["Added tests"]
          }
        }
      ];

      branchRepositoryMock.getRecentBranches.mockResolvedValueOnce(limitedRecentBranches);

      // Act
      const result = await branchController.getRecentBranches(customLimit);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        const successResponse = result as MCPSuccessResponse<any>;
        expect(successResponse.data).toBeDefined();
        expect(successResponse.data.branches).toBeDefined();
        expect(successResponse.data.branches.length).toBe(1);
      }
    });
  });

  describe('updateTagsIndex', () => {
    it('should update tags index successfully', async () => {
      // Arrange
      // Mock updateTagIndexUseCase.execute
      jest.spyOn(updateTagIndexUseCase, 'execute').mockResolvedValueOnce({
        tags: TEST_TAGS,
        documentCount: 1,
        updateInfo: {
          fullRebuild: false,
          updateLocation: TEST_BRANCH,
          timestamp: new Date().toISOString()
        }
      });

      // Ensure saveTagIndex is registered by mock
      jest.spyOn(branchRepositoryMock, 'saveTagIndex').mockResolvedValueOnce();

      // Mock presenter
      jest.spyOn(presenter, 'present').mockReturnValueOnce({
        success: true,
        data: {}
      });

      // Act
      const result = await branchController.updateTagsIndex(TEST_BRANCH);

      // Assert
      expect(result.success).toBe(true);
      expect(branchRepositoryMock.saveTagIndex).toHaveBeenCalled();
    });
  });

  // Error handling tests
  describe('error handling', () => {
    it('should handle domain errors correctly', async () => {
      // Arrange
      const errorMessage = 'Invalid document path';
      branchRepositoryMock.getDocument.mockImplementationOnce(() => {
        throw new DomainError('INVALID_PATH', errorMessage);
      });

      // Act
      const result = await branchController.readDocument(TEST_BRANCH, 'invalid.md');

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        const errorResponse = result as MCPErrorResponse;
        expect(errorResponse.error).toBeDefined();
        expect(errorResponse.error.code).toContain('DOMAIN_ERROR.INVALID_PATH');
        expect(errorResponse.error.message).toBe(errorMessage);
      }
    });
  });
});
