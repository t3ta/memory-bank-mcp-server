/**
 * Document Controller Response Adapter
 *
 * This adapter is responsible for converting between Document Controller responses
 * and MCP Protocol formatted responses. It ensures consistent response formats
 * across all document operations.
 *
 * @module DocumentControllerResponseAdapter
 * @description Handles the conversion of document responses to MCP protocol format
 */

import { MCPResultAdapter } from '../../types/adapter/AdapterTypes.js';
import { MCPToolResponse } from '../../types/protocol/MCPProtocolTypes.js';
import { logger } from '../../shared/utils/logger.js';
import { DocumentDTO } from '../../application/dtos/DocumentDTO.js';

/**
 * Converts DocumentController response to MCP protocol format
 * This function transforms document data from application layer
 * into the standardized MCP protocol response format.
 *
 * @param {DocumentDTO} document - Document data from application layer
 * @returns {MCPToolResponse} MCP protocol formatted response
 */
export function convertDocumentToMCPResponse(document: DocumentDTO): MCPToolResponse {
  logger.debug('DocumentControllerResponseAdapter: Converting document to MCP response', {
    path: document.path,
    hasContent: !!document.content,
    contentType: typeof document.content
  });

  // アダプター層形式に変換
  const adapterResult: MCPResultAdapter = {
    content: {
      document: {
        path: document.path,
        content: document.content,
        tags: document.tags || [],
        lastModified: document.lastModified
      }
    },
    metadata: {
      documentPath: document.path,
      responseType: 'document'
    }
  };

  // MCPレスポンス形式に変換
  return {
    status: 'success',
    result: adapterResult.content,
    _meta: adapterResult.metadata
  };
}

/**
 * Converts error to MCP protocol format error response
 * This function standardizes error handling by transforming error information
 * into the MCP protocol error response format.
 *
 * @param {Object} error - Error information
 * @param {string} error.message - Error message
 * @param {string} [error.code] - Optional error code
 * @param {unknown} [error.details] - Optional error details
 * @param {string} [operation] - Optional operation name
 * @returns {MCPToolResponse} MCP protocol formatted error response
 */
export function convertErrorToMCPResponse(
  error: { message: string; code?: string; details?: unknown },
  operation?: string
): MCPToolResponse {
  logger.debug('DocumentControllerResponseAdapter: Converting error to MCP response', {
    operation,
    errorMessage: error.message,
    errorCode: error.code
  });

  return {
    status: 'error',
    error: error.message,
    _meta: {
      errorCode: error.code || 'UNKNOWN_ERROR',
      errorDetails: error.details,
      operation,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Converts write result to MCP protocol format
 * This function transforms the document write operation result
 * into the standardized MCP protocol response format.
 *
 * @param {Object} result - Write operation result
 * @param {DocumentDTO} result.document - Document data
 * @param {number} [result.version] - Optional version information
 * @param {boolean} [returnContent] - Whether to include content in response
 * @returns {MCPToolResponse} MCP protocol formatted response
 */
export function convertWriteResultToMCPResponse(
  result: {
    document: {
      path: string;
      content?: string | object;
      tags?: string[];
      lastModified: string;
    };
    version?: number
  },
  returnContent?: boolean
): MCPToolResponse {
  logger.debug('DocumentControllerResponseAdapter: Converting write result to MCP response', {
    path: result.document.path,
    hasContent: !!result.document.content,
    returnContent: !!returnContent
  });

  // 返却コンテンツの準備
  const responseContent: Record<string, unknown> = {
    document: {
      path: result.document.path,
      tags: result.document.tags || [],
      lastModified: result.document.lastModified
    }
  };

  // returnContentが指定されている場合はコンテンツも含める
  if (returnContent) {
    (responseContent.document as any).content = result.document.content;
  }

  // バージョン情報があれば含める
  if (result.version !== undefined) {
    (responseContent.document as any).version = result.version;
  }

  return {
    status: 'success',
    result: responseContent,
    _meta: {
      documentPath: result.document.path,
      responseType: 'writeResult',
      timestamp: new Date().toISOString()
    }
  };
}
