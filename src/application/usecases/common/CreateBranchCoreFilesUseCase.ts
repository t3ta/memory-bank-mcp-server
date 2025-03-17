import { IUseCase } from '../../interfaces/IUseCase.js';
import { IBranchMemoryBankRepository } from '../../../domain/repositories/IBranchMemoryBankRepository.js';
import { CoreFilesDTO } from '../../dtos/CoreFilesDTO.js';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../shared/errors/ApplicationError.js';
import { Tag } from '../../../domain/entities/Tag.js';

/**
 * Input data for creating/updating branch core files
 */
export interface CreateBranchCoreFilesInput {
  /**
   * Branch name
   */
  branchName: string;

  /**
   * Core files data
   */
  files: CoreFilesDTO;
}

/**
 * Output data for creating/updating branch core files
 */
export interface CreateBranchCoreFilesOutput {
  /**
   * Success message
   */
  message: string;

  /**
   * List of updated file paths
   */
  updatedFiles: string[];
}

/**
 * Use case for creating or updating core files in a branch memory bank
 */
export class CreateBranchCoreFilesUseCase
  implements IUseCase<CreateBranchCoreFilesInput, CreateBranchCoreFilesOutput>
{
  // Core file paths
  private readonly ACTIVE_CONTEXT_PATH = 'activeContext.json';
  private readonly PROGRESS_PATH = 'progress.json';
  private readonly SYSTEM_PATTERNS_PATH = 'systemPatterns.json';

  /**
   * Constructor
   * @param branchRepository Branch memory bank repository
   */
  constructor(private readonly branchRepository: IBranchMemoryBankRepository) {}

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: CreateBranchCoreFilesInput): Promise<CreateBranchCoreFilesOutput> {
    try {
      // Validate input
      if (!input.branchName) {
        throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Branch name is required');
      }

      if (!input.files) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Core files data is required'
        );
      }

      // Create domain objects
      const branchInfo = BranchInfo.create(input.branchName);

      // Check if branch exists
      const branchExists = await this.branchRepository.exists(input.branchName);

      if (!branchExists) {
        throw new DomainError(
          DomainErrorCodes.BRANCH_NOT_FOUND,
          `Branch "${input.branchName}" not found`
        );
      }

      const updatedFiles: string[] = [];

      // Update each core file if provided
      if (input.files.activeContext) {
        const content = this.generateActiveContextJSON(input.files.activeContext);
        const document = MemoryDocument.create({
          path: DocumentPath.create(this.ACTIVE_CONTEXT_PATH),
          content,
          tags: [Tag.create('core'), Tag.create('active-context')],
          lastModified: new Date(),
        });

        await this.branchRepository.saveDocument(branchInfo, document);
        updatedFiles.push(this.ACTIVE_CONTEXT_PATH);
      }

      if (input.files.progress) {
        const content = this.generateProgressJSON(input.files.progress);
        const document = MemoryDocument.create({
          path: DocumentPath.create(this.PROGRESS_PATH),
          content,
          tags: [Tag.create('core'), Tag.create('progress')],
          lastModified: new Date(),
        });

        await this.branchRepository.saveDocument(branchInfo, document);
        updatedFiles.push(this.PROGRESS_PATH);
      }

      if (input.files.systemPatterns && input.files.systemPatterns.technicalDecisions) {
        const content = this.generateSystemPatternsJSON(input.files.systemPatterns);
        const document = MemoryDocument.create({
          path: DocumentPath.create(this.SYSTEM_PATTERNS_PATH),
          content,
          tags: [Tag.create('core'), Tag.create('system-patterns')],
          lastModified: new Date(),
        });

        await this.branchRepository.saveDocument(branchInfo, document);
        updatedFiles.push(this.SYSTEM_PATTERNS_PATH);
      }

      return {
        message: `Successfully updated ${updatedFiles.length} core files for branch "${input.branchName}"`,
        updatedFiles,
      };
    } catch (error) {
      // Re-throw domain and application errors
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      // Wrap other errors
      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to create/update core files: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Generate JSON for active context
   * @param activeContext Active context DTO
   * @returns JSON content as string
   */
  private generateActiveContextJSON(activeContext: ActiveContextDTO): string {
    const now = new Date();

    // Create structured JSON document
    const jsonDoc = {
      schema: 'memory_document_v2',
      metadata: {
        id: this.generateUUID(),
        title: 'アクティブコンテキスト',
        documentType: 'active_context',
        path: this.ACTIVE_CONTEXT_PATH,
        tags: ['core', 'active-context'],
        lastModified: now.toISOString(),
        createdAt: now.toISOString(),
        version: 1
      },
      content: {
        currentWork: activeContext.currentWork || '',
        recentChanges: this.formatRecentChanges(activeContext.recentChanges || []),
        activeDecisions: this.formatActiveDecisions(activeContext.activeDecisions || []),
        considerations: this.formatConsiderations(activeContext.considerations || []),
        nextSteps: this.formatNextSteps(activeContext.nextSteps || [])
      }
    };

    return JSON.stringify(jsonDoc, null, 2);
  }

  /**
   * Format recent changes to structured format
   * @param changes Array of change strings
   * @returns Structured changes
   */
  private formatRecentChanges(changes: string[]): Array<{date: string, description: string}> {
    return changes.map(change => ({
      date: new Date().toISOString(),
      description: change
    }));
  }

  /**
   * Format active decisions to structured format
   * @param decisions Array of decision strings
   * @returns Structured decisions
   */
  private formatActiveDecisions(decisions: string[]): Array<{id: string, description: string, reason?: string}> {
    return decisions.map(decision => ({
      id: this.generateUUID(),
      description: decision
    }));
  }

  /**
   * Format considerations to structured format
   * @param considerations Array of consideration strings
   * @returns Structured considerations
   */
  private formatConsiderations(considerations: string[]): Array<{id: string, description: string, status: string}> {
    return considerations.map(consideration => ({
      id: this.generateUUID(),
      description: consideration,
      status: 'open'
    }));
  }

  /**
   * Format next steps to structured format
   * @param steps Array of step strings
   * @returns Structured steps
   */
  private formatNextSteps(steps: string[]): Array<{id: string, description: string, priority: string}> {
    return steps.map(step => ({
      id: this.generateUUID(),
      description: step,
      priority: 'medium'
    }));
  }

  /**
   * Generate JSON for progress
   * @param progress Progress DTO
   * @returns JSON content as string
   */
  private generateProgressJSON(progress: ProgressDTO): string {
    const now = new Date();

    // Create structured JSON document
    const jsonDoc = {
      schema: 'memory_document_v2',
      metadata: {
        id: this.generateUUID(),
        title: '進捗状況',
        documentType: 'progress',
        path: this.PROGRESS_PATH,
        tags: ['core', 'progress'],
        lastModified: now.toISOString(),
        createdAt: now.toISOString(),
        version: 1
      },
      content: {
        workingFeatures: this.formatWorkingFeatures(progress.workingFeatures || []),
        pendingImplementation: this.formatPendingImplementation(progress.pendingImplementation || []),
        status: progress.status || '',
        completionPercentage: 0,
        knownIssues: this.formatKnownIssues(progress.knownIssues || [])
      }
    };

    return JSON.stringify(jsonDoc, null, 2);
  }

  /**
   * Format working features to structured format
   * @param features Array of feature strings
   * @returns Structured features
   */
  private formatWorkingFeatures(features: string[]): Array<{id: string, description: string, implementedAt: string}> {
    return features.map(feature => ({
      id: this.generateUUID(),
      description: feature,
      implementedAt: new Date().toISOString()
    }));
  }

  /**
   * Format pending implementation to structured format
   * @param items Array of pending item strings
   * @returns Structured pending items
   */
  private formatPendingImplementation(items: string[]): Array<{id: string, description: string, priority: string, estimatedCompletion?: string}> {
    return items.map(item => ({
      id: this.generateUUID(),
      description: item,
      priority: 'medium'
    }));
  }

  /**
   * Format known issues to structured format
   * @param issues Array of issue strings
   * @returns Structured issues
   */
  private formatKnownIssues(issues: string[]): Array<{id: string, description: string, severity: string, workaround?: string}> {
    return issues.map(issue => ({
      id: this.generateUUID(),
      description: issue,
      severity: 'medium'
    }));
  }

  /**
   * Generate JSON for system patterns
   * @param systemPatterns System patterns DTO
   * @returns JSON content as string
   */
  private generateSystemPatternsJSON(systemPatterns: SystemPatternsDTO): string {
    const now = new Date();

    // Create structured JSON document
    const jsonDoc = {
      schema: 'memory_document_v2',
      metadata: {
        id: this.generateUUID(),
        title: 'システムパターン',
        documentType: 'system_patterns',
        path: this.SYSTEM_PATTERNS_PATH,
        tags: ['core', 'system-patterns'],
        lastModified: now.toISOString(),
        createdAt: now.toISOString(),
        version: 1
      },
      content: {
        technicalDecisions: this.formatTechnicalDecisions(systemPatterns.technicalDecisions || []),
        implementationPatterns: []
      }
    };

    return JSON.stringify(jsonDoc, null, 2);
  }

  /**
   * Format technical decisions to structured format
   * @param decisions Array of technical decision DTOs
   * @returns Structured technical decisions
   */
  private formatTechnicalDecisions(decisions: TechnicalDecisionDTO[]): Array<{
    id: string,
    title: string,
    context: string,
    decision: string,
    consequences: {
      positive: string[],
      negative: string[]
    },
    status: string,
    date: string,
    alternatives?: Array<{
      description: string,
      reason?: string
    }>
  }> {
    return decisions.map(decision => ({
      id: this.generateUUID(),
      title: decision.title,
      context: decision.context,
      decision: decision.decision,
      consequences: {
        positive: decision.consequences || [],
        negative: []
      },
      status: 'accepted',
      date: new Date().toISOString(),
      alternatives: []
    }));
  }

  /**
   * Generate a UUID for document IDs
   * @returns UUID string
   */
  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }
}

// Export the interfaces from CoreFilesDTO for convenience
import {
  ActiveContextDTO,
  ProgressDTO,
  SystemPatternsDTO,
  TechnicalDecisionDTO
} from '../../dtos/CoreFilesDTO.js';
