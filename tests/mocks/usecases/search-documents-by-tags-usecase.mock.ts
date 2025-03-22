import { mock, instance, when, anyString, anything, deepEqual } from 'ts-mockito';
import { 
  SearchDocumentsByTagsUseCase,
  SearchDocumentsByTagsInput,
  SearchDocumentsByTagsOutput
} from '../../../src/application/usecases/common/SearchDocumentsByTagsUseCase';
import { IUseCase } from '../../../src/application/interfaces/IUseCase';
import { ApplicationError } from '../../../src/shared/errors/ApplicationError';

/**
 * タグによるドキュメント検索ユースケースのモックを作成する
 * 
 * @param customizations カスタマイズ関数 - モックの振る舞いをカスタマイズするためのコールバック
 * @returns モックされたユースケースとそのインスタンスのオブジェクト
 * 
 * @example
 * // 基本的な使い方
 * const { mockUseCase, instanceUseCase } = createMockSearchDocumentsByTagsUseCase();
 * 
 * // カスタマイズした使い方
 * const { mockUseCase, instanceUseCase } = createMockSearchDocumentsByTagsUseCase(mockUseCase => {
 *   // 特定の入力に対する出力をカスタマイズ
 *   when(mockUseCase.execute(deepEqual({
 *     tags: ['important', 'documentation'],
 *     branchName: 'main'
 *   }))).thenResolve({
 *     documents: [
 *       { path: 'docs/readme.md', content: '# Project Documentation', tags: ['documentation'], lastModified: new Date().toISOString() }
 *     ],
 *     searchInfo: {
 *       count: 1,
 *       searchedTags: ['important', 'documentation'],
 *       matchedAllTags: false,
 *       searchLocation: 'main'
 *     }
 *   });
 * });
 */
export function createMockSearchDocumentsByTagsUseCase(
  customizations?: (mockUseCase: IUseCase<SearchDocumentsByTagsInput, SearchDocumentsByTagsOutput>) => void
): {
  mockUseCase: IUseCase<SearchDocumentsByTagsInput, SearchDocumentsByTagsOutput>;
  instanceUseCase: IUseCase<SearchDocumentsByTagsInput, SearchDocumentsByTagsOutput>;
} {
  const mockUseCase = mock<IUseCase<SearchDocumentsByTagsInput, SearchDocumentsByTagsOutput>>();

  // デフォルトの振る舞いを設定
  when(mockUseCase.execute(anything())).thenResolve({
    documents: [],
    searchInfo: {
      count: 0,
      searchedTags: [],
      matchedAllTags: false,
      searchLocation: 'global'
    }
  });

  // カスタマイズ関数があれば実行
  if (customizations) {
    customizations(mockUseCase);
  }

  // 実際のインスタンスを返す
  return {
    mockUseCase,
    instanceUseCase: instance(mockUseCase)
  };
}
