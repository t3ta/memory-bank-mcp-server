import { IDocumentValidator } from '../../domain/validation/IDocumentValidator.js';
import { DomainError, DomainErrorCodes } from '../../shared/errors/DomainError.js';
import { z } from 'zod';

import {
  SCHEMA_VERSION, // ここで SCHEMA_VERSION をインポート
  BaseJsonDocumentV2Schema,
  DocumentMetadataV2Schema, // DocumentMetadataV2Schema をインポート
  BranchContextJsonV2Schema,
  ActiveContextJsonV2Schema,
  ProgressJsonV2Schema,
  SystemPatternsJsonV2Schema,
} from '@memory-bank/schemas';

/**
 * Implementation of IDocumentValidator using Zod schemas
 * This keeps validation logic separate from domain entities
 */
export class ZodDocumentValidator implements IDocumentValidator {
  // 古い形式と新形式の両方を受け入れるスキーマを定義
  private readonly DocumentFormatSchema = z.object({
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

  /**
   * Validates content for a specific document type
   * @param documentType Type of document
   * @param content Content to validate
   * @returns true if valid, throws error if not
   */
  public validateContent(documentType: string, content: Record<string, unknown>): boolean {
    try {
      switch (documentType) {
        case 'branch_context':
          BranchContextJsonV2Schema.shape.content.parse(content);
          break;
        case 'active_context':
          ActiveContextJsonV2Schema.shape.content.parse(content);
          break;
        case 'progress':
          ProgressJsonV2Schema.shape.content.parse(content);
          break;
        case 'system_patterns':
          SystemPatternsJsonV2Schema.shape.content.parse(content);
          break;
        default:
          if (Object.keys(content).length === 0) {
            throw new Error('Content cannot be empty');
          }
          break;
      }
      return true;
    } catch (error) {
      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        `Invalid content for ${documentType} document: ${(error as Error).message}`
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
      // まず基本的な形式を検証（新旧両方の形式に対応）
      const formatResult = this.DocumentFormatSchema.safeParse(document);

      if (!formatResult.success) {
        const formattedError = formatResult.error.format();
        throw new Error(`Document format invalid: ${JSON.stringify(formattedError)}`);
      }

      // documentTypeをトップレベルまたはmetadata内から取得
      const parsedDoc = formatResult.data;
      const documentType = 'documentType' in parsedDoc
        ? parsedDoc.documentType
        : (parsedDoc.metadata as any).documentType;

      // 特定のドキュメントタイプに応じたスキーマを適用
      // 注：古い形式の場合は厳密な検証よりも寛容に処理
      switch (documentType) {
        case 'branch_context':
          try {
            BranchContextJsonV2Schema.parse(document);
          } catch (schemaError) {
            // ドキュメント形式を検証し、新形式に移行できるかをチェック
            this.validateDocumentStructure(document, 'branch_context', schemaError);
          }
          break;
        case 'active_context':
          try {
            ActiveContextJsonV2Schema.parse(document);
          } catch (schemaError) {
            this.validateDocumentStructure(document, 'active_context', schemaError);
          }
          break;
        case 'progress':
          try {
            ProgressJsonV2Schema.parse(document);
          } catch (schemaError) {
            this.validateDocumentStructure(document, 'progress', schemaError);
          }
          break;
        case 'system_patterns':
          try {
            SystemPatternsJsonV2Schema.parse(document);
          } catch (schemaError) {
            this.validateDocumentStructure(document, 'system_patterns', schemaError);
          }
          break;
        default:
          // 一般的なドキュメントは基本的な形式のみを検証
          BaseJsonDocumentV2Schema.parse(document);
          break;
      }
      return true;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        `Invalid document structure: ${(error as Error).message}`
      );
    }
  }

  /**
   * ドキュメント構造を検証し、形式の違いを判断
   * @param document 検証するドキュメント
   * @param expectedType 期待されるドキュメントタイプ
   * @param originalError 元のエラー（参照用）
   */
  private validateDocumentStructure(document: unknown, expectedType: string, originalError: unknown): void {
    const obj = document as Record<string, any>;

    // 基本構造チェック
    if (!obj || typeof obj !== 'object') {
      throw new Error(`Document must be an object, found ${typeof document}`);
    }

    if (obj.schema !== SCHEMA_VERSION) {
      throw new Error(`Invalid schema version: expected ${SCHEMA_VERSION}`);
    }

    // 古い形式の検証（documentTypeがmetadata内）
    if (!obj.documentType && obj.metadata?.documentType) {
      // 古い形式を検出: ログに記録（ただし寛容に処理）
      console.warn(`Detected legacy document format with documentType in metadata.
        Document will be automatically converted to new format on next save.
        Path: ${obj.metadata?.path || 'unknown'}`);

      // 内容が期待されるタイプと一致するかチェック
      if (obj.metadata.documentType !== expectedType) {
        throw new Error(`Document type mismatch: metadata.documentType is '${obj.metadata.documentType}', but expected '${expectedType}'`);
      }
      // 古い形式は許容するので、ここでtrueを返す
      return;
    }

    // 新形式の検証（ただしdocumentTypeが期待と異なる）
    if (obj.documentType && obj.documentType !== expectedType) {
      throw new Error(`Document type mismatch: documentType is '${obj.documentType}', but expected '${expectedType}'`);
    }

    // その他のスキーマエラーの場合、元のエラーを再スロー
    if (originalError instanceof z.ZodError) {
      const formattedError = originalError.format();
      throw new Error(`Document schema validation failed: ${JSON.stringify(formattedError)}`);
    } else {
      throw originalError;
    }
  }

  /**
   * Validates metadata structure
   * @param metadata Metadata to validate
   * @returns true if valid, throws error if not
   */
  public validateMetadata(metadata: Record<string, unknown>): boolean {
    try {
      DocumentMetadataV2Schema.parse(metadata); // DocumentMetadataV2Schema を直接使う
      return true;
    } catch (error) {
      throw new DomainError(
        DomainErrorCodes.VALIDATION_ERROR,
        `Invalid document metadata: ${(error as Error).message}`
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
