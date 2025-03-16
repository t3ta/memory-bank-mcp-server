import { IUseCase } from '../../interfaces/IUseCase.js';
import { IBranchMemoryBankRepository } from '../../../domain/repositories/IBranchMemoryBankRepository.js';
import { CoreFilesDTO } from '../../dtos/CoreFilesDTO.js';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';
import { ApplicationError, ApplicationErrorCodes } from '../../../shared/errors/ApplicationError.js';

/**
 * Input data for reading branch core files
 */
export interface ReadBranchCoreFilesInput {
  /**
   * Branch name
   */
  branchName: string;
}

/**
 * Output data for reading branch core files
 */
export interface ReadBranchCoreFilesOutput {
  /**
   * Core files data
   */
  files: CoreFilesDTO;
}

/**
 * Use case for reading core files from a branch memory bank
 */
export class ReadBranchCoreFilesUseCase implements IUseCase<ReadBranchCoreFilesInput, ReadBranchCoreFilesOutput> {
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
  async execute(input: ReadBranchCoreFilesInput): Promise<ReadBranchCoreFilesOutput> {
    try {
      // Validate input
      if (!input.branchName) {
        throw new ApplicationError(
          ApplicationErrorCodes.INVALID_INPUT,
          'Branch name is required'
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

      // Read each core file
      const activeContextDoc = await this.branchRepository.getDocument(
        branchInfo,
        DocumentPath.create(this.ACTIVE_CONTEXT_PATH)
      );

      const progressDoc = await this.branchRepository.getDocument(
        branchInfo,
        DocumentPath.create(this.PROGRESS_PATH)
      );
      // Initialize the output DTO
      const coreFiles: CoreFilesDTO = {};

      // Parse active context if exists
      if (activeContextDoc) {
        coreFiles.activeContext = this.parseActiveContext(activeContextDoc.content);
      }

      // Parse progress if exists
      if (progressDoc) {
        coreFiles.progress = this.parseProgress(progressDoc.content);
      }

      // Check if systemPatterns exists
      const systemPatternsPath = DocumentPath.create(this.SYSTEM_PATTERNS_PATH);

      // Initialize systemPatterns with empty technicalDecisions array
      coreFiles.systemPatterns = {
        technicalDecisions: []
      };

      try {
        // Try to get the document to check if it exists
        const systemPatternsDoc = await this.branchRepository.getDocument(branchInfo, systemPatternsPath);

        // If document exists, process it efficiently
        if (systemPatternsDoc) {
          // Process it in a memory-efficient way - use the document we already fetched
          const parsedSystemPatterns = this.parseSystemPatterns(systemPatternsDoc.content);
          coreFiles.systemPatterns = parsedSystemPatterns;
        }
      } catch (error) {
        // If document doesn't exist or there's an error, just continue with empty systemPatterns
        console.warn('System patterns document not found or error occurred:', error);
      }

      return { files: coreFiles };
    } catch (error) {
      // Re-throw domain and application errors
      if (error instanceof DomainError || error instanceof ApplicationError) {
        throw error;
      }

      // Wrap other errors
      throw new ApplicationError(
        ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED,
        `Failed to read core files: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Parse active context from markdown content
   * @param content Markdown content
   * @returns Parsed active context DTO
   */
  private parseActiveContext(content: string): ActiveContextDTO {
    const activeContext: ActiveContextDTO = {};

    // Current Work
    const currentWorkMatch = content.match(/## 現在の作業内容\n\n([^#]*)(?:\n##|$)/s);
    if (currentWorkMatch && currentWorkMatch[1].trim()) {
      activeContext.currentWork = currentWorkMatch[1].trim();
    }

    // Recent Changes
    const recentChangesMatch = content.match(/## 最近の変更点\n\n([^#]*)(?:\n##|$)/s);
    if (recentChangesMatch && recentChangesMatch[1].trim()) {
      activeContext.recentChanges = recentChangesMatch[1]
        .trim()
        .split('\n')
        .filter(line => line.startsWith('- '))
        .map(line => line.substring(2).trim());
    }

    // Active Decisions
    const activeDecisionsMatch = content.match(/## アクティブな決定事項\n\n([^#]*)(?:\n##|$)/s);
    if (activeDecisionsMatch && activeDecisionsMatch[1].trim()) {
      activeContext.activeDecisions = activeDecisionsMatch[1]
        .trim()
        .split('\n')
        .filter(line => line.startsWith('- '))
        .map(line => line.substring(2).trim());
    }

    // Considerations
    const considerationsMatch = content.match(/## 検討事項\n\n([^#]*)(?:\n##|$)/s);
    if (considerationsMatch && considerationsMatch[1].trim()) {
      activeContext.considerations = considerationsMatch[1]
        .trim()
        .split('\n')
        .filter(line => line.startsWith('- '))
        .map(line => line.substring(2).trim());
    }

    // Next Steps
    const nextStepsMatch = content.match(/## 次のステップ\n\n([^#]*)(?:\n##|$)/s);
    if (nextStepsMatch && nextStepsMatch[1].trim()) {
      activeContext.nextSteps = nextStepsMatch[1]
        .trim()
        .split('\n')
        .filter(line => line.startsWith('- '))
        .map(line => line.substring(2).trim());
    }

    return activeContext;
  }

  /**
   * Parse progress from markdown content
   * @param content Markdown content
   * @returns Parsed progress DTO
   */
  private parseProgress(content: string): ProgressDTO {
    const progress: ProgressDTO = {};

    // Status
    const statusMatch = content.match(/## 現在の状態\n\n([^#]*)(?:\n##|$)/s);
    if (statusMatch && statusMatch[1].trim()) {
      progress.status = statusMatch[1].trim();
    }

    // Working Features
    const workingFeaturesMatch = content.match(/## 動作している機能\n\n([^#]*)(?:\n##|$)/s);
    if (workingFeaturesMatch && workingFeaturesMatch[1].trim()) {
      progress.workingFeatures = workingFeaturesMatch[1]
        .trim()
        .split('\n')
        .filter(line => line.startsWith('- '))
        .map(line => line.substring(2).trim());
    }

    // Pending Implementation
    const pendingImplementationMatch = content.match(/## 未実装の機能\n\n([^#]*)(?:\n##|$)/s);
    if (pendingImplementationMatch && pendingImplementationMatch[1].trim()) {
      progress.pendingImplementation = pendingImplementationMatch[1]
        .trim()
        .split('\n')
        .filter(line => line.startsWith('- '))
        .map(line => line.substring(2).trim());
    }

    // Known Issues
    const knownIssuesMatch = content.match(/## 既知の問題\n\n([^#]*)(?:\n##|$)/s);
    if (knownIssuesMatch && knownIssuesMatch[1].trim()) {
      progress.knownIssues = knownIssuesMatch[1]
        .trim()
        .split('\n')
        .filter(line => line.startsWith('- '))
        .map(line => line.substring(2).trim());
    }

    return progress;
  }

  /**
   * Parse system patterns efficiently without loading the entire file
   * @param branchInfo Branch information
   * @param systemPatternsPath Path to system patterns document
   * @returns Parsed system patterns DTO
   */
  private async parseSystemPatternsEfficiently(
    branchInfo: BranchInfo,
    systemPatternsPath: DocumentPath
  ): Promise<SystemPatternsDTO> {
    // Initialize with empty array to avoid undefined errors
    const systemPatterns: SystemPatternsDTO = {
      technicalDecisions: [] // Ensure this is always initialized as an array
    };

    try {
      // Get the document but limit how much we process
      const document = await this.branchRepository.getDocument(branchInfo, systemPatternsPath);
      if (!document) {
        return systemPatterns;
      }

      // Process the content
      const content = document.content;

      // Find all technical decisions sections with a more direct approach
      // Use the regex to match full decision sections in one go
      const decisionRegex = /### ([^\n]+)\n+(?:#### コンテキスト\n+([^#]*?)\n+)?(?:#### 決定事項\n+([^#]*?)\n+)?(?:#### 影響\n+([^#]*?)(?=\n+###|\n+##|$))?/gs;

      let match;
      // Ensure technicalDecisions is initialized as an array
      if (!systemPatterns.technicalDecisions) {
        systemPatterns.technicalDecisions = [];
      }
      
      while ((match = decisionRegex.exec(content)) !== null) {
        const title = match[1]?.trim() || '';
        const context = match[2]?.trim() || '';
        const decision = match[3]?.trim() || '';
        const consequencesText = match[4]?.trim() || '';

        // Parse consequences list
        const consequences = consequencesText
          .split('\n')
          .filter(line => line.trim().startsWith('- '))
          .map(line => line.trim().substring(2).trim());

        systemPatterns.technicalDecisions!.push({
          title,
          context,
          decision,
          consequences
        });

        // Limit to 10 decisions to avoid memory issues
        if (systemPatterns.technicalDecisions!.length >= 10) {
          break;
        }
      }

      // Match has already been handled by the regex loop above

      return systemPatterns;
    } catch (error) {
      console.error('Error parsing system patterns efficiently:', error);
      return systemPatterns;
    }
  }

  /**
   * Legacy method kept for backward compatibility
   * @param content Markdown content
   * @returns Parsed system patterns DTO
   */
  private parseSystemPatterns(content: string): SystemPatternsDTO {
    console.warn('Using deprecated parseSystemPatterns method - consider using parseSystemPatternsEfficiently instead');
    
    // Initialize with empty array to avoid undefined errors
    const systemPatterns: SystemPatternsDTO = {
      technicalDecisions: [] // Ensure this is always initialized as an array
    };

    try {
      // Use the same approach as parseSystemPatternsEfficiently for consistency
      const decisionRegex = /### ([^\n]+)\n+(?:#### コンテキスト\n+([^#]*?)\n+)?(?:#### 決定事項\n+([^#]*?)\n+)?(?:#### 影響\n+([^#]*?)(?=\n+###|\n+##|$))?/gs;

      let match;
      // Ensure technicalDecisions is initialized as an array
      if (!systemPatterns.technicalDecisions) {
        systemPatterns.technicalDecisions = [];
      }
      
      while ((match = decisionRegex.exec(content)) !== null) {
        const title = match[1]?.trim() || '';
        const context = match[2]?.trim() || '';
        const decision = match[3]?.trim() || '';
        const consequencesText = match[4]?.trim() || '';

        // Parse consequences list
        const consequences = consequencesText
          .split('\n')
          .filter(line => line.trim().startsWith('- '))
          .map(line => line.trim().substring(2).trim());

        systemPatterns.technicalDecisions!.push({
          title,
          context,
          decision,
          consequences
        });

        // Limit to 10 decisions to avoid memory issues
        if (systemPatterns.technicalDecisions!.length >= 10) {
          break;
        }
      }
    } catch (error) {
      console.error('Error in parseSystemPatterns:', error);
    }

    return systemPatterns;
  }
}

// Export the interfaces from CoreFilesDTO for convenience
import {
  ActiveContextDTO,
  ProgressDTO,
  SystemPatternsDTO,
  TechnicalDecisionDTO
} from '../../dtos/CoreFilesDTO.js';
