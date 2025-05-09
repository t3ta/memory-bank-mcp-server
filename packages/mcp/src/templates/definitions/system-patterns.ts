/**
 * system-patternsテンプレート定義
 * 
 * システムパターンを表示するためのテンプレート
 */
import { Template } from '@memory-bank/schemas/templates';

/**
 * システムパターンテンプレート
 * 技術的な決定、ファイル構造、設計パターン、アーキテクチャなどを表示します
 */
export const systemPatternsTemplate: Template = {
  schema: "template_v1",
  metadata: {
    id: "system-patterns",
    titleKey: "template.title.system_patterns",
    descriptionKey: "template.description.system_patterns",
    type: "system",
    lastModified: "2025-03-24T16:01:00.000Z"
  },
  content: {
    sections: [
      {
        id: "technicalDecisions",
        titleKey: "template.section.technical_decisions",
        contentKey: "template.content.technical_decisions",
        isOptional: false
      },
      {
        id: "fileStructure",
        titleKey: "template.section.file_structure",
        contentKey: "template.content.file_structure",
        isOptional: true
      },
      {
        id: "designPatterns",
        titleKey: "template.section.design_patterns",
        contentKey: "template.content.design_patterns",
        isOptional: true
      },
      {
        id: "architecture",
        titleKey: "template.section.architecture",
        contentKey: "template.content.architecture",
        isOptional: true
      },
      {
        id: "footer",
        titleKey: "template.section.footer",
        contentKey: "template.content.footer",
        isOptional: false
      }
    ],
    placeholders: {
      "DESIGN_PATTERNS": "template.placeholder.design_patterns",
      "ARCHITECTURE": "template.placeholder.architecture"
    }
  }
};
