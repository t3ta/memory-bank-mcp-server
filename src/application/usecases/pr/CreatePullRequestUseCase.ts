import { IFileSystemService } from '../../../infrastructure/storage/interfaces/IFileSystemService.js';
import { IBranchMemoryBankRepository } from '../../../domain/repositories/IBranchMemoryBankRepository.js';
import { PullRequestDTO } from '../../dtos/PullRequestDTO.js';
import { 
  ICreatePullRequestUseCase, 
  CreatePullRequestInput, 
  CreatePullRequestOutput 
} from './ICreatePullRequestUseCase.js';
import { ApplicationError } from '../../../shared/errors/ApplicationError.js';
import { BranchInfo } from '../../../domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Implementation of the CreatePullRequest use case
 */
export class CreatePullRequestUseCase implements ICreatePullRequestUseCase {
  /**
   * Template file names
   */
  private readonly TEMPLATES = {
    ja: 'pull-request-template.md',
    en: 'pull-request-template-en.md'
  };

  constructor(
    private readonly branchRepository: IBranchMemoryBankRepository,
    private readonly fileSystemService: IFileSystemService
  ) {}

  /**
   * Execute the use case
   */
  async execute(input: CreatePullRequestInput): Promise<CreatePullRequestOutput> {
    try {
      const { branch, title, baseBranch, language = 'ja' } = input;
      
      // Validate branch name
      if (!branch) {
        throw new ApplicationError(
          'INVALID_INPUT',
          'Branch name is required'
        );
      }

      // Validate language
      if (language !== 'ja' && language !== 'en') {
        throw new ApplicationError(
          'INVALID_INPUT',
          'Language must be either "ja" or "en"'
        );
      }

      // Create domain objects
      const branchInfo = BranchInfo.create(branch);
      
      // Check if branch exists
      const branchExists = await this.branchRepository.exists(branch);
      if (!branchExists) {
        throw new ApplicationError(
          'BRANCH_NOT_FOUND',
          `Branch "${branch}" not found`
        );
      }

      // Generate PR content
      const pullRequest = await this.generatePullRequestContent(
        branchInfo,
        title,
        baseBranch,
        language
      );

      // Create PR file path
      const prFilePath = `pullRequest.md`;
      const documentPath = DocumentPath.create(prFilePath);
      
      // Create memory document
      const document = MemoryDocument.create({
        path: documentPath,
        content: pullRequest.content,
        tags: [Tag.create('pull-request')],
        lastModified: new Date()
      });
      
      // Write pullRequest.md to branch memory bank
      await this.branchRepository.saveDocument(
        branchInfo,
        document
      );

      // Update return value with file path
      pullRequest.filePath = `docs/branch-memory-bank/${branch.replace('/', '-')}/${prFilePath}`;

      return { pullRequest };
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }
      
      throw new ApplicationError(
        'PULL_REQUEST_CREATION_FAILED',
        `Failed to create pull request: ${(error as Error).message}`,
        { originalError: error }
      );
    }
  }

  /**
   * Generate pull request content from branch memory bank
   */
  private async generatePullRequestContent(
    branchInfo: BranchInfo,
    customTitle?: string,
    customBaseBranch?: string,
    language: string = 'ja'
  ): Promise<PullRequestDTO> {
    // Get template file path
    const templateFileName = language === 'en' ? this.TEMPLATES.en : this.TEMPLATES.ja;
    const templateDirname = path.dirname(fileURLToPath(import.meta.url));
    const templatePath = path.join(templateDirname, '../../../../src/templates', templateFileName);

    // Read template content
    let templateContent: string;
    try {
      templateContent = await this.fileSystemService.readFile(templatePath);
    } catch (error) {
      throw new ApplicationError(
        'TEMPLATE_NOT_FOUND',
        `Pull request template not found: ${(error as Error).message}`,
        { originalError: error }
      );
    }

    // Get core files
    const activeContextPath = DocumentPath.create('activeContext.md');
    const progressPath = DocumentPath.create('progress.md');
    const systemPatternsPath = DocumentPath.create('systemPatterns.md');
    
    const activeContext = await this.branchRepository.getDocument(branchInfo, activeContextPath);
    const progress = await this.branchRepository.getDocument(branchInfo, progressPath);
    const systemPatterns = await this.branchRepository.getDocument(branchInfo, systemPatternsPath);
    
    // TypeScript workaround for null checks
    // This ensures TypeScript recognizes properly typed non-null values after the null check

    if (!activeContext || !progress) {
      throw new ApplicationError(
        'CORE_FILES_NOT_FOUND',
        'Required memory bank core files not found'
      );
    }
    
    // Now TypeScript knows these are defined and have content property
    const activeContextContent = activeContext.content;
    const progressContent = progress.content;
    // Safely handle systemPatterns that might be null 
    // and check if content is too large (more than 5000 chars)
    const systemPatternsContent = systemPatterns && systemPatterns.content.length < 5000 ? 
      systemPatterns.content : '';

    // Extract sections based on language
    const sectionHeaders = language === 'en' ? {
      currentWork: '## Current Work',
      recentChanges: '## Recent Changes',
      activeDecisions: '## Active Decisions',
      considerations: '## Considerations',
      workingFeatures: '## Working Features',
      knownIssues: '## Known Issues',
      nextSteps: '## Next Steps',
      techDecisions: '## Technical Decisions'
    } : {
      currentWork: '## 現在の作業内容',
      recentChanges: '## 最近の変更点',
      activeDecisions: '## アクティブな決定事項',
      considerations: '## 検討事項',
      workingFeatures: '## 動作している機能',
      knownIssues: '## 既知の問題',
      nextSteps: '## 次のステップ',
      techDecisions: '## 技術的決定事項'
    };

    // Extract current work for title if custom title not provided
    let title = customTitle || '';
    let currentWork = this.extractSection(activeContextContent, sectionHeaders.currentWork);

    if (!title && currentWork) {
      const firstLine = currentWork.split('\n')[0];
      if (firstLine) {
        title = firstLine.trim();
      }
    }

    // If still no title, generate one from branch name
    if (!title) {
      const branchType = branchInfo.name.startsWith('feature/') ? 'feat' : 'fix';
      const featureName = branchInfo.name.replace(/^(feature|fix)\//, '').replace(/-/g, ' ');
      title = `${branchType}: ${featureName}`;
    }

    // Determine base branch if not specified
    const baseBranch = customBaseBranch || 
      (branchInfo.name.startsWith('feature/') ? 'develop' : 'master');

    // Prepare replacements for template
    const replacements: Record<string, string> = {
      '{{CURRENT_WORK}}': currentWork,
      '{{RECENT_CHANGES}}': this.extractSection(activeContextContent, sectionHeaders.recentChanges),
      '{{ACTIVE_DECISIONS}}': this.extractSection(activeContextContent, sectionHeaders.activeDecisions),
      '{{CONSIDERATIONS}}': this.extractSection(activeContextContent, sectionHeaders.considerations),
      '{{WORKING_FEATURES}}': this.extractSection(progressContent, sectionHeaders.workingFeatures),
      '{{KNOWN_ISSUES}}': this.extractSection(progressContent, sectionHeaders.knownIssues)
    };

    // Apply replacements
    let processedContent = templateContent;
    for (const [placeholder, content] of Object.entries(replacements)) {
      if (content) {
        // Replace placeholder with content
        processedContent = processedContent.replace(placeholder, content);
      } else {
        // Remove placeholder and its comment if content is empty
        const commentRegex = new RegExp(`<!-- [^>]+ -->[\\s\\n]*${placeholder}[\\s\\n]*`, 'g');
        processedContent = processedContent.replace(commentRegex, '');
        
        // Remove the placeholder itself
        processedContent = processedContent.replace(placeholder, '');
      }
    }

    // Clean up empty sections
    processedContent = this.cleanupEmptySections(processedContent);

    // Determine labels based on title and branch type
    const labels = ['memory-bank', 'auto-pr'];
    if (title.toLowerCase().includes('fix:') || title.toLowerCase().includes('修正')) {
      labels.push('bug');
    } else if (title.toLowerCase().includes('feat:') || title.toLowerCase().includes('機能')) {
      labels.push('enhancement');
    } else if (title.toLowerCase().includes('doc:') || title.toLowerCase().includes('ドキュメント')) {
      labels.push('documentation');
    }

    // Add PR header
    const prReadyMsg = language === 'en' ? '# PR Ready\n\n' : '# PRの準備完了\n\n';
    
    // Generate final content with metadata
    const finalContent = 
      `${prReadyMsg}#title: ${title}\n#targetBranch: ${baseBranch}\n#labels: ${labels.join(',')}\n\n${processedContent}`;

    return {
      title,
      baseBranch,
      labels,
      content: finalContent
    };
  }

  /**
   * Extract section from markdown content
   */
  private extractSection(content: string, sectionHeader: string): string {
    if (!content) return '';

    const lines = content.split('\n');
    let capturing = false;
    let result: string[] = [];

    for (const line of lines) {
      // Start capturing when section header is found
      if (line.includes(sectionHeader)) {
        capturing = true;
        continue;
      }

      if (capturing) {
        // Stop capturing at the next header
        if (line.startsWith('##')) {
          break;
        }

        // Add non-empty lines
        result.push(line);
      }
    }

    // Trim empty lines at the beginning and end
    while (result.length > 0 && result[0].trim() === '') {
      result.shift();
    }
    
    while (result.length > 0 && result[result.length - 1].trim() === '') {
      result.pop();
    }

    return result.join('\n');
  }

  /**
   * Clean up empty sections from template
   */
  private cleanupEmptySections(content: string): string {
    // Replace sections with no content
    let cleaned = content;
    
    // Replace empty sections (header followed immediately by another header)
    cleaned = cleaned.replace(/##\s+[^\n]+\n\s*\n*##/g, '##');
    
    // Reduce multiple consecutive newlines to max two
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Ensure there's a blank line before each section header
    cleaned = cleaned.replace(/([^\n])(\n##)/g, '$1\n$2');
    
    return cleaned;
  }
}
