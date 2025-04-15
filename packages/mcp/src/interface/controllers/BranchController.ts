import { logger } from '../../shared/utils/logger.js';
import { MCPResponsePresenter } from '../presenters/MCPResponsePresenter.js';
import { ReadBranchDocumentUseCase } from '../../application/usecases/branch/ReadBranchDocumentUseCase.js';
import { WriteBranchDocumentUseCase } from '../../application/usecases/branch/WriteBranchDocumentUseCase.js';
import { SearchDocumentsByTagsUseCase } from '../../application/usecases/common/SearchDocumentsByTagsUseCase.js';
import { UpdateTagIndexUseCase } from '../../application/usecases/common/UpdateTagIndexUseCase.js';
import { GetRecentBranchesUseCase } from '../../application/usecases/common/GetRecentBranchesUseCase.js';
import { ReadBranchCoreFilesUseCase } from '../../application/usecases/common/ReadBranchCoreFilesUseCase.js';
import { CreateBranchCoreFilesUseCase } from '../../application/usecases/common/CreateBranchCoreFilesUseCase.js';
import { DomainErrors } from '../../shared/errors/DomainError.js';
import type { IConfigProvider } from '../../infrastructure/config/interfaces/IConfigProvider.js';
import { ApplicationErrors } from '../../shared/errors/ApplicationError.js';
import { BaseError } from '../../shared/errors/BaseError.js';
import type { MCPResponse } from '../presenters/types/MCPResponse.js';
// アダプターレイヤーのインポート
import { convertAdapterToMCPResponse } from '../../adapters/mcp/MCPProtocolAdapter.js';
import { convertDomainToAdapter } from '../../adapters/domain/DomainAdapter.js';

/**
 * Controller for branch related operations
 * @deprecated Use DocumentController with scope=branch instead for better adapter layer integration
 *
 * @deprecated Use DocumentController instead. This controller is maintained for backward compatibility.
 * This controller will be removed in a future version.
 */
export class BranchController {
  private readonly componentLogger = logger.withContext({ component: 'BranchController' });

  constructor(
    private readonly readBranchDocumentUseCase: ReadBranchDocumentUseCase,
    private readonly writeBranchDocumentUseCase: WriteBranchDocumentUseCase,
    private readonly searchDocumentsByTagsUseCase: SearchDocumentsByTagsUseCase,
    private readonly updateTagIndexUseCase: UpdateTagIndexUseCase,
    private readonly getRecentBranchesUseCase: GetRecentBranchesUseCase,
    private readonly readBranchCoreFilesUseCase: ReadBranchCoreFilesUseCase,
    private readonly createBranchCoreFilesUseCase: CreateBranchCoreFilesUseCase,
    private readonly presenter: MCPResponsePresenter,
    private readonly configProvider: IConfigProvider, // Inject ConfigProvider
  ) { }

  /**
   * Read a branch document
   * @param branchName Branch name (optional)
   * @param path Document path
   * @returns Promise resolving to MCP response with document
   */
  async readDocument(branchName: string | undefined, path: string): Promise<MCPResponse> {
    try {
      // branchName が undefined でもログにはそのまま記録される
      this.componentLogger.info('Reading branch document', { operation: 'readDocument', branchName, path });

      // UseCase にそのまま渡す（UseCase側で undefined を処理）
      const documentResult = await this.readBranchDocumentUseCase.execute({
        branchName, // undefined の可能性あり
        path,
      });

      // ドメインモデルからアダプターレイヤーへの変換
      const adapterResult = convertDomainToAdapter({
        documentType: path.split('.').pop() || 'unknown',
        content: typeof documentResult.document.content === 'string'
          ? JSON.parse(documentResult.document.content)
          : documentResult.document.content,
        metadata: {
          tags: documentResult.document.tags || [],
          lastModified: documentResult.document.lastModified,
          path: documentResult.document.path
        }
      });

      // アダプターレイヤーからMCPレスポンスへの変換
      const mcpResponse = convertAdapterToMCPResponse(adapterResult);

      return this.presenter.presentRawResponse(mcpResponse);
    } catch (error) {
      // エラーログでも branchName は undefined の可能性がある
      this.componentLogger.error('Failed to read branch document', { operation: 'readDocument', branchName, path, error });
      return this.handleError(error);
    }
  }

  /**
   * Write a branch document
   * @param params Write document parameters
   * @returns Promise resolving to MCP response with document
   */
  async writeDocument(params: {
    branchName?: string;
    path: string;
    content?: Record<string, unknown> | string; // Allow object or string
    tags?: string[];
    patches?: Record<string, unknown>[]; // パッチオペレーションの配列
  }): Promise<MCPResponse> {
    // Destructure params
    const { branchName, path, content, tags, patches } = params;
    try {
      // Determine conditions first
      const hasPatches = patches && Array.isArray(patches) && patches.length > 0;
      // Check if content is not undefined, not null, AND not an empty string
      const hasContent = content !== undefined && content !== null && content !== '';

      // branchName が undefined でもログにはそのまま記録される
      this.componentLogger.info('Writing branch document', {
        operation: 'writeDocument',
        branchName,
        path,
        hasContent,
        hasPatches,
        contentType: hasContent ? typeof content : 'none'
      });

      let result;

      if (hasPatches) {
        // アダプター層は現在このルートでは使用していないが、将来の拡張に備えてコメントとして残す
        // const adapterInput = {
        //   content: { path, patches, tags },
        //   metadata: {}
        // };

        // Call WriteBranchDocumentUseCase with patches
        result = await this.writeBranchDocumentUseCase.execute({
          branchName, // undefined の可能性あり
          document: { // Pass path and tags from the document object
            path: path,
            tags: tags,
            content: undefined // Pass undefined when using patches
          },
          patches: patches // Pass the patches array
        });
      } else if (hasContent) {
        // 入力をアダプター層形式に変換（現在使用していないが、将来の拡張のためにコメントとして残す）
        // const documentType = path.split('.').pop() || 'unknown';

        // If content is provided (and no patches), call the existing UseCase
        // Content is already known to be a non-empty string here due to hasContent check
        result = await this.writeBranchDocumentUseCase.execute({
          branchName, // undefined の可能性あり
          document: { // Pass data matching WriteDocumentDTO
            path: path,
            content: content, // Pass the valid string content
            tags: tags // Pass tags if available
          }
          // No patches field here
        });
      } else {
        // Handle the case where neither content nor patches are provided
        const patchesType = typeof patches;
        const patchesValue = JSON.stringify(patches);
        const patchesLength = Array.isArray(patches) ? patches.length : 'N/A';
        const contentType = typeof content;
        const contentValue = JSON.stringify(content);
        const debugMessage = `DEBUG: Entered init branch unexpectedly. patches type: ${patchesType}, patches length: ${patchesLength}, patches value: ${patchesValue}, content type: ${contentType}, content value: ${contentValue}`;

        this.componentLogger.info(debugMessage, { operation: 'writeDocument', branchName, path });

        // アダプターレイヤーを使用したレスポンス形式
        const adapterResult = {
          content: { message: debugMessage },
          isError: false,
          metadata: {}
        };

        const mcpResponse = convertAdapterToMCPResponse(adapterResult);
        return this.presenter.presentRawResponse(mcpResponse);
      }

      // 結果をアダプターレイヤーを通じて変換
      const documentResult = result.document;

      // ドメインモデルからアダプターレイヤーへの変換
      const adapterResult = convertDomainToAdapter({
        documentType: path.split('.').pop() || 'unknown',
        content: typeof documentResult.content === 'string'
          ? JSON.parse(documentResult.content)
          : documentResult.content,
        metadata: {
          tags: documentResult.tags || [],
          lastModified: documentResult.lastModified,
          path: documentResult.path
        }
      });

      // アダプターレイヤーからMCPレスポンスへの変換
      const mcpResponse = convertAdapterToMCPResponse(adapterResult);

      return this.presenter.presentRawResponse(mcpResponse);
    } catch (error) {
      // Log the error with destructured variables available in this scope
      // エラーログでも branchName は undefined の可能性がある
      this.componentLogger.error('Failed to write branch document', {
        operation: 'writeDocument',
        branchName,
        path,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return this.handleError(error);
    }
  } // Closing brace for the writeDocument method

  /**
   * Read core files for a branch
   * @param branchName Branch name
   * @returns Promise resolving to MCP response with core files
   */
  async readCoreFiles(branchName: string): Promise<MCPResponse> {
    try {
      this.componentLogger.info('Reading branch core files', { operation: 'readCoreFiles', branchName });

      const result = await this.readBranchCoreFilesUseCase.execute({ branchName });

      // 結果をアダプターレイヤーを通じて変換
      const adapterResult = {
        content: result,
        isError: false,
        metadata: { branchName }
      };

      // アダプターレイヤーからMCPレスポンスへの変換
      const mcpResponse = convertAdapterToMCPResponse(adapterResult);

      return this.presenter.presentRawResponse(mcpResponse);
    } catch (error) {
      this.componentLogger.error('Failed to read branch core files', {
        operation: 'readCoreFiles',
        branchName,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return this.handleError(error);
    }
  }

  /**
   * Create core files for a branch
   * @param branchName Branch name
   * @param files Core files to create
   * @returns Promise resolving to MCP response with result
   */
  async createCoreFiles(branchName: string, files: Record<string, unknown>): Promise<MCPResponse> {
    try {
      this.validateFiles(files);
      this.componentLogger.info('Creating branch core files', {
        operation: 'createCoreFiles',
        branchName,
        fileCount: Object.keys(files).length
      });

      await this.createBranchCoreFilesUseCase.execute({
        branchName: branchName,
        files,
      });

      // 結果をアダプターレイヤーを通じて変換
      const adapterResult = {
        content: {
          message: 'Core files created successfully',
          fileCount: Object.keys(files).length
        },
        isError: false,
        metadata: { branchName }
      };

      // アダプターレイヤーからMCPレスポンスへの変換
      const mcpResponse = convertAdapterToMCPResponse(adapterResult);

      return this.presenter.presentRawResponse(mcpResponse);
    } catch (error) {
      this.componentLogger.error('Failed to create branch core files', {
        operation: 'createCoreFiles',
        branchName,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return this.handleError(error);
    }
  }

  /**
   * Search documents by tags
   * @param params Search parameters
   * @returns Promise resolving to MCP response with search results
   */
  async searchByTags(params: {
    tags: string[];
    branchName: string;
    match?: 'and' | 'or';
  }): Promise<MCPResponse> {
    try {
      const { tags, branchName, match } = params;
      this.componentLogger.info('Searching branch documents by tags', {
        operation: 'searchByTags',
        branchName,
        tags,
        match
      });

      // Get docs path from injected configProvider
      const docsPath = this.configProvider.getConfig().docsRoot;
      if (!docsPath) {
        throw new Error("Docs path could not be determined from config.");
      }

      const result = await this.searchDocumentsByTagsUseCase.execute({
        tags,
        branchName,
        match: match ?? 'or', // Default to 'or'
        scope: 'branch', // Always search within the specified branch
        docs: docsPath, // Pass determined docs path
      });

      // 結果をアダプターレイヤーを通じて変換
      const adapterResult = {
        content: result,
        isError: false,
        metadata: {
          branchName,
          tags,
          match: match ?? 'or',
          resultCount: result.results.length
        }
      };

      // アダプターレイヤーからMCPレスポンスへの変換
      const mcpResponse = convertAdapterToMCPResponse(adapterResult);

      return this.presenter.presentRawResponse(mcpResponse);
    } catch (error) {
      this.componentLogger.error('Failed to search documents by tags', {
        operation: 'searchByTags',
        branchName: params.branchName,
        tags: params.tags,
        match: params.match,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return this.handleError(error);
    }
  }

  /**
   * Update tag index for a branch
   * @param branchName Branch name
   * @returns Promise resolving to MCP response with result
   */
  async updateTagIndex(branchName: string): Promise<MCPResponse> {
    try {
      this.componentLogger.info('Updating tag index', { operation: 'updateTagIndex', branchName });

      const result = await this.updateTagIndexUseCase.execute({ branchName });

      // 結果をアダプターレイヤーを通じて変換
      const adapterResult = {
        content: {
          message: 'Tag index updated successfully',
          result
        },
        isError: false,
        metadata: { branchName }
      };

      // アダプターレイヤーからMCPレスポンスへの変換
      const mcpResponse = convertAdapterToMCPResponse(adapterResult);

      return this.presenter.presentRawResponse(mcpResponse);
    } catch (error) {
      this.componentLogger.error('Failed to update tag index', {
        operation: 'updateTagIndex',
        branchName,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return this.handleError(error);
    }
  }

  /**
   * Get recent branches
   * @returns Promise resolving to MCP response with recent branches
   */
  async getRecentBranches(): Promise<MCPResponse> {
    try {
      this.componentLogger.info('Getting recent branches', { operation: 'getRecentBranches' });

      const branches = await this.getRecentBranchesUseCase.execute({});

      // 結果をアダプターレイヤーを通じて変換
      const adapterResult = {
        content: branches,
        isError: false,
        metadata: {
          count: branches.total,
          timestamp: new Date().toISOString()
        }
      };

      // アダプターレイヤーからMCPレスポンスへの変換
      const mcpResponse = convertAdapterToMCPResponse(adapterResult);

      return this.presenter.presentRawResponse(mcpResponse);
    } catch (error) {
      this.componentLogger.error('Failed to get recent branches', {
        operation: 'getRecentBranches',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      return this.handleError(error);
    }
  }

  /**
   * Validate files input
   * @param files Files to validate
   * @throws DomainError if validation fails
   */
  private validateFiles(files: Record<string, unknown>): void {
    if (!files || typeof files !== 'object') {
      throw DomainErrors.validationError('Files must be provided as an object');
    }
  }

  /**
   * Handle errors
   * @param error Error to handle
   * @returns Error response
   */
  private handleError(error: unknown): MCPResponse {
    if (error instanceof BaseError) {
      // エラーをアダプターレイヤーを通じて変換
      const adapterResult = {
        content: error.message,
        isError: true,
        metadata: {
          code: error.code,
          details: error.details,
          timestamp: new Date().toISOString()
        }
      };

      // アダプターレイヤーからMCPレスポンスへの変換
      const mcpResponse = convertAdapterToMCPResponse(adapterResult);

      return this.presenter.presentRawResponse(mcpResponse);
    }

    // Convert unknown errors to ApplicationError
    const applicationError = ApplicationErrors.unexpectedControllerError(
      'BranchController',
      error instanceof Error ? error : undefined
    );

    // エラーをアダプターレイヤーを通じて変換
    const adapterResult = {
      content: applicationError.message,
      isError: true,
      metadata: {
        code: applicationError.code,
        details: applicationError.details,
        timestamp: new Date().toISOString()
      }
    };

    // アダプターレイヤーからMCPレスポンスへの変換
    const mcpResponse = convertAdapterToMCPResponse(adapterResult);

    return this.presenter.presentRawResponse(mcpResponse);
  }
}
