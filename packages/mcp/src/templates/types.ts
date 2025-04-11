/**
 * テンプレート関連の型定義
 */

// テンプレートのメタデータ
export interface TemplateMetadata {
  id: string;
  titleKey: string;
  descriptionKey: string;
  type: 'system' | 'user' | 'project';
  lastModified: string;
}

// テンプレートのセクション
export interface TemplateSection {
  id: string;
  titleKey: string;
  contentKey: string;
  isOptional: boolean;
}

// テンプレートの内容
export interface TemplateContent {
  sections: TemplateSection[];
  placeholders: Record<string, unknown>;
}

// テンプレートのスキーマ
export interface Template {
  schema: 'template_v1';
  metadata: TemplateMetadata;
  content: TemplateContent;
}

// 言語タイプ
export type Language = 'en' | 'ja' | 'zh';
