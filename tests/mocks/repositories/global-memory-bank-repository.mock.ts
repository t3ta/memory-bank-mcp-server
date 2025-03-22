import { mock, instance, when, anyString, anything, deepEqual } from 'ts-mockito';
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
 *   when(mockRepo.getDocument(deepEqual(new DocumentPath('test/path.md')))).thenResolve({
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
  const mockRepo = mock<IGlobalMemoryBankRepository>();

  // デフォルトの振る舞いを設定
  when(mockRepo.initialize()).thenResolve();
  when(mockRepo.getDocument(anything())).thenResolve(null);
  when(mockRepo.saveDocument(anything())).thenResolve();
  when(mockRepo.deleteDocument(anything())).thenResolve(true);
  when(mockRepo.listDocuments()).thenResolve([]);
  when(mockRepo.findDocumentsByTags(anything())).thenResolve([]);
  when(mockRepo.updateTagsIndex()).thenResolve();
  when(mockRepo.saveTagIndex(anything())).thenResolve();
  when(mockRepo.getTagIndex()).thenResolve(null);
  when(mockRepo.findDocumentPathsByTagsUsingIndex(anything(), anything())).thenResolve([]);
  when(mockRepo.validateStructure()).thenResolve(true);

  // カスタマイズ関数があれば実行
  if (customizations) {
    customizations(mockRepo);
  }

  // 実際のインスタンスを返す
  return {
    mock: mockRepo,
    instance: instance(mockRepo)
  };
}
