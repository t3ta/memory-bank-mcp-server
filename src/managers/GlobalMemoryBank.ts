import { promises as fs } from 'fs';
import path from 'path';
import { BaseMemoryBank } from './BaseMemoryBank.js';
import { ValidationResult, TEMPLATES, Language, WorkspaceConfig } from '../models/types.js';

/**
 * Global memory bank implementation
 */
export class GlobalMemoryBank extends BaseMemoryBank {
  private static readonly REQUIRED_FILES = [
    'architecture.md',
    'coding-standards.md',
    'domain-models.md',
    'glossary.md',
    'tech-stack.md',
    'user-guide.md'
  ];

  private language: Language;

  constructor(basePath: string, config: WorkspaceConfig) {
    super(basePath);
    this.language = config.language;
  }

  /**
   * Initialize the global memory bank with required structure
   */
  async initialize(): Promise<void> {
    // Create tags directory
    await fs.mkdir(path.join(this.basePath, 'tags'), { recursive: true });

    // Create tags index
    await this.writeDocument('tags/index.md', `# ${this.language === 'ja' ? 'タグインデックス' : 'Tag Index'}

tags: #meta #index

## ${this.language === 'ja' ? '利用可能なタグ' : 'Available Tags'}

[${this.language === 'ja' ? 'このファイルは利用可能なタグで自動的に更新されます' : 'This file is automatically updated with available tags'}]
`);

    // Create required files with templates
    const templates = TEMPLATES[this.language];
    const templateMap = {
      'architecture.md': templates.architecture,
      'coding-standards.md': templates.codingStandards,
      'domain-models.md': templates.domainModels,
      'glossary.md': templates.glossary,
      'tech-stack.md': templates.techStack,
      'user-guide.md': templates.userGuide
    };

    for (const [file, template] of Object.entries(templateMap)) {
      const fullPath = path.join(this.basePath, file);
      try {
        await fs.access(fullPath);
      } catch {
        await this.writeDocument(file, template);
      }
    }
  }

  /**
   * Validate the global memory bank structure
   */
  async validateStructure(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      missingFiles: [],
      errors: []
    };

    // Check for required files
    for (const file of GlobalMemoryBank.REQUIRED_FILES) {
      try {
        await fs.access(path.join(this.basePath, file));
      } catch {
        result.isValid = false;
        result.missingFiles.push(file);
      }
    }

    // Check for tags directory
    try {
      await fs.access(path.join(this.basePath, 'tags'));
    } catch {
      result.isValid = false;
      result.errors.push('Missing tags directory');
    }

    return result;
  }

  /**
   * Update the tags index
   */
  async updateTagsIndex(): Promise<void> {
    const files = await this.listDocuments();
    const tagMap = new Map<string, Set<string>>();

    // Collect all tags and their documents
    for (const file of files) {
      try {
        const doc = await this.readDocument(file);
        for (const tag of doc.tags) {
          if (!tagMap.has(tag)) {
            tagMap.set(tag, new Set());
          }
          tagMap.get(tag)!.add(file);
        }
      } catch (error) {
        console.error(`Error reading document ${file}:`, error);
      }
    }

    // Generate index content
    let content = `# ${this.language === 'ja' ? 'タグインデックス' : 'Tag Index'}

tags: #meta #index

## ${this.language === 'ja' ? '利用可能なタグ' : 'Available Tags'}

`;

    const sortedTags = Array.from(tagMap.keys()).sort();
    for (const tag of sortedTags) {
      content += `### #${tag}\n\n`;
      const documents = Array.from(tagMap.get(tag)!).sort();
      for (const doc of documents) {
        content += `- [${doc}](../${doc})\n`;
      }
      content += '\n';
    }

    // Update the index file
    await this.writeDocument('tags/index.md', content);
  }
}
