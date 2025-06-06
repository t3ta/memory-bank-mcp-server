/**
 * user-guideテンプレート定義
 * 
 * ユーザーガイドを表示するためのテンプレート
 */
import { Template } from '@memory-bank/schemas/templates';

/**
 * ユーザーガイドテンプレート
 * 導入、はじめ方、インストール、基本使用法、高度な機能、トラブルシューティングなどを表示します
 */
export const userGuideTemplate: Template = {
  schema: "template_v1",
  metadata: {
    id: "user-guide-template",
    titleKey: "template.title.user_guide",
    descriptionKey: "template.description.user_guide",
    type: "system", // JSONでは "global-memory" でしたが、型定義に合わせて "system" に変更
    lastModified: "2025-03-24T16:06:00.000Z"
  },
  content: {
    sections: [
      {
        id: "introduction",
        titleKey: "template.section.user_guide_introduction",
        contentKey: "template.content.user_guide_introduction",
        isOptional: false
      },
      {
        id: "gettingStarted",
        titleKey: "template.section.user_guide_getting_started",
        contentKey: "template.content.user_guide_getting_started",
        isOptional: false
      },
      {
        id: "installation",
        titleKey: "template.section.user_guide_installation",
        contentKey: "template.content.user_guide_installation",
        isOptional: false
      },
      {
        id: "basicUsage",
        titleKey: "template.section.user_guide_basic_usage",
        contentKey: "template.content.user_guide_basic_usage",
        isOptional: false
      },
      {
        id: "advancedFeatures",
        titleKey: "template.section.user_guide_advanced_features",
        contentKey: "template.content.user_guide_advanced_features",
        isOptional: true
      },
      {
        id: "troubleshooting",
        titleKey: "template.section.user_guide_troubleshooting",
        contentKey: "template.content.user_guide_troubleshooting",
        isOptional: true
      },
      {
        id: "faq",
        titleKey: "template.section.user_guide_faq",
        contentKey: "template.content.user_guide_faq",
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
      "INTRODUCTION": "template.placeholder.user_guide_introduction",
      "GETTING_STARTED": "template.placeholder.user_guide_getting_started",
      "INSTALLATION": "template.placeholder.user_guide_installation",
      "BASIC_USAGE": "template.placeholder.user_guide_basic_usage",
      "ADVANCED_FEATURES": "template.placeholder.user_guide_advanced_features",
      "TROUBLESHOOTING": "template.placeholder.user_guide_troubleshooting",
      "FAQ": "template.placeholder.user_guide_faq"
    }
  }
};
