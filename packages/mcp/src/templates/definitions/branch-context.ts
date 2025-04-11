/**
 * branch-contextテンプレート定義
 * 
 * ブランチコンテキストを表示するためのテンプレート
 */
import { Template } from '@memory-bank/schemas/templates';

/**
 * ブランチコンテキストテンプレート
 * ブランチの目的、背景、ユーザーストーリーなどを表示します
 */
export const branchContextTemplate: Template = {
  schema: "template_v1",
  metadata: {
    id: "branch-context",
    titleKey: "template.title.branch_context",
    descriptionKey: "template.description.branch_context",
    type: "system",
    lastModified: "2025-03-24T16:01:00.000Z"
  },
  content: {
    sections: [
      {
        id: "purpose",
        titleKey: "template.section.purpose",
        contentKey: "template.content.purpose",
        isOptional: false
      },
      {
        id: "background",
        titleKey: "template.section.background",
        contentKey: "template.content.background",
        isOptional: true
      },
      {
        id: "userStories",
        titleKey: "template.section.user_stories",
        contentKey: "template.content.user_stories",
        isOptional: false
      },
      {
        id: "relatedIssues",
        titleKey: "template.section.related_issues",
        contentKey: "template.content.related_issues",
        isOptional: true
      },
      {
        id: "technicalConsiderations",
        titleKey: "template.section.technical_considerations",
        contentKey: "template.content.technical_considerations",
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
      "PROBLEM": "template.placeholder.problem",
      "FEATURES": "template.placeholder.features",
      "BEHAVIOR": "template.placeholder.behavior",
      "ISSUES": "template.placeholder.issues",
      "TECH_CONSIDERATIONS": "template.placeholder.tech_considerations"
    }
  }
};
