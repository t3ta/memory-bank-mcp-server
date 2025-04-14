/**
 * MCP Protocol Adapter
 *
 * This adapter is responsible for converting between MCP protocol formats and internal formats.
 * It handles the transformation of external communication formats to domain-compatible formats.
 */

import { MCPToolResponse, ToolContent, LegacyToolResponse } from '../../types/protocol/MCPProtocolTypes.js';
import { MCPResultAdapter } from '../../types/adapter/AdapterTypes.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * MCPToolResponseからMCPResultAdapterへの変換
 * プロトコル層からアダプター層への橋渡しを担当
 *
 * @param response MCPサーバーからのレスポンス
 * @returns アダプター層の標準形式
 */
export function convertMCPResponseToAdapter(response: MCPToolResponse): MCPResultAdapter {
  // エラー状態の確認
  const isError = response.status === 'error';

  // コンテンツの抽出
  let content: any = null;

  if (response.result && Array.isArray(response.result)) {
    logger.debug('MCPResponseAdapter: Converting array content', {
      resultLength: response.result.length,
      resultType: 'array',
    });

    // 配列形式の場合、text型を検索して抽出
    const textItem = response.result.find((item: any) =>
      item && typeof item === 'object' && item.type === 'text');

    if (textItem && 'text' in textItem) {
      if (typeof textItem.text === 'object') {
        logger.debug('MCPResponseAdapter: Found object text content');
        content = textItem.text;
      } else if (typeof textItem.text === 'string') {
        logger.debug('MCPResponseAdapter: Found string text content, attempting to parse as JSON');
        try {
          // 文字列をJSONとしてパース試行
          content = JSON.parse(textItem.text);
        } catch {
          // パース失敗時は単純なテキストとして扱う
          logger.debug('MCPResponseAdapter: JSON parsing failed, using as plain text');
          content = { text: textItem.text };
        }
      }
    } else {
      // text型が見つからない場合、最初の要素を使用
      logger.debug('MCPResponseAdapter: No text item found, using first array item');
      if (response.result.length > 0) {
        content = response.result[0];
      }
    }
  } else if (response.result) {
    // 配列でない場合はそのまま使用
    logger.debug('MCPResponseAdapter: Using non-array result directly', {
      resultType: typeof response.result,
    });
    content = response.result;
  }

  // LegacyToolResponseからの変換対応
  if (!content && 'content' in response && Array.isArray((response as any).content)) {
    logger.debug('MCPResponseAdapter: Detected LegacyToolResponse format');
    const legacyResponse = response as unknown as LegacyToolResponse;
    return convertLegacyResponseToAdapter(legacyResponse);
  }

  return {
    content,
    isError,
    metadata: response._meta || {}
  };
}

/**
 * 旧型式のLegacyToolResponseからMCPResultAdapterへの変換
 *
 * @param response 旧型式のレスポンス
 * @returns アダプター層の標準形式
 */
function convertLegacyResponseToAdapter(response: LegacyToolResponse): MCPResultAdapter {
  logger.debug('MCPResponseAdapter: Converting legacy response', {
    hasContent: !!response.content,
    contentLength: response.content?.length || 0,
    isError: response.isError,
  });

  let content: any = null;

  if (response.content && Array.isArray(response.content) && response.content.length > 0) {
    const textItem = response.content.find((item: ToolContent) =>
      item && typeof item === 'object' && item.type === 'text');

    if (textItem && textItem.text) {
      if (typeof textItem.text === 'object') {
        content = textItem.text;
      } else if (typeof textItem.text === 'string') {
        try {
          content = JSON.parse(textItem.text);
        } catch {
          content = { text: textItem.text };
        }
      }
    } else {
      content = response.content[0];
    }
  }

  return {
    content,
    isError: response.isError,
    metadata: response._meta || {}
  };
}

/**
 * MCPResultAdapterからMCPToolResponseへの変換
 * アダプター層からプロトコル層への変換を担当
 *
 * @param adapter アダプター層のデータ
 * @returns MCPプロトコル形式のレスポンス
 */
export function convertAdapterToMCPResponse(adapter: MCPResultAdapter): MCPToolResponse {
  logger.debug('MCPResponseAdapter: Converting adapter to MCP response', {
    hasContent: !!adapter.content,
    contentType: typeof adapter.content,
    isError: adapter.isError,
  });

  // エラー状態の確認
  if (adapter.isError) {
    return {
      status: 'error',
      error: typeof adapter.content === 'string'
        ? adapter.content
        : 'An error occurred',
      _meta: adapter.metadata || {}
    };
  }

  // contentが配列の場合はそのまま使用
  if (Array.isArray(adapter.content)) {
    return {
      status: 'success',
      result: adapter.content,
      _meta: adapter.metadata || {}
    };
  }

  // contentがオブジェクトまたは文字列の場合、ToolContent形式に変換
  const content: ToolContent = {
    type: 'text',
    text: adapter.content,
  };

  return {
    status: 'success',
    result: [content],
    _meta: adapter.metadata || {}
  };
}
