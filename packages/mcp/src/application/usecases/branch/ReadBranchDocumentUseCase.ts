import { IUseCase } from '../../interfaces/IUseCase.js';
import { DocumentDTO } from '../../dtos/DocumentDTO.js';
import { IBranchMemoryBankRepository } from '../../../domain/repositories/IBranchMemoryBankRepository.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DomainErrors } from '../../../shared/errors/DomainError.js';
import { ApplicationErrors, ErrorUtils } from '../../../shared/errors/index.js';
import { logger } from '../../../shared/utils/logger.js';
import type { IGitService } from '@/infrastructure/git/IGitService.js';
import type { IConfigProvider } from '@/infrastructure/config/interfaces/IConfigProvider.js'; // みらい追加：ConfigProvider使うよ！

/**
 * Input data for read branch document use case
 */
export interface ReadBranchDocumentInput {
  /**
   * Branch name (optional, will be detected if not provided)
   */
  branchName?: string;

  /**
   * Document path
   */
  path: string;
}

/**
 * Output data for read branch document use case
 */
export interface ReadBranchDocumentOutput {
  /**
   * Document data
   */
  document: DocumentDTO;
}

/**
 * Use case for reading a document from branch memory bank
 */
export class ReadBranchDocumentUseCase
  implements IUseCase<ReadBranchDocumentInput, ReadBranchDocumentOutput> {
  private readonly useCaseLogger = logger.withContext({
    component: 'ReadBranchDocumentUseCase'
  });

  /**
   * Constructor
   * @param branchRepository Branch memory bank repository
   * @param gitService Git service
   * @param configProvider Configuration provider // みらい追加
   */
  constructor(
    private readonly branchRepository: IBranchMemoryBankRepository,
    private readonly gitService: IGitService,
    private readonly configProvider: IConfigProvider // みらい追加：ConfigProvider注入！
  ) {}

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: ReadBranchDocumentInput): Promise<ReadBranchDocumentOutput> {
    let branchNameToUse = input.branchName;

    // みらい修正：branchNameがなくて、かつプロジェクトモードの時だけGitから取る！
    if (!branchNameToUse) {
      const config = this.configProvider.getConfig(); // ConfigProviderから設定取得
      if (config.isProjectMode) { // プロジェクトモードかチェック
        this.useCaseLogger.info('Branch name not provided in project mode, attempting to detect current branch...');
        try {
          branchNameToUse = await this.gitService.getCurrentBranchName();
          this.useCaseLogger.info(`Current branch name automatically detected: ${branchNameToUse}`);
        } catch (error) {
          this.useCaseLogger.error('Failed to get current branch name', { error });
          throw ApplicationErrors.invalidInput('Branch name is required but could not be automatically determined. Please provide it explicitly or ensure you are in a Git repository.');
        }
      } else {
        // プロジェクトモードでない場合は、ブランチ名の省略はエラー
        this.useCaseLogger.warn('Branch name omitted outside of project mode.');
        throw ApplicationErrors.invalidInput('Branch name is required when not running in project mode.');
      }
    }

    this.useCaseLogger.info('Executing read branch document use case', {
      branchName: branchNameToUse,
      documentPath: input.path
    });

    // pathのチェックはそのまま
    if (!input.path) {
      throw ApplicationErrors.invalidInput('Document path is required');
    }

    return await ErrorUtils.wrapAsync(
      // みらい変更：executeInternalには確定したブランチ名を渡す
      // みらい修正：branchNameToUseがstringなのは確定してるから `!` で教えてあげる
      this.executeInternal({ ...input, branchName: branchNameToUse! }),
      (error) => ApplicationErrors.executionFailed(
        'ReadBranchDocumentUseCase',
        error instanceof Error ? error : undefined,
        // みらい変更：エラーログにも確定したブランチ名を含める
        { input: { ...input, branchName: branchNameToUse } }
      )
    );
  }

  /**
   * Internal execution logic wrapped with error handling
   */
  // みらい変更：引数のinputはbranchNameが確定している前提にする
  private async executeInternal(input: Required<ReadBranchDocumentInput>): Promise<ReadBranchDocumentOutput> {
    const branchInfo = BranchInfo.create(input.branchName);
    const documentPath = DocumentPath.create(input.path);

    // Use branchInfo.safeName for the existence check to match filesystem structure
    const branchExists = await this.branchRepository.exists(branchInfo.safeName);

    if (!branchExists) {
      this.useCaseLogger.warn('Branch not found', { branchName: input.branchName });
      throw DomainErrors.branchNotFound(input.branchName);
    }

    const document = await this.branchRepository.getDocument(branchInfo, documentPath);

    if (!document) {
      this.useCaseLogger.warn('Document not found', {
        branchName: input.branchName,
        documentPath: input.path
      });
      throw DomainErrors.documentNotFound(input.path, { branchName: input.branchName });
    }

    this.useCaseLogger.debug('Document retrieved successfully', {
      documentPath: input.path,
      documentType: (document as any).determineDocumentType()
    });

    return {
      document: {
        path: document.path.value,
        content: document.content,
        tags: document.tags.map((tag) => tag.value),
        lastModified: document.lastModified.toISOString(),
      },
    };
  }
}
