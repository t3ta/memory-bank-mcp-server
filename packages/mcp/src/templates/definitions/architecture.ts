/**
 * architectureテンプレート定義
 * 
 * アーキテクチャ情報を表示するためのテンプレート
 */
import { Template } from '@memory-bank/schemas/templates';

/**
 * アーキテクチャテンプレート
 * システムのアーキテクチャ、コンポーネント、レイヤー、データフローなどを表示します
 */
export const architectureTemplate: Template = {
  schema: "template_v1",
  metadata: {
    id: "architecture-template",
    titleKey: "template.title.architecture",
    descriptionKey: "template.description.architecture",
    type: "system", // JSONでは "global-memory" でしたが、型定義に合わせて "system" に変更
    lastModified: "2025-03-24T16:05:00.000Z"
  },
  content: {
    sections: [
      {
        id: "overview",
        titleKey: "template.section.architecture_overview",
        contentKey: "template.content.architecture_overview",
        isOptional: false
      },
      {
        id: "components",
        titleKey: "template.section.architecture_components",
        contentKey: "template.content.architecture_components",
        isOptional: false
      },
      {
        id: "layers",
        titleKey: "template.section.architecture_layers",
        contentKey: "template.content.architecture_layers",
        isOptional: false
      },
      {
        id: "dataFlow",
        titleKey: "template.section.architecture_data_flow",
        contentKey: "template.content.architecture_data_flow",
        isOptional: true
      },
      {
        id: "dependencies",
        titleKey: "template.section.architecture_dependencies",
        contentKey: "template.content.architecture_dependencies",
        isOptional: true
      },
      {
        id: "decisions",
        titleKey: "template.section.architecture_decisions",
        contentKey: "template.content.architecture_decisions",
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
      "OVERVIEW": "template.placeholder.architecture_overview",
      "COMPONENTS": "template.placeholder.architecture_components",
      "LAYERS": "template.placeholder.architecture_layers",
      "DATA_FLOW": "template.placeholder.architecture_data_flow",
      "DEPENDENCIES": "template.placeholder.architecture_dependencies",
      "DECISIONS": "template.placeholder.architecture_decisions"
    }
  }
};
