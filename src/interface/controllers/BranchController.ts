import type { CoreFilesDTO } from "../../application/dtos/CoreFilesDTO.js";
import type { DocumentDTO } from "../../application/dtos/DocumentDTO.js";
import type { JsonDocumentDTO } from "../../application/dtos/JsonDocumentDTO.js";
import type { UpdateTagIndexUseCaseV2 } from "../../application/usecases/common/UpdateTagIndexUseCaseV2.js";
import type { ReadJsonDocumentUseCase, WriteJsonDocumentUseCase, DeleteJsonDocumentUseCase, SearchJsonDocumentsUseCase, UpdateJsonIndexUseCase, ReadBranchDocumentUseCase, WriteBranchDocumentUseCase, SearchDocumentsByTagsUseCase, UpdateTagIndexUseCase, GetRecentBranchesUseCase, ReadBranchCoreFilesUseCase, CreateBranchCoreFilesUseCase } from "../../application/usecases/index.js";
import { DocumentType } from "../../domain/entities/JsonDocument.js";
import { ApplicationError } from "../../shared/errors/ApplicationError.js";
import { DomainError } from "../../shared/errors/DomainError.js";
import { InfrastructureError } from "../../shared/errors/InfrastructureError.js";
import { logger } from "../../shared/utils/logger.js";
import type { MCPResponsePresenter } from "../presenters/MCPResponsePresenter.js";
import type { MCPResponse } from "../presenters/types/MCPResponse.js";
import type { IBranchController } from "./interfaces/IBranchController.js";


/**
 * Controller for branch memory bank operations
 * Handles incoming requests related to branch memory banks
 */
export class BranchController implements IBranchController {
  readonly _type = 'controller' as const;

  // Note: This array is used for reference but the actual core files are determined by the use case
  // private readonly coreFiles = [
  //   'branchContext.md',
  //   'activeContext.md',
  //   'systemPatterns.md',
  //   'progress.md',
  // ];

  /**
   * Constructor
   * @param readBranchDocumentUseCase Use case for reading branch documents
   * @param writeBranchDocumentUseCase Use case for writing branch documents
   * @param searchDocumentsByTagsUseCase Use case for searching documents by tags
   * @param updateTagIndexUseCase Use case for updating tag index
   * @param getRecentBranchesUseCase Use case for getting recent branches
   * @param readBranchCoreFilesUseCase Use case for reading branch core files
   * @param createBranchCoreFilesUseCase Use case for creating branch core files
   * @param presenter Response presenter
   */
  // Optional dependencies
  private readonly updateTagIndexUseCaseV2?: UpdateTagIndexUseCaseV2;
  private readonly readJsonDocumentUseCase?: ReadJsonDocumentUseCase;
  private readonly writeJsonDocumentUseCase?: WriteJsonDocumentUseCase;
  private readonly deleteJsonDocumentUseCase?: DeleteJsonDocumentUseCase;
  private readonly searchJsonDocumentsUseCase?: SearchJsonDocumentsUseCase;
  private readonly updateJsonIndexUseCase?: UpdateJsonIndexUseCase;

  constructor(
    private readonly readBranchDocumentUseCase: ReadBranchDocumentUseCase,
    private readonly writeBranchDocumentUseCase: WriteBranchDocumentUseCase,
    private readonly searchDocumentsByTagsUseCase: SearchDocumentsByTagsUseCase,
    private readonly updateTagIndexUseCase: UpdateTagIndexUseCase,
    private readonly getRecentBranchesUseCase: GetRecentBranchesUseCase,
    private readonly readBranchCoreFilesUseCase: ReadBranchCoreFilesUseCase,
    private readonly createBranchCoreFilesUseCase: CreateBranchCoreFilesUseCase,
    private readonly presenter: MCPResponsePresenter,
    options?: {
      updateTagIndexUseCaseV2?: UpdateTagIndexUseCaseV2;
      readJsonDocumentUseCase?: ReadJsonDocumentUseCase;
      writeJsonDocumentUseCase?: WriteJsonDocumentUseCase;
      deleteJsonDocumentUseCase?: DeleteJsonDocumentUseCase;
      searchJsonDocumentsUseCase?: SearchJsonDocumentsUseCase;
      updateJsonIndexUseCase?: UpdateJsonIndexUseCase;
    }
  ) {
    // Set optional dependencies
    this.updateTagIndexUseCaseV2 = options?.updateTagIndexUseCaseV2;
    this.readJsonDocumentUseCase = options?.readJsonDocumentUseCase;
    this.writeJsonDocumentUseCase = options?.writeJsonDocumentUseCase;
    this.deleteJsonDocumentUseCase = options?.deleteJsonDocumentUseCase;
    this.searchJsonDocumentsUseCase = options?.searchJsonDocumentsUseCase;
    this.updateJsonIndexUseCase = options?.updateJsonIndexUseCase;
  }

  /**
   * Read document from branch memory bank
   * @param branchName Branch name
   * @param path Document path
   * @returns Promise resolving to MCP response with document
   */
  async readDocument(branchName: string, path: string): Promise<MCPResponse<DocumentDTO>> {
    try {
      logger.info(`Reading document from branch ${branchName}: ${path}`);

      const result = await this.readBranchDocumentUseCase.execute({
        branchName,
        path,
      });

      // 自動JSONパース処理の追加
      // jsonファイルかつcontent.textフィールドが存在する場合、JSONとしてパースを試みる
      const document = result.document;
      if (document && path.endsWith('.json') && document.content) {
        try {
          // 文字列をJSONとしてパース
          const jsonDoc = JSON.parse(document.content);
          
          // memory_document_v1またはmemory_document_v2スキーマを持つドキュメントで、
          // content.textフィールドがある場合は自動的にパースを試みる
          if (
            (jsonDoc.schema === 'memory_document_v1' || jsonDoc.schema === 'memory_document_v2') && 
            jsonDoc.content && 
            typeof jsonDoc.content === 'object' && 
            'text' in jsonDoc.content && 
            typeof jsonDoc.content.text === 'string'
          ) {
            logger.debug(`Attempting to auto-parse content.text field in JSON document: ${path}`);
            
            try {
              // content.textをJSONとしてパース
              const parsedText = JSON.parse(jsonDoc.content.text);
              // パースに成功したら、元のJSONオブジェクトのcontent.textをパース済みのオブジェクトに置き換え
              jsonDoc.content.text = parsedText;
              // 置き換えたJSONオブジェクトを文字列化して元のdocumentに設定
              document.content = JSON.stringify(jsonDoc, null, 2);
              logger.debug(`Successfully auto-parsed content.text in JSON document: ${path}`);
            } catch (parseError) {
              // パースに失敗した場合は元のまま（パースしない）
              logger.debug(`Failed to auto-parse content.text in JSON document ${path}, it's probably not a valid JSON string`);
            }
          }
        } catch (error) {
          // JSONとしてパースできなかった場合は何もしない
          logger.debug(`Document ${path} is not a valid JSON`);
        }
      }

      return this.presenter.present(document);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Write document to branch memory bank
   * @param branchName Branch name
   * @param path Document path
   * @param content Document content
   * @param tags Optional tags for the document
   * @returns Promise resolving to MCP response with the result
   */
  async writeDocument(
    branchName: string,
    path: string,
    content: string,
    tags?: string[]
  ): Promise<MCPResponse> {
    try {
      logger.info(`Writing document to branch ${branchName}: ${path}`);

      const result = await this.writeBranchDocumentUseCase.execute({
        branchName,
        document: {
          path,
          content,
          tags: tags || [],
        },
      });

      return this.presenter.present(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Read core files from branch memory bank
   * @param branchName Branch name
   * @returns Promise resolving to MCP response with core files content
   */
  async readCoreFiles(branchName: string): Promise<MCPResponse<Record<string, DocumentDTO>>> {
    try {
      logger.info(`Reading core files from branch ${branchName}`);

      // Use the new ReadBranchCoreFilesUseCase
      const result = await this.readBranchCoreFilesUseCase.execute({
        branchName,
      });

      // Format response to maintain backward compatibility
      const formattedResult: Record<string, DocumentDTO> = {};

      // Determine which file extension to use (.json preferred)
      let useJsonExtension = true;
      
      // Check for existence of files to determine extension preference
      try {
        // Try to find a branchContext file to check which extension is available
        // Check json first
        await this.readBranchDocumentUseCase.execute({
          branchName,
          path: 'branchContext.json',
        });
        useJsonExtension = true;
        logger.debug(`Using .json extension for files in branch ${branchName}`);
      } catch (jsonError) {
        try {
          // Try md if json failed
          await this.readBranchDocumentUseCase.execute({
            branchName,
            path: 'branchContext.md',
          });
          useJsonExtension = false;
          logger.debug(`Using .md extension for files in branch ${branchName}`);
        } catch (mdError) {
          // If both fail, default to json (forward compatible)
          useJsonExtension = true;
          logger.debug(`No core files found, defaulting to .json extension for branch ${branchName}`);
        }
      }
      
      // File extension to use based on availability
      const extension = useJsonExtension ? '.json' : '.md';

      // If activeContext exists in the result
      if (result.files.activeContext) {
        const fileName = `activeContext${extension}`;
        formattedResult[fileName] = {
          path: fileName,
          content: this.generateActiveContextContent(result.files.activeContext),
          tags: ['core', 'active-context'],
          lastModified: new Date().toISOString(),
        };
      }

      // If progress exists in the result
      if (result.files.progress) {
        const fileName = `progress${extension}`;
        formattedResult[fileName] = {
          path: fileName,
          content: this.generateProgressContent(result.files.progress),
          tags: ['core', 'progress'],
          lastModified: new Date().toISOString(),
        };
      }

      // If systemPatterns exists in the result
      if (result.files.systemPatterns) {
        const fileName = `systemPatterns${extension}`;
        formattedResult[fileName] = {
          path: fileName,
          content: this.generateSystemPatternsContent(result.files.systemPatterns),
          tags: ['core', 'system-patterns'],
          lastModified: new Date().toISOString(),
        };
      }

      // For branchContext, try both extensions (.json first, then .md as fallback)
      try {
        const branchFileName = `branchContext${extension}`;
        let branchContextResult;
      
        try {
          branchContextResult = await this.readBranchDocumentUseCase.execute({
            branchName,
            path: branchFileName,
          });
        } catch (primaryError) {
          logger.warn(`Could not find ${branchFileName}, trying fallback extension`);
          // If first extension fails, try the other one
          const fallbackExtension = useJsonExtension ? '.md' : '.json';
          const fallbackFileName = `branchContext${fallbackExtension}`;
          
          branchContextResult = await this.readBranchDocumentUseCase.execute({
            branchName,
            path: fallbackFileName,
          });
          
          // If fallback worked, use that extension for this file
          formattedResult[fallbackFileName] = branchContextResult.document;
          return this.presenter.present(formattedResult);
        }

        formattedResult[branchFileName] = branchContextResult.document;
      } catch (error) {
        logger.error(`Error reading branchContext file from branch ${branchName}:`, error);

        // Add empty placeholder for missing file
        const fallbackFileName = `branchContext${extension}`;
        formattedResult[fallbackFileName] = {
          path: fallbackFileName,
          content: '',
          tags: ['core', 'branch-context'],
          lastModified: new Date().toISOString(),
        };
      }

      return this.presenter.present(formattedResult);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Write core files to branch memory bank
   * @param branchName Branch name
   * @param files Core files content
   * @returns Promise resolving to MCP response with the result
   */
  async writeCoreFiles(branchName: string, files: Record<string, any>): Promise<MCPResponse> {
    try {
      logger.info(`Writing core files to branch ${branchName}`);

      // Validate input
      if (!files || typeof files !== 'object') {
        throw new DomainError('INVALID_INPUT', 'Files must be provided as an object');
      }

      // Handle branchContext.md separately since it's not part of the CoreFilesDTO
      if (files['branchContext.md']) {
        const content = this.extractContent(files['branchContext.md']);

        await this.writeBranchDocumentUseCase.execute({
          branchName,
          document: {
            path: 'branchContext.md',
            content,
            tags: ['core', 'branch-context'],
          },
        });

        // Remove from files to avoid processing it again
        delete files['branchContext.md'];
      }

      // Prepare CoreFilesDTO from the remaining files
      const coreFiles: CoreFilesDTO = {};

      // Process activeContext.md
      if (files['activeContext.md']) {
        const content = this.extractContent(files['activeContext.md']);
        coreFiles.activeContext = this.parseActiveContextContent(content);
      }

      // Process progress.md
      if (files['progress.md']) {
        const content = this.extractContent(files['progress.md']);
        coreFiles.progress = this.parseProgressContent(content);
      }

      // Process systemPatterns.md
      if (files['systemPatterns.md']) {
        const content = this.extractContent(files['systemPatterns.md']);
        coreFiles.systemPatterns = this.parseSystemPatternsContent(content);
      }

      // Use the new CreateBranchCoreFilesUseCase
      let result: any;
      if (Object.keys(coreFiles).length > 0) {
        result = await this.createBranchCoreFilesUseCase.execute({
          branchName,
          files: coreFiles,
        });
      }

      return this.presenter.present(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get recent branches
   * @param limit Maximum number of branches to return
   * @returns Promise resolving to MCP response with recent branches
   */
  async getRecentBranches(limit?: number): Promise<MCPResponse> {
    try {
      logger.info(`Getting recent branches (limit: ${limit || 'default'})`);

      const result = await this.getRecentBranchesUseCase.execute({ limit });

      return this.presenter.present(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Find documents by tags in branch memory bank
   * @param branchName Branch name
   * @param tags Tags to search for
   * @param matchAllTags Whether to require all tags to match
   * @returns Promise resolving to MCP response with matching documents
   */
  async findDocumentsByTags(
    branchName: string,
    tags: string[],
    matchAllTags?: boolean
  ): Promise<MCPResponse<DocumentDTO[]>> {
    try {
      logger.info(`Finding documents by tags in branch ${branchName}: ${tags.join(', ')}`);

      const result = await this.searchDocumentsByTagsUseCase.execute({
        branchName,
        tags,
        matchAllTags,
      });

      return this.presenter.present(result.documents);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update tags index in branch memory bank
   * @param branchName Branch name
   * @param fullRebuild Whether to perform full rebuild of the index
   * @returns Promise resolving to MCP response with the result
   */
  async updateTagsIndex(branchName: string, fullRebuild?: boolean): Promise<MCPResponse> {
    try {
      logger.info(
        `Updating tags index for branch ${branchName} (fullRebuild: ${fullRebuild ? 'yes' : 'no'})`
      );

      // Use V2 if available, otherwise fall back to V1
      if (this.updateTagIndexUseCaseV2) {
        logger.info('Using UpdateTagIndexUseCaseV2 for branch tag index update');
        const result = await this.updateTagIndexUseCaseV2.execute({
          branchName,
          fullRebuild,
        });
        return this.presenter.present(result);
      } else {
        logger.info('Using UpdateTagIndexUseCase (V1) for branch tag index update');
        const result = await this.updateTagIndexUseCase.execute({
          branchName,
          fullRebuild,
        });
        return this.presenter.present(result);
      }
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Extract content from various input formats
   * @param input Input content (string or object with content property)
   * @returns Extracted content string
   */
  private extractContent(input: any): string {
    if (typeof input === 'string') {
      return input;
    } else if (input && typeof input === 'object' && 'content' in input) {
      return input.content as string;
    }

    throw new ApplicationError('INVALID_INPUT', 'Invalid content format');
  }

  /**
   * Parse activeContext content from markdown
   * @param content Markdown content
   * @returns ActiveContextDTO
   */
  private parseActiveContextContent(content: string): any {
    // Simple parsing, in real implementation this would use the same parser as in ReadBranchCoreFilesUseCase
    const result: any = {
      currentWork: '',
      recentChanges: [],
      activeDecisions: [],
      considerations: [],
      nextSteps: [],
    };

    // Extract current work
    const currentWorkMatch = content.match(/## 現在の作業内容\n\n(.*?)(?:\n##|$)/s);
    if (currentWorkMatch && currentWorkMatch[1].trim()) {
      result.currentWork = currentWorkMatch[1].trim();
    }

    // Extract recent changes
    const recentChangesMatch = content.match(/## 最近の変更点\n\n(.*?)(?:\n##|$)/s);
    if (recentChangesMatch && recentChangesMatch[1].trim()) {
      result.recentChanges = recentChangesMatch[1]
        .trim()
        .split('\n')
        .filter((line) => line.startsWith('- '))
        .map((line) => line.substring(2).trim());
    }

    // Extract active decisions
    const activeDecisionsMatch = content.match(/## アクティブな決定事項\n\n(.*?)(?:\n##|$)/s);
    if (activeDecisionsMatch && activeDecisionsMatch[1].trim()) {
      result.activeDecisions = activeDecisionsMatch[1]
        .trim()
        .split('\n')
        .filter((line) => line.startsWith('- '))
        .map((line) => line.substring(2).trim());
    }

    // Extract considerations
    const considerationsMatch = content.match(/## 検討事項\n\n(.*?)(?:\n##|$)/s);
    if (considerationsMatch && considerationsMatch[1].trim()) {
      result.considerations = considerationsMatch[1]
        .trim()
        .split('\n')
        .filter((line) => line.startsWith('- '))
        .map((line) => line.substring(2).trim());
    }

    // Extract next steps
    const nextStepsMatch = content.match(/## 次のステップ\n\n(.*?)(?:\n##|$)/s);
    if (nextStepsMatch && nextStepsMatch[1].trim()) {
      result.nextSteps = nextStepsMatch[1]
        .trim()
        .split('\n')
        .filter((line) => line.startsWith('- '))
        .map((line) => line.substring(2).trim());
    }

    return result;
  }

  /**
   * Parse progress content from markdown
   * @param content Markdown content
   * @returns ProgressDTO
   */
  private parseProgressContent(content: string): any {
    // Simple parsing, in real implementation this would use the same parser as in ReadBranchCoreFilesUseCase
    const result: any = {
      workingFeatures: [],
      pendingImplementation: [],
      status: '',
      knownIssues: [],
    };

    // Extract working features
    const workingFeaturesMatch = content.match(/## 動作している機能\n\n(.*?)(?:\n##|$)/s);
    if (workingFeaturesMatch && workingFeaturesMatch[1].trim()) {
      result.workingFeatures = workingFeaturesMatch[1]
        .trim()
        .split('\n')
        .filter((line) => line.startsWith('- '))
        .map((line) => line.substring(2).trim());
    }

    // Extract pending implementation
    const pendingImplementationMatch = content.match(/## 未実装の機能\n\n(.*?)(?:\n##|$)/s);
    if (pendingImplementationMatch && pendingImplementationMatch[1].trim()) {
      result.pendingImplementation = pendingImplementationMatch[1]
        .trim()
        .split('\n')
        .filter((line) => line.startsWith('- '))
        .map((line) => line.substring(2).trim());
    }

    // Extract status
    const statusMatch = content.match(/## 現在の状態\n\n(.*?)(?:\n##|$)/s);
    if (statusMatch && statusMatch[1].trim()) {
      result.status = statusMatch[1].trim();
    }

    // Extract known issues
    const knownIssuesMatch = content.match(/## 既知の問題\n\n(.*?)(?:\n##|$)/s);
    if (knownIssuesMatch && knownIssuesMatch[1].trim()) {
      result.knownIssues = knownIssuesMatch[1]
        .trim()
        .split('\n')
        .filter((line) => line.startsWith('- '))
        .map((line) => line.substring(2).trim());
    }

    return result;
  }

  /**
   * Parse system patterns content from markdown
   * @param content Markdown content
   * @returns SystemPatternsDTO
   */
  private parseSystemPatternsContent(content: string): any {
    // Simple parsing, in real implementation this would use the same parser as in ReadBranchCoreFilesUseCase
    const result: any = {
      technicalDecisions: [],
    };

    // Find all technical decisions sections
    const decisions = content.match(
      /### (.+?)\n\n#### コンテキスト\n\n(.*?)\n\n#### 決定事項\n\n(.*?)\n\n#### 影響\n\n(.*?)(?=\n###|\n##|$)/gs
    );

    if (decisions) {
      result.technicalDecisions = decisions.map((decision) => {
        // Extract parts of each decision
        const titleMatch = decision.match(/### (.+?)\n/);
        const contextMatch = decision.match(/#### コンテキスト\n\n(.*?)\n\n/s);
        const decisionMatch = decision.match(/#### 決定事項\n\n(.*?)\n\n/s);
        const consequencesMatch = decision.match(/#### 影響\n\n(.*?)(?=\n###|\n##|$)/s);

        // Parse consequences list
        const consequences = consequencesMatch
          ? consequencesMatch[1]
            .trim()
            .split('\n')
            .filter((line) => line.startsWith('- '))
            .map((line) => line.substring(2).trim())
          : [];

        return {
          title: titleMatch ? titleMatch[1].trim() : '',
          context: contextMatch ? contextMatch[1].trim() : '',
          decision: decisionMatch ? decisionMatch[1].trim() : '',
          consequences,
        };
      });
    }

    return result;
  }

  /**
   * Generate markdown content from ActiveContextDTO
   * @param activeContext ActiveContextDTO
   * @returns Markdown content
   */
  private generateActiveContextContent(activeContext: any): string {
    let markdown = '# アクティブコンテキスト\n\n';

    // Current Work
    markdown += '## 現在の作業内容\n\n';
    if (activeContext.currentWork) {
      markdown += `${activeContext.currentWork}\n`;
    }

    // Recent Changes
    markdown += '## 最近の変更点\n\n';
    if (activeContext.recentChanges && activeContext.recentChanges.length > 0) {
      activeContext.recentChanges.forEach((change: string) => {
        markdown += `- ${change}\n`;
      });
    }

    // Active Decisions
    markdown += '## アクティブな決定事項\n\n';
    if (activeContext.activeDecisions && activeContext.activeDecisions.length > 0) {
      activeContext.activeDecisions.forEach((decision: string) => {
        markdown += `- ${decision}\n`;
      });
    }

    // Considerations
    markdown += '## 検討事項\n\n';
    if (activeContext.considerations && activeContext.considerations.length > 0) {
      activeContext.considerations.forEach((consideration: string) => {
        markdown += `- ${consideration}\n`;
      });
    }

    // Next Steps
    markdown += '## 次のステップ\n\n';
    if (activeContext.nextSteps && activeContext.nextSteps.length > 0) {
      activeContext.nextSteps.forEach((step: string) => {
        markdown += `- ${step}\n`;
      });
    }

    return markdown;
  }

  /**
   * Generate markdown content from ProgressDTO
   * @param progress ProgressDTO
   * @returns Markdown content
   */
  private generateProgressContent(progress: any): string {
    let markdown = '# 進捗状況\n\n';

    // Working Features
    markdown += '## 動作している機能\n\n';
    if (progress.workingFeatures && progress.workingFeatures.length > 0) {
      progress.workingFeatures.forEach((feature: string) => {
        markdown += `- ${feature}\n`;
      });
    }

    // Pending Implementation
    markdown += '## 未実装の機能\n\n';
    if (progress.pendingImplementation && progress.pendingImplementation.length > 0) {
      progress.pendingImplementation.forEach((item: string) => {
        markdown += `- ${item}\n`;
      });
    }

    // Current Status
    markdown += '## 現在の状態\n\n';
    if (progress.status) {
      markdown += `${progress.status}\n`;
    }

    // Known Issues
    markdown += '## 既知の問題\n\n';
    if (progress.knownIssues && progress.knownIssues.length > 0) {
      progress.knownIssues.forEach((issue: string) => {
        markdown += `- ${issue}\n`;
      });
    }

    return markdown;
  }

  /**
   * Generate markdown content from SystemPatternsDTO
   * @param systemPatterns SystemPatternsDTO
   * @returns Markdown content
   */
  private generateSystemPatternsContent(systemPatterns: any): string {
    let markdown = '# システムパターン\n\n';

    // Technical Decisions
    markdown += '## 技術的決定事項\n\n';

    if (systemPatterns.technicalDecisions && systemPatterns.technicalDecisions.length > 0) {
      systemPatterns.technicalDecisions.forEach((decision: any) => {
        // Decision title
        markdown += `### ${decision.title}\n\n`;

        // Context
        markdown += '#### コンテキスト\n\n';
        markdown += `${decision.context}\n\n`;

        // Decision
        markdown += '#### 決定事項\n\n';
        markdown += `${decision.decision}\n\n`;

        // Consequences
        markdown += '#### 影響\n\n';
        if (decision.consequences && decision.consequences.length > 0) {
          decision.consequences.forEach((consequence: string) => {
            markdown += `- ${consequence}\n`;
          });
        }

        markdown += '\n';
      });
    }

    return markdown;
  }

  /**
   * Handle errors in controller methods
   * @param error Error to handle
   * @returns Formatted error response
   */
  private handleError(error: any): MCPResponse {
    if (
      error instanceof DomainError ||
      error instanceof ApplicationError ||
      error instanceof InfrastructureError
    ) {
      return this.presenter.presentError(error);
    }

    // Unknown error
    return this.presenter.presentError(
      new ApplicationError(
        'UNEXPECTED_ERROR',
        error instanceof Error ? error.message : 'An unexpected error occurred',
        { originalError: error }
      )
    );
  }

  /**
   * Read JSON document from branch memory bank
   * @param branchName Branch name
   * @param options Options for reading document (path or ID)
   * @returns Promise resolving to MCP response with JSON document
   */
  async readJsonDocument(
    branchName: string,
    options: { path?: string; id?: string }
  ): Promise<MCPResponse<JsonDocumentDTO>> {
    try {
      logger.info(`Reading JSON document from branch ${branchName}: ${options.path || options.id}`);

      if (!this.readJsonDocumentUseCase) {
        throw new ApplicationError(
          'FEATURE_NOT_AVAILABLE',
          'JSON document features are not available in this configuration'
        );
      }

      const result = await this.readJsonDocumentUseCase.execute({
        branchName,
        path: options.path,
        id: options.id,
      });

      return this.presenter.present(result.document);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Write JSON document to branch memory bank
   * @param branchName Branch name
   * @param document Document data to write
   * @returns Promise resolving to MCP response with the result
   */
  async writeJsonDocument(branchName: string, document: JsonDocumentDTO): Promise<MCPResponse> {
    try {
      logger.info(`Writing JSON document to branch ${branchName}: ${document.path}`);

      if (!this.writeJsonDocumentUseCase) {
        throw new ApplicationError(
          'FEATURE_NOT_AVAILABLE',
          'JSON document features are not available in this configuration'
        );
      }

      const result = await this.writeJsonDocumentUseCase.execute({
        branchName,
        document: {
          path: document.path || '',
          title: document.title,
          documentType: document.documentType,
          content: document.content,
          tags: document.tags,
        },
      });

      return this.presenter.present(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Delete JSON document from branch memory bank
   * @param branchName Branch name
   * @param options Options for deleting document (path or ID)
   * @returns Promise resolving to MCP response with the result
   */
  async deleteJsonDocument(
    branchName: string,
    options: { path?: string; id?: string }
  ): Promise<MCPResponse> {
    try {
      logger.info(
        `Deleting JSON document from branch ${branchName}: ${options.path || options.id}`
      );

      if (!this.deleteJsonDocumentUseCase) {
        throw new ApplicationError(
          'FEATURE_NOT_AVAILABLE',
          'JSON document features are not available in this configuration'
        );
      }

      const result = await this.deleteJsonDocumentUseCase.execute({
        branchName,
        path: options.path,
        id: options.id,
      });

      return this.presenter.present(result);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * List JSON documents in branch memory bank
   * @param branchName Branch name
   * @param options Options for listing documents (type, tags)
   * @returns Promise resolving to MCP response with list of documents
   */
  async listJsonDocuments(
    branchName: string,
    options?: { type?: string; tags?: string[] }
  ): Promise<MCPResponse<JsonDocumentDTO[]>> {
    try {
      logger.info(`Listing JSON documents in branch ${branchName}`);

      if (!this.searchJsonDocumentsUseCase) {
        throw new ApplicationError(
          'FEATURE_NOT_AVAILABLE',
          'JSON document features are not available in this configuration'
        );
      }

      const result = await this.searchJsonDocumentsUseCase.execute({
        branchName,
        documentType: options?.type as DocumentType,
        tags: options?.tags,
      });

      return this.presenter.present(result.documents);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Search JSON documents in branch memory bank
   * @param branchName Branch name
   * @param query Search query
   * @returns Promise resolving to MCP response with matching documents
   */
  async searchJsonDocuments(
    branchName: string,
    query: string
  ): Promise<MCPResponse<JsonDocumentDTO[]>> {
    try {
      logger.info(`Searching JSON documents in branch ${branchName} with query: ${query}`);

      if (!this.searchJsonDocumentsUseCase) {
        throw new ApplicationError(
          'FEATURE_NOT_AVAILABLE',
          'JSON document features are not available in this configuration'
        );
      }

      // Use the existing list function with tags
      const result = await this.listJsonDocuments(branchName, {
        tags: query ? [query] : undefined,
      });

      return result;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Update JSON index in branch memory bank
   * @param branchName Branch name
   * @param options Options for updating index (force rebuild)
   * @returns Promise resolving to MCP response with the result
   */
  async updateJsonIndex(branchName: string, options?: { force?: boolean }): Promise<MCPResponse> {
    try {
      logger.info(
        `Updating JSON index for branch ${branchName} (force: ${options?.force ? 'yes' : 'no'})`
      );

      if (!this.updateJsonIndexUseCase) {
        throw new ApplicationError(
          'FEATURE_NOT_AVAILABLE',
          'JSON document features are not available in this configuration'
        );
      }

      const result = await this.updateJsonIndexUseCase.execute({
        branchName,
        fullRebuild: options?.force,
      });

      return this.presenter.present(result);
    } catch (error) {
      return this.handleError(error);
    }
  }
}
