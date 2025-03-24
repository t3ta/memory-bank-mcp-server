// @ts-nocheck
// This file was automatically converted from ts-mockito to jest.fn()
import { jest } from '@jest/globals';
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
 *     expect.expect.anything(), 
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
  // jestのモックオブジェクトを作成
  const mock = {
    initializeIndex: jest.fn().mockResolvedValue(),
    buildIndex: jest.fn().mockResolvedValue(),
    addToIndex: jest.fn().mockResolvedValue(),
    removeFromIndex: jest.fn().mockResolvedValue(),
    findById: jest.fn().mockResolvedValue(null),
    findByPath: jest.fn().mockResolvedValue(null),
    findByTags: jest.fn().mockResolvedValue([]),
    findByType: jest.fn().mockResolvedValue([]),
    listAll: jest.fn().mockResolvedValue([]),
    saveIndex: jest.fn().mockResolvedValue(),
    loadIndex: jest.fn().mockResolvedValue()
  };

  // カスタマイズ関数があれば実行
  if (customizations) {
    customizations(mock);
  }

  // 実際のインスタンスを返す
  return {
    mock: mock,
    instance: mock as unknown as IIndexService
  };
}
