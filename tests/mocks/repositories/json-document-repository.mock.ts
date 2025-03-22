import { mock, instance, when, anyString, anything, deepEqual } from 'ts-mockito';
import { IJsonDocumentRepository } from '../../../src/domain/repositories/IJsonDocumentRepository';
import { JsonDocument, DocumentType } from '../../../src/domain/entities/JsonDocument';
import { DocumentId } from '../../../src/domain/entities/DocumentId';
import { DocumentPath } from '../../../src/domain/entities/DocumentPath';
import { Tag } from '../../../src/domain/entities/Tag';
import { BranchInfo } from '../../../src/domain/entities/BranchInfo';

/**
 * JSONドキュメントリポジトリのモックを作成する
 * 
 * @param customizations カスタマイズ関数 - モックの振る舞いをカスタマイズするためのコールバック
 * @returns モックされたリポジトリとそのインスタンスのオブジェクト
 * 
 * @example
 * // 基本的な使い方
 * const { mock, instance } = createMockJsonDocumentRepository();
 * 
 * // カスタマイズした使い方
 * const { mock, instance } = createMockJsonDocumentRepository(mockRepo => {
 *   when(mockRepo.findById(deepEqual(new DocumentId('123')))).thenResolve({
 *     // カスタム返却値
 *   } as JsonDocument);
 * });
 */
export function createMockJsonDocumentRepository(
  customizations?: (mockRepo: IJsonDocumentRepository) => void
): {
  mock: IJsonDocumentRepository;
  instance: IJsonDocumentRepository;
} {
  const mockRepo = mock<IJsonDocumentRepository>();

  // デフォルトの振る舞いを設定
  when(mockRepo.findById(anything())).thenResolve(null);
  when(mockRepo.findByPath(anything(), anything())).thenResolve(null);
  when(mockRepo.findByTags(anything(), anything(), anything())).thenResolve([]);
  when(mockRepo.findByType(anything(), anything())).thenResolve([]);
  when(mockRepo.listAll(anything())).thenResolve([]);
  when(mockRepo.exists(anything(), anything())).thenResolve(true);
  when(mockRepo.save(anything(), anything())).thenCall(
    (_, document: JsonDocument) => Promise.resolve(document)
  );
  when(mockRepo.delete(anything(), anything())).thenResolve(true);

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