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
  private initialized: boolean = false;

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
   * Check if memory bank is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) return;

    try {
      // ディレクトリ作成（存在する場合は何もしない）
      await fs.mkdir(this.basePath, { recursive: true });

      // 必要なファイルの作成
      const timestamp = new Date().toISOString();
      const templates = TEMPLATES[this.language];

      for (const file of BRANCH_CORE_FILES) {
        try {
          const filePath = path.join(this.basePath, file);
          await fs.access(filePath);
        } catch {
          // ファイルが存在しない場合のみ作成
          const templateKey = file.replace(/\.md$/, '') as keyof typeof TEMPLATES[typeof this.language];
          const template = templates[templateKey]
            .replace('{branchName}', this.branchName.replace(/\//g, '-'))
            .replace('{timestamp}', timestamp);
          await this.writeDocument(file, template);
        }
      }
    } catch {
      // エラーが発生した場合は無視（次回の呼び出しで再試行）
    }

    this.initialized = true;
  }

  /**
   * Initialize the branch memory bank with required structure
   */
  async initialize(): Promise<void> {
    await this.ensureInitialized();
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
      await this.ensureInitialized();
      // Validate updates using zod schema
      const validatedUpdates = ActiveContextSchema.parse(updates);
      const editOptions = validatedUpdates.editOptions || { mode: 'replace' };

      const sections: DocumentSections = {};

      // Always include sections even if empty
      sections['currentWork'] = {
        header: this.language === 'ja' ? '## 現在の作業内容' : '## Current Work',
        content: validatedUpdates.currentWork || ''
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
      await this.ensureInitialized();
      // Validate updates using zod schema
      const validatedUpdates = ProgressSchema.parse(updates);
      const editOptions = validatedUpdates.editOptions || { mode: 'replace' };

      const sections: DocumentSections = {};

      // Always include sections even if empty
      sections['workingFeatures'] = {
        header: this.language === 'ja' ? '## 動作している機能' : '## Working Features',
        content: validatedUpdates.workingFeatures || []
      };

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
      await this.ensureInitialized();
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
      await this.ensureInitialized();

      // 各ファイルの更新
      if (validatedArgs.files.branchContext?.content) {
        await this.writeDocument('branchContext.md', validatedArgs.files.branchContext.content);
      }

      if (validatedArgs.files.activeContext) {
        await this.updateActiveContext(validatedArgs.files.activeContext);
      }

      if (validatedArgs.files.progress) {
        await this.updateProgress(validatedArgs.files.progress);
      }

      if (validatedArgs.files.systemPatterns?.technicalDecisions) {
        for (const decision of validatedArgs.files.systemPatterns.technicalDecisions) {
          await this.addTechnicalDecision(decision);
        }
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
      const lines = doc.content.split('\n');
      const result: string[] = [];
      let i = 0;

      // First pass: collect all sections and their content
      const allSections = new Map<string, { start: number; end: number }>();
      let currentStart = -1;

      for (i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('##')) {
          if (currentStart !== -1) {
            allSections.set(lines[currentStart].trim(), { start: currentStart, end: i });
          }
          currentStart = i;
        }
      }
      if (currentStart !== -1) {
        allSections.set(lines[currentStart].trim(), { start: currentStart, end: lines.length });
      }

      // Second pass: build the new content
      i = 0;
      while (i < lines.length) {
        const line = lines[i].trim();
        if (!line.startsWith('##')) {
          result.push(lines[i]);
          i++;
          continue;
        }

        // Found a section header
        const section = Object.values(sections).find(s => s.header === line);
        if (!section) {
          // No update for this section, copy until next section
          const sectionInfo = allSections.get(line);
          if (sectionInfo) {
            result.push(...lines.slice(i, sectionInfo.end));
            i = sectionInfo.end;
          } else {
            result.push(lines[i]);
            i++;
          }
          continue;
        }

        // Section to update
        result.push(lines[i]); // Add header
        i++;

        // Format new content
        const formattedContent = Array.isArray(section.content)
          ? section.content.map(item => `- ${item}`).join('\n')
          : section.content;

        // Get existing content
        const sectionInfo = allSections.get(line);
        const existingContent = sectionInfo
          ? lines.slice(i, sectionInfo.end).filter(l => l.trim())
          : [];

        // Apply the update based on mode
        result.push(''); // Empty line after header

        const content = [];
        switch (options.mode) {
          case 'append':
            if (existingContent.length > 0) {
              content.push(...existingContent);
            }
            if (formattedContent) {
              if (content.length > 0) content.push('');
              content.push(formattedContent);
            }
            break;

          case 'prepend':
            if (formattedContent) {
              content.push(formattedContent);
            }
            if (existingContent.length > 0) {
              if (content.length > 0) content.push('');
              content.push(...existingContent);
            }
            break;

          default: // replace
            if (formattedContent) {
              content.push(formattedContent);
            }
            break;
        }

        if (content.length > 0) {
          result.push(...content);
        }

        // Skip to next section
        i = sectionInfo ? sectionInfo.end : i;
      }

      // Add missing sections
      for (const section of Object.values(sections)) {
        if (!allSections.has(section.header)) {
          const formattedContent = Array.isArray(section.content)
            ? section.content.map(item => `- ${item}`).join('\n')
            : section.content;

          if (formattedContent) {
            result.push('');
            result.push(section.header);
            result.push('');
            result.push(formattedContent);
          }
        }
      }

      // Clean up and normalize content
      let content = result.join('\n')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .replace(/^-\s*$/gm, '')
        .trim() + '\n';

      await this.writeDocument(documentPath, content, doc.tags);
    } catch (error) {
      if (error instanceof MemoryBankError) {
        throw error;
      }
      throw MemoryBankError.documentValidationFailed(documentPath, (error as Error).message);
    }
  }
}
