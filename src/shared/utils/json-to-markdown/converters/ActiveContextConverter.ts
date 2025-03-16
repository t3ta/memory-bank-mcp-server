import { JsonDocument } from '../../../../domain/entities/JsonDocument.js';
import { BaseDocumentTypeConverter } from '../DocumentTypeConverter.js';
import { MarkdownBuilder } from '../MarkdownBuilder.js';

/**
 * Converter for Active Context documents
 */
export class ActiveContextConverter extends BaseDocumentTypeConverter {
  protected documentType = 'active_context';
  
  /**
   * Convert Active Context content to Markdown
   * @param document Active Context JSON document
   * @param builder Markdown builder
   */
  protected convertContent(document: JsonDocument, builder: MarkdownBuilder): void {
    // Extract content from document
    const content = document.content as any;
    
    // Current work section
    if (content.currentWork) {
      builder.heading('現在の作業内容', 2);
      builder.paragraph(content.currentWork);
    }
    
    // Recent changes section
    if (content.recentChanges && Array.isArray(content.recentChanges) && content.recentChanges.length > 0) {
      builder.heading('最近の変更点', 2);
      builder.list(content.recentChanges);
    }
    
    // Active decisions section
    if (content.activeDecisions && Array.isArray(content.activeDecisions) && content.activeDecisions.length > 0) {
      builder.heading('アクティブな決定事項', 2);
      builder.list(content.activeDecisions);
    }
    
    // Considerations section
    if (content.considerations && Array.isArray(content.considerations) && content.considerations.length > 0) {
      builder.heading('検討事項', 2);
      builder.list(content.considerations);
    }
    
    // Next steps section
    if (content.nextSteps && Array.isArray(content.nextSteps) && content.nextSteps.length > 0) {
      builder.heading('次のステップ', 2);
      builder.list(content.nextSteps);
    }
  }
}
