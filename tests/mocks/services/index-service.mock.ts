import { mock, instance, when, anyString, anything, deepEqual } from 'ts-mockito';
import { IIndexService } from '../../../src/infrastructure/index/interfaces/IIndexService';
import { BranchInfo } from '../../../src/domain/entities/BranchInfo';
import { DocumentId } from '../../../src/domain/entities/DocumentId';
import { DocumentPath } from '../../../src/domain/entities/DocumentPath';
import { Tag } from '../../../src/domain/entities/Tag';
import { JsonDocument, DocumentType } from '../../../src/domain/entities/JsonDocument';
import { DocumentReference } from '../../../src/schemas/v2/index-schema';

/**
 * インデックスサービスのモックを作成する
 * 
 * @param customizations カスタマイズ関数 - モックの振る舞いをカスタマイズするためのコールバック
 * @returns モックされたサービスとそのインスタンスのオブジェクト
 * 
 * @example
 * // 基本的な使い方
 * const { mock, instance } = createMockIndexService();
 * 
 * // カスタマイズした使い方
 * const { mock, instance } = createMockIndexService(mockService => {
 *   // 特定のIDに対する検索結果をカスタマイズ
 *   when(mockService.findById(
 *     anything(), 
 *     deepEqual(new DocumentId('12345678-1234-1234-1234-123456789012'))
 *   )).thenResolve({
 *     id: '12345678-1234-1234-1234-123456789012',
 *     path: 'test/document.md',
 *     documentType: 'markdown',
 *     title: 'Test Document'
 *   });
 * });
 */
export function createMockIndexService(
  customizations?: (mockService: IIndexService) => void
): {
  mock: IIndexService;
  instance: IIndexService;
} {
  const mockService = mock<IIndexService>();

  // デフォルトの振る舞いを設定
  when(mockService.initializeIndex(anything())).thenResolve();
  when(mockService.buildIndex(anything(), anything())).thenResolve();
  when(mockService.addToIndex(anything(), anything())).thenResolve();
  when(mockService.removeFromIndex(anything(), anything())).thenResolve();
  when(mockService.findById(anything(), anything())).thenResolve(null);
  when(mockService.findByPath(anything(), anything())).thenResolve(null);
  when(mockService.findByTags(anything(), anything(), anything())).thenResolve([]);
  when(mockService.findByType(anything(), anything())).thenResolve([]);
  when(mockService.listAll(anything())).thenResolve([]);
  when(mockService.saveIndex(anything())).thenResolve();
  when(mockService.loadIndex(anything())).thenResolve();

  // カスタマイズ関数があれば実行
  if (customizations) {
    customizations(mockService);
  }

  // 実際のインスタンスを返す
  return {
    mock: mockService,
    instance: instance(mockService)
  };
}
