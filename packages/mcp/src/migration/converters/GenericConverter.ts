/**
 * Generic converter
 *
 * Converts generic markdown documents to JSON
 * Used as a fallback when no specific converter is available
 */
import { v4 as uuidv4 } from 'uuid';
import { BaseConverter } from './BaseConverter.js';
import { parseMarkdownForMigration } from '../utils/MarkdownParser.js';
import { JsonDocument } from '../../domain/entities/JsonDocument.js';
import { DocumentPath } from '../../domain/entities/DocumentPath.js';
import { DocumentId } from '../../domain/entities/DocumentId.js';
import { DocumentVersionInfo } from '../../domain/entities/DocumentVersionInfo.js';
import { Tag } from '../../domain/entities/Tag.js';

/**
 * Converter for generic documents
 */
export class GenericConverter implements BaseConverter {
  /**
   * Convert generic markdown to JSON document
   * @param markdownContent Markdown content
   * @param path Document path
   * @returns JsonDocument instance
   */
  convert(markdownContent: string, path: DocumentPath): JsonDocument {
    const parsed = parseMarkdownForMigration(markdownContent, path.value);

    const contentObj = { ...parsed.content };

    if (
      typeof contentObj !== 'object' ||
      contentObj === null ||
      Object.keys(contentObj).length === 0
    ) {
      contentObj.rawContent = markdownContent;
      contentObj.sections = this.extractSections(markdownContent);
    }

    const tags = parsed.tags.map((tag) => Tag.create(tag));

    return JsonDocument.create({
      id: DocumentId.create(uuidv4()),
      path,
      title: parsed.title,
      documentType: 'generic',
      tags,
      content: contentObj,
      versionInfo: new DocumentVersionInfo({
        version: 1,
        lastModified: new Date(),
        modifiedBy: 'migration'
      })
    });
  }

  /**
   * Extract sections from markdown content
   * @param content Markdown content
   * @returns Object with section titles as keys and content as values
   */
  private extractSections(content: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = content.split('\n');

    let currentSection = 'main';
    let currentContent = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('## ')) {
        if (currentContent.trim()) {
          sections[currentSection] = currentContent.trim();
        }

        currentSection = line
          .substring(3)
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^a-z0-9_]/g, '');
        currentContent = '';
        continue;
      }

      if (line.startsWith('# ') || line.startsWith('tags:')) {
        continue;
      }

      currentContent += line + '\n';
    }

    if (currentContent.trim()) {
      sections[currentSection] = currentContent.trim();
    }

    return sections;
  }
}
