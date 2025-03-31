// packages/schemas/src/v2/search-index.ts
import { z } from 'zod';

// ドキュメントメタデータインデックスのスキーマ
export const DocumentMetaSchema = z.object({
  title: z.string(),
  lastModified: z.string().datetime(), // ISO 8601 format
  scope: z.enum(['branch', 'global']),
  // 必要に応じて他のメタデータも追加 (例: documentType)
  // documentType: z.string().optional(),
});

export type DocumentMeta = z.infer<typeof DocumentMetaSchema>;

// ドキュメントメタデータインデックス全体のスキーマ (パスをキーとする)
export const DocumentsMetaIndexSchema = z.record(z.string(), DocumentMetaSchema);

export type DocumentsMetaIndex = z.infer<typeof DocumentsMetaIndexSchema>;

// タグインデックスのスキーマ (タグをキーとし、パスの配列を値とする)
export const TagsIndexSchema = z.record(z.string(), z.array(z.string()));

export type TagsIndex = z.infer<typeof TagsIndexSchema>;

// 検索結果のスキーマ (MCPツールが返す形式)
export const SearchResultItemSchema = z.object({
  path: z.string(),
  title: z.string(),
  lastModified: z.string().datetime(),
  scope: z.enum(['branch', 'global']),
});

export type SearchResultItem = z.infer<typeof SearchResultItemSchema>;

export const SearchResultsSchema = z.object({
  results: z.array(SearchResultItemSchema),
});

export type SearchResults = z.infer<typeof SearchResultsSchema>;
