/**
 * Document Controller Adapter
 *
 * This adapter is responsible for converting between Document Controller inputs/outputs
 * and the adapter/domain layer formats.
 *
 * @module DocumentControllerAdapter
 * @description Handles the conversion between controller layer and domain layer formats
 */

import { MCPResultAdapter } from '../../types/adapter/AdapterTypes.js';
import { DomainDocumentModel } from '../../types/domain/DomainTypes.js';
import { logger } from '../../shared/utils/logger.js';
import { ApplicationErrors } from '../../shared/errors/ApplicationError.js';
import { BaseError } from '../../shared/errors/BaseError.js';

/**
 * Converts document controller input to domain model
 * This function transforms input parameters from the controller layer
 * into a standardized domain model format.
 *
 * @param {string} path - Document path
 * @param {string|Record<string, unknown>|undefined} content - Document content (string, object or undefined)
 * @param {string[]} [tags] - Optional document tags
 * @returns {DomainDocumentModel} Domain model formatted document
 */
export function convertDocumentInputToDomain(
  path: string,
  content: string | Record<string, unknown> | undefined,
  tags?: string[]
): DomainDocumentModel {
  logger.debug('DocumentControllerAdapter: Converting input to domain model', {
    path,
    hasContent: !!content,
    contentType: content ? typeof content : 'undefined',
    tags: tags ?? []
  });

  // ドキュメントタイプをパスから推測
  const documentType = path.split('.').pop() || 'unknown';

  // 文字列コンテンツをJSONとしてパース（可能であれば）
  let parsedContent: Record<string, unknown>;
  if (typeof content === 'string') {
    try {
      parsedContent = JSON.parse(content);
    } catch (error) {
      // パースできない場合はテキストとして扱う
      logger.debug('DocumentControllerAdapter: String content is not valid JSON, treating as text value', {
        error: error instanceof Error ? error.message : 'Unknown error',
        contentLength: content.length
      });
      parsedContent = { text: content };
    }
  } else if (content && typeof content === 'object') {
    // オブジェクトの場合はそのまま使用
    parsedContent = content;
  } else {
    // コンテンツがない場合は空オブジェクト
    logger.debug('DocumentControllerAdapter: No content provided, using empty object');
    parsedContent = {};
  }

  return {
    documentType,
    content: parsedContent,
    metadata: {
      path,
      tags: tags || [],
      lastModified: new Date().toISOString()
    }
  };
}

/**
 * Converts domain model document to controller output format
 * This function transforms a domain model document into a format suitable
 * for adapter layer responses, handling content transformation and metadata.
 *
 * @param {Object} document - Domain model document
 * @param {string} document.path - Document path
 * @param {Record<string, unknown>|string} document.content - Document content
 * @param {string[]} [document.tags] - Optional document tags
 * @param {string} [document.lastModified] - Optional last modified timestamp
 * @returns {MCPResultAdapter} Adapter layer formatted response
 */
export function convertDomainDocumentToResponse(document: {
  path: string;
  content: Record<string, unknown> | string;
  tags?: string[];
  lastModified?: string;
}): MCPResultAdapter {
  logger.debug('DocumentControllerAdapter: Converting domain document to response', {
    path: document.path,
    hasContent: !!document.content,
    contentType: typeof document.content
  });

  // コンテンツが文字列の場合はJSONとしてパースを試みる
  let content: any = document.content;
  if (typeof document.content === 'string') {
    try {
      content = JSON.parse(document.content);
    } catch (error) {
      // パースできない場合はそのまま使用
      logger.debug('DocumentControllerAdapter: String content is not valid JSON, using as is', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return {
    content: content,
    metadata: {
      path: document.path,
      tags: document.tags || [],
      lastModified: document.lastModified || new Date().toISOString()
    }
  };
}

/**
 * Converts error to MCPResultAdapter format
 * This function standardizes error handling by transforming any error
 * into a consistent adapter layer response format.
 *
 * @param {unknown} error - Error object of any type
 * @param {string} [operation] - Optional operation name (for logging)
 * @returns {MCPResultAdapter} Error information in adapter response format
 */
export function convertErrorToResponse(error: unknown, operation?: string): MCPResultAdapter {
  const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
  const errorCode = error instanceof BaseError ? error.code : 'UNEXPECTED_ERROR';
  const errorDetails = error instanceof BaseError ? error.details : undefined;

  logger.error('DocumentControllerAdapter: Error in operation', {
    operation,
    errorMessage,
    errorCode,
    errorDetails,
    stack: error instanceof Error ? error.stack : undefined
  });

  return {
    content: {
      message: errorMessage,
      code: errorCode,
      details: errorDetails
    },
    isError: true,
    metadata: {
      operation,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Creates an input validation error
 * This helper function generates a standardized validation error
 * that follows the application's error handling conventions.
 *
 * @param {string} message - Error message
 * @returns {Error} Validation error (ApplicationError instance)
 */
export function createValidationError(message: string): Error {
  return ApplicationErrors.invalidInput(message);
}
