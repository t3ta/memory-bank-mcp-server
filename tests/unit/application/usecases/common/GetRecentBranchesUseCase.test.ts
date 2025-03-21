import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { GetRecentBranchesUseCase } from '../../../../../src/application/usecases/common/GetRecentBranchesUseCase';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo';
import {
  ApplicationError,
  ApplicationErrorCodes,
} from '../../../../../src/shared/errors/ApplicationError';

/**
 * GetRecentBranchesUseCaseのユニットテスト
 * 
 * これらのテストは、GetRecentBranchesUseCaseが以下の機能を正しく実装していることを確認します：
 * - デフォルトの制限値を使用した最近のブランチ取得
 * - カスタム制限値を使用した最近のブランチ取得
 * - リポジトリからの空の結果の処理
 * - 不正な制限値のバリデーションとエラー処理
 * - リポジトリエラーの適切な処理とラッピング
 * 
 * TODO: 以下のテストケースを追加する
 * - 並べ替え順序の確認（最新のブランチが最初に来ることを検証）
 * - 返された情報の完全性の確認（サマリー情報など）
 * - 大量のブランチがある場合のパフォーマンステスト
 */

// リポジトリのモック
const mockBranchRepository: jest.Mocked<IBranchMemoryBankRepository> = {
  exists: jest.fn(),
  initialize: jest.fn(),
  getDocument: jest.fn(),
  saveDocument: jest.fn(),
  deleteDocument: jest.fn(),
  listDocuments: jest.fn(),
  findDocumentsByTags: jest.fn(),
  getRecentBranches: jest.fn(),
  validateStructure: jest.fn(),
  getTagIndex: jest.fn(),
  saveTagIndex: jest.fn(),
  findDocumentPathsByTagsUsingIndex: jest.fn(),
};

describe('GetRecentBranchesUseCase', () => {
  let useCase: GetRecentBranchesUseCase;

  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();

    // モックリポジトリを使用してユースケースを作成
    useCase = new GetRecentBranchesUseCase(mockBranchRepository);
  });

  it('should get recent branches with default limit', async () => {
    // テストデータの準備
    const mockBranches = [
      {
        branchInfo: BranchInfo.create('feature/login'),
        lastModified: new Date('2023-01-02T00:00:00.000Z'),
        summary: {
          currentWork: 'Implementing login feature',
          recentChanges: ['Added authentication', 'Fixed validation'],
        },
      },
      {
        branchInfo: BranchInfo.create('fix/auth-bug'),
        lastModified: new Date('2023-01-01T00:00:00.000Z'),
        summary: {
          currentWork: 'Fixing auth bug',
          recentChanges: ['Identified issue', 'Started fixing'],
        },
      },
    ];

    mockBranchRepository.getRecentBranches.mockResolvedValue(mockBranches);

    // ユースケースを実行
    const result = await useCase.execute({});

    // 結果の検証
    expect(result).toBeDefined();
    expect(result.branches).toHaveLength(2);
    expect(result.total).toBe(2);

    // 1つめのブランチデータが正しく変換されていることを確認
    expect(result.branches[0].name).toBe('feature/login');
    expect(result.branches[0].lastModified).toBe('2023-01-02T00:00:00.000Z');
    expect(result.branches[0].summary.currentWork).toBe('Implementing login feature');
    expect(result.branches[0].summary.recentChanges).toEqual([
      'Added authentication',
      'Fixed validation',
    ]);

    // 2つめのブランチデータが正しく変換されていることを確認
    expect(result.branches[1].name).toBe('fix/auth-bug');
    expect(result.branches[1].lastModified).toBe('2023-01-01T00:00:00.000Z');
    expect(result.branches[1].summary.currentWork).toBe('Fixing auth bug');
    expect(result.branches[1].summary.recentChanges).toEqual([
      'Identified issue',
      'Started fixing',
    ]);

    // リポジトリがデフォルトの制限値で呼び出されたことを確認
    expect(mockBranchRepository.getRecentBranches).toHaveBeenCalledWith(10);
  });

  it('should get recent branches with custom limit', async () => {
    // テストデータの準備
    mockBranchRepository.getRecentBranches.mockResolvedValue([
      {
        branchInfo: BranchInfo.create('feature/login'),
        lastModified: new Date('2023-01-01T00:00:00.000Z'),
        summary: {
          currentWork: 'Implementing login feature',
          recentChanges: [],
        },
      },
    ]);

    // カスタム制限値でユースケースを実行
    const result = await useCase.execute({ limit: 5 });

    // 結果の検証
    expect(result).toBeDefined();

    // リポジトリがカスタム制限値で呼び出されたことを確認
    expect(mockBranchRepository.getRecentBranches).toHaveBeenCalledWith(5);
  });

  it('should handle empty result from repository', async () => {
    // 空の配列を返すようにリポジトリをモック
    mockBranchRepository.getRecentBranches.mockResolvedValue([]);

    // ユースケースを実行
    const result = await useCase.execute({});

    // 結果の検証
    expect(result).toBeDefined();
    expect(result.branches).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should throw ApplicationError when limit is less than 1', async () => {
    // 無効な制限値でのテスト
    await expect(useCase.execute({ limit: 0 })).rejects.toThrow(ApplicationError);
    await expect(useCase.execute({ limit: 0 })).rejects.toThrow('Limit must be a positive number');

    try {
      await useCase.execute({ limit: -5 });
      expect('No error thrown').toBe('Should have thrown an error');
    } catch (error) {
      expect(error instanceof ApplicationError).toBe(true);
      expect((error as ApplicationError).code).toBe(
        `APP_ERROR.${ApplicationErrorCodes.INVALID_INPUT}`
      );
    }

    // リポジトリが呼び出されなかったことを確認
    expect(mockBranchRepository.getRecentBranches).not.toHaveBeenCalled();
  });

  it('should wrap repository errors as ApplicationError', async () => {
    // リポジトリエラーのシミュレーション
    const repositoryError = new Error('Database connection failed');
    mockBranchRepository.getRecentBranches.mockRejectedValue(repositoryError);

    // ユースケースを実行してエラーをキャッチ
    await expect(useCase.execute({})).rejects.toThrow(ApplicationError);
    await expect(useCase.execute({})).rejects.toThrow(
      'Failed to get recent branches: Database connection failed'
    );

    try {
      await useCase.execute({});
      expect('No error thrown').toBe('Should have thrown an error');
    } catch (error) {
      expect(error instanceof ApplicationError).toBe(true);
      expect((error as ApplicationError).code).toBe(
        `APP_ERROR.${ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED}`
      );
      expect((error as ApplicationError).details).toEqual({ originalError: repositoryError });
    }
  });

  it('should pass through application errors without wrapping', async () => {
    // 既存のApplicationErrorをスローするようにリポジトリをモック
    const applicationError = new ApplicationError(
      ApplicationErrorCodes.INVALID_STATE,
      'Invalid application state'
    );
    mockBranchRepository.getRecentBranches.mockRejectedValue(applicationError);

    // ユースケースを実行してエラーをキャッチ
    await expect(useCase.execute({})).rejects.toBe(applicationError); // 同じエラーインスタンスであること
  });

  // TODO: 並べ替え順序の確認
  it.skip('should return branches ordered by lastModified in descending order', async () => {
    // 日付順が不規則なブランチデータ
    const unorderedBranches = [
      {
        branchInfo: BranchInfo.create('branch2'),
        lastModified: new Date('2023-02-01T00:00:00.000Z'),
        summary: { currentWork: 'Work 2' }
      },
      {
        branchInfo: BranchInfo.create('branch1'),
        lastModified: new Date('2023-03-01T00:00:00.000Z'),
        summary: { currentWork: 'Work 1' }
      },
      {
        branchInfo: BranchInfo.create('branch3'),
        lastModified: new Date('2023-01-01T00:00:00.000Z'),
        summary: { currentWork: 'Work 3' }
      }
    ];
    
    mockBranchRepository.getRecentBranches.mockResolvedValue(unorderedBranches);
    
    // ユースケースを実行
    const result = await useCase.execute({});
    
    // 結果の検証 - 最新の日付順に並んでいることを確認
    expect(result.branches[0].name).toBe('branch1');
    expect(result.branches[1].name).toBe('branch2');
    expect(result.branches[2].name).toBe('branch3');
  });

  // TODO: 返された情報の完全性の確認
  it.skip('should include complete summary information for each branch', async () => {
    // 詳細なサマリー情報を持つデータ
    const branchesWithDetailedSummary = [
      {
        branchInfo: BranchInfo.create('feature/complex'),
        lastModified: new Date('2023-01-02T00:00:00.000Z'),
        summary: {
          currentWork: 'Complex feature implementation',
          recentChanges: ['Added component A', 'Fixed bug B', 'Refactored C'],
          activeDecisions: ['Use library X instead of Y', 'Follow pattern Z'],
          considerations: ['Performance impact', 'Security implications'],
          nextSteps: ['Implement feature D', 'Test with E']
        },
      }
    ];
    
    mockBranchRepository.getRecentBranches.mockResolvedValue(branchesWithDetailedSummary);
    
    // ユースケースを実行
    const result = await useCase.execute({});
    
    // 実装されているサマリー情報フィールドが含まれていることを確認
    expect(result.branches[0].summary.currentWork).toBe('Complex feature implementation');
    expect(result.branches[0].summary.recentChanges).toHaveLength(3);
    // RecentBranchDTOにはこれらのプロパティは含まれていないため、コメントアウト
    // expect(result.branches[0].summary.activeDecisions).toHaveLength(2);
    // expect(result.branches[0].summary.considerations).toHaveLength(2);
    // expect(result.branches[0].summary.nextSteps).toHaveLength(2);
  });

  // TODO: 大量のブランチがある場合のパフォーマンステスト
  it.skip('should efficiently handle a large number of branches', async () => {
    // 多数のブランチデータを生成
    const largeBranchSet = Array.from({ length: 1000 }, (_, i) => ({
      branchInfo: BranchInfo.create(`branch-${i}`),
      lastModified: new Date(2023, 0, i % 31 + 1),
      summary: {
        currentWork: `Working on feature ${i}`,
        recentChanges: [`Change ${i}`]
      }
    }));
    
    mockBranchRepository.getRecentBranches.mockResolvedValue(largeBranchSet);
    
    // パフォーマンスを計測
    const startTime = Date.now();
    const result = await useCase.execute({ limit: 100 });
    const endTime = Date.now();
    
    // 結果の検証
    expect(result.branches).toHaveLength(100);
    expect(result.total).toBe(1000);
    
    // 処理時間が一定の閾値内であることを確認 (例: 100ms以下)
    expect(endTime - startTime).toBeLessThan(100);
  });
});
