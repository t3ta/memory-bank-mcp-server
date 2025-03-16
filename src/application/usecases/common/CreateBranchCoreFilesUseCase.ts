import { IUseCase } from '../../interfaces/IUseCase.js';
import { IBranchMemoryBankRepository } from '../../../domain/repositories/IBranchMemoryBankRepository.js';
import { CoreFilesDTO } from '../../dtos/CoreFilesDTO.js';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';
import { ApplicationError, ApplicationErrorCodes } from '../../../shared/errors/ApplicationError.js';
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
export class CreateBranchCoreFilesUseCase implements IUseCase<CreateBranchCoreFilesInput, CreateBranchCoreFilesOutput> {
  // Core file paths
  private readonly ACTIVE_CONTEXT_PATH = 'activeContext.md';
  private readonly PROGRESS_PATH = 'progress.md';
  private readonly SYSTEM_PATTERNS_PATH = 'systemPatterns.md';

  /**
   * Constructor
   * @param branchRepository Branch memory bank repository
   */
  constructor(
    private readonly branchRepository: IBranchMemoryBankRepository
  ) {}

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: CreateBranchCoreFilesInput): Promise<CreateBranchCoreFilesOutput> {
    try {
      // Validate input
      if (!input.branchName) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Branch name is required'
        );
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
        const content = this.generateActiveContextMarkdown(input.files.activeContext);
        const document = MemoryDocument.create({
          path: DocumentPath.create(this.ACTIVE_CONTEXT_PATH),
          content,
          tags: [Tag.create('core'), Tag.create('active-context')],
          lastModified: new Date()
        });
        
        await this.branchRepository.saveDocument(branchInfo, document);
        updatedFiles.push(this.ACTIVE_CONTEXT_PATH);
      }
      
      if (input.files.progress) {
        const content = this.generateProgressMarkdown(input.files.progress);
        const document = MemoryDocument.create({
          path: DocumentPath.create(this.PROGRESS_PATH),
          content,
          tags: [Tag.create('core'), Tag.create('progress')],
          lastModified: new Date()
        });
        
        await this.branchRepository.saveDocument(branchInfo, document);
        updatedFiles.push(this.PROGRESS_PATH);
      }
      
      if (input.files.systemPatterns && input.files.systemPatterns.technicalDecisions) {
        const content = this.generateSystemPatternsMarkdown(input.files.systemPatterns);
        const document = MemoryDocument.create({
          path: DocumentPath.create(this.SYSTEM_PATTERNS_PATH),
          content,
          tags: [Tag.create('core'), Tag.create('system-patterns')],
          lastModified: new Date()
        });
        
        await this.branchRepository.saveDocument(branchInfo, document);
        updatedFiles.push(this.SYSTEM_PATTERNS_PATH);
      }
      
      return {
        message: `Successfully updated ${updatedFiles.length} core files for branch "${input.branchName}"`,
        updatedFiles
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
   * Generate markdown for active context
   * @param activeContext Active context DTO
   * @returns Markdown content
   */
  private generateActiveContextMarkdown(activeContext: ActiveContextDTO): string {
    let markdown = '# アクティブコンテキスト\n\n';
    
    // Current Work
    markdown += '## 現在の作業内容\n\n';
    if (activeContext.currentWork) {
      markdown += `${activeContext.currentWork}\n`;
    }
    
    // Recent Changes
    markdown += '## 最近の変更点\n\n';
    if (activeContext.recentChanges && activeContext.recentChanges.length > 0) {
      activeContext.recentChanges.forEach(change => {
        markdown += `- ${change}\n`;
      });
    }
    
    // Active Decisions
    markdown += '## アクティブな決定事項\n\n';
    if (activeContext.activeDecisions && activeContext.activeDecisions.length > 0) {
      activeContext.activeDecisions.forEach(decision => {
        markdown += `- ${decision}\n`;
      });
    }
    
    // Considerations
    markdown += '## 検討事項\n\n';
    if (activeContext.considerations && activeContext.considerations.length > 0) {
      activeContext.considerations.forEach(consideration => {
        markdown += `- ${consideration}\n`;
      });
    }
    
    // Next Steps
    markdown += '## 次のステップ\n\n';
    if (activeContext.nextSteps && activeContext.nextSteps.length > 0) {
      activeContext.nextSteps.forEach(step => {
        markdown += `- ${step}\n`;
      });
    }
    
    return markdown;
  }

  /**
   * Generate markdown for progress
   * @param progress Progress DTO
   * @returns Markdown content
   */
  private generateProgressMarkdown(progress: ProgressDTO): string {
    let markdown = '# 進捗状況\n\n';
    
    // Working Features
    markdown += '## 動作している機能\n\n';
    if (progress.workingFeatures && progress.workingFeatures.length > 0) {
      progress.workingFeatures.forEach(feature => {
        markdown += `- ${feature}\n`;
      });
    }
    
    // Pending Implementation
    markdown += '## 未実装の機能\n\n';
    if (progress.pendingImplementation && progress.pendingImplementation.length > 0) {
      progress.pendingImplementation.forEach(item => {
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
      progress.knownIssues.forEach(issue => {
        markdown += `- ${issue}\n`;
      });
    }
    
    return markdown;
  }

  /**
   * Generate markdown for system patterns
   * @param systemPatterns System patterns DTO
   * @returns Markdown content
   */
  private generateSystemPatternsMarkdown(systemPatterns: SystemPatternsDTO): string {
    let markdown = '# システムパターン\n\n';
    
    // Technical Decisions
    markdown += '## 技術的決定事項\n\n';
    
    if (systemPatterns.technicalDecisions && systemPatterns.technicalDecisions.length > 0) {
      systemPatterns.technicalDecisions.forEach(decision => {
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
          decision.consequences.forEach(consequence => {
            markdown += `- ${consequence}\n`;
          });
        }
        
        markdown += '\n';
      });
    }
    
    return markdown;
  }
}

// Export the interfaces from CoreFilesDTO for convenience
import { 
  ActiveContextDTO, 
  ProgressDTO, 
  SystemPatternsDTO, 
  TechnicalDecisionDTO 
} from '../../dtos/CoreFilesDTO.js';
