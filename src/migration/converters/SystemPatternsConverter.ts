/**
 * System patterns converter
 *
 * Converts system patterns markdown documents to JSON
 */
import { v4 as uuidv4 } from 'uuid';
import { BaseConverter } from './BaseConverter.js';
import { parseMarkdownForMigration, TechnicalDecision } from '../utils/MarkdownParser.js';
import { JsonDocument } from '../../domain/entities/JsonDocument.js';
import { DocumentPath } from '../../domain/entities/DocumentPath.js';
import { DocumentId } from '../../domain/entities/DocumentId.js';
import { Tag } from '../../domain/entities/Tag.js';
import {
  SystemPatternsContentV2,
  TechnicalDecisionContentV2,
} from '../../schemas/v2/json-document.js';

/**
 * Converter for system patterns documents
 */
export class SystemPatternsConverter implements BaseConverter {
  /**
   * Convert system patterns markdown to JSON document
   * @param markdownContent Markdown content
   * @param path Document path
   * @returns JsonDocument instance
   */
  convert(markdownContent: string, path: DocumentPath): JsonDocument {
    // Parse markdown
    const parsed = parseMarkdownForMigration(markdownContent, path.value);

    // Convert technical decisions
    const technicalDecisions: TechnicalDecisionContentV2[] = [];

    if (Array.isArray(parsed.content.technicalDecisions)) {
      (parsed.content.technicalDecisions as TechnicalDecision[]).forEach((decision) => {
        technicalDecisions.push({
          title: decision.title,
          context: decision.context,
          decision: decision.decision,
          consequences: decision.consequences,
        });
      });
    }

    // Prepare content
    const content: SystemPatternsContentV2 = {
      technicalDecisions,
    };

    // Create tags
    const tags = parsed.tags.map((tag) => Tag.create(tag));

    // Create JsonDocument
    return JsonDocument.create({
      id: DocumentId.create(uuidv4()),
      path,
      title: parsed.title,
      documentType: 'system_patterns',
      tags,
      content,
      lastModified: new Date(),
      createdAt: new Date(),
    });
  }
}
