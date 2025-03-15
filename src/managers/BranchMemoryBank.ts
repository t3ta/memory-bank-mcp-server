import { promises as fs } from 'fs';
import path from 'path';
import { BaseMemoryBank } from './BaseMemoryBank.js';
import { ValidationResult, BRANCH_CORE_FILES, TEMPLATES, Language, WorkspaceConfig } from '../models/types.js';

/**
 * Branch memory bank implementation
 */
export class BranchMemoryBank extends BaseMemoryBank {
  private branchName: string;
  private language: Language;

  constructor(basePath: string, branchName: string, config: WorkspaceConfig) {
    super(basePath);
    this.branchName = branchName;
    this.language = config.language;
  }

  /**
   * Initialize the branch memory bank with required structure
   */
  async initialize(): Promise<void> {
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

    for (const file of BRANCH_CORE_FILES) {
      try {
        // Check if file exists
        const filePath = path.join(this.basePath, file);
        try {
          await fs.access(filePath);
          continue; // Skip if file exists
        } catch {
          // File doesn't exist, create it
          let template: string = templateMap[file];

          // Replace placeholders
          template = template
            .replace('{branchName}', this.branchName.replace(/\//g, '-'))
            .replace('{timestamp}', timestamp);

          await fs.writeFile(filePath, template, 'utf-8');
        }
      } catch (error) {
        console.error(`Error initializing file ${file}:`, error);
        throw error;
      }
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
  }): Promise<void> {
    const doc = await this.readDocument('activeContext.md');
    let content = doc.content;

    if (updates.currentWork) {
      content = this.updateSection(content, this.language === 'ja' ? '## 現在の作業内容' : '## Current Work', updates.currentWork);
    }

    if (updates.recentChanges) {
      const changes = updates.recentChanges.map(change => `- ${change}`).join('\n');
      content = this.updateSection(content, this.language === 'ja' ? '## 最近の変更点' : '## Recent Changes', changes);
    }

    if (updates.activeDecisions) {
      const decisions = updates.activeDecisions.map(decision => `- ${decision}`).join('\n');
      content = this.updateSection(content, this.language === 'ja' ? '## アクティブな決定事項' : '## Active Decisions', decisions);
    }

    if (updates.considerations) {
      const considerations = updates.considerations.map(item => `- ${item}`).join('\n');
      content = this.updateSection(content, this.language === 'ja' ? '## 検討事項' : '## Active Considerations', considerations);
    }

    if (updates.nextSteps) {
      const steps = updates.nextSteps.map(step => `- [ ] ${step}`).join('\n');
      content = this.updateSection(content, this.language === 'ja' ? '## 次のステップ' : '## Next Steps', steps);
    }

    await this.writeDocument('activeContext.md', content);
  }

  /**
   * Update progress information
   */
  async updateProgress(updates: {
    workingFeatures?: string[];
    pendingImplementation?: string[];
    status?: string;
    knownIssues?: string[];
  }): Promise<void> {
    const doc = await this.readDocument('progress.md');
    let content = doc.content;

    if (updates.workingFeatures) {
      const features = updates.workingFeatures.map(feature => `- ${feature}`).join('\n');
      content = this.updateSection(content, this.language === 'ja' ? '## 動作している機能' : '## Working Features', features);
    }

    if (updates.pendingImplementation) {
      const pending = updates.pendingImplementation.map(item => `- [ ] ${item}`).join('\n');
      content = this.updateSection(content, this.language === 'ja' ? '## 未実装の機能' : '## Pending Implementation', pending);
    }

    if (updates.status) {
      content = this.updateSection(content, this.language === 'ja' ? '## 現在の状態' : '## Current Status', updates.status);
    }

    if (updates.knownIssues) {
      const issues = updates.knownIssues.map(issue => `- ${issue}`).join('\n');
      content = this.updateSection(content, this.language === 'ja' ? '## 既知の問題' : '## Known Issues', issues);
    }

    await this.writeDocument('progress.md', content);
  }

  /**
   * Add a technical decision to systemPatterns.md
   */
  async addTechnicalDecision(decision: {
    title: string;
    context: string;
    decision: string;
    consequences: string[];
  }): Promise<void> {
    const doc = await this.readDocument('systemPatterns.md');
    const decisionText = `
### ${decision.title}

${this.language === 'ja' ? '#### コンテキスト' : '#### Context'}
${decision.context}

${this.language === 'ja' ? '#### 決定事項' : '#### Decision'}
${decision.decision}

${this.language === 'ja' ? '#### 影響' : '#### Consequences'}
${decision.consequences.map(c => `- ${c}`).join('\n')}
`;

    const content = this.updateSection(doc.content, this.language === 'ja' ? '## 技術的決定事項' : '## Technical Decisions', decisionText, true);
    await this.writeDocument('systemPatterns.md', content);
  }

  private updateSection(content: string, sectionHeader: string, newContent: string, append = false): string {
    const lines = content.split('\n');
    const sectionIndex = lines.findIndex(line => line.trim() === sectionHeader);

    if (sectionIndex === -1) {
      // Section not found, append it at the end
      return `${content}\n\n${sectionHeader}\n\n${newContent}`;
    }

    // Find the next section or end of file
    let nextSectionIndex = lines.findIndex((line, index) =>
      index > sectionIndex && line.startsWith('##')
    );
    if (nextSectionIndex === -1) {
      nextSectionIndex = lines.length;
    }

    if (append) {
      // Add new content at the end of the section
      const beforeSection = lines.slice(0, nextSectionIndex).join('\n');
      const afterSection = lines.slice(nextSectionIndex).join('\n');
      return `${beforeSection}\n${newContent}\n${afterSection}`;
    } else {
      // Replace section content
      const beforeSection = lines.slice(0, sectionIndex + 1).join('\n');
      const afterSection = lines.slice(nextSectionIndex).join('\n');
      return `${beforeSection}\n\n${newContent}\n${afterSection}`;
    }
  }
}
