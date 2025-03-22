import { mock, instance, when, anyString, anything, deepEqual } from 'ts-mockito';
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
 * const { mockRepo, instanceRepo } = createMockBranchMemoryBankRepository();
 * 
 * // カスタマイズした使い方
 * const { mockRepo, instanceRepo } = createMockBranchMemoryBankRepository(mockRepo => {
 *   // 特定のブランチの存在チェックをカスタマイズ
 *   when(mockRepo.exists('feature-branch')).thenResolve(true);
 *   when(mockRepo.exists('non-existent-branch')).thenResolve(false);
 * });
 */
export function createMockBranchMemoryBankRepository(
  customizations?: (mockRepo: IBranchMemoryBankRepository) => void
): {
  mockRepo: IBranchMemoryBankRepository;
  instanceRepo: IBranchMemoryBankRepository;
} {
  const mockRepo = mock<IBranchMemoryBankRepository>();

  // デフォルトの振る舞いを設定
  when(mockRepo.exists(anyString())).thenResolve(true);
  when(mockRepo.initialize(anything())).thenResolve();
  when(mockRepo.getDocument(anything(), anything())).thenResolve(null);
  when(mockRepo.saveDocument(anything(), anything())).thenResolve();
  when(mockRepo.deleteDocument(anything(), anything())).thenResolve(true);
  when(mockRepo.listDocuments(anything())).thenResolve([]);
  when(mockRepo.findDocumentsByTags(anything(), anything())).thenResolve([]);
  when(mockRepo.getRecentBranches(anything())).thenResolve([]);
  when(mockRepo.validateStructure(anything())).thenResolve(true);
  when(mockRepo.saveTagIndex(anything(), anything())).thenResolve();
  when(mockRepo.getTagIndex(anything())).thenResolve(null);
  when(mockRepo.findDocumentPathsByTagsUsingIndex(anything(), anything(), anything())).thenResolve([]);

  // カスタマイズ関数があれば実行
  if (customizations) {
    customizations(mockRepo);
  }

  // 実際のインスタンスを返す
  return {
    mockRepo,
    instanceRepo: instance(mockRepo)
  };
}
