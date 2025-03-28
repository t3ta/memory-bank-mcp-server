// @ts-nocheck
// This file was automatically converted from ts-mockito to jest.fn()
import { describe, it, expect, beforeEach } from '@jest/globals';
import { jest } from '@jest/globals';
import { BranchController } from '../../../../packages/mcp/src/interface/controllers/BranchController';
import { ReadBranchDocumentUseCase } from '../../../../packages/mcp/src/application/usecases/branch/ReadBranchDocumentUseCase';
import { WriteBranchDocumentUseCase } from '../../../../packages/mcp/src/application/usecases/branch/WriteBranchDocumentUseCase';
import { SearchDocumentsByTagsUseCase } from '../../../../packages/mcp/src/application/usecases/common/SearchDocumentsByTagsUseCase';
import { UpdateTagIndexUseCase } from '../../../../packages/mcp/src/application/usecases/common/UpdateTagIndexUseCase';
import { GetRecentBranchesUseCase } from '../../../../packages/mcp/src/application/usecases/common/GetRecentBranchesUseCase';
import { ReadBranchCoreFilesUseCase } from '../../../../packages/mcp/src/application/usecases/common/ReadBranchCoreFilesUseCase';
import { CreateBranchCoreFilesUseCase } from '../../../../packages/mcp/src/application/usecases/common/CreateBranchCoreFilesUseCase';
import { MCPResponsePresenter } from '../../../../packages/mcp/src/interface/presenters/MCPResponsePresenter';
import { DocumentDTO } from '../../../../packages/mcp/src/application/dtos/DocumentDTO';
import { JsonDocumentDTO } from '../../../../packages/mcp/src/application/dtos/JsonDocumentDTO';
import { DomainError } from '../../../../packages/mcp/src/shared/errors/DomainError';
import { ApplicationError } from '../../../../packages/mcp/src/shared/errors/ApplicationError';
import { InfrastructureError } from '../../../../packages/mcp/src/shared/errors/InfrastructureError';
import { ReadJsonDocumentUseCase } from '../../../../packages/mcp/src/application/usecases/json/ReadJsonDocumentUseCase';
import { WriteJsonDocumentUseCase } from '../../../../packages/mcp/src/application/usecases/json/WriteJsonDocumentUseCase';
import { DeleteJsonDocumentUseCase } from '../../../../packages/mcp/src/application/usecases/json/DeleteJsonDocumentUseCase';
import { SearchJsonDocumentsUseCase } from '../../../../packages/mcp/src/application/usecases/json/SearchJsonDocumentsUseCase';
import { UpdateJsonIndexUseCase } from '../../../../packages/mcp/src/application/usecases/json/UpdateJsonIndexUseCase';
import { DocumentType } from '../../../../packages/mcp/src/domain/entities/JsonDocument';

// Mock use cases
const mockReadBranchDocumentUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<ReadBranchDocumentUseCase>;

const mockWriteBranchDocumentUseCase = {
  execute: jest.fn(),
  branchRepository: {
    exists: jest.fn(() => Promise.resolve(true)),
    saveTagIndex: jest.fn(() => Promise.resolve(true)),
  },
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

// Mock JSON use cases
const mockReadJsonDocumentUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<ReadJsonDocumentUseCase>;

const mockWriteJsonDocumentUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<WriteJsonDocumentUseCase>;

const mockDeleteJsonDocumentUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<DeleteJsonDocumentUseCase>;

const mockSearchJsonDocumentsUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<SearchJsonDocumentsUseCase>;

const mockUpdateJsonIndexUseCase = {
  execute: jest.fn(),
} as unknown as jest.Mocked<UpdateJsonIndexUseCase>;

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
      mockPresenter,
      {
        readJsonDocumentUseCase: mockReadJsonDocumentUseCase,
        writeJsonDocumentUseCase: mockWriteJsonDocumentUseCase,
        deleteJsonDocumentUseCase: mockDeleteJsonDocumentUseCase,
        searchJsonDocumentsUseCase: mockSearchJsonDocumentsUseCase,
        updateJsonIndexUseCase: mockUpdateJsonIndexUseCase,
      }
    );
  });

  describe('readDocument', () => {
    it('should read document and return success response', async () => {
      // Arrange
      const branchName = 'feature/test';
      const path = 'test.json';
      const documentDTO: DocumentDTO = {
        path: 'test.json',
        content: '{"title": "Test", "content": {"text": "Content"}}',
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
      expect(mockReadBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName,
        path,
      });
      expect(mockPresenter.present).toHaveBeenCalledWith(documentDTO);
    });

    it('should auto-parse content.text for JSON documents with memory_document_v2 schema', async () => {
      // Arrange
      const branchName = 'feature/test';
      const path = 'test.json';
      const documentContent = JSON.stringify({
        schema: 'memory_document_v2',
        metadata: {
          id: '123',
          title: 'Test Document',
          documentType: 'test',
          path: 'test.json',
          tags: ['test'],
          lastModified: '2023-01-01T00:00:00.000Z',
          createdAt: '2023-01-01T00:00:00.000Z',
          version: 1
        },
        content: {
          text: JSON.stringify({ key: 'value', nested: { data: true } })
        }
      });

      const documentDTO: DocumentDTO = {
        path: 'test.json',
        content: documentContent,
        tags: ['test'],
        lastModified: '2023-01-01T00:00:00.000Z',
      };

      mockReadBranchDocumentUseCase.execute.mockResolvedValue({
        document: documentDTO,
      });

      mockPresenter.present.mockImplementation((doc) => ({
        success: true,
        data: doc,
      }));

      // Act
      const result = await controller.readDocument(branchName, path);

      // Assert
      expect(result.success).toBe(true);

      // Check that the document was returned with parsed content.text
      const parsedContent = JSON.parse(mockPresenter.present.mock.calls[0][0].content);
      expect(parsedContent.content.text).toEqual({ key: 'value', nested: { data: true } });
    });

    it('should handle errors from ReadBranchDocumentUseCase', async () => {
      // Arrange
      const branchName = 'feature/test';
      const path = 'nonexistent.json';
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
      expect(mockPresenter.presentError).toHaveBeenCalledWith(error);
    });
  });

  describe('writeDocument', () => {
    it('should write document and return success response', async () => {
      // Arrange
      const branchName = 'feature/test';
      const path = 'test.json';
      const content = '{"title": "Test", "content": "Content"}';
      const tags = ['test', 'document'];

      mockWriteBranchDocumentUseCase.execute.mockResolvedValue({
        success: true,
      });

      mockPresenter.present.mockReturnValue({
        success: true,
        data: { success: true },
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
    });
  });

  describe('readCoreFiles', () => {
    it('should read core files with .json extension only', async () => {
      // Arrange
      const branchName = 'feature/test';

      // Mock core files content as JSON objects (not strings)
      const activeContextObj = {
        schema: 'memory_document_v2',
        metadata: {
          id: 'ac123',
          title: 'アクティブコンテキスト',
          documentType: 'active_context',
          path: 'activeContext.json',
          tags: ['core', 'active-context'],
          lastModified: '2023-01-01T00:00:00.000Z',
          createdAt: '2023-01-01T00:00:00.000Z',
          version: 1
        },
        content: {
          currentWork: 'Current work',
          recentChanges: ['Change 1', 'Change 2'],
          activeDecisions: ['Decision 1'],
          considerations: ['Consideration 1'],
          nextSteps: ['Step 1', 'Step 2']
        }
      };

      const progressObj = {
        schema: 'memory_document_v2',
        metadata: {
          id: 'p123',
          title: '進捗状況',
          documentType: 'progress',
          path: 'progress.json',
          tags: ['core', 'progress'],
          lastModified: '2023-01-01T00:00:00.000Z',
          createdAt: '2023-01-01T00:00:00.000Z',
          version: 1
        },
        content: {
          status: 'In progress',
          workingFeatures: ['Feature 1'],
          pendingImplementation: ['Feature 2'],
          knownIssues: ['Issue 1']
        }
      };

      const systemPatternsObj = {
        schema: 'memory_document_v2',
        metadata: {
          id: 'sp123',
          title: 'システムパターン',
          documentType: 'system_patterns',
          path: 'systemPatterns.json',
          tags: ['core', 'system-patterns'],
          lastModified: '2023-01-01T00:00:00.000Z',
          createdAt: '2023-01-01T00:00:00.000Z',
          version: 1
        },
        content: {
          technicalDecisions: [
            {
              title: 'Decision Title',
              context: 'Decision Context',
              decision: 'The Decision',
              consequences: ['Consequence 1', 'Consequence 2']
            }
          ]
        }
      };

      // Mock ReadBranchCoreFilesUseCase response with JSON objects
      mockReadBranchCoreFilesUseCase.execute.mockResolvedValue({
        files: {
          activeContext: activeContextObj.content,
          progress: progressObj.content,
          systemPatterns: systemPatternsObj.content
        }
      });

      // Mock BranchDocument use case response for branchContext.json
      const branchContextContent = JSON.stringify({
        schema: 'memory_document_v2',
        metadata: {
          id: 'bc123',
          title: 'ブランチコンテキスト',
          documentType: 'branch_context',
          path: 'branchContext.json',
          tags: ['core', 'branch-context'],
          lastModified: '2023-01-01T00:00:00.000Z',
          createdAt: '2023-01-01T00:00:00.000Z',
          version: 1
        },
        content: {
          branchName: 'feature/test',
          purpose: 'Testing purpose',
          createdAt: '2023-01-01T00:00:00.000Z'
        }
      });

      mockReadBranchDocumentUseCase.execute.mockResolvedValue({
        document: {
          path: 'branchContext.json',
          content: branchContextContent,
          tags: ['core', 'branch-context'],
          lastModified: '2023-01-01T00:00:00.000Z'
        }
      });

      // Mock presenter
      mockPresenter.present.mockImplementation((data) => ({
        success: true,
        data
      }));

      // Act
      const result = await controller.readCoreFiles(branchName);

      // Assert
      expect(result.success).toBe(true);

      // Verify ReadBranchCoreFilesUseCase was called
      expect(mockReadBranchCoreFilesUseCase.execute).toHaveBeenCalledWith({
        branchName
      });

      // Verify ReadBranchDocumentUseCase was called for branchContext.json
      expect(mockReadBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName,
        path: 'branchContext.json'
      });

      // Check that presenter was called with JSON formatted documents
      const presentedData = mockPresenter.present.mock.calls[0][0];

      // Verify structure of the returned data
      expect(presentedData).toHaveProperty('activeContext.json');
      expect(presentedData).toHaveProperty('progress.json');
      expect(presentedData).toHaveProperty('systemPatterns.json');
      expect(presentedData).toHaveProperty('branchContext.json');

      // Verify all files have .json extension
      Object.keys(presentedData).forEach(key => {
        expect(key.endsWith('.json')).toBe(true);
      });

      // Verify content of activeContext is stringified JSON
      const activeContextContent = JSON.parse(presentedData['activeContext.json'].content);
      expect(activeContextContent).toHaveProperty('content.currentWork', 'Current work');

      // Verify content of progress is stringified JSON
      const progressContent = JSON.parse(presentedData['progress.json'].content);
      expect(progressContent).toHaveProperty('content.status', 'In progress');

      // Verify content of systemPatterns is stringified JSON
      const systemPatternsContent = JSON.parse(presentedData['systemPatterns.json'].content);
      expect(systemPatternsContent).toHaveProperty('content.technicalDecisions');
    });

    it('should handle errors when reading branchContext.json', async () => {
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
            nextSteps: []
          },
          progress: {
            status: 'In progress',
            workingFeatures: [],
            pendingImplementation: [],
            knownIssues: []
          },
          systemPatterns: {
            technicalDecisions: []
          }
        }
      });

      // Mock error for branchContext.json
      mockReadBranchDocumentUseCase.execute.mockRejectedValue(
        new DomainError('DOCUMENT_NOT_FOUND', 'Document not found')
      );

      // Mock presenter
      mockPresenter.present.mockImplementation((data) => ({
        success: true,
        data
      }));

      // Act
      const result = await controller.readCoreFiles(branchName);

      // Assert
      expect(result.success).toBe(true);

      // Check core files were returned without branchContext
      const presentedData = mockPresenter.present.mock.calls[0][0];
      expect(presentedData).toHaveProperty('activeContext.json');
      expect(presentedData).toHaveProperty('progress.json');
      expect(presentedData).toHaveProperty('systemPatterns.json');

      // The controller should handle the missing branchContext gracefully
      expect(mockReadBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName,
        path: 'branchContext.json'
      });
    });
  });

  describe('writeCoreFiles', () => {
    it('should write core files with .json extension only', async () => {
      // Arrange
      const branchName = 'feature/test';

      // JSON objects for core files
      const files = {
        'activeContext.json': {
          schema: 'memory_document_v2',
          metadata: {
            id: 'ac123',
            title: 'アクティブコンテキスト',
            documentType: 'active_context'
          },
          content: {
            currentWork: 'Current work',
            recentChanges: ['Change 1'],
            activeDecisions: [],
            considerations: [],
            nextSteps: []
          }
        },
        'progress.json': {
          schema: 'memory_document_v2',
          metadata: {
            id: 'p123',
            title: '進捗状況',
            documentType: 'progress'
          },
          content: {
            status: 'In progress',
            workingFeatures: [],
            pendingImplementation: [],
            knownIssues: []
          }
        },
        'systemPatterns.json': {
          schema: 'memory_document_v2',
          metadata: {
            id: 'sp123',
            title: 'システムパターン',
            documentType: 'system_patterns'
          },
          content: {
            technicalDecisions: []
          }
        },
        'branchContext.json': {
          schema: 'memory_document_v2',
          metadata: {
            id: 'bc123',
            title: 'ブランチコンテキスト',
            documentType: 'branch_context'
          },
          content: {
            branchName: 'feature/test',
            purpose: 'Testing purpose'
          }
        }
      };

      // Convert to stringified JSON for the test
      const stringifiedFiles = {};
      Object.entries(files).forEach(([key, value]) => {
        stringifiedFiles[key] = JSON.stringify(value);
      });

      // Mock CreateBranchCoreFilesUseCase
      mockCreateBranchCoreFilesUseCase.execute.mockResolvedValue({
        success: true,
        updatedFiles: ['activeContext.json', 'progress.json', 'systemPatterns.json']
      });

      // Mock presenter
      mockPresenter.present.mockReturnValue({
        success: true,
        data: {
          success: true,
          updatedFiles: ['activeContext.json', 'progress.json', 'systemPatterns.json']
        }
      });

      // Act
      const result = await controller.writeCoreFiles(branchName, stringifiedFiles);

      // Assert
      expect(result.success).toBe(true);

      // Verify CreateBranchCoreFilesUseCase was called with parsed content
      expect(mockCreateBranchCoreFilesUseCase.execute).toHaveBeenCalledWith({
        branchName,
        files: expect.objectContaining({
          activeContext: expect.anything(),
          progress: expect.anything(),
          systemPatterns: expect.anything()
        })
      });

      // Verify presenter was called with success response
      expect(mockPresenter.present).toHaveBeenCalled();
    });

    it('should validate input files object', async () => {
      // Arrange
      const branchName = 'feature/test';
      const invalidInput = null;

      mockPresenter.presentError.mockReturnValue({
        success: false,
        error: {
          code: 'DOMAIN_ERROR.VALIDATION_ERROR',
          message: 'Files must be provided as an object'
        }
      });

      // Act
      const result = await controller.writeCoreFiles(branchName, invalidInput);

      // Assert
      expect(result.success).toBe(false);
      expect(mockPresenter.presentError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'VALIDATION_ERROR',
          message: 'Files must be provided as an object'
        })
      );

      // Verify core files use cases were not called
      expect(mockCreateBranchCoreFilesUseCase.execute).not.toHaveBeenCalled();
    });
  });

  describe('JSON document operations', () => {
    describe('readJsonDocument', () => {
      it('should read JSON document by path', async () => {
        // Arrange
        const branchName = 'feature/test';
        const path = 'document.json';
        const jsonDoc: JsonDocumentDTO = {
          id: 'doc123',
          path: 'document.json',
          title: 'Test Document',
          documentType: 'test' as DocumentType,
          content: { data: 'test content' },
          tags: ['test']
        };

        mockReadJsonDocumentUseCase.execute.mockResolvedValue({
          document: jsonDoc
        });

        mockPresenter.present.mockReturnValue({
          success: true,
          data: jsonDoc
        });

        // Act
        const result = await controller.readJsonDocument(branchName, { path });

        // Assert
        expect(result.success).toBe(true);
        expect(mockReadJsonDocumentUseCase.execute).toHaveBeenCalledWith({
          branchName,
          path,
          id: undefined
        });
        expect(mockPresenter.present).toHaveBeenCalledWith(jsonDoc);
      });

      it('should read JSON document by id', async () => {
        // Arrange
        const branchName = 'feature/test';
        const id = 'doc123';
        const jsonDoc: JsonDocumentDTO = {
          id,
          path: 'document.json',
          title: 'Test Document',
          documentType: 'test' as DocumentType,
          content: { data: 'test content' },
          tags: ['test']
        };

        mockReadJsonDocumentUseCase.execute.mockResolvedValue({
          document: jsonDoc
        });

        mockPresenter.present.mockReturnValue({
          success: true,
          data: jsonDoc
        });

        // Act
        const result = await controller.readJsonDocument(branchName, { id });

        // Assert
        expect(result.success).toBe(true);
        expect(mockReadJsonDocumentUseCase.execute).toHaveBeenCalledWith({
          branchName,
          path: undefined,
          id
        });
      });

      it('should handle feature not available error', async () => {
        // Arrange
        const branchName = 'feature/test';
        const path = 'document.json';

        // Set JSON document use case to null to simulate feature not available
        const controllerWithoutJsonFeatures = new BranchController(
          mockReadBranchDocumentUseCase,
          mockWriteBranchDocumentUseCase,
          mockSearchDocumentsByTagsUseCase,
          mockUpdateTagIndexUseCase,
          mockGetRecentBranchesUseCase,
          mockReadBranchCoreFilesUseCase,
          mockCreateBranchCoreFilesUseCase,
          mockPresenter
        );

        mockPresenter.presentError.mockReturnValue({
          success: false,
          error: {
            code: 'DOMAIN_ERROR.FEATURE_NOT_AVAILABLE',
            message: 'JSON document features are not available in this configuration'
          }
        });

        // Act
        const result = await controllerWithoutJsonFeatures.readJsonDocument(branchName, { path });

        // Assert
        expect(result.success).toBe(false);
        expect(mockPresenter.presentError).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 'FEATURE_NOT_AVAILABLE',
            message: 'JSON document features are not available in this configuration'
          })
        );
      });
    });

    describe('writeJsonDocument', () => {
      it('should write JSON document', async () => {
        // Arrange
        const branchName = 'feature/test';
        const jsonDoc: JsonDocumentDTO = {
          id: 'doc123',
          path: 'document.json',
          title: 'Test Document',
          documentType: 'test' as DocumentType,
          content: { data: 'test content' },
          tags: ['test']
        };

        mockWriteJsonDocumentUseCase.execute.mockResolvedValue({
          success: true,
          documentId: 'doc123'
        });

        mockPresenter.present.mockReturnValue({
          success: true,
          data: {
            success: true,
            documentId: 'doc123'
          }
        });

        // Act
        const result = await controller.writeJsonDocument(branchName, jsonDoc);

        // Assert
        expect(result.success).toBe(true);
        expect(mockWriteJsonDocumentUseCase.execute).toHaveBeenCalledWith({
          branchName,
          document: jsonDoc
        });
      });
    });

    describe('deleteJsonDocument', () => {
      it('should delete JSON document by path', async () => {
        // Arrange
        const branchName = 'feature/test';
        const path = 'document.json';

        mockDeleteJsonDocumentUseCase.execute.mockResolvedValue({
          success: true
        });

        mockPresenter.present.mockReturnValue({
          success: true,
          data: { success: true }
        });

        // Act
        const result = await controller.deleteJsonDocument(branchName, { path });

        // Assert
        expect(result.success).toBe(true);
        expect(mockDeleteJsonDocumentUseCase.execute).toHaveBeenCalledWith({
          branchName,
          path,
          id: undefined
        });
      });
    });

    describe('listJsonDocuments', () => {
      it('should list JSON documents with filters', async () => {
        // Arrange
        const branchName = 'feature/test';
        const filters = {
          type: 'test' as DocumentType,
          tags: ['test', 'document']
        };

        const documents: JsonDocumentDTO[] = [
          {
            id: 'doc1',
            path: 'doc1.json',
            title: 'Document 1',
            documentType: 'test' as DocumentType,
            content: { data: 'test content 1' },
            tags: ['test', 'document']
          },
          {
            id: 'doc2',
            path: 'doc2.json',
            title: 'Document 2',
            documentType: 'test' as DocumentType,
            content: { data: 'test content 2' },
            tags: ['test', 'document']
          }
        ];

        mockSearchJsonDocumentsUseCase.execute.mockResolvedValue({
          documents,
          count: documents.length
        });

        mockPresenter.present.mockReturnValue({
          success: true,
          data: documents
        });

        // Act
        const result = await controller.listJsonDocuments(branchName, filters);

        // Assert
        expect(result.success).toBe(true);
        expect(mockSearchJsonDocumentsUseCase.execute).toHaveBeenCalledWith({
          branchName,
          documentType: filters.type,
          tags: filters.tags
        });
        expect(mockPresenter.present).toHaveBeenCalledWith(documents);
      });
    });

    describe('updateJsonIndex', () => {
      it('should update JSON index', async () => {
        // Arrange
        const branchName = 'feature/test';
        const force = true;

        mockUpdateJsonIndexUseCase.execute.mockResolvedValue({
          success: true,
          indexedDocuments: 10,
          updateInfo: {
            timestamp: new Date().toISOString(),
            location: branchName
          }
        });

        mockPresenter.present.mockReturnValue({
          success: true,
          data: {
            success: true,
            indexedDocuments: 10
          }
        });

        // Act
        const result = await controller.updateJsonIndex(branchName, { force });

        // Assert
        expect(result.success).toBe(true);
        expect(mockUpdateJsonIndexUseCase.execute).toHaveBeenCalledWith({
          branchName,
          fullRebuild: force
        });
      });
    });
  });

  // その他の既存テスト（getRecentBranches, findDocumentsByTags, updateTagsIndex等）は省略

  describe('error handling for JSON extension implementation', () => {
    it('should handle domain errors properly', async () => {
      // Arrange - マークダウン時代の遺物削除後にもエラー処理が正しく機能するか確認
      const error = new DomainError('INVALID_DOCUMENT', 'Invalid document structure');

      mockReadBranchDocumentUseCase.execute.mockRejectedValue(error);

      mockPresenter.presentError.mockReturnValue({
        success: false,
        error: {
          code: 'DOMAIN_ERROR.INVALID_DOCUMENT',
          message: 'Invalid document structure'
        }
      });

      // Act
      const result = await controller.readDocument('feature/test', 'invalid.json');

      // Assert
      expect(result.success).toBe(false);
      expect(mockPresenter.presentError).toHaveBeenCalledWith(error);
    });

    it('should handle unknown errors with standard error wrapping', async () => {
      // Arrange - 不明なエラーの取り扱いテスト
      const randomError = new Error('Something unexpected happened');

      mockReadBranchCoreFilesUseCase.execute.mockRejectedValue(randomError);

      mockPresenter.presentError.mockReturnValue({
        success: false,
        error: {
          code: 'UNEXPECTED_ERROR',
          message: 'Something unexpected happened'
        }
      });

      // Act
      const result = await controller.readCoreFiles('feature/test');

      // Assert
      expect(result.success).toBe(false);
      expect(mockPresenter.presentError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: 'UNEXPECTED_ERROR',
          message: 'Something unexpected happened'
        })
      );
    });
  });
});
