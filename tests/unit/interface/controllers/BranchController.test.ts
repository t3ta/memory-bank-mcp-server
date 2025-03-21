import { describe, it, expect, beforeEach } from '@jest/globals';
import { jest } from '@jest/globals';
import { BranchController } from '../../../../src/interface/controllers/BranchController';
import { ReadBranchDocumentUseCase } from '../../../../src/application/usecases/branch/ReadBranchDocumentUseCase';
import { WriteBranchDocumentUseCase } from '../../../../src/application/usecases/branch/WriteBranchDocumentUseCase';
import { SearchDocumentsByTagsUseCase } from '../../../../src/application/usecases/common/SearchDocumentsByTagsUseCase';
import { UpdateTagIndexUseCase } from '../../../../src/application/usecases/common/UpdateTagIndexUseCase';
import { GetRecentBranchesUseCase } from '../../../../src/application/usecases/common/GetRecentBranchesUseCase';
import { ReadBranchCoreFilesUseCase } from '../../../../src/application/usecases/common/ReadBranchCoreFilesUseCase';
import { CreateBranchCoreFilesUseCase } from '../../../../src/application/usecases/common/CreateBranchCoreFilesUseCase';
import { MCPResponsePresenter } from '../../../../src/interface/presenters/MCPResponsePresenter';
import { DocumentDTO } from '../../../../src/application/dtos/DocumentDTO';
import { DomainError } from '../../../../src/shared/errors/DomainError';
import { ApplicationError } from '../../../../src/shared/errors/ApplicationError';
import { InfrastructureError } from '../../../../src/shared/errors/InfrastructureError';

// Mock use cases
const mockReadBranchDocumentUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<ReadBranchDocumentUseCase>;

const mockWriteBranchDocumentUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<WriteBranchDocumentUseCase>;

const mockSearchDocumentsByTagsUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<SearchDocumentsByTagsUseCase>;

const mockUpdateTagIndexUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<UpdateTagIndexUseCase>;

const mockGetRecentBranchesUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<GetRecentBranchesUseCase>;

const mockReadBranchCoreFilesUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<ReadBranchCoreFilesUseCase>;

const mockCreateBranchCoreFilesUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<CreateBranchCoreFilesUseCase>;

// Mock presenter
const mockPresenter = {
  present: jest.fn(),
  presentError: jest.fn(),
} as unknown as jest.Mocked<MCPResponsePresenter>;

describe('BranchController', () => {
  let controller: BranchController;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create controller with mocks
    controller = new BranchController(
      mockReadBranchDocumentUseCase,
      mockWriteBranchDocumentUseCase,
      mockSearchDocumentsByTagsUseCase,
      mockUpdateTagIndexUseCase,
      mockGetRecentBranchesUseCase,
      mockReadBranchCoreFilesUseCase,
      mockCreateBranchCoreFilesUseCase,
      mockPresenter
    );
  });

  describe('readDocument', () => {
    it('should read document and return success response', async () => {
      // Arrange
      const branchName = 'feature/test';
      const path = 'test.md';
      const documentDTO: DocumentDTO = {
        path: 'test.md',
        content: '# Test\n\nContent',
        tags: ['test'],
        lastModified: '2023-01-01T00:00:00.000Z',
      };

      mockReadBranchDocumentUseCase.execute.mockResolvedValue({
        document: documentDTO,
      });

      mockPresenter.present.mockReturnValue({
        success: true,
        data: documentDTO,
      });

      // Act
      const result = await controller.readDocument(branchName, path);

      // Assert
      expect(result.success).toBe(true);
      expect(result.success).toBe(true);

      expect(mockReadBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName,
        path,
      });

      expect(mockPresenter.present).toHaveBeenCalledWith(documentDTO);
    });

    it('should handle domain errors', async () => {
      // Arrange
      const branchName = 'feature/test';
      const path = 'nonexistent.md';
      const error = new DomainError('DOCUMENT_NOT_FOUND', 'Document not found');

      mockReadBranchDocumentUseCase.execute.mockRejectedValue(error);

      mockPresenter.presentError.mockReturnValue({
        success: false,
        error: {
          code: 'DOMAIN_ERROR.DOCUMENT_NOT_FOUND',
          message: 'Document not found',
        },
      });

      // Act
      const result = await controller.readDocument(branchName, path);

      // Assert
      expect(result.success).toBe(false);
      expect(result).toEqual({
        success: false,
        error: {
          code: 'DOMAIN_ERROR.DOCUMENT_NOT_FOUND',
          message: 'Document not found',
        },
      });

      expect(mockReadBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName,
        path,
      });

      expect(mockPresenter.presentError).toHaveBeenCalledWith(error);
    });
  });

  describe('writeDocument', () => {
    it('should write document and return success response', async () => {
      // Arrange
      const branchName = 'feature/test';
      const path = 'test.md';
      const content = '# Test\n\nContent';
      const tags = ['test', 'document'];

      mockWriteBranchDocumentUseCase.execute.mockResolvedValue({
        document: {
          path: 'test.md',
          content: '# Test\n\nContent',
          tags: [],
          lastModified: '2023-01-01T00:00:00.000Z',
        },
      });

      mockPresenter.present.mockReturnValue({
        success: true,
        data: {
          document: {
            path: 'test.md',
            content: '# Test\n\nContent',
            tags: [],
            lastModified: '2023-01-01T00:00:00.000Z',
          },
        },
      });

      // Act
      const result = await controller.writeDocument(branchName, path, content, tags);

      // Assert
      expect(result.success).toBe(true);

      expect(mockWriteBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName,
        document: {
          path,
          content,
          tags,
        },
      });

      expect(mockPresenter.present).toHaveBeenCalledWith({
        document: {
          path: 'test.md',
          content: '# Test\n\nContent',
          tags: [],
          lastModified: '2023-01-01T00:00:00.000Z',
        },
      });
    });

    it('should handle application errors', async () => {
      // Arrange
      const branchName = 'feature/test';
      const path = 'test.md';
      const content = '# Test\n\nContent';
      const error = new ApplicationError('WRITE_FAILED', 'Failed to write document');

      mockWriteBranchDocumentUseCase.execute.mockRejectedValue(error);

      mockPresenter.presentError.mockReturnValue({
        success: false,
        error: {
          code: 'APP_ERROR.WRITE_FAILED',
          message: 'Failed to write document',
        },
      });

      // Act
      const result = await controller.writeDocument(branchName, path, content);

      // Assert
      expect(result.success).toBe(false);
      expect(result).toEqual({
        success: false,
        error: {
          code: 'APP_ERROR.WRITE_FAILED',
          message: 'Failed to write document',
        },
      });

      expect(mockPresenter.presentError).toHaveBeenCalledWith(error);
    });

    it('should use empty array for tags when not provided', async () => {
      // Arrange
      const branchName = 'feature/test';
      const path = 'test.md';
      const content = '# Test\n\nContent';

      mockWriteBranchDocumentUseCase.execute.mockResolvedValue({
        document: {
          path: 'test.md',
          content: '# Test\n\nContent',
          tags: [],
          lastModified: '2023-01-01T00:00:00.000Z',
        },
      });

      mockPresenter.present.mockReturnValue({
        success: true,
        data: { message: 'Document written successfully', documentPath: 'test.md' },
      });

      // Act
      await controller.writeDocument(branchName, path, content);

      // Assert
      expect(mockWriteBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName,
        document: {
          path,
          content,
          tags: [],
        },
      });
    });
  });

  describe('readCoreFiles', () => {
    it('should read core files and return formatted response', async () => {
      // Arrange
      const branchName = 'feature/test';

      // Mock ReadBranchCoreFilesUseCase response
      mockReadBranchCoreFilesUseCase.execute.mockResolvedValue({
        files: {
          activeContext: {
            currentWork: 'Current work',
            recentChanges: ['Change 1', 'Change 2'],
            activeDecisions: ['Decision 1'],
            considerations: ['Consideration 1'],
            nextSteps: ['Step 1', 'Step 2'],
          },
          progress: {
            status: 'In progress',
            workingFeatures: ['Feature 1'],
            pendingImplementation: ['Feature 2'],
            knownIssues: ['Issue 1'],
          },
          systemPatterns: {
            technicalDecisions: [
              {
                title: 'Decision Title',
                context: 'Decision Context',
                decision: 'The Decision',
                consequences: ['Consequence 1', 'Consequence 2'],
              },
            ],
          },
        },
      });

      // Mock BranchDocument use case response for branchContext.md
      mockReadBranchDocumentUseCase.execute.mockResolvedValue({
        document: {
          path: 'branchContext.md',
          content: '# Branch Context\n\nBranch context content',
          tags: ['core', 'branch-context'],
          lastModified: '2023-01-01T00:00:00.000Z',
        },
      });

      // Mock presenter
      mockPresenter.present.mockReturnValue({
        success: true,
        data: {}, // Will be filled with formatted core files
      });

      // Act
      const result = await controller.readCoreFiles(branchName);

      // Assert
      expect(result.success).toBe(true);

      // Verify use cases called
      expect(mockReadBranchCoreFilesUseCase.execute).toHaveBeenCalledWith({
        branchName,
      });

      expect(mockReadBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName,
        path: 'branchContext.md',
      });

      // Verify presenter called with formatted data
      expect(mockPresenter.present).toHaveBeenCalledWith(
        expect.objectContaining({
          'activeContext.md': expect.objectContaining({
            path: 'activeContext.md',
            content: expect.stringContaining('# アクティブコンテキスト'),
          }),
          'progress.md': expect.objectContaining({
            path: 'progress.md',
            content: expect.stringContaining('# 進捗状況'),
          }),
          'systemPatterns.md': expect.objectContaining({
            path: 'systemPatterns.md',
            content: expect.stringContaining('# システムパターン'),
          }),
          'branchContext.md': expect.objectContaining({
            path: 'branchContext.md',
            content: '# Branch Context\n\nBranch context content',
          }),
        })
      );
    });

    it('should handle errors when reading branchContext.md', async () => {
      // Arrange
      const branchName = 'feature/test';

      // Mock ReadBranchCoreFilesUseCase response
      mockReadBranchCoreFilesUseCase.execute.mockResolvedValue({
        files: {
          activeContext: {
            currentWork: 'Current work',
            recentChanges: [],
            activeDecisions: [],
            considerations: [],
            nextSteps: [],
          },
          progress: {
            status: 'In progress',
            workingFeatures: [],
            pendingImplementation: [],
            knownIssues: [],
          },
          systemPatterns: {
            technicalDecisions: [],
          },
        },
      });

      // Mock error for branchContext.md
      mockReadBranchDocumentUseCase.execute.mockRejectedValue(
        new DomainError('DOCUMENT_NOT_FOUND', 'Document not found')
      );

      // Mock presenter
      mockPresenter.present.mockReturnValue({
        success: true,
        data: {}, // Will be filled with formatted core files
      });

      // Act
      const result = await controller.readCoreFiles(branchName);

      // Assert
      expect(result.success).toBe(true);

      // Verify presenter called with formatted data including empty branchContext
      expect(mockPresenter.present).toHaveBeenCalledWith(
        expect.objectContaining({
          'branchContext.md': expect.objectContaining({
            path: 'branchContext.md',
            content: '',
            tags: ['core', 'branch-context'],
          }),
        })
      );
    });

    it('should handle errors from ReadBranchCoreFilesUseCase', async () => {
      // Arrange
      const branchName = 'feature/test';
      const error = new InfrastructureError('CORE_FILES_READ_ERROR', 'Failed to read core files');

      mockReadBranchCoreFilesUseCase.execute.mockRejectedValue(error);

      mockPresenter.presentError.mockReturnValue({
        success: false,
        error: {
          code: 'INFRA_ERROR.CORE_FILES_READ_ERROR',
          message: 'Failed to read core files',
        },
      });

      // Act
      const result = await controller.readCoreFiles(branchName);

      // Assert
      expect(result.success).toBe(false);
      expect(mockPresenter.presentError).toHaveBeenCalledWith(error);
    });
  });

  describe('writeCoreFiles', () => {
    it('should write core files and return success response', async () => {
      // Arrange
      const branchName = 'feature/test';
      const files = {
        'branchContext.md': {
          content: '# Branch Context\n\nBranch context content',
        },
        'activeContext.md':
          '# アクティブコンテキスト\n\n## 現在の作業内容\n\nCurrent work\n\n## 最近の変更点\n\n- Change 1\n- Change 2\n\n## アクティブな決定事項\n\n- Decision 1\n\n## 検討事項\n\n- Consideration 1\n\n## 次のステップ\n\n- Step 1\n- Step 2\n',
        'progress.md':
          '# 進捗状況\n\n## 動作している機能\n\n- Feature 1\n\n## 未実装の機能\n\n- Feature 2\n\n## 現在の状態\n\nIn progress\n\n## 既知の問題\n\n- Issue 1\n',
        'systemPatterns.md':
          '# システムパターン\n\n## 技術的決定事項\n\n### Decision Title\n\n#### コンテキスト\n\nDecision Context\n\n#### 決定事項\n\nThe Decision\n\n#### 影響\n\n- Consequence 1\n- Consequence 2\n\n',
      };

      // Mock use cases
      mockWriteBranchDocumentUseCase.execute.mockResolvedValue({
        document: {
          path: 'test.md',
          content: '# Test\n\nContent',
          tags: [],
          lastModified: '2023-01-01T00:00:00.000Z',
        },
      });

      mockCreateBranchCoreFilesUseCase.execute.mockResolvedValue({
        message: 'Core files created successfully',
        updatedFiles: ['activeContext.md', 'progress.md', 'systemPatterns.md'],
      });

      mockPresenter.present.mockReturnValue({
        success: true,
        data: {
          message: 'Successfully updated core files for branch "feature/test"',
          updatedFiles: ['activeContext.md', 'progress.md', 'systemPatterns.md'],
        },
      });

      // Act
      const result = await controller.writeCoreFiles(branchName, files);

      // Assert
      expect(result.success).toBe(true);

      // Verify WriteBranchDocumentUseCase called for branchContext.md
      expect(mockWriteBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName,
        document: {
          path: 'branchContext.md',
          content: '# Branch Context\n\nBranch context content',
          tags: ['core', 'branch-context'],
        },
      });

      // Verify CreateBranchCoreFilesUseCase called with parsed DTOs
      expect(mockCreateBranchCoreFilesUseCase.execute).toHaveBeenCalledWith({
        branchName,
        files: expect.objectContaining({
          activeContext: expect.objectContaining({
            currentWork: expect.any(String),
            recentChanges: expect.any(Array),
            activeDecisions: expect.any(Array),
            considerations: expect.any(Array),
            nextSteps: expect.any(Array),
          }),
          progress: expect.objectContaining({
            status: expect.any(String),
            workingFeatures: expect.any(Array),
            pendingImplementation: expect.any(Array),
            knownIssues: expect.any(Array),
          }),
          systemPatterns: expect.objectContaining({
            technicalDecisions: expect.any(Array),
          }),
        }),
      });
    });

    it('should validate input', async () => {
      // Arrange
      const branchName = 'feature/test';
      const invalidInput = null;

      mockPresenter.presentError.mockReturnValue({
        success: false,
        error: {
          code: 'DOMAIN_ERROR.INVALID_INPUT',
          message: 'Files must be provided as an object',
        },
      });

      // Act
      const result = await controller.writeCoreFiles(branchName, invalidInput as any);

      // Assert
      expect(result.success).toBe(false);
      expect(mockPresenter.presentError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Files must be provided as an object',
        })
      );

      // Verify use cases not called
      expect(mockWriteBranchDocumentUseCase.execute).not.toHaveBeenCalled();
      expect(mockCreateBranchCoreFilesUseCase.execute).not.toHaveBeenCalled();
    });

    it('should handle errors from WriteBranchDocumentUseCase', async () => {
      // Arrange
      const branchName = 'feature/test';
      const files = {
        'branchContext.md': 'Branch context content',
      };

      const error = new ApplicationError('WRITE_FAILED', 'Failed to write document');

      mockWriteBranchDocumentUseCase.execute.mockRejectedValue(error);

      mockPresenter.presentError.mockReturnValue({
        success: false,
        error: {
          code: 'APP_ERROR.WRITE_FAILED',
          message: 'Failed to write document',
        },
      });

      // Act
      const result = await controller.writeCoreFiles(branchName, files);

      // Assert
      expect(result.success).toBe(false);
      expect(mockPresenter.presentError).toHaveBeenCalledWith(error);
    });
  });

  describe('getRecentBranches', () => {
    it('should get recent branches with default limit', async () => {
      // Arrange
      mockGetRecentBranchesUseCase.execute.mockResolvedValue({
        branches: [
          {
            name: 'feature/test',
            lastModified: '2023-01-01T00:00:00.000Z',
            summary: {
              currentWork: 'Current work',
              recentChanges: ['Change 1'],
            },
          },
        ],
        total: 1,
      });

      mockPresenter.present.mockReturnValue({
        success: true,
        data: {
          branches: [
            {
              name: 'feature/test',
              lastModified: '2023-01-01T00:00:00.000Z',
              summary: {
                currentWork: 'Current work',
                recentChanges: ['Change 1'],
              },
            },
          ],
          total: 1,
        },
      });

      // Act
      const result = await controller.getRecentBranches();

      // Assert
      expect(result.success).toBe(true);

      expect(mockGetRecentBranchesUseCase.execute).toHaveBeenCalledWith({
        limit: undefined,
      });
    });

    it('should get recent branches with custom limit', async () => {
      // Arrange
      const limit = 5;

      mockGetRecentBranchesUseCase.execute.mockResolvedValue({
        branches: [],
        total: 0,
      });

      mockPresenter.present.mockReturnValue({
        success: true,
        data: {
          branches: [],
          total: 0,
        },
      });

      // Act
      await controller.getRecentBranches(limit);

      // Assert
      expect(mockGetRecentBranchesUseCase.execute).toHaveBeenCalledWith({
        limit,
      });
    });
  });

  describe('findDocumentsByTags', () => {
    it('should find documents by tags', async () => {
      // Arrange
      const branchName = 'feature/test';
      const tags = ['test', 'document'];
      const matchAllTags = true;

      const documents: DocumentDTO[] = [
        {
          path: 'doc1.md',
          content: 'Content 1',
          tags: ['test', 'document'],
          lastModified: '2023-01-01T00:00:00.000Z',
        },
        {
          path: 'doc2.md',
          content: 'Content 2',
          tags: ['test', 'document', 'other'],
          lastModified: '2023-01-02T00:00:00.000Z',
        },
      ];

      mockSearchDocumentsByTagsUseCase.execute.mockResolvedValue({
        documents,
        searchInfo: {
          count: documents.length,
          searchedTags: tags,
          matchedAllTags: matchAllTags,
          searchLocation: branchName,
        },
      });

      mockPresenter.present.mockReturnValue({
        success: true,
        data: documents,
      });

      // Act
      const result = await controller.findDocumentsByTags(branchName, tags, matchAllTags);

      // Assert
      expect(result.success).toBe(true);
      expect(result.success).toBe(true);
      expect(mockPresenter.present).toHaveBeenCalledWith(documents);

      expect(mockSearchDocumentsByTagsUseCase.execute).toHaveBeenCalledWith({
        branchName,
        tags,
        matchAllTags,
      });
    });
  });

  describe('updateTagsIndex', () => {
    it('should update tags index', async () => {
      // Arrange
      const branchName = 'feature/test';
      const fullRebuild = true;

      mockUpdateTagIndexUseCase.execute.mockResolvedValue({
        tags: ['test', 'document'],
        documentCount: 2,
        updateInfo: {
          fullRebuild: true,
          updateLocation: branchName,
          timestamp: new Date().toISOString(),
        },
      });

      mockPresenter.present.mockReturnValue({
        success: true,
        data: {
          tags: ['test', 'document'],
          documentCount: 2,
          updateInfo: {
            fullRebuild: true,
            updateLocation: branchName,
            timestamp: expect.any(String),
          },
        },
      });

      // Act
      const result = await controller.updateTagsIndex(branchName, fullRebuild);

      // Assert
      expect(result.success).toBe(true);

      expect(mockUpdateTagIndexUseCase.execute).toHaveBeenCalledWith({
        branchName,
        fullRebuild,
      });
    });
  });

  describe('error handling', () => {
    it('should handle domain errors', async () => {
      // Arrange - Using readDocument as example
      const error = new DomainError('INVALID_PATH', 'Invalid document path');

      mockReadBranchDocumentUseCase.execute.mockRejectedValue(error);

      mockPresenter.presentError.mockReturnValue({
        success: false,
        error: {
          code: 'DOMAIN_ERROR.INVALID_PATH',
          message: 'Invalid document path',
        },
      });

      // Act
      const result = await controller.readDocument('feature/test', 'invalid.md');

      // Assert
      expect(result.success).toBe(false);
      expect(mockPresenter.presentError).toHaveBeenCalledWith(error);
    });

    it('should handle application errors', async () => {
      // Arrange - Using writeDocument as example
      const error = new ApplicationError('USE_CASE_EXECUTION_FAILED', 'Failed to execute use case');

      mockWriteBranchDocumentUseCase.execute.mockRejectedValue(error);

      mockPresenter.presentError.mockReturnValue({
        success: false,
        error: {
          code: 'APP_ERROR.USE_CASE_EXECUTION_FAILED',
          message: 'Failed to execute use case',
        },
      });

      // Act
      const result = await controller.writeDocument('feature/test', 'test.md', 'content');

      // Assert
      expect(result.success).toBe(false);
      expect(mockPresenter.presentError).toHaveBeenCalledWith(error);
    });

    it('should handle infrastructure errors', async () => {
      // Arrange - Using readCoreFiles as example
      const error = new InfrastructureError('FILE_SYSTEM_ERROR', 'File system error');

      mockReadBranchCoreFilesUseCase.execute.mockRejectedValue(error);

      mockPresenter.presentError.mockReturnValue({
        success: false,
        error: {
          code: 'INFRA_ERROR.FILE_SYSTEM_ERROR',
          message: 'File system error',
        },
      });

      // Act
      const result = await controller.readCoreFiles('feature/test');

      // Assert
      expect(result.success).toBe(false);
      expect(mockPresenter.presentError).toHaveBeenCalledWith(error);
    });

    it('should handle unknown errors', async () => {
      // Arrange - Using getRecentBranches as example
      const error = new Error('Unknown error');

      mockGetRecentBranchesUseCase.execute.mockRejectedValue(error);

      mockPresenter.presentError.mockReturnValue({
        success: false,
        error: {
          code: 'APP_ERROR.UNEXPECTED_ERROR',
          message: 'Unknown error',
        },
      });

      // Act
      const result = await controller.getRecentBranches();

      // Assert
      expect(result.success).toBe(false);
      expect(mockPresenter.presentError).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unknown error',
        })
      );
    });
  });
});
