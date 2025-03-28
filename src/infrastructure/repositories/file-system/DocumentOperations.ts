import path from 'node:path';
import { DocumentPath } from '../../../domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../domain/entities/MemoryDocument.js';
import { Tag } from '../../../domain/entities/Tag.js';
import { DomainError } from '../../../shared/errors/DomainError.js';
import { InfrastructureError, InfrastructureErrorCodes } from '../../../shared/errors/InfrastructureError.js';
import { extractTags } from '../../../shared/utils/index.js';
import { logger } from '../../../shared/utils/logger.js';
import type { IFileSystemService } from '../../storage/interfaces/IFileSystemService.js';
import type { IConfigProvider } from '../../config/index.js';
import { FileSystemMemoryBankRepositoryBase } from './FileSystemMemoryBankRepositoryBase.js';

/**
 * ドキュメント操作を担当するコンポーネント
 * 単一ドキュメントの読み書き、削除、検証などを担当
 */
export class DocumentOperations extends FileSystemMemoryBankRepositoryBase {
  /**
   * Constructor
   * @param basePath 基底パス
   * @param fileSystemService ファイルシステムサービス 
   * @param configProvider 設定プロバイダー
   */
  constructor(
    private readonly basePath: string,
    fileSystemService: IFileSystemService,
    configProvider: IConfigProvider
  ) {
    super(fileSystemService, configProvider);
  }

  /**
   * ドキュメントを取得
   * @param documentPath ドキュメントパス
   * @returns ドキュメント（存在しない場合はnull）
   */
  async getDocument(documentPath: DocumentPath): Promise<MemoryDocument | null> {
    try {
      const filePath = this.resolvePath(documentPath.value);
      this.logDebug(`Finding document at path: ${filePath}`);

      // ファイルが存在するかチェック
      const exists = await this.fileExists(filePath);

      if (!exists) {
        // 代替フォーマットを試す（.md <-> .json）
        const alternatePath = documentPath.toAlternateFormat();
        const alternateFilePath = this.resolvePath(alternatePath.value);
        this.logDebug(`File not found at ${filePath}, trying alternate format: ${alternateFilePath}`);

        const alternateExists = await this.fileExists(alternateFilePath);

        if (!alternateExists) {
          this.logDebug(`Alternate format not found either: ${alternateFilePath}`);
          return null;
        }

        this.logDebug(`Found document in alternate format: ${alternateFilePath}`);
        // 代替パスで再帰的に呼び出し
        return this.getDocument(alternatePath);
      }

      // ファイル内容を読み込む
      const content = await this.readFile(filePath);
      this.logDebug(`File content read from ${filePath}`);

      // JSONファイルは特別に処理
      if (documentPath.isJSON) {
        try {
          // JSONをパース
          const jsonObj = JSON.parse(content);
          this.logDebug('JSON parsed for file:', { filePath, schema: jsonObj.schema });

          // スキーマに準拠したドキュメントか通常のJSONかをチェック
          if (jsonObj.schema === 'memory_document_v1' && jsonObj.metadata && jsonObj.content) {
            this.logDebug('Schema-compliant document found:', { filePath, metadata: jsonObj.metadata });
            // スキーマに準拠したドキュメント - fromJSONで変換
            const doc = MemoryDocument.fromJSON(jsonObj, documentPath);
            this.logDebug('Created document from JSON with tags:', { tags: doc.tags.map(t => t.value) });
            return doc;
          } else {
            // 通常のJSON - 生のコンテンツでMemoryDocumentを作成
            const stats = await this.getFileStats(filePath);

            // metadataフィールドにタグがあれば抽出
            let tags: Tag[] = [];
            if (jsonObj.metadata && Array.isArray(jsonObj.metadata.tags)) {
              try {
                tags = jsonObj.metadata.tags.map((tag: string) => Tag.create(tag));
              } catch (tagError) {
                logger.warn(`Ignoring invalid tags in ${documentPath.value}:`, tagError);
              }
            }

            return MemoryDocument.create({
              path: documentPath,
              content,
              tags,
              lastModified: stats.lastModified,
            });
          }
        } catch (error) {
          // タグ検証エラーの場合
          if (error instanceof DomainError && error.code === 'DOMAIN_ERROR.INVALID_TAG_FORMAT') {
            logger.error(`Invalid tag format in document ${documentPath.value}:`, error);

            // サニタイズしたタグで復旧を試みる
            try {
              // 再度パースしてタグをサニタイズ
              const jsonDoc = JSON.parse(content);

              // タグが存在すればサニタイズ
              if (jsonDoc.metadata && jsonDoc.metadata.tags) {
                // 問題のある文字をハイフンに置き換え
                jsonDoc.metadata.tags = jsonDoc.metadata.tags.map((tag: string) => {
                  // 小文字に変換し、無効な文字をハイフンに置き換え
                  return tag.toLowerCase().replace(/[^a-z0-9-]/g, '-');
                });

                logger.warn(`Sanitized tags in ${documentPath.value}: ${JSON.stringify(jsonDoc.metadata.tags)}`);

                // サニタイズしたタグでメモリドキュメントを作成
                if (jsonDoc.schema === 'memory_document_v1' && jsonDoc.metadata && jsonDoc.content) {
                  return MemoryDocument.fromJSON(jsonDoc, documentPath);
                }
              }
            } catch (recoveryError) {
              logger.error(`Failed to recover document ${documentPath.value}:`, recoveryError);
            }

            // 復旧に失敗した場合 - ログを残すがスローしない
            logger.warn(`Skipping document with invalid tags: ${documentPath.value}`);
            return null;
          }

          throw new InfrastructureError(
            InfrastructureErrorCodes.FILE_READ_ERROR,
            `Failed to parse JSON document: ${documentPath.value}`,
            { originalError: error }
          );
        }
      }

      // マークダウンなどの他のファイルは通常の処理
      // タグを抽出
      const tags = extractTags(content).map((tag) => Tag.create(tag));

      // ファイル統計を取得
      const stats = await this.getFileStats(filePath);

      // ドキュメントを作成
      return MemoryDocument.create({
        path: documentPath,
        content,
        tags,
        lastModified: stats.lastModified,
      });
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        if (error.code === `INFRA_ERROR.${InfrastructureErrorCodes.FILE_NOT_FOUND}`) {
          return null;
        }

        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_READ_ERROR,
        `Failed to get document: ${documentPath.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * ドキュメントを保存
   * @param document 保存するドキュメント
   */
  async saveDocument(document: MemoryDocument): Promise<void> {
    try {
      const filePath = this.resolvePath(document.path.value);

      // JSONファイルは特別に処理
      if (document.isJSON) {
        // JSON形式に変換
        const jsonDoc = document.toJSON();
        const jsonContent = JSON.stringify(jsonDoc, null, 2);

        // JSONファイルを書き込む
        await this.writeFile(filePath, jsonContent);
        return;
      }

      // マークダウンファイルは通常の処理
      // タグ付きのコンテンツを準備
      let content = document.content;

      // ドキュメントにタグがあれば追加または更新
      if (document.tags.length > 0) {
        const tagLine = `tags: ${document.tags.map((tag) => tag.toHashtag()).join(' ')}\n\n`;

        // すでにタグがあれば置き換え
        if (content.includes('tags:')) {
          content = content.replace(/tags:.*\n\n/, tagLine);
        } else {
          // タイトル（最初の行）の後にタグを追加
          const lines = content.split('\n');
          const firstLine = lines[0];
          const rest = lines.slice(1).join('\n');

          content = `${firstLine}\n\n${tagLine}${rest}`;
        }
      }

      // ファイルを書き込む
      await this.writeFile(filePath, content);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_WRITE_ERROR,
        `Failed to save document: ${document.path.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * ドキュメントを削除
   * @param documentPath 削除するドキュメントのパス
   * @returns 削除に成功したらtrue
   */
  async deleteDocument(documentPath: DocumentPath): Promise<boolean> {
    try {
      const filePath = this.resolvePath(documentPath.value);
      
      // ファイルを削除
      return await this.deleteFile(filePath);
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Failed to delete document: ${documentPath.value}`,
        { originalError: error }
      );
    }
  }

  /**
   * すべてのドキュメントパスをリスト
   * @returns ドキュメントパスの配列
   */
  async listDocuments(): Promise<DocumentPath[]> {
    try {
      // すべてのファイルをリスト
      const files = await this.listFiles(this.basePath);
      this.logDebug(`DocumentOperations.listDocuments() found ${files.length} files`);

      // 拡張子を除いたベース名でファイルをグループ化
      const fileGroups = new Map<string, { md?: string, json?: string }>();

      for (const file of files) {
        try {
          // 相対パスを取得
          const relativePath = path.relative(this.basePath, file);

          // マークダウンとJSONファイル以外はスキップ
          if (!relativePath.endsWith('.md') && !relativePath.endsWith('.json')) {
            continue;
          }

          // パスを検証
          const parts = relativePath.split(path.sep);
          if (parts.includes('..') || parts.some((part) => part.startsWith('..'))) {
            logger.error('Invalid document path:', {
              path: relativePath,
              reason: 'Path traversal attempt detected',
            });
            continue;
          }

          // 拡張子とディレクトリパス付きのベース名を取得
          const extension = path.extname(relativePath);
          const dirPath = path.dirname(relativePath);
          const baseName = path.basename(relativePath, extension);
          const baseNameWithDir = path.join(dirPath, baseName);

          this.logDebug(`Processing file: ${relativePath}, baseNameWithDir: ${baseNameWithDir}, extension: ${extension}`);

          // グループに追加
          const group = fileGroups.get(baseNameWithDir) || { md: undefined, json: undefined };
          if (extension === '.md') {
            group.md = relativePath;
          } else if (extension === '.json') {
            group.json = relativePath;
          }
          fileGroups.set(baseNameWithDir, group);
        } catch (error) {
          logger.error('Error processing file path:', {
            path: file,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // JSONファイルを優先、なければMDファイルを使用
      const paths: DocumentPath[] = [];
      this.logDebug(`Found ${fileGroups.size} unique base files`);

      for (const [baseNameWithDir, group] of fileGroups) {
        try {
          // JSONファイルを優先
          const pathToUse = group.json || group.md;
          if (pathToUse) {
            this.logDebug(`Using ${pathToUse} for base ${baseNameWithDir} (JSON: ${!!group.json}, MD: ${!!group.md})`);
            const documentPath = DocumentPath.create(pathToUse);
            paths.push(documentPath);
          }
        } catch (error) {
          logger.error('Error creating document path:', {
            baseNameWithDir,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      return paths;
    } catch (error) {
      if (error instanceof DomainError) {
        throw error;
      }

      if (error instanceof InfrastructureError) {
        throw error;
      }

      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        'Failed to list documents',
        { originalError: error }
      );
    }
  }

  /**
   * パスを完全なファイルパスに解決
   * @param documentPath 基底パスからの相対ドキュメントパス
   * @returns 完全なファイルパス
   */
  private resolvePath(documentPath: string): string {
    // パスを正規化
    const normalizedPath = path.normalize(documentPath);

    // パストラバーサル攻撃のチェック
    if (normalizedPath.startsWith('..')) {
      throw new InfrastructureError(
        InfrastructureErrorCodes.FILE_SYSTEM_ERROR,
        `Invalid document path: ${documentPath}. Path cannot traverse outside the base directory.`
      );
    }

    // フルパスを解決
    return path.join(this.basePath, normalizedPath);
  }
}
