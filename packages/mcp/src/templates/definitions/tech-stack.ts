/**
 * tech-stackテンプレート定義
 * 
 * テクノロジースタックを表示するためのテンプレート
 */
import { Template } from '@memory-bank/schemas/templates';

/**
 * テクノロジースタックテンプレート
 * フロントエンド、バックエンド、データベース、インフラなどの技術スタックを表示します
 */
export const techStackTemplate: Template = {
  schema: "template_v1",
  metadata: {
    id: "tech-stack",
    titleKey: "template.title.tech_stack",
    descriptionKey: "template.description.tech_stack",
    type: "system",
    lastModified: "2025-03-24T16:06:00.000Z"
  },
  content: {
    sections: [
      {
        id: "overview",
        titleKey: "template.section.tech_stack_overview",
        contentKey: "template.content.tech_stack_overview",
        isOptional: false
      },
      {
        id: "frontend",
        titleKey: "template.section.tech_stack_frontend",
        contentKey: "template.content.tech_stack_frontend",
        isOptional: false
      },
      {
        id: "backend",
        titleKey: "template.section.tech_stack_backend",
        contentKey: "template.content.tech_stack_backend",
        isOptional: false
      },
      {
        id: "database",
        titleKey: "template.section.tech_stack_database",
        contentKey: "template.content.tech_stack_database",
        isOptional: false
      },
      {
        id: "infrastructure",
        titleKey: "template.section.tech_stack_infrastructure",
        contentKey: "template.content.tech_stack_infrastructure",
        isOptional: true
      },
      {
        id: "devTools",
        titleKey: "template.section.tech_stack_dev_tools",
        contentKey: "template.content.tech_stack_dev_tools",
        isOptional: true
      },
      {
        id: "testing",
        titleKey: "template.section.tech_stack_testing",
        contentKey: "template.content.tech_stack_testing",
        isOptional: true
      },
      {
        id: "deployment",
        titleKey: "template.section.tech_stack_deployment",
        contentKey: "template.content.tech_stack_deployment",
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
      "OVERVIEW": "template.placeholder.tech_stack_overview",
      "FRONTEND": "template.placeholder.tech_stack_frontend",
      "BACKEND": "template.placeholder.tech_stack_backend",
      "DATABASE": "template.placeholder.tech_stack_database",
      "INFRASTRUCTURE": "template.placeholder.tech_stack_infrastructure",
      "DEV_TOOLS": "template.placeholder.tech_stack_dev_tools",
      "TESTING": "template.placeholder.tech_stack_testing",
      "DEPLOYMENT": "template.placeholder.tech_stack_deployment"
    }
  }
};
