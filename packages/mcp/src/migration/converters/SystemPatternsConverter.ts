/**
 * System patterns converter
 *
 * Converts system patterns markdown documents to JSON
 */
import { DocumentId } from "../../domain/entities/DocumentId.js";
import type { DocumentPath } from "../../domain/entities/DocumentPath.js";
import { DocumentVersionInfo } from "../../domain/entities/DocumentVersionInfo.js";
import { JsonDocument } from "../../domain/entities/JsonDocument.js";
import { Tag } from "../../domain/entities/Tag.js";
import { v4 as uuidv4 } from "uuid";
import type { TechnicalDecisionContentV2, SystemPatternsContentV2 } from "@memory-bank/schemas";

import { parseMarkdownForMigration, type TechnicalDecision } from "../utils/MarkdownParser.js";
import type { BaseConverter } from "./BaseConverter.js";



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
    const parsed = parseMarkdownForMigration(markdownContent, path.value);

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

    const content: SystemPatternsContentV2 = {
      technicalDecisions,
    };

    const tags = parsed.tags.map((tag) => Tag.create(tag));

    return JsonDocument.create({
      id: DocumentId.create(uuidv4()),
      path,
      title: parsed.title,
      documentType: 'system_patterns',
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
