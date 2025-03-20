/**
 * Progress converter
 *
 * Converts progress markdown documents to JSON
 */
import { v4 as uuidv4 } from 'uuid';
import { BaseConverter } from './BaseConverter';
import { parseMarkdownForMigration } from '../utils/MarkdownParser';
import { JsonDocument } from '../../domain/entities/JsonDocument';
import { DocumentPath } from '../../domain/entities/DocumentPath';
import { DocumentId } from '../../domain/entities/DocumentId';
import { Tag } from '../../domain/entities/Tag';
import { ProgressContentV2 } from '../../schemas/v2/json-document';

/**
 * Converter for progress documents
 */
export class ProgressConverter implements BaseConverter {
  /**
   * Convert progress markdown to JSON document
   * @param markdownContent Markdown content
   * @param path Document path
   * @returns JsonDocument instance
   */
  convert(markdownContent: string, path: DocumentPath): JsonDocument {
    // Parse markdown
    const parsed = parseMarkdownForMigration(markdownContent, path.value);

    // Prepare content
    const content: ProgressContentV2 = {
      workingFeatures: Array.isArray(parsed.content.workingFeatures)
        ? (parsed.content.workingFeatures as string[])
        : [],
      pendingImplementation: Array.isArray(parsed.content.pendingImplementation)
        ? (parsed.content.pendingImplementation as string[])
        : [],
      status: (parsed.content.status as string) || '',
      knownIssues: Array.isArray(parsed.content.knownIssues)
        ? (parsed.content.knownIssues as string[])
        : [],
    };

    // Create tags
    const tags = parsed.tags.map((tag) => Tag.create(tag));

    // Create JsonDocument
    return JsonDocument.create({
      id: DocumentId.create(uuidv4()),
      path,
      title: parsed.title,
      documentType: 'progress',
      tags,
      content,
      lastModified: new Date(),
      createdAt: new Date(),
    });
  }
}
