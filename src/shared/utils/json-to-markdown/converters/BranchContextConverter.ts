import { JsonDocument } from '../../../../domain/entities/JsonDocument.js';
import { BaseDocumentTypeConverter } from '../DocumentTypeConverter.js';
import { MarkdownBuilder } from '../MarkdownBuilder.js';

/**
 * Converter for Branch Context documents
 */
export class BranchContextConverter extends BaseDocumentTypeConverter {
  protected documentType = 'branch_context';

  /**
   * Convert Branch Context content to Markdown
   * @param document Branch Context JSON document
   * @param builder Markdown builder
   */
  protected convertContent(document: JsonDocument, builder: MarkdownBuilder): void {
    // Extract content from document
    const content = document.content as any;

    // Purpose section
    if (content.purpose) {
      builder.heading('目的', 2);
      builder.paragraph(content.purpose);

      // Add branch info if available
      if (document.path && document.path.value) {
        builder.paragraph(`ブランチ: ${document.path.directory}`);
      }

      // Add creation date if available
      if (content.createdAt) {
        const createdAt =
          content.createdAt instanceof Date ? content.createdAt.toISOString() : content.createdAt;

        builder.paragraph(`作成日時: ${createdAt}`);
      }
    }

    // User stories section
    if (
      content.userStories &&
      Array.isArray(content.userStories) &&
      content.userStories.length > 0
    ) {
      builder.heading('ユーザーストーリー', 2);

      // For challenge and features sections
      builder.heading('解決する課題', 3);
      const challenges = content.userStories
        .filter((story: any) => story.type === 'challenge' || !story.type)
        .map((story: any) => story.description);

      if (challenges.length > 0) {
        builder.list(challenges);
      }

      builder.heading('必要な機能', 3);
      const features = content.userStories
        .filter((story: any) => story.type === 'feature')
        .map((story: any) => story.description);

      if (features.length > 0) {
        builder.list(features);
      }

      builder.heading('期待される動作', 3);
      const expectations = content.userStories
        .filter((story: any) => story.type === 'expectation')
        .map((story: any) => story.description);

      if (expectations.length > 0) {
        builder.list(expectations);
      }
    }
  }
}
