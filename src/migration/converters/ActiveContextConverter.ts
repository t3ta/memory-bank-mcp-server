/**
 * Active context converter
 *
 * Converts active context markdown documents to JSON
 */
import { v4 as uuidv4 } from 'uuid';
import { BaseConverter } from './BaseConverter.js';
import { parseMarkdownForMigration } from '../utils/MarkdownParser.js';
import { JsonDocument } from '../../domain/entities/JsonDocument.js';
import { DocumentPath } from '../../domain/entities/DocumentPath.js';
import { DocumentId } from '../../domain/entities/DocumentId.js';
import { Tag } from '../../domain/entities/Tag.js';
import { ActiveContextContentV2 } from '../../schemas/v2/json-document.js';

/**
 * Converter for active context documents
 */
export class ActiveContextConverter implements BaseConverter {
  /**
   * Convert active context markdown to JSON document
   * @param markdownContent Markdown content
   * @param path Document path
   * @returns JsonDocument instance
   */
  convert(markdownContent: string, path: DocumentPath): JsonDocument {
    // Parse markdown
    const parsed = parseMarkdownForMigration(markdownContent, path.value);

    // Prepare content
    const content: ActiveContextContentV2 = {
      currentWork: (parsed.content.currentWork as string) || '',
      recentChanges: Array.isArray(parsed.content.recentChanges)
        ? (parsed.content.recentChanges as string[])
        : [],
      activeDecisions: Array.isArray(parsed.content.activeDecisions)
        ? (parsed.content.activeDecisions as string[])
        : [],
      considerations: Array.isArray(parsed.content.considerations)
        ? (parsed.content.considerations as string[])
        : [],
      nextSteps: Array.isArray(parsed.content.nextSteps)
        ? (parsed.content.nextSteps as string[])
        : [],
    };

    // Create tags
    const tags = parsed.tags.map((tag) => Tag.create(tag));

    // Create JsonDocument
    return JsonDocument.create({
      id: DocumentId.create(uuidv4()),
      path,
      title: parsed.title,
      documentType: 'active_context',
      tags,
      content,
      lastModified: new Date(),
      createdAt: new Date(),
    });
  }
}
