/**
 * Unified E2E Test API
 * 
 * このファイルはE2Eテストのためのシンプルな統一APIを提供します。
 * 主な目的:
 * 1. 直接ファイルシステムアクセスへのフォールバックを排除
 * 2. テストコードをシンプルに保つ
 * 3. 実際の環境と同じTransport経由の通信フローをテストする
 */

import { MCPInMemoryClient } from './MCPInMemoryClient.js';

// document-tools.tsのインタフェースと互換性を持つように型定義
export interface WriteDocumentParams {
  scope: 'branch' | 'global';
  branch?: string;
  path: string;
  content?: Record<string, unknown> | string;
  patches?: Record<string, unknown>[];
  tags?: string[];
  docs: string;
  returnContent?: boolean;
}

export interface ReadDocumentParams {
  scope: 'branch' | 'global';
  branch?: string;
  path: string;
  docs: string;
}

/**
 * Unified write_document implementation that uses MCPInMemoryClient
 * This implementation provides the same interface as document-tools.ts but uses the transport layer
 */
export async function unified_write_document(
  client: MCPInMemoryClient,
  params: WriteDocumentParams
): Promise<any> {
  console.log(`[unified_write_document] Starting with params:`, {
    scope: params.scope,
    branch: params.branch,
    path: params.path,
    hasContent: !!params.content,
    hasPatches: !!params.patches,
    hasTags: !!params.tags,
    returnContent: params.returnContent
  });

  // MCPInMemoryClientのメソッドを使用するだけ - レスポンス変換やエラーハンドリングはクライアントに委譲
  return client.writeDocument(
    params.scope,
    params.path,
    params.docs,
    {
      content: params.content,
      patches: params.patches,
      tags: params.tags,
      branch: params.branch,
      returnContent: params.returnContent
    }
  );
}

/**
 * Unified read_document implementation that uses MCPInMemoryClient
 * This implementation provides the same interface as document-tools.ts but uses the transport layer
 */
export async function unified_read_document(
  client: MCPInMemoryClient,
  params: ReadDocumentParams
): Promise<any> {
  console.log(`[unified_read_document] Starting with params:`, {
    scope: params.scope,
    branch: params.branch,
    path: params.path
  });

  // MCPInMemoryClientのメソッドを使用するだけ - レスポンス変換やエラーハンドリングはクライアントに委譲
  return client.readDocument(
    params.scope,
    params.path,
    params.docs,
    {
      branch: params.branch
    }
  );
}

/**
 * Unified search_documents_by_tags implementation that uses MCPInMemoryClient
 * This implementation provides the same interface as document-tools.ts but uses the transport layer
 */
export async function unified_search_documents_by_tags(
  client: MCPInMemoryClient,
  tags: string[],
  docs: string,
  options: {
    match?: 'and' | 'or';
    scope?: 'branch' | 'global' | 'all';
    branch?: string;
  } = {}
): Promise<any> {
  console.log(`[unified_search_documents_by_tags] Starting with params:`, {
    tags,
    match: options.match,
    scope: options.scope,
    branch: options.branch
  });

  // callToolには既にタイムアウト処理が含まれている
  return client.searchDocumentsByTags(
    tags,
    docs,
    {
      match: options.match,
      scope: options.scope,
      branch: options.branch
    }
  );
}

/**
 * Unified read_context implementation that uses MCPInMemoryClient
 * This implementation provides the same interface as document-tools.ts but uses the transport layer
 */
export async function unified_read_context(
  client: MCPInMemoryClient,
  branch: string,
  language: string,
  docs: string
): Promise<any> {
  console.log(`[unified_read_context] Starting with params:`, {
    branch,
    language
  });

  // callToolには既にタイムアウト処理が含まれている
  return client.readContext(branch, language, docs);
}
