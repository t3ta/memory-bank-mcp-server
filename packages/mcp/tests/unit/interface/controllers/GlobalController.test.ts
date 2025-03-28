/**
 * @jest-environment node
 */
import { GlobalController } from '../../../../src/interface/controllers/GlobalController.js';
import { MCPResponsePresenter } from '../../../../src/interface/presenters/MCPResponsePresenter.js';
import { DomainError } from '../../../../src/shared/errors/DomainError.js';
import { BaseError } from '../../../../src/shared/errors/BaseError.js';

// Add MockType definition back for compatibility
type MockType<T> = {
  [P in keyof T]: jest.Mock<any, any>;
};

describe('GlobalController', () => {
  // 各種モックの準備
  let readGlobalDocumentUseCase: jest.Mocked<any>; // Use jest.Mocked
  let writeGlobalDocumentUseCase: jest.Mocked<any>; // Use jest.Mocked
  let searchDocumentsByTagsUseCase: jest.Mocked<any>; // Use jest.Mocked
  let updateTagIndexUseCase: jest.Mocked<any>; // Use jest.Mocked
  let presenter: jest.Mocked<MCPResponsePresenter>; // Use jest.Mocked
  let updateTagIndexUseCaseV2: MockType<any>;
  let readJsonDocumentUseCase: MockType<any>;
  let writeJsonDocumentUseCase: MockType<any>;
  let deleteJsonDocumentUseCase: MockType<any>;
  let searchJsonDocumentsUseCase: MockType<any>;
  let updateJsonIndexUseCase: MockType<any>;
  let templateController: MockType<any>;
  let controller: GlobalController;

  // 各テスト前に実行
  beforeEach(() => {
    // モックの作成 (Use jest.fn() directly or assign mock implementations)
    readGlobalDocumentUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    writeGlobalDocumentUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    searchDocumentsByTagsUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    updateTagIndexUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    presenter = { present: jest.fn(), presentError: jest.fn() } as jest.Mocked<MCPResponsePresenter>;
    updateTagIndexUseCaseV2 = { execute: jest.fn() } as jest.Mocked<any>;
    readJsonDocumentUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    writeJsonDocumentUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    deleteJsonDocumentUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    searchJsonDocumentsUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    updateJsonIndexUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    templateController = { getTemplate: jest.fn() } as jest.Mocked<any>;

    // モックメソッドの実装 (already done by jest.fn())
    // readGlobalDocumentUseCase.execute = jest.fn(); // No longer needed
    writeGlobalDocumentUseCase.execute = jest.fn();
    searchDocumentsByTagsUseCase.execute = jest.fn();
    updateTagIndexUseCase.execute = jest.fn();
    presenter.present = jest.fn();
    presenter.presentError = jest.fn();
    updateTagIndexUseCaseV2.execute = jest.fn();
    readJsonDocumentUseCase.execute = jest.fn();
    writeJsonDocumentUseCase.execute = jest.fn();
    deleteJsonDocumentUseCase.execute = jest.fn();
    templateController.getTemplate = jest.fn();
    updateJsonIndexUseCase.execute = jest.fn();
    templateController.getTemplateAsMarkdown = jest.fn();

    // コントローラーのインスタンス化
    controller = new GlobalController(
      readGlobalDocumentUseCase,
      writeGlobalDocumentUseCase,
      searchDocumentsByTagsUseCase,
      updateTagIndexUseCase,
      presenter as any,
      {
        updateTagIndexUseCaseV2,
        readJsonDocumentUseCase,
        writeJsonDocumentUseCase,
        deleteJsonDocumentUseCase,
        searchJsonDocumentsUseCase,
        updateJsonIndexUseCase
        // templateController is removed as it's deprecated
      }
    );
  });

  // モックのリセット
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('readDocument', () => {
    it('正常系: ドキュメントが正常に読み込まれること', async () => {
      // モックの戻り値を設定
      const mockDocument = {
        path: 'test.json',
        content: '{"test": "content"}',
        tags: ['test'],
        lastModified: '2025-03-28T00:00:00Z'
      };
      readGlobalDocumentUseCase.execute.mockResolvedValue({
        document: mockDocument
      });
      presenter.present.mockReturnValue({
        success: true,
        data: mockDocument
      });

      // テスト対象のメソッド実行
      const result = await controller.readDocument('test.json');

      // 検証
      expect(readGlobalDocumentUseCase.execute).toHaveBeenCalledWith({
        path: 'test.json'
      });
      expect(presenter.present).toHaveBeenCalledWith(mockDocument);
      expect(result).toEqual({
        success: true,
        data: mockDocument
      });
    });

    it('異常系: エラーが適切に処理されること', async () => {
      // エラーをスローするように設定
      const mockError = new DomainError('NOT_FOUND', 'Document not found');
      readGlobalDocumentUseCase.execute.mockRejectedValue(mockError);
      presenter.presentError.mockReturnValue({
        success: false,
        error: {
          code: 'DOMAIN_ERROR.NOT_FOUND',
          message: 'Document not found'
        }
      });

      // テスト対象のメソッド実行
      const result = await controller.readDocument('test.json');

      // 検証
      expect(readGlobalDocumentUseCase.execute).toHaveBeenCalledWith({
        path: 'test.json'
      });
      expect(presenter.presentError).toHaveBeenCalledWith(mockError);
      expect(result).toEqual({
        success: false,
        error: {
          code: 'DOMAIN_ERROR.NOT_FOUND',
          message: 'Document not found'
        }
      });
    });
  });

  describe('writeDocument', () => {
    it('正常系: ドキュメントが正常に書き込まれること', async () => {
      // モックの戻り値を設定
      writeGlobalDocumentUseCase.execute.mockResolvedValue({
        success: true
      });
      presenter.present.mockReturnValue({
        success: true,
        data: { success: true }
      });

      // テスト対象のメソッド実行
      const result = await controller.writeDocument(
        'test.json',
        '{"test": "content"}',
        ['test']
      );

      // 検証
      expect(writeGlobalDocumentUseCase.execute).toHaveBeenCalledWith({
        document: {
          path: 'test.json',
          content: '{"test": "content"}',
          tags: ['test']
        }
      });
      expect(presenter.present).toHaveBeenCalledWith({ success: true });
      expect(result).toEqual({
        success: true,
        data: { success: true }
      });
    });

    it('正常系: tagsパラメータが省略された場合に空配列が渡されること', async () => {
      // モックの戻り値を設定
      writeGlobalDocumentUseCase.execute.mockResolvedValue({
        success: true
      });
      presenter.present.mockReturnValue({
        success: true,
        data: { success: true }
      });

      // テスト対象のメソッド実行（tagsを省略）
      const result = await controller.writeDocument(
        'test.json',
        '{"test": "content"}'
      );

      // 検証
      expect(writeGlobalDocumentUseCase.execute).toHaveBeenCalledWith({
        document: {
          path: 'test.json',
          content: '{"test": "content"}',
          tags: [] // 空配列がデフォルト
        }
      });
      expect(presenter.present).toHaveBeenCalledWith({ success: true });
      expect(result).toEqual({
        success: true,
        data: { success: true }
      });
    });
  });

  describe('readCoreFiles', () => {
    // テンプレート機能は非推奨になったため、テストをシンプル化
    it('正常系: コアファイルが正常に読み込まれること', async () => {
      // プレゼンターのモック設定
      presenter.present.mockImplementation(data => ({
        success: true,
        data
      }));

      // テスト対象のメソッド実行
      const result = await controller.readCoreFiles();

      // 結果の確認
      expect(result.success).toBe(true);
      expect(Object.keys(result.data)).toBeGreaterThan(0); // 何らかのファイルが返される
    });

    // 他のテンプレート関連テストはスキップ
    it.skip('非推奨: テンプレート機能は削除されたのでスキップ', async () => {
      // テンプレート機能は非推奨になったためスキップ
    });
  });

  describe('updateTagsIndex', () => {
    it('正常系: V2が利用可能な場合はV2が使われること', async () => {
      // モックの戻り値を設定
      updateTagIndexUseCaseV2.execute.mockResolvedValue({
        success: true,
        message: 'Updated using V2'
      });
      presenter.present.mockReturnValue({
        success: true,
        data: { success: true, message: 'Updated using V2' }
      });

      // テスト対象のメソッド実行
      const result = await controller.updateTagsIndex();

      // 検証
      expect(updateTagIndexUseCaseV2.execute).toHaveBeenCalledWith({
        branchName: undefined,
        fullRebuild: true
      });
      expect(updateTagIndexUseCase.execute).not.toHaveBeenCalled(); // V1は呼ばれないはず
      expect(presenter.present).toHaveBeenCalledWith({ success: true, message: 'Updated using V2' });
      expect(result).toEqual({
        success: true,
        data: { success: true, message: 'Updated using V2' }
      });
    });

    it('正常系: V2が利用できない場合はV1が使われること', async () => {
      // コントローラーを再作成（V2なし）
      controller = new GlobalController(
        readGlobalDocumentUseCase,
        writeGlobalDocumentUseCase,
        searchDocumentsByTagsUseCase,
        updateTagIndexUseCase,
        presenter as any
      );

      // モックの戻り値を設定
      updateTagIndexUseCase.execute.mockResolvedValue({
        success: true,
        message: 'Updated using V1'
      });
      presenter.present.mockReturnValue({
        success: true,
        data: { success: true, message: 'Updated using V1' }
      });

      // テスト対象のメソッド実行
      const result = await controller.updateTagsIndex();

      // 検証
      expect(updateTagIndexUseCaseV2?.execute).not.toHaveBeenCalled(); // V2は存在しないはず
      expect(updateTagIndexUseCase.execute).toHaveBeenCalledWith({
        branchName: undefined,
        fullRebuild: true
      });
      expect(presenter.present).toHaveBeenCalledWith({ success: true, message: 'Updated using V1' });
      expect(result).toEqual({
        success: true,
        data: { success: true, message: 'Updated using V1' }
      });
    });
  });

  describe('findDocumentsByTags', () => {
    it('正常系: タグでドキュメントを検索できること', async () => {
      // モックの戻り値を設定
      const mockDocuments = [
        {
          path: 'doc1.json',
          content: '{"test": "content1"}',
          tags: ['test', 'important'],
          lastModified: '2025-03-28T00:00:00Z'
        },
        {
          path: 'doc2.json',
          content: '{"test": "content2"}',
          tags: ['test', 'draft'],
          lastModified: '2025-03-28T01:00:00Z'
        }
      ];
      searchDocumentsByTagsUseCase.execute.mockResolvedValue({
        documents: mockDocuments,
        searchInfo: { matchedCount: 2 }
      });
      presenter.present.mockReturnValue({
        success: true,
        data: mockDocuments
      });

      // テスト対象のメソッド実行
      const result = await controller.findDocumentsByTags(['test'], true);

      // 検証
      expect(searchDocumentsByTagsUseCase.execute).toHaveBeenCalledWith({
        branchName: undefined, // グローバルはundefined
        tags: ['test'],
        matchAllTags: true
      });
      expect(presenter.present).toHaveBeenCalledWith(mockDocuments);
      expect(result).toEqual({
        success: true,
        data: mockDocuments
      });
    });
  });

  describe('JSON関連のメソッド', () => {
    describe('readJsonDocument', () => {
      it('正常系: JSONドキュメントが正常に読み込まれること', async () => {
        // モックの戻り値を設定
        const mockDocument = {
          id: '123',
          path: 'test.json',
          title: 'Test Document',
          documentType: 'test',
          content: { test: 'content' },
          tags: ['test'],
          lastModified: '2025-03-28T00:00:00Z'
        };
        readJsonDocumentUseCase.execute.mockResolvedValue({
          document: mockDocument
        });
        presenter.present.mockReturnValue({
          success: true,
          data: mockDocument
        });

        // テスト対象のメソッド実行
        const result = await controller.readJsonDocument({ path: 'test.json' });

        // 検証
        expect(readJsonDocumentUseCase.execute).toHaveBeenCalledWith({
          branchName: undefined,
          path: 'test.json',
          id: undefined
        });
        expect(presenter.present).toHaveBeenCalledWith(mockDocument);
        expect(result).toEqual({
          success: true,
          data: mockDocument
        });
      });

      it('異常系: JSONサポートが無効な場合はエラーになること', async () => {
        // コントローラーを再作成（JSON機能なし）
        controller = new GlobalController(
          readGlobalDocumentUseCase,
          writeGlobalDocumentUseCase,
          searchDocumentsByTagsUseCase,
          updateTagIndexUseCase,
          presenter as any
        );

        // プレゼンターのエラー出力をモック
        presenter.presentError.mockReturnValue({
          success: false,
          error: {
            code: 'DOMAIN_ERROR.FEATURE_NOT_AVAILABLE',
            message: 'JSON document features are not available in this configuration'
          }
        });

        // テスト対象のメソッド実行
        const result = await controller.readJsonDocument({ path: 'test.json' });

        // 検証
        expect(readJsonDocumentUseCase?.execute).not.toHaveBeenCalled();
        expect(presenter.presentError).toHaveBeenCalled();
        expect(result).toEqual({
          success: false,
          error: {
            code: 'DOMAIN_ERROR.FEATURE_NOT_AVAILABLE',
            message: 'JSON document features are not available in this configuration'
          }
        });
      });
    });

    // 他のJSON関連メソッドも同様に実装...
  });

  // 残りのメソッドのテストはここに追加...
});
