// @ts-nocheck
// This file was automatically converted from ts-mockito to jest.fn()
import { jest } from '@jest/globals';
import { 
  IBranchMemoryBankRepository,
  RecentBranch
} from '../../../src/domain/repositories/IBranchMemoryBankRepository';
import { BranchInfo } from '../../../src/domain/entities/BranchInfo';
import { DocumentPath } from '../../../src/domain/entities/DocumentPath';
import { MemoryDocument } from '../../../src/domain/entities/MemoryDocument';
import { Tag } from '../../../src/domain/entities/Tag';
import { TagIndex } from '../../../src/schemas/tag-index/tag-index-schema';

/**
 * ブランチメモリバンクリポジトリのモックを作成する
 * 
 * @param customizations カスタマイズ関数 - モックの振る舞いをカスタマイズするためのコールバック
 * @returns モックされたリポジトリとそのインスタンスのオブジェクト
 * 
 * @example
 * // 基本的な使い方
 * const { mock, instance } = createMockBranchMemoryBankRepository();
 * 
 * // カスタマイズした使い方
 * const { mock, instance } = createMockBranchMemoryBankRepository(mockRepo => {
 *   // 特定のブランチの存在チェックをカスタマイズ
 *   mockRepo.exists = jest.fn().mockResolvedValue(true);
 *   mockRepo.exists = jest.fn().mockResolvedValue(false);
 * });
 */
export function createMockBranchMemoryBankRepository(
  customizations?: (mockRepo: IBranchMemoryBankRepository) => void
): {
  mock: IBranchMemoryBankRepository;
  instance: IBranchMemoryBankRepository;
} {
  // jestのモックオブジェクトを作成
  const mock = {
    exists: jest.fn().mockResolvedValue(true),
    initialize: jest.fn().mockResolvedValue(),
    getDocument: jest.fn().mockResolvedValue(null),
    saveDocument: jest.fn().mockResolvedValue(),
    deleteDocument: jest.fn().mockResolvedValue(true),
    listDocuments: jest.fn().mockResolvedValue([]),
    findDocumentsByTags: jest.fn().mockResolvedValue([]),
    getRecentBranches: jest.fn().mockResolvedValue([]),
    validateStructure: jest.fn().mockResolvedValue(true),
    saveTagIndex: jest.fn().mockResolvedValue(),
    getTagIndex: jest.fn().mockResolvedValue(null),
    findDocumentPathsByTagsUsingIndex: jest.fn().mockResolvedValue([])
  };

  // カスタマイズ関数があれば実行
  if (customizations) {
    customizations(mock);
  }

  // 実際のインスタンスを返す
  return {
    mock: mock,
    instance: mock as unknown as IBranchMemoryBankRepository
  };
}
