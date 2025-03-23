// ts-mockito import removed;
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
 *   when(mockRepo.findById(new DocumentId('123'))).thenResolve({
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
  const mockRepo = jest.mocked<IJsonDocumentRepository>();

  // デフォルトの振る舞いを設定
  mockRepo.findById = jest.fn().mockResolvedValue(null);
  mockRepo.findByPath = jest.fn().mockResolvedValue(null);
  mockRepo.findByTags = jest.fn().mockResolvedValue([]);
  mockRepo.findByType = jest.fn().mockResolvedValue([]);
  mockRepo.listAll = jest.fn().mockResolvedValue([]);
  mockRepo.exists = jest.fn().mockResolvedValue(true);
  when(mockRepo.save(expect.anything(), expect.anything())).thenCall(
    (_, document: JsonDocument) => Promise.resolve(document)
  );
  mockRepo.delete = jest.fn().mockResolvedValue(true);

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