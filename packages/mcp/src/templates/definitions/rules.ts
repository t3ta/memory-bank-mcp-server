/**
 * rulesテンプレート定義
 * 
 * Memory Bankシステムのルールを定義するテンプレート
 */
import { Template } from '@memory-bank/schemas/templates';

/**
 * rulesテンプレート
 * ブランチメモリーのルールとガイドラインを定義します
 */
export const rulesTemplate: Template = {
  schema: "template_v1",
  metadata: {
    id: "rules",
    titleKey: "template.title.rules",
    descriptionKey: "template.description.rules",
    type: "system",
    lastModified: "2025-04-11T12:45:00.000Z"
  },
  content: {
    sections: [
      {
        id: "branchMemoryGuidelines",
        titleKey: "template.section.branchMemoryGuidelines",
        contentKey: "template.content.branchMemoryGuidelines",
        isOptional: false
      },
      {
        id: "branchContextJson",
        titleKey: "template.section.branchContextJson",
        contentKey: "template.content.branchContextJson",
        isOptional: false
      },
      {
        id: "activeContextJson",
        titleKey: "template.section.activeContextJson",
        contentKey: "template.content.activeContextJson",
        isOptional: false
      },
      {
        id: "progressJson",
        titleKey: "template.section.progressJson",
        contentKey: "template.content.progressJson",
        isOptional: false
      },
      {
        id: "systemPatternsJson",
        titleKey: "template.section.systemPatternsJson",
        contentKey: "template.content.systemPatternsJson",
        isOptional: false
      },
      {
        id: "bestPractices",
        titleKey: "template.section.bestPractices",
        contentKey: "template.content.bestPractices",
        isOptional: false
      }
    ],
    placeholders: {}
  }
};
