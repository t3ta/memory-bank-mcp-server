/**
 * progressテンプレート定義
 * 
 * 進捗状況を表示するためのテンプレート
 */
import { Template } from '@memory-bank/schemas/templates';

/**
 * 進捗テンプレート
 * 動作中の機能、未実装の機能、現在のステータス、既知の問題などを表示します
 */
export const progressTemplate: Template = {
  schema: "template_v1",
  metadata: {
    id: "progress",
    titleKey: "template.title.progress",
    descriptionKey: "template.description.progress",
    type: "system",
    lastModified: "2025-03-24T16:01:00.000Z"
  },
  content: {
    sections: [
      {
        id: "workingFeatures",
        titleKey: "template.section.working_features",
        contentKey: "template.content.working_features",
        isOptional: false
      },
      {
        id: "unimplementedFeatures",
        titleKey: "template.section.unimplemented_features",
        contentKey: "template.content.unimplemented_features",
        isOptional: false
      },
      {
        id: "currentStatus",
        titleKey: "template.section.current_status",
        contentKey: "template.content.current_status",
        isOptional: false
      },
      {
        id: "knownIssues",
        titleKey: "template.section.known_issues",
        contentKey: "template.content.known_issues",
        isOptional: true
      },
      {
        id: "completionCriteria",
        titleKey: "template.section.completion_criteria",
        contentKey: "template.content.completion_criteria",
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
      "WORKING_FEATURES": "template.placeholder.working_features",
      "UNIMPLEMENTED_FEATURES": "template.placeholder.unimplemented_features",
      "CURRENT_STATUS": "template.placeholder.current_status",
      "KNOWN_ISSUES": "template.placeholder.known_issues",
      "COMPLETION_CRITERIA": "template.placeholder.completion_criteria"
    }
  }
};
