/**
 * coding-standardsテンプレート定義
 * 
 * コーディング規約を表示するためのテンプレート
 */
import { Template } from '@memory-bank/schemas/templates';

/**
 * コーディング規約テンプレート
 * 命名規則、フォーマット、ドキュメント、テスト、エラー処理などの規約を表示します
 */
export const codingStandardsTemplate: Template = {
  schema: "template_v1",
  metadata: {
    id: "coding-standards-template",
    titleKey: "template.title.coding_standards",
    descriptionKey: "template.description.coding_standards",
    type: "system", // JSONでは "global-memory" でしたが、型定義に合わせて "system" に変更
    lastModified: "2025-03-24T16:05:00.000Z"
  },
  content: {
    sections: [
      {
        id: "overview",
        titleKey: "template.section.coding_standards_overview",
        contentKey: "template.content.coding_standards_overview",
        isOptional: false
      },
      {
        id: "naming",
        titleKey: "template.section.coding_standards_naming",
        contentKey: "template.content.coding_standards_naming",
        isOptional: false
      },
      {
        id: "formatting",
        titleKey: "template.section.coding_standards_formatting",
        contentKey: "template.content.coding_standards_formatting",
        isOptional: false
      },
      {
        id: "documentation",
        titleKey: "template.section.coding_standards_documentation",
        contentKey: "template.content.coding_standards_documentation",
        isOptional: false
      },
      {
        id: "testing",
        titleKey: "template.section.coding_standards_testing",
        contentKey: "template.content.coding_standards_testing",
        isOptional: true
      },
      {
        id: "errorHandling",
        titleKey: "template.section.coding_standards_error_handling",
        contentKey: "template.content.coding_standards_error_handling",
        isOptional: true
      },
      {
        id: "security",
        titleKey: "template.section.coding_standards_security",
        contentKey: "template.content.coding_standards_security",
        isOptional: true
      },
      {
        id: "performance",
        titleKey: "template.section.coding_standards_performance",
        contentKey: "template.content.coding_standards_performance",
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
      "OVERVIEW": "template.placeholder.coding_standards_overview",
      "NAMING": "template.placeholder.coding_standards_naming",
      "FORMATTING": "template.placeholder.coding_standards_formatting",
      "DOCUMENTATION": "template.placeholder.coding_standards_documentation",
      "TESTING": "template.placeholder.coding_standards_testing",
      "ERROR_HANDLING": "template.placeholder.coding_standards_error_handling",
      "SECURITY": "template.placeholder.coding_standards_security",
      "PERFORMANCE": "template.placeholder.coding_standards_performance"
    }
  }
};
