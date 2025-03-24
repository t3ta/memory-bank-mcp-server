// @ts-nocheck
// This file was automatically converted from ts-mockito to jest.fn()
import { jest } from '@jest/globals';
import { IGlobalMemoryBankRepository } from '../../../src/domain/repositories/IGlobalMemoryBankRepository';
import { DocumentPath } from '../../../src/domain/entities/DocumentPath';
import { MemoryDocument } from '../../../src/domain/entities/MemoryDocument';
import { Tag } from '../../../src/domain/entities/Tag';
import { TagIndex } from '../../../src/schemas/tag-index/tag-index-schema';

/**
 * グローバルメモリバンクリポジトリのモックを作成する
 * 
 * @param customizations カスタマイズ関数 - モックの振る舞いをカスタマイズするためのコールバック
 * @returns モックされたリポジトリとそのインスタンスのオブジェクト
 * 
 * @example
 * // 基本的な使い方
 * const { mock, instance } = createMockGlobalMemoryBankRepository();
 * 
 * // カスタマイズした使い方
 * const { mock, instance } = createMockGlobalMemoryBankRepository(mockRepo => {
 *   // 特定のドキュメントパスの取得をカスタマイズ
 *   when(mockRepo.getDocument(new DocumentPath('test/path.md'))).thenResolve({
 *     // カスタムドキュメント
 *   } as MemoryDocument);
 * });
 */
export function createMockGlobalMemoryBankRepository(
  customizations?: (mockRepo: IGlobalMemoryBankRepository) => void
): {
  mock: IGlobalMemoryBankRepository;
  instance: IGlobalMemoryBankRepository;
} {
  // jestのモックオブジェクトを作成
  const mock = {
    initialize: jest.fn().mockResolvedValue(),
    getDocument: jest.fn().mockResolvedValue(null),
    saveDocument: jest.fn().mockResolvedValue(),
    deleteDocument: jest.fn().mockResolvedValue(true),
    listDocuments: jest.fn().mockResolvedValue([]),
    findDocumentsByTags: jest.fn().mockResolvedValue([]),
    updateTagsIndex: jest.fn().mockResolvedValue(),
    saveTagIndex: jest.fn().mockResolvedValue(),
    getTagIndex: jest.fn().mockResolvedValue(null),
    findDocumentPathsByTagsUsingIndex: jest.fn().mockResolvedValue([]),
    validateStructure: jest.fn().mockResolvedValue(true)
  };

  // カスタマイズ関数があれば実行
  if (customizations) {
    customizations(mock);
  }

  // 実際のインスタンスを返す
  return {
    mock: mock,
    instance: mock as unknown as IGlobalMemoryBankRepository
  };
}
