/**
 * @jest-environment node
 */
import { ContextController } from '../../../../src/interface/controllers/ContextController.js';
import { DomainError } from '../../../../src/shared/errors/DomainError.js';
import { ApplicationError } from '../../../../src/shared/errors/ApplicationError.js';
import { InfrastructureError } from '../../../../src/shared/errors/InfrastructureError.js';

// Removed MockType definition and createMock helper function

describe('ContextController', () => {
  // 各種モックの準備
  let readContextUseCase: jest.Mocked<any>; // Use jest.Mocked
  let readRulesUseCase: jest.Mocked<any>; // Use jest.Mocked
  let controller: ContextController;

  // 各テスト前に実行
  beforeEach(() => {
    // モックの作成 (Use jest.fn() directly or assign mock implementations)
    readContextUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    readRulesUseCase = { execute: jest.fn() } as jest.Mocked<any>;

    // モックメソッドの実装 (already done by jest.fn())
    // readContextUseCase.execute = jest.fn(); // No longer needed with direct assignment
    readRulesUseCase.execute = jest.fn();

    // コントローラーのインスタンス化
    controller = new ContextController(
      readContextUseCase,
      readRulesUseCase
    );
  });

  // モックのリセット
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('readRules', () => {
    it('正常系: 指定された言語のルールが読み込めること', async () => {
      // モックの戻り値を設定
      const mockRules = {
        content: '# Rules content',
        language: 'ja'
      };
      readRulesUseCase.execute.mockResolvedValue(mockRules);

      // テスト対象のメソッド実行
      const result = await controller.readRules('ja');

      // 検証
      expect(readRulesUseCase.execute).toHaveBeenCalledWith('ja');
      expect(result).toEqual({
        success: true,
        data: mockRules
      });
    });

    it('異常系: エラーが適切に処理されること', async () => {
      // エラーをスローするように設定
      const mockError = new DomainError('RULES_NOT_FOUND', 'Rules not found for language: fr');
      readRulesUseCase.execute.mockRejectedValue(mockError);

      // テスト対象のメソッド実行
      const result = await controller.readRules('fr');

      // 検証
      expect(readRulesUseCase.execute).toHaveBeenCalledWith('fr');
      expect(result).toEqual({
        success: false,
        error: 'RULES_NOT_FOUND: Rules not found for language: fr'
      });
    });
  });

  describe('readContext', () => {
    it('正常系: コンテキスト情報とルールが読み込めること', async () => {
      // モックの戻り値を設定
      const mockContextData = {
        branchMemory: {
          'file1.json': '{"content": "file1 content"}',
          'file2.json': '{"content": "file2 content"}'
        },
        globalMemory: {
          'global1.json': '{"content": "global1 content"}'
        }
      };
      readContextUseCase.execute.mockResolvedValue(mockContextData);

      const mockRules = {
        content: '# Rules content',
        language: 'en'
      };
      readRulesUseCase.execute.mockResolvedValue(mockRules);

      // テスト対象のメソッド実行
      const result = await controller.readContext({
        branch: 'test-branch',
        language: 'en'
      });

      // 検証
      expect(readContextUseCase.execute).toHaveBeenCalledWith({
        branch: 'test-branch',
        language: 'en'
      });
      expect(readRulesUseCase.execute).toHaveBeenCalledWith('en');
      expect(result).toEqual({
        success: true,
        data: {
          branchMemory: mockContextData.branchMemory,
          globalMemory: mockContextData.globalMemory,
          rules: mockRules
        }
      });
    });

    it('正常系: ルールの取得が失敗してもその他のコンテキスト情報は返されること', async () => {
      // モックの戻り値を設定（コンテキスト正常、ルールエラー）
      const mockContextData = {
        branchMemory: {
          'file1.json': '{"content": "file1 content"}'
        },
        globalMemory: {
          'global1.json': '{"content": "global1 content"}'
        }
      };
      readContextUseCase.execute.mockResolvedValue(mockContextData);

      // ルールの取得はエラー
      readRulesUseCase.execute.mockRejectedValue(
        new DomainError('RULES_NOT_FOUND', 'Rules not found for language: zh')
      );

      // テスト対象のメソッド実行
      const result = await controller.readContext({
        branch: 'test-branch',
        language: 'zh'
      });

      // 検証
      expect(readContextUseCase.execute).toHaveBeenCalledWith({
        branch: 'test-branch',
        language: 'zh'
      });
      expect(readRulesUseCase.execute).toHaveBeenCalledWith('zh');

      // ルールが含まれないがその他の情報は返される
      expect(result).toEqual({
        success: true,
        data: {
          branchMemory: mockContextData.branchMemory,
          globalMemory: mockContextData.globalMemory
          // rulesフィールドは存在しない
        }
      });
    });

    it('異常系: コンテキスト情報の取得に失敗した場合はエラーが返されること', async () => {
      // readContextUseCaseがエラーをスロー
      const mockError = new ApplicationError('BRANCH_ACCESS_ERROR', 'Failed to access branch memory');
      readContextUseCase.execute.mockRejectedValue(mockError);

      // テスト対象のメソッド実行
      const result = await controller.readContext({
        branch: 'non-existent-branch',
        language: 'en'
      });

      // 検証
      expect(readContextUseCase.execute).toHaveBeenCalledWith({
        branch: 'non-existent-branch',
        language: 'en'
      });
      expect(readRulesUseCase.execute).not.toHaveBeenCalled(); // ルールの取得まで到達しない
      expect(result).toEqual({
        success: false,
        error: 'BRANCH_ACCESS_ERROR: Failed to access branch memory'
      });
    });
  });

  describe('handleError', () => {
    it('DomainErrorを適切に処理できること', async () => {
      // エラーをスローするように設定
      const mockError = new DomainError('VALIDATION_ERROR', 'Invalid input');
      readRulesUseCase.execute.mockRejectedValue(mockError);

      // テスト対象のメソッド実行
      const result = await controller.readRules('en');

      // 検証
      expect(result).toEqual({
        success: false,
        error: 'VALIDATION_ERROR: Invalid input'
      });
    });

    it('ApplicationErrorを適切に処理できること', async () => {
      // エラーをスローするように設定
      const mockError = new ApplicationError('SERVICE_ERROR', 'Service unavailable');
      readRulesUseCase.execute.mockRejectedValue(mockError);

      // テスト対象のメソッド実行
      const result = await controller.readRules('en');

      // 検証
      expect(result).toEqual({
        success: false,
        error: 'SERVICE_ERROR: Service unavailable'
      });
    });

    it('InfrastructureErrorを適切に処理できること', async () => {
      // エラーをスローするように設定
      const mockError = new InfrastructureError('DATABASE_ERROR', 'Database connection failed');
      readRulesUseCase.execute.mockRejectedValue(mockError);

      // テスト対象のメソッド実行
      const result = await controller.readRules('en');

      // 検証
      expect(result).toEqual({
        success: false,
        error: 'DATABASE_ERROR: Database connection failed'
      });
    });

    it('通常のErrorを適切に処理できること', async () => {
      // エラーをスローするように設定
      const mockError = new Error('Something went wrong');
      readRulesUseCase.execute.mockRejectedValue(mockError);

      // テスト対象のメソッド実行
      const result = await controller.readRules('en');

      // 検証
      expect(result).toEqual({
        success: false,
        error: 'Something went wrong'
      });
    });

    it('非Errorオブジェクトを適切に処理できること', async () => {
      // エラーをスローするように設定
      readRulesUseCase.execute.mockRejectedValue('Just a string error');

      // テスト対象のメソッド実行
      const result = await controller.readRules('en');

      // 検証
      expect(result).toEqual({
        success: false,
        error: 'An unexpected error occurred'
      });
    });
  });
});
