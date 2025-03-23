// ts-mockito import removed;
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
  const mockRepo = jest.mocked<IBranchMemoryBankRepository>();

  // デフォルトの振る舞いを設定
  mockRepo.exists = jest.fn().mockResolvedValue(true);
  mockRepo.initialize = jest.fn().mockResolvedValue();
  mockRepo.getDocument = jest.fn().mockResolvedValue(null);
  mockRepo.saveDocument = jest.fn().mockResolvedValue();
  mockRepo.deleteDocument = jest.fn().mockResolvedValue(true);
  mockRepo.listDocuments = jest.fn().mockResolvedValue([]);
  mockRepo.findDocumentsByTags = jest.fn().mockResolvedValue([]);
  mockRepo.getRecentBranches = jest.fn().mockResolvedValue([]);
  mockRepo.validateStructure = jest.fn().mockResolvedValue(true);
  mockRepo.saveTagIndex = jest.fn().mockResolvedValue();
  mockRepo.getTagIndex = jest.fn().mockResolvedValue(null);
  mockRepo.findDocumentPathsByTagsUsingIndex = jest.fn().mockResolvedValue([]);

  // カスタマイズ関数があれば実行
  if (customizations) {
    customizations(mockRepo);
  }

  // 実際のインスタンスを返す
  return {
    mock: mockRepo,
    instance: mockRepo
  };
}
