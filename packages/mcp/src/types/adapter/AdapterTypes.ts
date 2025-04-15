/**
 * Adapter Layer Type Definitions
 *
 * This file contains type definitions for the Adapter Layer.
 * These types represent the bridge between external protocol formats and internal domain models.
 */

/**
 * MCPプロトコル層とドメイン層を橋渡しするアダプター
 * 外部プロトコル形式と内部モデル形式の変換を担当
 */
export interface MCPResultAdapter {
  /** 変換済みのコンテンツデータ (任意の形式) */
  content: any;
  /** エラー状態かどうか */
  isError?: boolean;
  /** 追加のメタデータ情報 */
  metadata?: Record<string, unknown>;
}

/**
 * ドキュメントアダプター - ドメインモデルとJSON表現の変換を担当
 */
export interface DocumentAdapter {
  /** ドキュメントの種類 */
  documentType: string;
  /** ドキュメントのコンテンツ (オブジェクト形式) */
  content: Record<string, unknown>;
  /** ドキュメントのメタデータ */
  metadata: Record<string, unknown>;
}
