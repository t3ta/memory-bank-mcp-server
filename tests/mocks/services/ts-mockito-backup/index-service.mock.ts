// ts-mockito import removed;
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
 *     expect.anything(), 
 *     new DocumentId('12345678-1234-1234-1234-123456789012')
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
  const mockService = jest.mocked<IIndexService>();

  // デフォルトの振る舞いを設定
  mockService.initializeIndex = jest.fn().mockResolvedValue();
  mockService.buildIndex = jest.fn().mockResolvedValue();
  mockService.addToIndex = jest.fn().mockResolvedValue();
  mockService.removeFromIndex = jest.fn().mockResolvedValue();
  mockService.findById = jest.fn().mockResolvedValue(null);
  mockService.findByPath = jest.fn().mockResolvedValue(null);
  mockService.findByTags = jest.fn().mockResolvedValue([]);
  mockService.findByType = jest.fn().mockResolvedValue([]);
  mockService.listAll = jest.fn().mockResolvedValue([]);
  mockService.saveIndex = jest.fn().mockResolvedValue();
  mockService.loadIndex = jest.fn().mockResolvedValue();

  // カスタマイズ関数があれば実行
  if (customizations) {
    customizations(mockService);
  }

  // 実際のインスタンスを返す
  return {
    mock: mockService,
    instance: mockService
  };
}
