import { promises as fs } from 'fs';
import path from 'path';
import { BaseMemoryBank } from './BaseMemoryBank.js';
import { ValidationResult, BRANCH_CORE_FILES, TEMPLATES, Language, WorkspaceConfig, ValidationErrorType } from '../models/types.js';
import { MemoryBankError } from '../errors/MemoryBankError.js';
import {
  BranchNameSchema,
  ActiveContextSchema,
  ProgressSchema,
  SystemPatternsSchema,
  DocumentSections,
  WriteBranchCoreFilesArgs,
  WriteBranchCoreFilesArgsSchema,
  EditMode,
  SectionEditOptions
} from '../schemas/index.js';

/**
 * Branch memory bank implementation
 */
export class BranchMemoryBank extends BaseMemoryBank {
  private branchName: string;
  private language: Language;

  constructor(basePath: string, branchName: string, config: WorkspaceConfig) {
    super(basePath);
    try {
      this.branchName = BranchNameSchema.parse(branchName);
    } catch (error) {
      throw MemoryBankError.invalidBranchName(branchName);
    }
    this.language = config.language;
  }

  /**
   * Initialize the branch memory bank with required structure
   */
  async initialize(): Promise<void> {
    try {
      // Ensure directory exists
      await fs.mkdir(this.basePath, { recursive: true });

      const timestamp = new Date().toISOString();
      const templates = TEMPLATES[this.language];

      const templateMap = {
        'branchContext.md': templates.branchContext,
        'activeContext.md': templates.activeContext,
        'systemPatterns.md': templates.systemPatterns,
        'progress.md': templates.progress
      };

      // Initialize all core files with templates
      for (const file of BRANCH_CORE_FILES) {
        try {
          const filePath = path.join(this.basePath, file);
          let template: string = templateMap[file];

          // Replace placeholders
          template = template
            .replace('{branchName}', this.branchName.replace(/\//g, '-'))
            .replace('{timestamp}', timestamp);

          await this.writeDocument(file, template);
        } catch (error) {
          if (error instanceof MemoryBankError) {
            throw error;
          }
          throw MemoryBankError.fileSystemError('initialize', file, error as Error);
        }
      }
    } catch (error) {
      if (error instanceof MemoryBankError) {
        throw error;
      }
      throw MemoryBankError.fileSystemError('initialize', this.basePath, error as Error);
    }
  }

  /**
   * Validate the branch memory bank structure
   */
  async validateStructure(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      missingFiles: [],
      errors: []
    };

    // Check for required core files
    for (const file of BRANCH_CORE_FILES) {
      try {
        await fs.access(path.join(this.basePath, file));
      } catch {
        result.isValid = false;
        result.missingFiles.push(file);
        result.errors.push({
          type: ValidationErrorType.MISSING_FILE,
          message: `Required file ${file} is missing`,
          path: file
        });
      }
    }

    return result;
  }

  /**
   * Update the active context with new information
   */
  async updateActiveContext(updates: {
    currentWork?: string;
    recentChanges?: string[];
    activeDecisions?: string[];
    considerations?: string[];
    nextSteps?: string[];
    editOptions?: SectionEditOptions;
  }): Promise<void> {
    try {
      // Validate updates using zod schema
      const validatedUpdates = ActiveContextSchema.parse(updates);
      const editOptions = validatedUpdates.editOptions || { mode: 'replace' };

      const sections: DocumentSections = {};

      if (validatedUpdates.currentWork) {
        sections['currentWork'] = {
          header: this.language === 'ja' ? '## 現在の作業内容' : '## Current Work',
          content: validatedUpdates.currentWork
        };
      }

      if (validatedUpdates.recentChanges) {
        sections['recentChanges'] = {
          header: this.language === 'ja' ? '## 最近の変更点' : '## Recent Changes',
          content: validatedUpdates.recentChanges
        };
      }

      if (validatedUpdates.activeDecisions) {
        sections['activeDecisions'] = {
          header: this.language === 'ja' ? '## アクティブな決定事項' : '## Active Decisions',
          content: validatedUpdates.activeDecisions
        };
      }

      if (validatedUpdates.considerations) {
        sections['considerations'] = {
          header: this.language === 'ja' ? '## 検討事項' : '## Active Considerations',
          content: validatedUpdates.considerations
        };
      }

      if (validatedUpdates.nextSteps) {
        sections['nextSteps'] = {
          header: this.language === 'ja' ? '## 次のステップ' : '## Next Steps',
          content: validatedUpdates.nextSteps
        };
      }

      await this.updateSectionsWithOptions('activeContext.md', sections, editOptions);
    } catch (error) {
      if (error instanceof MemoryBankError) {
        throw error;
      }
      throw MemoryBankError.documentValidationFailed('activeContext.md', (error as Error).message);
    }
  }

  /**
   * Update progress information
   */
  async updateProgress(updates: {
    workingFeatures?: string[];
    pendingImplementation?: string[];
    status?: string;
    knownIssues?: string[];
    editOptions?: SectionEditOptions;
  }): Promise<void> {
    try {
      // Validate updates using zod schema
      const validatedUpdates = ProgressSchema.parse(updates);
      const editOptions = validatedUpdates.editOptions || { mode: 'replace' };

      const sections: DocumentSections = {};

      if (validatedUpdates.workingFeatures) {
        sections['workingFeatures'] = {
          header: this.language === 'ja' ? '## 動作している機能' : '## Working Features',
          content: validatedUpdates.workingFeatures
        };
      }

      if (validatedUpdates.pendingImplementation) {
        sections['pendingImplementation'] = {
          header: this.language === 'ja' ? '## 未実装の機能' : '## Pending Implementation',
          content: validatedUpdates.pendingImplementation
        };
      }

      if (validatedUpdates.status) {
        sections['status'] = {
          header: this.language === 'ja' ? '## 現在の状態' : '## Current Status',
          content: validatedUpdates.status
        };
      }

      if (validatedUpdates.knownIssues) {
        sections['knownIssues'] = {
          header: this.language === 'ja' ? '## 既知の問題' : '## Known Issues',
          content: validatedUpdates.knownIssues
        };
      }

      await this.updateSectionsWithOptions('progress.md', sections, editOptions);
    } catch (error) {
      if (error instanceof MemoryBankError) {
        throw error;
      }
      throw MemoryBankError.documentValidationFailed('progress.md', (error as Error).message);
    }
  }

  /**
   * Add a technical decision to systemPatterns.md
   */
  async addTechnicalDecision(decision: {
    title: string;
    context: string;
    decision: string;
    consequences: string[];
    editOptions?: SectionEditOptions;
  }): Promise<void> {
    try {
      // Validate decision using zod schema
      const validatedDecision = SystemPatternsSchema.shape.technicalDecisions.unwrap().element.parse(decision);
      const editOptions = decision.editOptions || { mode: 'append' };

      const decisionText = `
### ${validatedDecision.title}

${this.language === 'ja' ? '#### コンテキスト' : '#### Context'}
${validatedDecision.context}

${this.language === 'ja' ? '#### 決定事項' : '#### Decision'}
${validatedDecision.decision}

${this.language === 'ja' ? '#### 影響' : '#### Consequences'}
${validatedDecision.consequences.map((c: string) => `- ${c}`).join('\n')}
`;

      const sections: DocumentSections = {
        'technicalDecisions': {
          header: this.language === 'ja' ? '## 技術的決定事項' : '## Technical Decisions',
          content: decisionText
        }
      };

      await this.updateSectionsWithOptions('systemPatterns.md', sections, editOptions);
    } catch (error) {
      if (error instanceof MemoryBankError) {
        throw error;
      }
      throw MemoryBankError.documentValidationFailed('systemPatterns.md', (error as Error).message);
    }
  }

  /**
   * Write multiple core files at once
   */
  async writeCoreFiles(args: WriteBranchCoreFilesArgs): Promise<void> {
    try {
      const validatedArgs = WriteBranchCoreFilesArgsSchema.parse(args);

      // Initialize memory bank if needed
      await this.initialize();

      // Update branchContext.md
      if (validatedArgs.files.branchContext?.content) {
        await this.writeDocument('branchContext.md', validatedArgs.files.branchContext.content);
      }

      // Update activeContext.md with complete content
      if (validatedArgs.files.activeContext) {
        const content = [
          '# アクティブコンテキスト',
          '',
          '## 現在の作業内容',
          validatedArgs.files.activeContext.currentWork || '',
          '',
          '## 最近の変更点',
          ...(validatedArgs.files.activeContext.recentChanges?.map(c => `- ${c}`) || []),
          '',
          '## アクティブな決定事項',
          ...(validatedArgs.files.activeContext.activeDecisions?.map(d => `- ${d}`) || []),
          '',
          '## 検討事項',
          ...(validatedArgs.files.activeContext.considerations?.map(c => `- ${c}`) || []),
          '',
          '## 次のステップ',
          ...(validatedArgs.files.activeContext.nextSteps?.map(s => `- ${s}`) || [])
        ].join('\n');
        await this.writeDocument('activeContext.md', content);
      }

      // Update progress.md with complete content
      if (validatedArgs.files.progress) {
        const content = [
          '# 進捗状況',
          '',
          '## 動作している機能',
          ...(validatedArgs.files.progress.workingFeatures?.map(f => `- ${f}`) || []),
          '',
          '## 未実装の機能',
          ...(validatedArgs.files.progress.pendingImplementation?.map(f => `- ${f}`) || []),
          '',
          '## 現在の状態',
          validatedArgs.files.progress.status || '',
          '',
          '## 既知の問題',
          ...(validatedArgs.files.progress.knownIssues?.map(i => `- ${i}`) || [])
        ].join('\n');
        await this.writeDocument('progress.md', content);
      }

      // Update systemPatterns.md with complete content
      if (validatedArgs.files.systemPatterns?.technicalDecisions) {
        const content = [
          '# システムパターン',
          '',
          '## 技術的決定事項'
        ];

        for (const decision of validatedArgs.files.systemPatterns.technicalDecisions) {
          content.push(
            '',
            `### ${decision.title}`,
            '',
            '#### コンテキスト',
            decision.context,
            '',
            '#### 決定事項',
            decision.decision,
            '',
            '#### 影響',
            ...decision.consequences.map(c => `- ${c}`)
          );
        }

        content.push('', '## 関連ファイルとディレクトリ構造');
        await this.writeDocument('systemPatterns.md', content.join('\n'));
      }
    } catch (error) {
      if (error instanceof MemoryBankError) {
        throw error;
      }
      throw MemoryBankError.documentValidationFailed('core-files', (error as Error).message);
    }
  }

  /**
   * Update sections with edit options
   */
  private async updateSectionsWithOptions(
    documentPath: string,
    sections: DocumentSections,
    options: SectionEditOptions
  ): Promise<void> {
    try {
      const doc = await this.readDocument(documentPath);
      let content = doc.content;
      const lines = content.split('\n');

      for (const [sectionName, section] of Object.entries(sections)) {
        // Find all occurrences of the section header
        const sectionIndices = lines
          .map((line, index) => line.trim() === section.header ? index : -1)
          .filter(index => index !== -1);

        // Remove duplicate sections if in replace mode
        if (options.mode === 'replace' && sectionIndices.length > 1) {
          for (let i = 1; i < sectionIndices.length; i++) {
            const start = sectionIndices[i];
            const end = i < sectionIndices.length - 1 ? sectionIndices[i + 1] : lines.length;
            lines.splice(start, end - start);
          }
          content = lines.join('\n');
        }

        const sectionIndex = lines.findIndex(line => line.trim() === section.header);
        const formattedContent = Array.isArray(section.content)
          ? section.content.map(item => `- ${item}`).join('\n')
          : section.content;

        if (sectionIndex === -1) {
          // Section not found, append it at the end with proper spacing
          content = content.trim() + '\n\n' + section.header + '\n\n' + formattedContent;
          continue;
        }

        // Find the next section or end of file
        let nextSectionIndex = lines.findIndex((line, index) =>
          index > sectionIndex && line.startsWith('##')
        );
        if (nextSectionIndex === -1) {
          nextSectionIndex = lines.length;
        }

        // Apply edit options
        const startLine = options.startLine ?? sectionIndex + 2; // Skip header and empty line
        const endLine = options.endLine ?? nextSectionIndex;

        switch (options.mode) {
          case 'append':
            // Add new content at the end of the section with proper spacing
            const beforeSection = lines.slice(0, endLine).join('\n').trim();
            const afterSection = lines.slice(endLine).join('\n');
            content = `${beforeSection}\n\n${formattedContent}\n\n${afterSection}`;
            break;

          case 'prepend':
            // Add new content at the start of the section with proper spacing
            const beforeContent = lines.slice(0, startLine).join('\n').trim();
            const afterContent = lines.slice(startLine).join('\n');
            content = `${beforeContent}\n\n${formattedContent}\n\n${afterContent}`;
            break;

          default: // replace
            // Replace section content between startLine and endLine with proper spacing
            const before = lines.slice(0, startLine).join('\n').trim();
            const after = lines.slice(endLine).join('\n');
            content = `${before}\n\n${formattedContent}\n\n${after}`;
            break;
        }
      }

      // Normalize line endings and remove multiple consecutive empty lines
      content = content
        .replace(/\n{3,}/g, '\n\n') // Replace 3+ newlines with 2
        .trim() + '\n'; // Ensure single newline at end of file

      await this.writeDocument(documentPath, content, doc.tags);
    } catch (error) {
      if (error instanceof MemoryBankError) {
        throw error;
      }
      throw MemoryBankError.documentValidationFailed(documentPath, (error as Error).message);
    }
  }
}
