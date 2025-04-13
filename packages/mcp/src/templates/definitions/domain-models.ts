/**
 * domain-modelsテンプレート定義
 * 
 * ドメインモデルを表示するためのテンプレート
 */
import { Template } from '@memory-bank/schemas/templates';

/**
 * ドメインモデルテンプレート
 * エンティティ、値オブジェクト、集約、リポジトリ、サービス、イベントなどを表示します
 */
export const domainModelsTemplate: Template = {
  schema: "template_v1",
  metadata: {
    id: "domain-models-template",
    titleKey: "template.title.domain_models",
    descriptionKey: "template.description.domain_models",
    type: "system", // JSONでは "global-memory" でしたが、型定義に合わせて "system" に変更
    lastModified: "2025-03-24T16:05:00.000Z"
  },
  content: {
    sections: [
      {
        id: "overview",
        titleKey: "template.section.domain_models_overview",
        contentKey: "template.content.domain_models_overview",
        isOptional: false
      },
      {
        id: "entities",
        titleKey: "template.section.domain_models_entities",
        contentKey: "template.content.domain_models_entities",
        isOptional: false
      },
      {
        id: "valueObjects",
        titleKey: "template.section.domain_models_value_objects",
        contentKey: "template.content.domain_models_value_objects",
        isOptional: false
      },
      {
        id: "aggregates",
        titleKey: "template.section.domain_models_aggregates",
        contentKey: "template.content.domain_models_aggregates",
        isOptional: true
      },
      {
        id: "repositories",
        titleKey: "template.section.domain_models_repositories",
        contentKey: "template.content.domain_models_repositories",
        isOptional: true
      },
      {
        id: "services",
        titleKey: "template.section.domain_models_services",
        contentKey: "template.content.domain_models_services",
        isOptional: true
      },
      {
        id: "events",
        titleKey: "template.section.domain_models_events",
        contentKey: "template.content.domain_models_events",
        isOptional: true
      },
      {
        id: "relationships",
        titleKey: "template.section.domain_models_relationships",
        contentKey: "template.content.domain_models_relationships",
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
      "OVERVIEW": "template.placeholder.domain_models_overview",
      "ENTITIES": "template.placeholder.domain_models_entities",
      "VALUE_OBJECTS": "template.placeholder.domain_models_value_objects",
      "AGGREGATES": "template.placeholder.domain_models_aggregates",
      "REPOSITORIES": "template.placeholder.domain_models_repositories",
      "SERVICES": "template.placeholder.domain_models_services",
      "EVENTS": "template.placeholder.domain_models_events",
      "RELATIONSHIPS": "template.placeholder.domain_models_relationships"
    }
  }
};
