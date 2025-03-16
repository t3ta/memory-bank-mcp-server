import { IFileSystemService } from '../../../infrastructure/storage/interfaces/IFileSystemService.js';
import { IBranchMemoryBankRepository } from '../../../domain/repositories/IBranchMemoryBankRepository.js';
import { PullRequestDTO } from '../../dtos/PullRequestDTO.js';
import {
  ICreatePullRequestUseCase,
  CreatePullRequestInput,
  CreatePullRequestOutput,
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
    en: 'pull-request-template-en.md',
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
      const { branch, title, baseBranch, language = 'ja', skipPatterns = false } = input;

      // Validate branch name
      if (!branch) {
        throw new ApplicationError('INVALID_INPUT', 'Branch name is required');
      }

      // Validate language
      if (language !== 'ja' && language !== 'en') {
        throw new ApplicationError('INVALID_INPUT', 'Language must be either "ja" or "en"');
      }

      // Create domain objects
      const branchInfo = BranchInfo.create(branch);

      // Check if branch exists
      const branchExists = await this.branchRepository.exists(branch);
      if (!branchExists) {
        throw new ApplicationError('BRANCH_NOT_FOUND', `Branch "${branch}" not found`);
      }

      // Generate PR content
      const pullRequest = await this.generatePullRequestContent(
        branchInfo,
        title,
        baseBranch,
        language,
        skipPatterns
      );

      // Create PR file path
      const prFilePath = `pullRequest.md`;
      const documentPath = DocumentPath.create(prFilePath);

      // Create memory document
      const document = MemoryDocument.create({
        path: documentPath,
        content: pullRequest.content,
        tags: [Tag.create('pull-request')],
        lastModified: new Date(),
      });

      // Write pullRequest.md to branch memory bank
      await this.branchRepository.saveDocument(branchInfo, document);

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
    language: string = 'ja',
    skipPatterns: boolean = false
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

    // Get activeContext and progress files fully - these are smaller files
    const activeContext = await this.branchRepository.getDocument(branchInfo, activeContextPath);
    const progress = await this.branchRepository.getDocument(branchInfo, progressPath);

    // TypeScript workaround for null checks
    if (!activeContext || !progress) {
      throw new ApplicationError(
        'CORE_FILES_NOT_FOUND',
        'Required memory bank core files not found'
      );
    }

    // Now TypeScript knows these are defined and have content property
    const activeContextContent = activeContext.content;
    const progressContent = progress.content;

    // Extract sections based on language
    const sectionHeaders =
      language === 'en'
        ? {
            currentWork: '## Current Work',
            recentChanges: '## Recent Changes',
            activeDecisions: '## Active Decisions',
            considerations: '## Considerations',
            workingFeatures: '## Working Features',
            knownIssues: '## Known Issues',
            nextSteps: '## Next Steps',
            techDecisions: '## Technical Decisions',
          }
        : {
            currentWork: '## 現在の作業内容',
            recentChanges: '## 最近の変更点',
            activeDecisions: '## アクティブな決定事項',
            considerations: '## 検討事項',
            workingFeatures: '## 動作している機能',
            knownIssues: '## 既知の問題',
            nextSteps: '## 次のステップ',
            techDecisions: '## 技術的決定事項',
          };

    // Extract current work for title if custom title not provided
    let title = customTitle || '';
    const currentWork = this.extractSection(activeContextContent, sectionHeaders.currentWork);

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
    const baseBranch =
      customBaseBranch || (branchInfo.name.startsWith('feature/') ? 'develop' : 'master');

    // Get technical decisions from systemPatterns efficiently (without loading entire file)
    let technicalDecisions = '';
    try {
      // If skipPatterns is true, don't even try to extract system patterns
      if (!skipPatterns) {
        // Check if systemPatterns file exists using listDocuments()
        const allDocuments = await this.branchRepository.listDocuments(branchInfo);
        const systemPatternsExists = allDocuments.some(
          (docPath) => docPath.value === systemPatternsPath.value
        );

        if (systemPatternsExists) {
          // Get only the most recent technical decisions to avoid memory issues
          // Instead of loading the entire file, we'll extract just the decisions we need
          const recentDecisions = await this.extractRecentTechnicalDecisions(
            branchInfo,
            systemPatternsPath,
            language === 'en' ? '### ' : '### ',
            5 // Limit to 5 recent decisions
          );

          if (recentDecisions.length > 0) {
            const sectionHeader =
              language === 'en' ? '## Technical Decisions' : '## 技術的決定事項';
            technicalDecisions = `${sectionHeader}\n\n${this.formatDecisions(recentDecisions)}`;
          }
        }
      } else {
        console.info('Skipping system patterns extraction as requested');
      }
    } catch (error) {
      // If we encounter an error, log it but continue without the technical decisions
      console.warn('Failed to extract technical decisions due to:', error);
      technicalDecisions = '';
    }

    // Prepare replacements for template
    const replacements: Record<string, string> = {
      '{{CURRENT_WORK}}': currentWork,
      '{{RECENT_CHANGES}}': this.extractSection(activeContextContent, sectionHeaders.recentChanges),
      '{{ACTIVE_DECISIONS}}': this.extractSection(
        activeContextContent,
        sectionHeaders.activeDecisions
      ),
      '{{CONSIDERATIONS}}': this.extractSection(
        activeContextContent,
        sectionHeaders.considerations
      ),
      '{{WORKING_FEATURES}}': this.extractSection(progressContent, sectionHeaders.workingFeatures),
      '{{KNOWN_ISSUES}}': this.extractSection(progressContent, sectionHeaders.knownIssues),
    };

    // Only add technical decisions if we have them
    if (technicalDecisions) {
      // システムパターンから抽出した技術的決定事項もアクティブな決定事項として追加
      // もし既にアクティブな決定事項がある場合は統合する
      const activeDecisions = replacements['{{ACTIVE_DECISIONS}}'] || '';
      if (activeDecisions) {
        replacements['{{ACTIVE_DECISIONS}}'] = activeDecisions + '\n\n' + technicalDecisions;
      } else {
        replacements['{{ACTIVE_DECISIONS}}'] = technicalDecisions;
      }
    }

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
    } else if (
      title.toLowerCase().includes('doc:') ||
      title.toLowerCase().includes('ドキュメント')
    ) {
      labels.push('documentation');
    }

    // Add PR header
    const prReadyMsg = language === 'en' ? '# PR Ready\n\n' : '# PRの準備完了\n\n';

    // Generate final content with metadata
    const finalContent = `${prReadyMsg}#title: ${title}\n#targetBranch: ${baseBranch}\n#labels: ${labels.join(',')}\n\n${processedContent}`;

    return {
      title,
      baseBranch,
      labels,
      content: finalContent,
    };
  }

  /**
   * Extract recent technical decisions directly from the repository
   * This avoids loading the entire systemPatterns file into memory
   */
  private async extractRecentTechnicalDecisions(
    branchInfo: BranchInfo,
    systemPatternsPath: DocumentPath,
    decisionPrefix: string,
    limit: number
  ): Promise<string[]> {
    try {
      // Instead of getting the whole document, check if it exists first
      const allDocuments = await this.branchRepository.listDocuments(branchInfo);
      const systemPatternsExists = allDocuments.some(
        (docPath) => docPath.value === systemPatternsPath.value
      );

      if (!systemPatternsExists) {
        return [];
      }

      // Use raw file system service to read the file in chunks
      // This avoids loading the entire file into memory through the domain entity
      const branchPath = this.fileSystemService.getBranchMemoryPath
        ? this.fileSystemService.getBranchMemoryPath(branchInfo.name)
        : path.join(
            this.fileSystemService.getConfig?.().memoryBankRoot || 'docs/branch-memory-bank',
            branchInfo.name.replace('/', '-')
          );

      const systemPatternsFilePath = path.join(branchPath, systemPatternsPath.value);

      // Check if file exists
      const fileExists = await this.fileSystemService.fileExists?.(systemPatternsFilePath);
      if (!fileExists) {
        return [];
      }

      // Read only the beginning of the file (first 150KB) where recent technical decisions
      // are most likely to be found
      const chunkSize = 150 * 1024; // 150KB
      const firstChunk = await this.readFileChunk(systemPatternsFilePath, 0, chunkSize);

      // Find all decision sections (starting with "### ")
      const decisions: string[] = [];

      // Find decision sections indexes
      const decisionStartIndices: number[] = [];
      let searchIndex = 0;
      let foundIndex: number;

      // Find all occurrences of the decision prefix in the first chunk
      while ((foundIndex = firstChunk.indexOf(decisionPrefix, searchIndex)) !== -1) {
        decisionStartIndices.push(foundIndex);
        searchIndex = foundIndex + decisionPrefix.length;

        // Limit the number of decisions we find to avoid memory issues
        if (decisionStartIndices.length >= limit) {
          break;
        }
      }

      // Extract each decision section
      for (let i = 0; i < decisionStartIndices.length; i++) {
        const startIndex = decisionStartIndices[i];
        const endIndex =
          i < decisionStartIndices.length - 1
            ? decisionStartIndices[i + 1]
            : Math.min(startIndex + 2000, firstChunk.length); // Limit each decision to max 2KB

        const decision = firstChunk.substring(startIndex, endIndex);
        decisions.push(decision);
      }

      // Process each decision to extract just the essential parts
      return decisions.slice(0, limit).map((decision) => {
        // Extract just the first few lines of each decision (title + context + main points)
        const lines = decision.split('\n').slice(0, 10); // Take only first 10 lines max
        return lines.join('\n');
      });
    } catch (error) {
      console.error('Error extracting recent technical decisions:', error);
      return [];
    }
  }

  /**
   * Read a chunk of a file rather than the entire file
   * This helps prevent memory issues with large files
   */
  private async readFileChunk(filePath: string, start: number, length: number): Promise<string> {
    try {
      // Check if the fileSystemService has a readFileChunk method
      if (this.fileSystemService.readFileChunk) {
        return await this.fileSystemService.readFileChunk(filePath, start, length);
      }

      // Fallback: read the whole file but only return the requested chunk
      const content = await this.fileSystemService.readFile(filePath);
      return content.substring(start, Math.min(start + length, content.length));
    } catch (error) {
      console.error(`Error reading file chunk from ${filePath}:`, error);
      return '';
    }
  }

  /**
   * Parse individual decisions from a section
   * This method is kept for backward compatibility but is no longer used
   * in the optimized implementation
   */
  private parseDecisionsFromSection(section: string): string[] {
    // Split by "### " which indicates the start of each decision
    const parts = section.split(/###\s+/);
    // The first part is the section header, so remove it
    parts.shift();
    return parts;
  }

  /**
   * Format decision parts into a readable format
   */
  private formatDecisions(decisions: string[]): string {
    if (decisions.length === 0) {
      return '';
    }

    return decisions
      .map((decision) => {
        // For decisions that already start with "### ", keep them as is
        if (decision.trim().startsWith('###')) {
          // Limit the content to reduce memory usage
          const lines = decision.trim().split('\n');
          // Get the title (first line)
          const title = lines[0];

          // Only include the most important content - skip empty lines and limit to 5 lines
          const content = lines
            .slice(1)
            .filter((line) => line.trim().length > 0)
            .slice(0, 5)
            .join('\n');

          return `${title}\n${content}`;
        } else {
          // For other formats, try to extract a title
          const lines = decision.trim().split('\n');
          const title = lines[0].trim();

          // Only include the most important content - skip empty lines
          const content = lines
            .slice(1)
            .filter((line) => line.trim().length > 0)
            .slice(0, 5)
            .join('\n');

          return `### ${title}\n${content}`;
        }
      })
      .join('\n\n');
  }

  /**
   * Extract section from markdown content
   */
  private extractSection(content: string, sectionHeader: string): string {
    if (!content) return '';

    const lines = content.split('\n');
    let capturing = false;
    const result: string[] = [];

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
