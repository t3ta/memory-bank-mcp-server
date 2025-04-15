/**
 * ZodDocumentSchemas
 *
 * This file contains the Zod schemas used for document validation.
 * These schemas are used by the ZodDocumentValidator to validate
 * documents and support the transformation between different formats.
 */

import { z } from 'zod';
import {
  SCHEMA_VERSION,
  BranchContextJsonV2Schema,
  ActiveContextJsonV2Schema,
  ProgressJsonV2Schema,
  SystemPatternsJsonV2Schema,
} from '@memory-bank/schemas';
import { logger } from '../../shared/utils/logger.js';

// ツールコンテンツのスキーマ定義
export const ToolContentSchema = z.object({
  type: z.string(),
  text: z.union([z.string(), z.record(z.unknown())]),
  mimeType: z.string().optional()
});

// 配列形式のコンテンツとオブジェクト形式の両方に対応するスキーマ
export const FlexibleContentSchema = z.union([
  // オブジェクト形式（通常のJSONドキュメント）
  z.record(z.unknown()),
  // 配列形式（ToolResponse形式）
  z.array(ToolContentSchema)
]);

// 配列形式からオブジェクト形式への変換関数
export function normalizeArrayContent(content: any[]): Record<string, unknown> {
  logger.debug('ZodDocumentSchemas: Normalizing array content', {
    contentLength: content.length,
  });

  // 配列内の最初のテキスト要素を探す
  const textItem = content.find((item: any) =>
    item && typeof item === 'object' && item.type === 'text');

  if (textItem && textItem.text) {
    logger.debug('ZodDocumentSchemas: Found text item in content array');

    // textItemからcontentを抽出（オブジェクトまたは文字列）
    if (typeof textItem.text === 'object') {
      logger.debug('ZodDocumentSchemas: Content is already an object, using directly');
      return textItem.text as Record<string, unknown>;
    } else if (typeof textItem.text === 'string') {
      try {
        // 文字列の場合はJSONとしてパース
        const parsed = JSON.parse(textItem.text);
        logger.debug('ZodDocumentSchemas: Successfully parsed text as JSON object');
        return parsed;
      } catch (parseError) {
        // パースに失敗した場合は元の文字列を保持
        logger.debug('ZodDocumentSchemas: Failed to parse as JSON, wrapping in text object');
        return { text: textItem.text };
      }
    }
  }

  logger.debug('ZodDocumentSchemas: Could not normalize array content as expected, returning empty object');
  return {};
}

// any形式のコンテンツをオブジェクト形式に正規化
export function normalizeContent(content: unknown): Record<string, unknown> {
  // nullやundefinedの場合は空オブジェクトを返す
  if (content === null || content === undefined) {
    return {};
  }

  // 配列の場合は特別な処理
  if (Array.isArray(content)) {
    return normalizeArrayContent(content);
  }

  // すでにオブジェクトの場合はそのまま返す
  if (typeof content === 'object') {
    return content as Record<string, unknown>;
  }

  // プリミティブ値の場合は、単純な値オブジェクトに変換
  return { value: content };
}

// 古い形式と新形式の両方を受け入れるドキュメント形式スキーマ
export const DocumentFormatSchema = z.object({
  schema: z.literal(SCHEMA_VERSION),
}).and(
  z.union([
    // 新形式: トップレベルにdocumentType
    z.object({
      documentType: z.string(),
      metadata: z.object({}).passthrough(),
    }),
    // 古い形式: metadataの中にdocumentType
    z.object({
      metadata: z.object({
        documentType: z.string(),
      }).passthrough(),
    }),
  ])
);

// ドキュメントから正規化されたdocumentTypeを取得
export function getDocumentType(document: any): string | undefined {
  if (!document) return undefined;

  // 新形式: トップレベルにdocumentType
  if (document.documentType) {
    return document.documentType;
  }

  // 古い形式: metadataの中にdocumentType
  if (document.metadata?.documentType) {
    return document.metadata.documentType;
  }

  return undefined;
}

// ドキュメントタイプごとのスキーママップ
export const DocumentSchemaMap = {
  'branch_context': BranchContextJsonV2Schema,
  'active_context': ActiveContextJsonV2Schema,
  'progress': ProgressJsonV2Schema,
  'system_patterns': SystemPatternsJsonV2Schema,
};

// 古いドキュメント形式を新しい形式に変換
export function migrateDocumentFormat(document: any): any {
  if (!document) return document;

  const result = { ...document };

  // 古い形式を検出: documentTypeがmetadata内
  if (!result.documentType && result.metadata?.documentType) {
    logger.debug(`Migrating document format: moving documentType to top level`, {
      documentType: result.metadata.documentType,
    });

    // documentTypeをトップレベルに移動
    result.documentType = result.metadata.documentType;

    // 元のmetadataからdocumentTypeを削除（クローンして操作）
    const newMetadata = { ...result.metadata };
    delete newMetadata.documentType;
    result.metadata = newMetadata;
  }

  // contentを正規化
  if (result.content) {
    result.content = normalizeContent(result.content);
  }

  return result;
}
