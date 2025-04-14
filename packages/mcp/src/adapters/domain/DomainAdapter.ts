/**
 * Domain Adapter
 *
 * This adapter is responsible for converting between adapter layer formats and domain models.
 * It handles the transformation of adapter-level data to domain entities and vice versa.
 */

import { MCPResultAdapter } from '../../types/adapter/AdapterTypes.js';
import { DomainDocumentModel } from '../../types/domain/DomainTypes.js';
import { JsonDocumentV2 } from '@memory-bank/schemas';
import { logger } from '../../shared/utils/logger.js';

/**
 * MCPResultAdapterからDomainDocumentModelへの変換
 * アダプター層からドメイン層への橋渡しを担当
 *
 * @param adapter アダプター層のデータ
 * @param documentType ドキュメントタイプ
 * @returns ドメイン層のドキュメントモデル
 */
export function convertAdapterToDomain(
  adapter: MCPResultAdapter,
  documentType: string
): DomainDocumentModel {
  logger.debug('DomainAdapter: Converting adapter to domain model', {
    documentType,
    hasContent: !!adapter.content,
    contentType: typeof adapter.content,
  });

  // content が常にオブジェクト形式になるよう保証
  let content: Record<string, unknown>;

  if (typeof adapter.content === 'object' && adapter.content !== null) {
    content = adapter.content as Record<string, unknown>;
  } else {
    // オブジェクトでない場合は、単純な値オブジェクトに変換
    content = { value: adapter.content };
  }

  return {
    documentType,
    content,
    metadata: adapter.metadata || {}
  };
}

/**
 * DomainDocumentModelからMCPResultAdapterへの変換
 * ドメイン層からアダプター層への変換を担当
 *
 * @param domain ドメイン層のドキュメントモデル
 * @returns アダプター層のデータ
 */
export function convertDomainToAdapter(domain: DomainDocumentModel): MCPResultAdapter {
  logger.debug('DomainAdapter: Converting domain model to adapter', {
    documentType: domain.documentType,
    hasContent: !!domain.content,
  });

  return {
    content: domain.content,
    metadata: domain.metadata
  };
}

/**
 * JsonDocumentV2からDomainDocumentModelへの変換
 * スキーマデータからドメインモデルへの変換を担当
 *
 * @param jsonDoc JSONドキュメント
 * @returns ドメイン層のドキュメントモデル
 */
export function convertJsonDocumentToDomain(jsonDoc: any): DomainDocumentModel {
  logger.debug('DomainAdapter: Converting JSON document to domain model', {
    documentType: jsonDoc.documentType,
    schema: jsonDoc.schema,
  });

  // 古い形式を検出: documentType が metadata 内にあるケース
  const documentType = jsonDoc.documentType || (jsonDoc.metadata as any)?.documentType;

  if (!documentType) {
    logger.warn('DomainAdapter: No documentType found in JSON document');
    throw new Error('Invalid document format: missing documentType');
  }

  return {
    documentType,
    content: jsonDoc.content,
    metadata: jsonDoc.metadata
  };
}

/**
 * DomainDocumentModelからJsonDocumentV2への変換
 * ドメインモデルからJSON形式への変換を担当
 *
 * @param domain ドメイン層のドキュメントモデル
 * @returns JSONドキュメント形式
 */
export function convertDomainToJsonDocument(domain: DomainDocumentModel): JsonDocumentV2 {
  logger.debug('DomainAdapter: Converting domain model to JSON document', {
    documentType: domain.documentType,
  });

  return {
    schema: 'memory_document_v2',
    documentType: domain.documentType,
    content: domain.content,
    metadata: domain.metadata
  } as JsonDocumentV2;
}
