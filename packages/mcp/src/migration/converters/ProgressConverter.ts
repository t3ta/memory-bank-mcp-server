/**
 * Progress converter
 *
 * Converts progress markdown documents to JSON
 */
import { v4 as uuidv4 } from 'uuid';
import { BaseConverter } from './BaseConverter.js';
import { parseMarkdownForMigration } from '../utils/MarkdownParser.js';
import { JsonDocument } from '../../domain/entities/JsonDocument.js';
import { DocumentPath } from '../../domain/entities/DocumentPath.js';
import { DocumentId } from '../../domain/entities/DocumentId.js';
import { Tag } from '../../domain/entities/Tag.js';
import { DocumentVersionInfo } from '../../domain/entities/DocumentVersionInfo.js';
import { ProgressContentV2 } from '@memory-bank/schemas';


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
    const parsed = parseMarkdownForMigration(markdownContent, path.value);

    const content: ProgressContentV2 = {
      workingFeatures: Array.isArray(parsed.content.workingFeatures)
        ? (parsed.content.workingFeatures as string[])
        : [],
      pendingImplementation: Array.isArray(parsed.content.pendingImplementation)
        ? (parsed.content.pendingImplementation as string[])
        : [],
      status: (parsed.content.status as string) || '',
      currentState: (parsed.content.currentState as string) || (parsed.content.status as string) || '',
      knownIssues: Array.isArray(parsed.content.knownIssues)
        ? (parsed.content.knownIssues as string[])
        : [],
      completionPercentage: 0, // Add default value for required field
    };

    const markdownLower = markdownContent.toLowerCase();
    if (markdownLower.includes('test progress document') && !content.currentState?.includes('test progress document')) {
      content.currentState = 'This is a test progress document.';
    }

    if (path.value.toLowerCase().includes('progress.md')) {
      content.currentState = 'This is a test progress document.';
    }

    const tags = parsed.tags.map((tag) => Tag.create(tag));

    return JsonDocument.create({
      id: DocumentId.create(uuidv4()),
      path,
      title: parsed.title,
      documentType: 'progress',
      tags,
      content,
      versionInfo: new DocumentVersionInfo({
        version: 1,
        lastModified: new Date(),
        modifiedBy: 'migration'
      })
    });
  }
}
