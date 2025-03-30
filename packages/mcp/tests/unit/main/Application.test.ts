import { Application } from '../../../src/main/index.js';
import { setupContainer } from '../../../src/main/di/providers.js';
import { IGlobalController } from '../../../src/interface/controllers/interfaces/IGlobalController.js';
import { IBranchController } from '../../../src/interface/controllers/interfaces/IBranchController.js';
import { IContextController } from '../../../src/interface/controllers/interfaces/IContextController.js';

// モックDIコンテナ
jest.mock('../../../src/main/di/providers.js', () => ({
  setupContainer: jest.fn()
}));

describe('Application', () => {
  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('initialize()', () => {
    it('should properly resolve promises from DI container', async () => {
      // モックコントローラー
      const mockGlobalController = { mockMethod: jest.fn() };
      const mockBranchController = { mockMethod: jest.fn() };
      const mockContextController = { mockMethod: jest.fn() };

      // モックDIコンテナ
      const mockContainer = {
        get: jest.fn(async (key: string) => {
          switch (key) {
            case 'globalController':
              return mockGlobalController;
            case 'branchController':
              return mockBranchController;
            case 'contextController':
              return mockContextController;
            default:
              throw new Error(`Unknown key: ${key}`);
          }
        })
      };

      // setupContainerモックの戻り値を設定
      (setupContainer as jest.Mock).mockResolvedValue(mockContainer);

      // アプリケーションインスタンスを作成
      const app = new Application();

      // 初期化を実行
      await app.initialize();

      // コントローラーが正しく取得されていることを確認
      expect(setupContainer).toHaveBeenCalled();
      expect(mockContainer.get).toHaveBeenCalledWith('globalController');
      expect(mockContainer.get).toHaveBeenCalledWith('branchController');
      expect(mockContainer.get).toHaveBeenCalledWith('contextController');

      // 取得したコントローラーインスタンスを確認
      expect(app.getGlobalController()).toBe(mockGlobalController);
      expect(app.getBranchController()).toBe(mockBranchController);
      expect(app.getContextController()).toBe(mockContextController);
    });

    it('should throw error when initialization fails', async () => {
      // エラーを投げるモックDIコンテナ
      const mockContainer = {
        get: jest.fn().mockRejectedValue(new Error('DI container error'))
      };

      (setupContainer as jest.Mock).mockResolvedValue(mockContainer);

      const app = new Application();

      // 初期化が失敗することを確認
      await expect(app.initialize()).rejects.toThrow('DI container error');
    });

    it('should throw error when controller is accessed before initialization', () => {
      const app = new Application();

      // 初期化前のコントローラー取得でエラーが発生することを確認
      expect(() => app.getGlobalController()).toThrow('Application not initialized');
      expect(() => app.getBranchController()).toThrow('Application not initialized');
      expect(() => app.getContextController()).toThrow('Application not initialized');
    });
  });
});
