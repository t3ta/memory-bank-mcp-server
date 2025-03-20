import { JsonDocument } from '../../../domain/entities/JsonDocument.js';
import { BaseDocumentTypeConverter } from '..DocumentTypeConverter.js';
import { MarkdownBuilder } from '..MarkdownBuilder.js';

/**
 * Converter for System Patterns documents
 */
export class SystemPatternsConverter extends BaseDocumentTypeConverter {
  protected documentType = 'system_patterns';

  /**
   * Convert System Patterns content to Markdown
   * @param document System Patterns JSON document
   * @param builder Markdown builder
   */
  protected convertContent(document: JsonDocument, builder: MarkdownBuilder): void {
    // Extract content from document
    const content = document.content as any;

    // Technical decisions section
    builder.heading('技術的決定事項', 2);

    if (
      content.technicalDecisions &&
      Array.isArray(content.technicalDecisions) &&
      content.technicalDecisions.length > 0
    ) {
      content.technicalDecisions.forEach((decision: any) => {
        // Decision title
        if (decision.title) {
          builder.heading(decision.title, 3);
        }

        // Context subsection
        if (decision.context) {
          builder.heading('コンテキスト', 4);
          builder.paragraph(decision.context);
        }

        // Decision subsection
        if (decision.decision) {
          builder.heading('決定事項', 4);
          builder.paragraph(decision.decision);
        }

        // Consequences subsection
        if (
          decision.consequences &&
          Array.isArray(decision.consequences) &&
          decision.consequences.length > 0
        ) {
          builder.heading('影響', 4);
          builder.list(decision.consequences);
        }
      });
    }
  }
}
