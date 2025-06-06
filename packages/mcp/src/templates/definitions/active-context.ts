/**
 * active-contextテンプレート定義
 * 
 * アクティブコンテキストを表示するためのテンプレート
 */
import { Template } from '@memory-bank/schemas/templates';

/**
 * アクティブコンテキストテンプレート
 * 現在の作業内容、最近の変更、次のステップなどを表示します
 */
export const activeContextTemplate: Template = {
  schema: "template_v1",
  metadata: {
    id: "active-context",
    titleKey: "template.title.active_context",
    descriptionKey: "template.description.active_context",
    type: "system",
    lastModified: "2025-03-24T16:00:00.000Z"
  },
  content: {
    sections: [
      {
        id: "currentWork",
        titleKey: "template.section.current_work",
        contentKey: "template.content.current_work",
        isOptional: false
      },
      {
        id: "recentChanges",
        titleKey: "template.section.recent_changes",
        contentKey: "template.content.recent_changes",
        isOptional: true
      },
      {
        id: "activeDecisions",
        titleKey: "template.section.active_decisions",
        contentKey: "template.content.active_decisions",
        isOptional: true
      },
      {
        id: "considerations",
        titleKey: "template.section.considerations",
        contentKey: "template.content.considerations",
        isOptional: true
      },
      {
        id: "nextSteps",
        titleKey: "template.section.next_steps",
        contentKey: "template.content.next_steps",
        isOptional: false
      },
      {
        id: "footer",
        titleKey: "template.section.footer",
        contentKey: "template.content.footer",
        isOptional: false
      }
    ],
    placeholders: {
      "CURRENT_WORK": "template.placeholder.current_work",
      "RECENT_CHANGES": "template.placeholder.recent_changes",
      "ACTIVE_DECISIONS": "template.placeholder.active_decisions",
      "CONSIDERATIONS": "template.placeholder.considerations",
      "NEXT_STEPS": "template.placeholder.next_steps"
    }
  }
};
