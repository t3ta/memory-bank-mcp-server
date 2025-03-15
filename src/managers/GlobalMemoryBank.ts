import { promises as fs } from 'fs';
import path from 'path';
import { BaseMemoryBank } from './BaseMemoryBank.js';
import { ValidationResult, TEMPLATES, Language, WorkspaceConfig, GLOBAL_CORE_FILES, ValidationErrorType } from '../models/types.js';
import { MemoryBankError } from '../errors/MemoryBankError.js';
import { TagSchema } from '../schemas/index.js';

/**
 * Global memory bank implementation
 */
export class GlobalMemoryBank extends BaseMemoryBank {
  private language: Language;

  constructor(basePath: string, config: WorkspaceConfig) {
    super(basePath);
    this.language = config.language;
  }

  /**
   * Initialize the global memory bank with required structure
   */
  async initialize(): Promise<void> {
    try {
      // Create tags directory
      const tagsDir = path.join(this.basePath, 'tags');
      await fs.mkdir(tagsDir, { recursive: true });

      // Create tags index with validated tags
      const metaTag = await this.validateTags(['meta', 'index']);
      await this.writeDocument('tags/index.md', `# ${this.language === 'ja' ? 'タグインデックス' : 'Tag Index'}

tags: ${metaTag.map(t => `#${t}`).join(' ')}

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
        try {
          const fullPath = path.join(this.basePath, file);
          try {
            await fs.access(fullPath);
          } catch {
            await this.writeDocument(file, template);
          }
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
   * Validate the global memory bank structure
   */
  async validateStructure(): Promise<ValidationResult> {
    const result: ValidationResult = {
      isValid: true,
      missingFiles: [],
      errors: []
    };

    // Check for required files
    for (const file of GLOBAL_CORE_FILES) {
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

    // Check for tags directory
    try {
      await fs.access(path.join(this.basePath, 'tags'));
    } catch {
      result.isValid = false;
      result.errors.push({
        type: ValidationErrorType.INVALID_STRUCTURE,
        message: 'Missing tags directory',
        path: 'tags'
      });
    }

    // Check for tags index file
    try {
      await fs.access(path.join(this.basePath, 'tags/index.md'));
    } catch {
      result.isValid = false;
      result.errors.push({
        type: ValidationErrorType.MISSING_FILE,
        message: 'Missing tags index file',
        path: 'tags/index.md'
      });
    }

    return result;
  }

  /**
   * Update the tags index
   */
  async updateTagsIndex(): Promise<void> {
    try {
      const files = await this.listDocuments();
      const tagMap = new Map<string, Set<string>>();

      // Collect all tags and their documents
      for (const file of files) {
        try {
          const doc = await this.readDocument(file);
          // Validate tags before adding them to the index
          const validatedTags = await this.validateTags(doc.tags);
          for (const tag of validatedTags) {
            if (!tagMap.has(tag)) {
              tagMap.set(tag, new Set());
            }
            tagMap.get(tag)!.add(file);
          }
        } catch (error) {
          if (error instanceof MemoryBankError) {
            console.error(`Error reading document ${file}:`, error.message);
            continue;
          }
          throw error;
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
    } catch (error) {
      if (error instanceof MemoryBankError) {
        throw error;
      }
      throw MemoryBankError.fileSystemError('update-tags', 'tags/index.md', error as Error);
    }
  }

  /**
   * Override tag validation to ensure all tags are valid
   */
  protected async validateTags(tags: string[]): Promise<string[]> {
    try {
      return await Promise.all(tags.map(tag => {
        try {
          return TagSchema.parse(tag);
        } catch (error) {
          throw MemoryBankError.invalidTagFormat(tag);
        }
      }));
    } catch (error) {
      if (error instanceof MemoryBankError) {
        throw error;
      }
      throw MemoryBankError.invalidTagFormat(tags.join(', '));
    }
  }
}
