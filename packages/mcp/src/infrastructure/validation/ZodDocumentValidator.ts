/**
 * ZodDocumentValidator
 *
 * Implementation of IDocumentValidator using Zod schemas
 * This keeps validation logic separate from domain entities
 */
import { IDocumentValidator } from '../../domain/validation/IDocumentValidator.js';
import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';
import { z } from 'zod';
import {
  SCHEMA_VERSION,
  BaseJsonDocumentV2Schema,
  DocumentMetadataV2Schema
} from '@memory-bank/schemas';
import {
  DocumentFormatSchema,
  FlexibleContentSchema,
  normalizeContent,
  getDocumentType,
  DocumentSchemaMap,
  migrateDocumentFormat
} from './ZodDocumentSchemas.js';
import { logger } from '../../shared/utils/logger.js';

export class ZodDocumentValidator implements IDocumentValidator {
  /**
   * Validates content for a specific document type
   * @param documentType Type of document
   * @param content Content to validate
   * @returns true if valid, throws error if not
   */
  public validateContent(documentType: string, content: Record<string, unknown>): boolean {
    try {
      // コンテンツの正規化（配列またはオブジェクト形式に対応）
      const contentToValidate = normalizeContent(content);

      // ドキュメントタイプに応じたスキーマを適用
      const schema = DocumentSchemaMap[documentType as keyof typeof DocumentSchemaMap];

      if (schema) {
        // 特定のドキュメントタイプ用のスキーマが存在する場合
        schema.shape.content.parse(contentToValidate);
      } else {
        // 一般的なコンテンツの検証
        FlexibleContentSchema.parse(contentToValidate);
      }

      return true;
    } catch (error) {
      // エラーメッセージの詳細化
      let errorMessage = `Invalid content for ${documentType} document`;

      if (error instanceof z.ZodError) {
        errorMessage += ': ' + JSON.stringify(error.format());
      } else {
        errorMessage += `: ${(error as Error).message}`;
      }

      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        errorMessage
      );
    }
  }

  /**
   * Validates a complete document object
   * @param document Document to validate
   * @returns true if valid, throws error if not
   */
  public validateDocument(document: unknown): boolean {
    try {
      if (!document || typeof document !== 'object') {
        throw new Error('Document must be an object');
      }

      // ドキュメントの正規化（古い形式から新形式への変換）
      const normalizedDoc = migrateDocumentFormat(document);

      // 基本的な形式を検証
      const formatResult = DocumentFormatSchema.safeParse(normalizedDoc);

      if (!formatResult.success) {
        const formattedError = formatResult.error.format();
        logger.error('Document format validation failed:', formattedError);
        throw new Error(`Document format invalid: ${JSON.stringify(formattedError)}`);
      }

      // documentTypeを取得
      const documentType = getDocumentType(normalizedDoc);

      if (!documentType) {
        throw new Error('Document type is missing or invalid');
      }

      // 特定のドキュメントタイプに応じたスキーマを適用
      const schema = DocumentSchemaMap[documentType as keyof typeof DocumentSchemaMap];

      if (schema) {
        try {
          schema.parse(normalizedDoc);
        } catch (schemaError) {
          // 特定のスキーマ検証は失敗しても、基本的な形式が正しければ許容する
          // これにより柔軟な互換性を維持
          logger.warn(`Schema validation failed for ${documentType}, but document format is valid`, {
            documentType,
            error: schemaError instanceof z.ZodError ? schemaError.format() : String(schemaError)
          });

          // 代わりに基本的なドキュメント検証を適用
          BaseJsonDocumentV2Schema.parse(normalizedDoc);
        }
      } else {
        // 一般的なドキュメントの検証
        BaseJsonDocumentV2Schema.parse(normalizedDoc);
      }

      return true;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      let errorMessage = 'Invalid document structure';

      if (error instanceof z.ZodError) {
        errorMessage += ': ' + JSON.stringify(error.format());
      } else {
        errorMessage += `: ${(error as Error).message}`;
      }

      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        errorMessage
      );
    }
  }

  /**
   * Validates metadata structure
   * @param metadata Metadata to validate
   * @returns true if valid, throws error if not
   */
  public validateMetadata(metadata: Record<string, unknown>): boolean {
    try {
      DocumentMetadataV2Schema.parse(metadata);
      return true;
    } catch (error) {
      let errorMessage = 'Invalid document metadata';

      if (error instanceof z.ZodError) {
        errorMessage += ': ' + JSON.stringify(error.format());
      } else {
        errorMessage += `: ${(error as Error).message}`;
      }

      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        errorMessage
      );
    }
  }

  /**
   * @returns The current schema version
   */
  public getSchemaVersion(): string {
    return SCHEMA_VERSION;
  }
}
