/**
 * Domain Layer Type Definitions
 *
 * This file contains type definitions for the Domain Layer.
 * These types represent the core business entities and value objects.
 */

/**
 * メモリバンクのドメインモデル共通インターフェース
 * ドメイン層で扱われる標準的な形式
 */
export interface DomainDocumentModel {
  /** ドキュメントの種類 */
  documentType: string;
  /** ドキュメントのコンテンツ (常にオブジェクト形式) */
  content: Record<string, unknown>;
  /** ドキュメントのメタデータ */
  metadata: Record<string, unknown>;
}

/**
 * ドメインモデルのコンテンツタイプ
 * これはドメインモデルのコンテンツ部分の標準形式
 */
export interface DomainContent {
  /** コンテンツの値 (文字列またはJSON互換のデータ構造) */
  [key: string]: unknown;
}
