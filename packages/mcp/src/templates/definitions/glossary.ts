/**
 * glossaryテンプレート定義
 * 
 * 用語集を表示するためのテンプレート
 */
import { Template } from '@memory-bank/schemas/templates';

/**
 * 用語集テンプレート
 * ドメイン用語、技術用語、略語、命名規則などを表示します
 */
export const glossaryTemplate: Template = {
  schema: "template_v1",
  metadata: {
    id: "glossary-template",
    titleKey: "template.title.glossary",
    descriptionKey: "template.description.glossary",
    type: "system", // JSONでは "global-memory" でしたが、型定義に合わせて "system" に変更
    lastModified: "2025-03-24T16:06:00.000Z"
  },
  content: {
    sections: [
      {
        id: "introduction",
        titleKey: "template.section.glossary_introduction",
        contentKey: "template.content.glossary_introduction",
        isOptional: false
      },
      {
        id: "domainTerms",
        titleKey: "template.section.glossary_domain_terms",
        contentKey: "template.content.glossary_domain_terms",
        isOptional: false
      },
      {
        id: "technicalTerms",
        titleKey: "template.section.glossary_technical_terms",
        contentKey: "template.content.glossary_technical_terms",
        isOptional: false
      },
      {
        id: "abbreviations",
        titleKey: "template.section.glossary_abbreviations",
        contentKey: "template.content.glossary_abbreviations",
        isOptional: true
      },
      {
        id: "namingConventions",
        titleKey: "template.section.glossary_naming_conventions",
        contentKey: "template.content.glossary_naming_conventions",
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
      "INTRODUCTION": "template.placeholder.glossary_introduction",
      "DOMAIN_TERMS": "template.placeholder.glossary_domain_terms",
      "TECHNICAL_TERMS": "template.placeholder.glossary_technical_terms",
      "ABBREVIATIONS": "template.placeholder.glossary_abbreviations",
      "NAMING_CONVENTIONS": "template.placeholder.glossary_naming_conventions"
    }
  }
};
