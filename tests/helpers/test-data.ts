import { MemoryDocument } from '../../src/domain/entities/MemoryDocument.js';
import { DocumentPath } from '../../src/domain/entities/DocumentPath.js';
import { Tag } from '../../src/domain/entities/Tag.js';
import { BranchInfo } from '../../src/domain/entities/BranchInfo.js';
import { TagIndex } from '../../src/schemas/tag-index/tag-index-schema.js';

/**
 * テスト用ドキュメントを作成するヘルパー関数
 * @param path ドキュメントパス
 * @param tags タグ配列
 * @param content ドキュメントの内容（省略可）
 * @param lastModified 最終更新日時（省略可）
 * @returns 作成されたMemoryDocumentオブジェクト
 */
export const createTestDocument = (
  path: string,
  tags: string[],
  content: string = `# Test Document\n\nContent for ${path}`,
  lastModified: Date = new Date('2023-01-01T00:00:00.000Z')
): MemoryDocument => {
  return MemoryDocument.create({
    path: DocumentPath.create(path),
    content,
    tags: tags.map((t) => Tag.create(t)),
    lastModified,
  });
};

/**
 * テスト用ブランチ情報を作成するヘルパー関数
 * @param name ブランチ名
 * @returns 作成されたBranchInfoオブジェクト
 */
export const createTestBranch = (name: string): BranchInfo => {
  return BranchInfo.create(name);
};

/**
 * テスト用タグを作成するヘルパー関数
 * @param values タグ値の配列
 * @returns 作成されたTagオブジェクトの配列
 */
export const createTestTags = (values: string[]): Tag[] => {
  return values.map((value) => Tag.create(value));
};

/**
 * テスト用タグインデックスを作成するヘルパー関数
 * @param context コンテキスト（ブランチ名または'global'）
 * @param tagMap タグマップ（タグ名 -> ドキュメントパスの配列）
 * @param fullRebuild フルリビルドフラグ（省略可）
 * @returns 作成されたTagIndexオブジェクト
 */
export const createTestTagIndex = (
  context: string,
  tagMap: Record<string, string[]>,
  fullRebuild: boolean = false
): TagIndex => {
  return {
    schema: 'tag_index_v1',
    metadata: {
      updatedAt: new Date().toISOString(),
      documentCount: Object.values(tagMap).reduce((acc, paths) => acc + paths.length, 0),
      fullRebuild,
      context,
    },
    index: tagMap,
  };
};
