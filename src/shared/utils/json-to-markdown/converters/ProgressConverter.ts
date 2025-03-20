import { JsonDocument } from '../../../../domain/entities/JsonDocument.js';
import { BaseDocumentTypeConverter } from '../DocumentTypeConverter.js';
import { MarkdownBuilder } from '../MarkdownBuilder.js';

/**
 * Converter for Progress documents
 */
export class ProgressConverter extends BaseDocumentTypeConverter {
  protected documentType = 'progress';

  /**
   * Convert Progress content to Markdown
   * @param document Progress JSON document
   * @param builder Markdown builder
   */
  protected convertContent(document: JsonDocument, builder: MarkdownBuilder): void {
    // Extract content from document
    const content = document.content as any;

    // Working features section
    builder.heading('動作している機能', 2);
    if (
      content.workingFeatures &&
      Array.isArray(content.workingFeatures) &&
      content.workingFeatures.length > 0
    ) {
      builder.list(content.workingFeatures);
    }

    // Pending implementation section
    builder.heading('未実装の機能', 2);
    if (
      content.pendingImplementation &&
      Array.isArray(content.pendingImplementation) &&
      content.pendingImplementation.length > 0
    ) {
      builder.list(content.pendingImplementation);
    }

    // Current status section
    builder.heading('現在の状態', 2);
    if (content.status) {
      builder.paragraph(content.status);
    }

    // Known issues section
    builder.heading('既知の問題', 2);
    if (
      content.knownIssues &&
      Array.isArray(content.knownIssues) &&
      content.knownIssues.length > 0
    ) {
      builder.list(content.knownIssues);
    }
  }
}
