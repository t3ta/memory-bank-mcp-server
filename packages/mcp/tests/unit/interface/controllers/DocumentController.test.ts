import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { DocumentController } from '../../../../src/interface/controllers/DocumentController.js';
import { ReadBranchDocumentUseCase } from '../../../../src/application/usecases/branch/ReadBranchDocumentUseCase.js';
import { WriteBranchDocumentUseCase } from '../../../../src/application/usecases/branch/WriteBranchDocumentUseCase.js';
import { ReadGlobalDocumentUseCase } from '../../../../src/application/usecases/global/ReadGlobalDocumentUseCase.js';
import { WriteGlobalDocumentUseCase } from '../../../../src/application/usecases/global/WriteGlobalDocumentUseCase.js';
// import { DocumentRepositorySelector } from '../../../../src/application/services/DocumentRepositorySelector.js';
import { MCPResponsePresenter } from '../../../../src/interface/presenters/MCPResponsePresenter.js';
import { BranchInfo } from '../../../../src/domain/entities/BranchInfo.js';
import { ApplicationError } from '../../../../src/shared/errors/ApplicationError.js';
import { BaseError } from '../../../../src/shared/errors/BaseError.js';

describe('DocumentController', () => {
  // Mock use cases
  const mockReadBranchDocumentUseCase = {
    execute: vi.fn(),
  } as unknown as ReadBranchDocumentUseCase;

  const mockWriteBranchDocumentUseCase = {
    execute: vi.fn(),
  } as unknown as WriteBranchDocumentUseCase;

  const mockReadGlobalDocumentUseCase = {
    execute: vi.fn(),
  } as unknown as ReadGlobalDocumentUseCase;

  const mockWriteGlobalDocumentUseCase = {
    execute: vi.fn(),
  } as unknown as WriteGlobalDocumentUseCase;

  // // Mock repository selector
  // const mockRepositorySelector = {
  //   getRepository: vi.fn(),
  // } as unknown as DocumentRepositorySelector;

  // Mock presenter
  const mockPresenter = {
    presentSuccess: vi.fn(),
    presentError: vi.fn(),
  } as unknown as MCPResponsePresenter;

  // Create controller instance
  let controller: DocumentController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new DocumentController(
      mockReadBranchDocumentUseCase,
      mockWriteBranchDocumentUseCase,
      mockReadGlobalDocumentUseCase,
      mockWriteGlobalDocumentUseCase,
      // mockRepositorySelector,
      mockPresenter
    );
  });

  describe('readDocument', () => {
    it('should call ReadGlobalDocumentUseCase for global scope', async () => {
      // Arrange
      const params = {
        scope: 'global' as const,
        path: 'core/config.json',
      };
      const mockResult = { document: { path: params.path, content: {}, tags: [] } };
      (mockReadGlobalDocumentUseCase.execute as Mock).mockResolvedValue(mockResult);
      (mockPresenter.presentSuccess as Mock).mockReturnValue({ success: true, data: mockResult });

      // Act
      const result = await controller.readDocument(params);

      // Assert
      expect(mockReadGlobalDocumentUseCase.execute).toHaveBeenCalledWith({ path: params.path });
      expect(mockPresenter.presentSuccess).toHaveBeenCalledWith(mockResult);
      expect(result).toEqual({ success: true, data: mockResult });
    });

    it('should call ReadBranchDocumentUseCase for branch scope', async () => {
      // Arrange
      const params = {
        scope: 'branch' as const,
        branchName: 'feature/test',
        path: 'test.json',
      };
      const mockResult = { document: { path: params.path, content: {}, tags: [] } };
      (mockReadBranchDocumentUseCase.execute as Mock).mockResolvedValue(mockResult);
      (mockPresenter.presentSuccess as Mock).mockReturnValue({ success: true, data: mockResult });

      // Act
      const result = await controller.readDocument(params);

      // Assert
      expect(mockReadBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName: params.branchName,
        path: params.path,
      });
      expect(mockPresenter.presentSuccess).toHaveBeenCalledWith(mockResult);
      expect(result).toEqual({ success: true, data: mockResult });
    });

    it('should handle errors and present them', async () => {
      // Arrange
      const params = {
        scope: 'branch' as const,
        path: 'test.json',
      };
      const error = new ApplicationError('ERROR_CODE', 'Test error');
      (mockReadBranchDocumentUseCase.execute as Mock).mockRejectedValue(error);
      (mockPresenter.presentError as Mock).mockReturnValue({ success: false, error: 'Test error' });

      // Act
      const result = await controller.readDocument(params);

      // Assert
      expect(mockReadBranchDocumentUseCase.execute).toHaveBeenCalled();
      expect(mockPresenter.presentError).toHaveBeenCalledWith(error);
      expect(result).toEqual({ success: false, error: 'Test error' });
    });

    it('should handle non-BaseError errors', async () => {
      // Arrange
      const params = {
        scope: 'global' as const,
        path: 'core/config.json',
      };
      const error = new Error('Generic error');
      (mockReadGlobalDocumentUseCase.execute as Mock).mockRejectedValue(error);
      (mockPresenter.presentError as Mock).mockReturnValue({ success: false, error: 'Unexpected error' });

      // Act
      const result = await controller.readDocument(params);

      // Assert
      expect(mockReadGlobalDocumentUseCase.execute).toHaveBeenCalled();
      expect(mockPresenter.presentError).toHaveBeenCalled();
      expect(result).toEqual({ success: false, error: 'Unexpected error' });
    });

    it('should handle invalid scope', async () => {
      // Arrange
      const params = {
        scope: 'invalid' as any,
        path: 'test.json',
      };
      (mockPresenter.presentError as Mock).mockReturnValue({ success: false, error: 'Invalid scope' });

      // Act
      const result = await controller.readDocument(params);

      // Assert
      expect(mockPresenter.presentError).toHaveBeenCalled();
      expect(result).toEqual({ success: false, error: 'Invalid scope' });
    });
  });

  describe('writeDocument', () => {
    it('should call WriteGlobalDocumentUseCase for global scope with content', async () => {
      // Arrange
      const params = {
        scope: 'global' as const,
        path: 'core/config.json',
        content: { key: 'value' },
      };
      const mockResult = { document: { path: params.path } };
      (mockWriteGlobalDocumentUseCase.execute as Mock).mockResolvedValue(mockResult);
      (mockPresenter.presentSuccess as Mock).mockReturnValue({ success: true, data: mockResult });

      // Act
      const result = await controller.writeDocument(params);

      // Assert
      expect(mockWriteGlobalDocumentUseCase.execute).toHaveBeenCalledWith({
        document: {
          path: params.path,
          content: params.content,
          tags: undefined,
        },
        patches: undefined,
        returnContent: undefined,
      });
      expect(mockPresenter.presentSuccess).toHaveBeenCalledWith(mockResult.document);
      expect(result).toEqual({ success: true, data: mockResult });
    });

    it('should call WriteBranchDocumentUseCase for branch scope with content', async () => {
      // Arrange
      const params = {
        scope: 'branch' as const,
        branchName: 'feature/test',
        path: 'test.json',
        content: { key: 'value' },
        tags: ['test'],
        returnContent: true,
      };
      const mockResult = { document: { path: params.path, content: params.content, tags: params.tags } };
      (mockWriteBranchDocumentUseCase.execute as Mock).mockResolvedValue(mockResult);
      (mockPresenter.presentSuccess as Mock).mockReturnValue({ success: true, data: mockResult });

      // Act
      const result = await controller.writeDocument(params);

      // Assert
      expect(mockWriteBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName: params.branchName,
        document: {
          path: params.path,
          content: params.content,
          tags: params.tags,
        },
        patches: undefined,
        returnContent: params.returnContent,
      });
      expect(mockPresenter.presentSuccess).toHaveBeenCalledWith(mockResult.document);
      expect(result).toEqual({ success: true, data: mockResult });
    });

    it('should call WriteGlobalDocumentUseCase for global scope with patches', async () => {
      // Arrange
      const params = {
        scope: 'global' as const,
        path: 'core/config.json',
        patches: [{ op: 'replace', path: '/key', value: 'updated' }],
      };
      const mockResult = { document: { path: params.path } };
      (mockWriteGlobalDocumentUseCase.execute as Mock).mockResolvedValue(mockResult);
      (mockPresenter.presentSuccess as Mock).mockReturnValue({ success: true, data: mockResult });

      // Act
      const result = await controller.writeDocument(params);

      // Assert
      expect(mockWriteGlobalDocumentUseCase.execute).toHaveBeenCalledWith({
        document: {
          path: params.path,
          content: undefined,
          tags: undefined,
        },
        patches: params.patches,
        returnContent: undefined,
      });
      expect(mockPresenter.presentSuccess).toHaveBeenCalledWith(mockResult.document);
      expect(result).toEqual({ success: true, data: mockResult });
    });

    it('should call WriteBranchDocumentUseCase for branch scope with patches', async () => {
      // Arrange
      const params = {
        scope: 'branch' as const,
        branchName: 'feature/test',
        path: 'test.json',
        patches: [{ op: 'replace', path: '/key', value: 'updated' }],
        returnContent: true,
      };
      const mockResult = { document: { path: params.path } };
      (mockWriteBranchDocumentUseCase.execute as Mock).mockResolvedValue(mockResult);
      (mockPresenter.presentSuccess as Mock).mockReturnValue({ success: true, data: mockResult });

      // Act
      const result = await controller.writeDocument(params);

      // Assert
      expect(mockWriteBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName: params.branchName,
        document: {
          path: params.path,
          content: undefined,
          tags: undefined,
        },
        patches: params.patches,
        returnContent: params.returnContent,
      });
      expect(mockPresenter.presentSuccess).toHaveBeenCalledWith(mockResult.document);
      expect(result).toEqual({ success: true, data: mockResult });
    });

    it('should reject when both content and patches are provided', async () => {
      // Arrange
      const params = {
        scope: 'branch' as const,
        path: 'test.json',
        content: { key: 'value' },
        patches: [{ op: 'replace', path: '/key', value: 'updated' }],
      };
      (mockPresenter.presentError as Mock).mockReturnValue({ success: false, error: 'Cannot provide both content and patches' });

      // Act
      const result = await controller.writeDocument(params);

      // Assert
      expect(mockWriteBranchDocumentUseCase.execute).not.toHaveBeenCalled();
      expect(mockPresenter.presentError).toHaveBeenCalled();
      expect(result).toEqual({ success: false, error: 'Cannot provide both content and patches' });
    });
  });
});
