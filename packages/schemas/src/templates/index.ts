/**
 * テンプレート関連の型定義
 * 
 * このモジュールはMemory Bankシステムで使用されるテンプレートの型定義を提供します。
 * テンプレートはmarkdownとJSONの中間形式として使用され、国際化対応が組み込まれています。
 */

// 既存の言語型を再利用
import type { Language } from '../v2/i18n-schema.js';

// Language型の再エクスポート
export type { Language };

/**
 * テンプレートのメタデータ
 */
export interface TemplateMetadata {
  /** テンプレートの一意識別子 */
  id: string;
  /** 国際化対応のタイトルキー */
  titleKey: string;
  /** 国際化対応の説明キー */
  descriptionKey: string;
  /** テンプレートのタイプ */
  type: 'system' | 'user' | 'project';
  /** 最終更新日時 (ISO 8601形式) */
  lastModified: string;
}

/**
 * テンプレートのセクション
 */
export interface TemplateSection {
  /** セクションの一意識別子 */
  id: string;
  /** 国際化対応のセクションタイトルキー */
  titleKey: string;
  /** 国際化対応のセクション内容キー */
  contentKey: string;
  /** セクションが省略可能かどうか */
  isOptional: boolean;
}

/**
 * テンプレートの内容
 */
export interface TemplateContent {
  /** テンプレートセクションの配列 */
  sections: TemplateSection[];
  /** テンプレート内で使用されるプレースホルダー */
  placeholders: Record<string, unknown>;
}

/**
 * テンプレートのスキーマ
 */
export interface Template {
  /** スキーマバージョン識別子 */
  schema: 'template_v1';
  /** テンプレートのメタデータ */
  metadata: TemplateMetadata;
  /** テンプレートの内容 */
  content: TemplateContent;
}
