import { IBranchMemoryBankRepository } from '../../../domain/repositories/IBranchMemoryBankRepository.js';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';
import { ApplicationError, ApplicationErrorCodes } from '../../../shared/errors/ApplicationError.js';
import type { ILogger } from '../../../domain/logger/ILogger.js';
import { LoggerFactory, LoggerType } from '../../../infrastructure/logger/LoggerFactory.js';
import type { IUseCase } from '../../interfaces/IUseCase.js';
import type {
  ActiveContextDTO,
  CoreFilesDTO,
  ProgressDTO,
  SystemPatternsDTO,
  TechnicalDecisionDTO
} from '../../dtos/CoreFilesDTO.js';

interface ReadBranchCoreFilesInput {
  branchName: string;
}

interface ReadBranchCoreFilesOutput {
  files: CoreFilesDTO;
}

export class ReadBranchCoreFilesUseCase implements IUseCase<ReadBranchCoreFilesInput, ReadBranchCoreFilesOutput> {
  private readonly logger: ILogger;

  private readonly ACTIVE_CONTEXT_PATHS = ['activeContext.md', 'activeContext.json'];
  private readonly PROGRESS_PATHS = ['progress.md', 'progress.json'];
  private readonly SYSTEM_PATTERNS_PATHS = ['systemPatterns.md', 'systemPatterns.json'];
  private readonly BRANCH_CONTEXT_PATHS = ['branchContext.md', 'branchContext.json'];

  constructor(private readonly branchRepository?: IBranchMemoryBankRepository) {
    this.logger = LoggerFactory.getInstance().getLogger('ReadBranchCoreFilesUseCase', {
      type: LoggerType.JSON,
      defaultContext: { useCase: 'ReadBranchCoreFiles' }
    });
  }

  public async execute(input: ReadBranchCoreFilesInput): Promise<ReadBranchCoreFilesOutput> {
    if (!this.branchRepository) {
      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        'Branch repository is not initialized'
      );
    }

    try {
      if (!input.branchName) {
        throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Branch name is required');
      }

      const branchInfo = BranchInfo.create(input.branchName);
      const coreFiles: CoreFilesDTO = {};
      const branchExists = await this.branchRepository.exists(input.branchName);

      if (!branchExists) {
        this.logger.info('Branch not found, attempting auto-initialization', {
          branch: input.branchName
        });

        try {
          await this.branchRepository.initialize(branchInfo);
        } catch (error) {
          this.logger.error('Failed to auto-initialize branch', {
            branch: input.branchName,
            error: error instanceof Error ? error.message : String(error)
          });

          throw new DomainError(
            DomainErrorCodes.BRANCH_INITIALIZATION_FAILED,
            `Failed to auto-initialize branch: ${input.branchName}`
          );
        }
      }

      // Active Context
      for (const path of this.ACTIVE_CONTEXT_PATHS) {
        try {
          const doc = await this.branchRepository.getDocument(
            branchInfo,
            DocumentPath.create(path)
          );
          if (doc) {
            coreFiles.activeContext = this.parseActiveContext(doc.content);
            break;
          }
        } catch (error) {
          if (error instanceof DomainError || error instanceof ApplicationError) {
            throw error;
          }
          this.logger.debug('Document not found, trying next path', {
            type: 'activeContext',
            path,
            branch: input.branchName
          });
        }
      }

      // Progress
      for (const path of this.PROGRESS_PATHS) {
        try {
          const doc = await this.branchRepository.getDocument(
            branchInfo,
            DocumentPath.create(path)
          );
          if (doc) {
            coreFiles.progress = this.parseProgress(doc.content);
            break;
          }
        } catch (error) {
          if (error instanceof DomainError || error instanceof ApplicationError) {
            throw error;
          }
          this.logger.debug('Document not found, trying next path', {
            type: 'progress',
            path,
            branch: input.branchName
          });
        }
      }

      // Branch Context
      for (const path of this.BRANCH_CONTEXT_PATHS) {
        try {
          const doc = await this.branchRepository.getDocument(
            branchInfo,
            DocumentPath.create(path)
          );
          if (doc) {
            coreFiles.branchContext = doc.content;
            break;
          }
        } catch (error) {
          if (error instanceof DomainError || error instanceof ApplicationError) {
            throw error;
          }
          this.logger.debug('Document not found, trying next path', {
            type: 'branchContext',
            path,
            branch: input.branchName
          });
        }
      }

      // System Patterns
      for (const path of this.SYSTEM_PATTERNS_PATHS) {
        try {
          const doc = await this.branchRepository.getDocument(
            branchInfo,
            DocumentPath.create(path)
          );
          if (doc) {
            coreFiles.systemPatterns = this.parseSystemPatterns(doc.content);
            break;
          }
        } catch (error) {
          if (error instanceof DomainError || error instanceof ApplicationError) {
            throw error;
          }
          this.logger.debug('Document not found, trying next path', {
            type: 'systemPatterns',
            path,
            branch: input.branchName
          });
        }
      }

      return { files: coreFiles };

    } catch (error) {
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      this.logger.error('Failed to read core files', {
        branch: input.branchName,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to read core files: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  private parseActiveContext(content: string): ActiveContextDTO {
    const result: ActiveContextDTO = {
      currentWork: '',
      recentChanges: [],
      activeDecisions: [],
      considerations: [],
      nextSteps: []
    };

    if (!content) return result;

    const currentWorkMatch = content.match(/## 現在の作業内容\n\n(.*?)(?:\n##|$)/s);
    if (currentWorkMatch?.length > 1) {
      result.currentWork = currentWorkMatch[1].trim();
    }

    const recentChangesMatch = content.match(/## 最近の変更点\n\n(.*?)(?:\n##|$)/s);
    if (recentChangesMatch?.length > 1) {
      result.recentChanges = recentChangesMatch[1]
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[*-]\s*/, ''));
    }

    const activeDecisionsMatch = content.match(/## アクティブな決定事項\n\n(.*?)(?:\n##|$)/s);
    if (activeDecisionsMatch?.length > 1) {
      result.activeDecisions = activeDecisionsMatch[1]
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[*-]\s*/, ''));
    }

    const considerationsMatch = content.match(/## 検討事項\n\n(.*?)(?:\n##|$)/s);
    if (considerationsMatch?.length > 1) {
      result.considerations = considerationsMatch[1]
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[*-]\s*/, ''));
    }

    const nextStepsMatch = content.match(/## 次のステップ\n\n(.*?)(?:\n##|$)/s);
    if (nextStepsMatch?.length > 1) {
      result.nextSteps = nextStepsMatch[1]
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[*-]\s*/, ''));
    }

    return result;
  }

  private parseProgress(content: string): ProgressDTO {
    const result: ProgressDTO = {
      workingFeatures: [],
      pendingImplementation: [],
      status: '',
      knownIssues: []
    };

    if (!content) return result;

    const workingFeaturesMatch = content.match(/## 動作している機能\n\n(.*?)(?:\n##|$)/s);
    if (workingFeaturesMatch?.length > 1) {
      result.workingFeatures = workingFeaturesMatch[1]
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[*-]\s*/, ''));
    }

    const pendingMatch = content.match(/## 未実装の機能\n\n(.*?)(?:\n##|$)/s);
    if (pendingMatch?.length > 1) {
      result.pendingImplementation = pendingMatch[1]
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[*-]\s*/, ''));
    }

    const statusMatch = content.match(/## 現在の状態\n\n(.*?)(?:\n##|$)/s);
    if (statusMatch?.length > 1) {
      result.status = statusMatch[1].trim();
    }

    const knownIssuesMatch = content.match(/## 既知の問題\n\n(.*?)(?:\n##|$)/s);
    if (knownIssuesMatch?.length > 1) {
      result.knownIssues = knownIssuesMatch[1]
        .trim()
        .split('\n')
        .filter(line => line.trim())
        .map(line => line.replace(/^[*-]\s*/, ''));
    }

    return result;
  }

  private parseSystemPatterns(content: string): SystemPatternsDTO {
    const result: SystemPatternsDTO = { technicalDecisions: [] };

    if (!content) return result;

    const technicalDecisionsMatch = content.match(/## 技術的決定事項\n\n(.*?)(?:\n##|$)/s);
    if (!technicalDecisionsMatch?.length || !technicalDecisionsMatch[1].trim()) {
      return result;
    }

    const decisions = technicalDecisionsMatch[1]
      .trim()
      .split(/(?=^###\s)/m)
      .filter(section => section.trim())
      .map(section => {
        const titleMatch = section.match(/^###\s+(.*?)(?:\n|$)/);
        return {
          title: titleMatch?.[1] || section.split('\n')[0],
          description: '',
          status: 'active',
          context: '',
          decision: '',
          consequences: []
        };
      });

    result.technicalDecisions = decisions;
    return result;
  }
}
