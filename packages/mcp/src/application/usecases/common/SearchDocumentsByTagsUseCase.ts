import { BranchInfo } from "../../../domain/entities/BranchInfo.js";
import { ApplicationError, ApplicationErrorCodes } from "../../../shared/errors/ApplicationError.js";
import { logger } from "../../../shared/utils/logger.js";

// type TagsIndex = any; // 使わないので削除
// type DocumentsMetaIndex = any; // 使わないので削除
// type SearchResultItem = any; // 下で定義
// type SearchResults = any; // 下で定義

// ★ 検索結果の型定義を追加 (export する)
export interface SearchResultItem { // ★ export を追加
  path: string;
  title: string;
  lastModified: string;
  scope: 'branch' | 'global';
}

// ★ インデックスから取得するドキュメント情報の型
interface IndexedDocumentInfo {
  path: string;
  scope: 'branch' | 'global';
  // title や lastModified もインデックスにあれば追加できる
}

// ★ マージされたインデックスの型 (tag -> ドキュメント情報配列)
type MergedTagIndex = Record<string, IndexedDocumentInfo[]>;
import type { IFileSystemService } from '../../../infrastructure/storage/interfaces/IFileSystemService.js';
import type { IUseCase } from "../../interfaces/IUseCase.js";
import { BranchTagIndex, GlobalTagIndex } from '@memory-bank/schemas'; // ★ スキーマ型をインポート (TagIndexDocument削除)
import path from 'path';

/**
 * Input data for searching documents by tags
 */
export interface SearchDocumentsByTagsInput {
  /**
   * Tags to search for (at least one required)
   */
  tags: string[];

  /**
   * Branch name (required if scope is 'branch' or 'all')
   */
  branchName?: string;

  /**
   * Search scope ('branch', 'global', or 'all')
   * @default 'all'
   */
  scope?: 'branch' | 'global' | 'all';

  /**
   * Match type ('and' or 'or')
   * @default 'or'
   */
  match?: 'and' | 'or';

  /**
   * Path to docs directory (needed to construct index paths)
   */
  docs: string;
}

/**
 * Output data for searching documents by tags
 */
export interface SearchDocumentsByTagsOutput {
  /**
   * Matching documents metadata
   */
  results: SearchResultItem[]; // ★ 上で定義した型を使用
}

/**
 * Use case for searching documents by tags
 */
export class SearchDocumentsByTagsUseCase
  implements IUseCase<SearchDocumentsByTagsInput, SearchDocumentsByTagsOutput> {
  /**
    * Constructor
    * @param fileSystemService File system service for reading index files
    */
  constructor(
    private readonly fileSystemService: IFileSystemService,
  ) { }

  /**
   * Execute the use case
   * @param input Input data
   * @returns Promise resolving to output data
   */
  async execute(input: SearchDocumentsByTagsInput): Promise<SearchDocumentsByTagsOutput> { // ★ 戻り値の型を修正
    logger.info('Executing SearchDocumentsByTagsUseCase:', input);

    // --- Input Validation ---
    if (!input.tags || input.tags.length === 0) {
      throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'At least one tag must be provided.');
    }
    if (!input.docs) {
      throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Docs path is required.');
    }
    const scope = input.scope ?? 'all';
    const match = input.match ?? 'or';
    if (scope === 'branch' && !input.branchName) {
      throw new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, 'Branch name is required for branch scope search.');
    }
    // If scope is 'all' but no branchName provided, default to 'global' only.
    const effectiveScope = (scope === 'all' && !input.branchName) ? 'global' : scope;
    if (scope === 'all' && !input.branchName) {
      logger.warn('Branch name not provided for "all" scope. Searching global only.');
    }


    // --- Load Indices ---
    let combinedTagsIndex: MergedTagIndex = {}; // ★ 型を MergedTagIndex に変更
    // let combinedDocumentsMeta: DocumentsMetaIndex = {}; // metaは使わないので削除

    try {
      // Load Global Indices if needed
      if (effectiveScope === 'global' || effectiveScope === 'all') {
        // ★★★ インデックスファイル名を修正 ★★★
        const globalIndexPath = path.join(input.docs, 'global-memory-bank', '_index.json'); // .index ディレクトリではなく、ファイル名を _index.json に
        // const globalMetaPath = path.join(input.docs, 'global-memory-bank', '.index', 'documents_meta.json'); // metaファイルは一旦使わない想定
        logger.debug(`Loading global index: ${globalIndexPath}`); // ログ修正 (metaPath削除)
        // ★★★ インデックスファイル読み込みを修正 ★★★
        const globalIndex = await this.readIndexFile<GlobalTagIndex>(globalIndexPath); // ★ 型を GlobalTagIndex に変更
        // const globalMeta = await this.readIndexFile<DocumentsMetaIndex>(globalMetaPath); // metaファイルは一旦使わない想定
        // Ensure nulls are handled correctly when merging
        // ★★★ 読み込んだインデックスをマージ (metaは一旦無視) ★★★
        // combinedTagsIndex は tag -> path[] のマップを期待している
        // globalIndex.index は { tag: string, documents: { path: string }[] }[] の形式
        if (globalIndex?.index) {
          for (const entry of globalIndex.index) {
            // ★ scope情報を追加してマージ
            combinedTagsIndex[entry.tag] = entry.documents.map((doc: { path: string }) => ({
              path: doc.path,
              scope: 'global'
            }));
          }
        }
        // if (globalMeta) combinedDocumentsMeta = { ...combinedDocumentsMeta, ...globalMeta }; // metaは使わない
        logger.debug(`Loaded ${Object.keys(combinedTagsIndex || {}).length} global tags from index.`); // ログ修正
      }

      // Load Branch Indices if needed
      if ((effectiveScope === 'branch' || effectiveScope === 'all') && input.branchName) {
        const branchInfo = BranchInfo.create(input.branchName); // Validate branch name format
        // ★★★ インデックスファイル名を修正 ★★★
        const branchIndexPath = path.join(input.docs, 'branch-memory-bank', branchInfo.safeName, '_index.json'); // .index ディレクトリではなく、ファイル名を _index.json に
        // const branchMetaPath = path.join(branchIndexPath, 'documents_meta.json'); // metaファイルは一旦使わない想定
        logger.debug(`Loading branch index: ${branchIndexPath}`); // ログ修正 (metaPath削除)
        // ★★★ インデックスファイル読み込みを修正 ★★★
        const branchIndex = await this.readIndexFile<BranchTagIndex>(branchIndexPath).catch(() => null); // ★ 型を BranchTagIndex に変更
        // const branchMeta = await this.readIndexFile<DocumentsMetaIndex>(branchMetaPath).catch(() => null); // metaファイルは一旦使わない想定
        // Ensure nulls are handled correctly when merging
        // ★★★ 読み込んだインデックスをマージ (metaは一旦無視) ★★★
        // combinedTagsIndex は tag -> path[] のマップを期待している
        // branchIndex.index は { tag: string, documents: { path: string }[] }[] の形式
        if (branchIndex?.index) {
          for (const entry of branchIndex.index) {
            // 同じタグがグローバルにも存在する場合、パスをマージする（重複はSetで防ぐ）
            const existingDocs = new Map<string, IndexedDocumentInfo>();
            // 既存のドキュメントをMapに入れる (パスをキーに)
            (combinedTagsIndex[entry.tag] || []).forEach(doc => existingDocs.set(doc.path, doc));
            // 新しいドキュメントを追加または上書き (ブランチ優先)
            entry.documents.forEach((doc: { path: string }) => {
              existingDocs.set(doc.path, { path: doc.path, scope: 'branch' }); // ★ scope情報を追加
            });
            combinedTagsIndex[entry.tag] = Array.from(existingDocs.values());
          }
        }
        // if (branchMeta) combinedDocumentsMeta = { ...combinedDocumentsMeta, ...branchMeta }; // metaは使わない
        logger.debug(`Loaded ${Object.keys(branchIndex?.index || {}).length} branch tags entries. Total unique tags: ${Object.keys(combinedTagsIndex).length}`); // ログ修正
      }
    } catch (error) {
      logger.error('Error loading index files:', error);
      throw new ApplicationError(ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED, `Failed to load index files: ${(error as Error).message}`);
    }

    // --- Perform Search ---
    logger.debug(`Performing search with match type: ${match}`);
    let matchingDocs: Map<string, IndexedDocumentInfo> = new Map(); // ★ パスをキーにしたMapに変更

    if (match === 'or') {
      // OR match: Add paths from any matching tag
      for (const tag of input.tags) {
        const docsForTag: IndexedDocumentInfo[] = combinedTagsIndex[tag] || [];
        docsForTag.forEach(doc => matchingDocs.set(doc.path, doc)); // ★ Mapに追加
      }
      logger.debug(`Found ${matchingDocs.size} docs with OR match.`); // ★ size を使う
    } else { // 'and' match
      // AND match: Start with paths from the first tag, then intersect with subsequent tags
      let firstTag = true;
      for (const tag of input.tags) {
        const docsForTag = new Map<string, IndexedDocumentInfo>(); // ★ Mapに変更
        (combinedTagsIndex[tag] || []).forEach(doc => docsForTag.set(doc.path, doc)); // ★ Mapに追加
        if (firstTag) {
          matchingDocs = docsForTag; // ★ Mapを代入
          firstTag = false;
        } else {
          // Intersect current matching paths with paths for this tag
          // Mapのキーで積集合を取る
          const intersectionPaths = new Set([...matchingDocs.keys()].filter(p => docsForTag.has(p)));
          // 新しいMapを作成
          const intersectionDocs = new Map<string, IndexedDocumentInfo>();
          intersectionPaths.forEach(p => {
            const doc = matchingDocs.get(p) ?? docsForTag.get(p); // どちらかのMapから取得
            if (doc) {
              intersectionDocs.set(p, doc);
            }
          });
          matchingDocs = intersectionDocs; // ★ Mapを更新
        }
        // Early exit if intersection results in empty set
        if (matchingDocs.size === 0) break; // ★ size を使う
      }
      logger.debug(`Found ${matchingDocs.size} docs with AND match.`); // ★ size を使う
    }

    // --- Retrieve Metadata and Format Results ---
    const results: SearchResultItem[] = [];
    for (const docInfo of matchingDocs.values()) { // ★ matchingDocs の値 (IndexedDocumentInfo) をループ
        // ★★★ meta ファイルを使わないように修正し、保持したscope情報を使う ★★★
        logger.warn(`Metadata not currently used for search results, creating fallback title/date for: ${docInfo.path}`);
        results.push({
          path: docInfo.path,
          title: path.basename(docInfo.path), // Fallback title using path
          lastModified: new Date(0).toISOString(), // Default/fallback date - TODO: Get actual lastModified if needed
          scope: docInfo.scope, // ★ インデックスから取得したscopeを使用
        });
      } // 外側の for ループの閉じ括弧

    // Sort results (e.g., by lastModified date descending)
    results.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    logger.info(`Search completed. Found and sorted ${results.length} documents.`);
    return { results };
  }

  /**
   * Helper to read and parse index JSON file
   */
  private async readIndexFile<T>(filePath: string): Promise<T | null> {
    try {
      const content = await this.fileSystemService.readFile(filePath);
      const parsed = JSON.parse(content) as T;
      return parsed;
    } catch (error) {
      // If file not found, return null, otherwise rethrow
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        logger.warn(`Index file not found: ${filePath}`); // 元のログに戻す
        return null;
      }
      logger.error(`Failed to read or parse index file ${filePath}:`, error); // 元のログに戻す
      throw error; // Rethrow other errors
    }
  }
}
