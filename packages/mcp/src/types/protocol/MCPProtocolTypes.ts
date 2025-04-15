/**
 * MCP Protocol Layer Type Definitions
 *
 * This file contains type definitions for the MCP Protocol Layer.
 * These types represent the external communication format used by the MCP SDK.
 */

/**
 * MCPサーバーとの通信に使われる、SDK準拠のレスポンス型
 * @template T レスポンスデータの型
 */
export interface MCPToolResponse<T = any> {
  /** レスポンスの状態 */
  status: 'success' | 'error' | 'pending';
  /** 成功時のレスポンスデータ */
  result?: T;
  /** エラー時のメッセージ */
  error?: string;
  /** 追加のメタデータ情報 */
  _meta?: Record<string, unknown>;
}

/**
 * Tool Content - MCPレスポンスのコンテンツ形式
 * 通常は配列形式で返される
 */
export interface ToolContent {
  /** コンテンツの種類 */
  type: string;
  /** コンテンツのテキスト (文字列または任意のオブジェクト) */
  text: string | Record<string, unknown>;
  /** MIMEタイプ (オプショナル) */
  mimeType?: string;
}

/**
 * Legacy Tool Response - 古い形式のレスポンス型
 * 現行の型と互換性を維持するための型定義
 */
export interface LegacyToolResponse {
  /** コンテンツ (配列形式) */
  content: ToolContent[];
  /** エラー状態かどうか */
  isError?: boolean;
  /** メタデータ情報 */
  _meta?: Record<string, unknown>;
  /** その他のプロパティ */
  [key: string]: unknown;
}
