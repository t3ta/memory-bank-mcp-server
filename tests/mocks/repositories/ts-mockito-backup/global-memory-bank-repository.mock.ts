// ts-mockito import removed;
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
  const mockRepo = jest.mocked<IGlobalMemoryBankRepository>();

  // デフォルトの振る舞いを設定
  mockRepo.initialize = jest.fn().mockResolvedValue();
  mockRepo.getDocument = jest.fn().mockResolvedValue(null);
  mockRepo.saveDocument = jest.fn().mockResolvedValue();
  mockRepo.deleteDocument = jest.fn().mockResolvedValue(true);
  mockRepo.listDocuments = jest.fn().mockResolvedValue([]);
  mockRepo.findDocumentsByTags = jest.fn().mockResolvedValue([]);
  mockRepo.updateTagsIndex = jest.fn().mockResolvedValue();
  mockRepo.saveTagIndex = jest.fn().mockResolvedValue();
  mockRepo.getTagIndex = jest.fn().mockResolvedValue(null);
  mockRepo.findDocumentPathsByTagsUsingIndex = jest.fn().mockResolvedValue([]);
  mockRepo.validateStructure = jest.fn().mockResolvedValue(true);

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
