/**
 * @jest-environment node
 */
import { BranchController } from '../../../../src/interface/controllers/BranchController.js';
import { MCPResponsePresenter } from '../../../../src/interface/presenters/MCPResponsePresenter.js';
import { DomainError } from '../../../../src/shared/errors/DomainError.js';
import { ApplicationError } from '../../../../src/shared/errors/ApplicationError.js';
import { InfrastructureError } from '../../../../src/shared/errors/InfrastructureError.js';

// Removed MockType definition and createMock helper function

describe('BranchController', () => {
  // 各種モックの準備
  let readBranchDocumentUseCase: jest.Mocked<any>; // Use jest.Mocked
  let writeBranchDocumentUseCase: jest.Mocked<any>; // Use jest.Mocked
  let searchDocumentsByTagsUseCase: jest.Mocked<any>; // Use jest.Mocked
  let updateTagIndexUseCase: jest.Mocked<any>; // Use jest.Mocked
  let getRecentBranchesUseCase: jest.Mocked<any>; // Use jest.Mocked
  let readBranchCoreFilesUseCase: jest.Mocked<any>; // Use jest.Mocked
  let createBranchCoreFilesUseCase: jest.Mocked<any>; // Use jest.Mocked
  let presenter: jest.Mocked<MCPResponsePresenter>; // Use jest.Mocked
  let updateTagIndexUseCaseV2: jest.Mocked<any>; // Use jest.Mocked
  let readJsonDocumentUseCase: jest.Mocked<any>; // Use jest.Mocked
  let writeJsonDocumentUseCase: jest.Mocked<any>; // Use jest.Mocked
  let deleteJsonDocumentUseCase: jest.Mocked<any>; // Use jest.Mocked
  let searchJsonDocumentsUseCase: jest.Mocked<any>; // Use jest.Mocked
  let updateJsonIndexUseCase: jest.Mocked<any>; // Use jest.Mocked
  let controller: BranchController;

  // 各テスト前に実行
  beforeEach(() => {
    // モックの作成 (Use jest.fn() directly or assign mock implementations)
    readBranchDocumentUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    writeBranchDocumentUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    searchDocumentsByTagsUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    updateTagIndexUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    getRecentBranchesUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    readBranchCoreFilesUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    createBranchCoreFilesUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    presenter = { present: jest.fn(), presentError: jest.fn() } as jest.Mocked<MCPResponsePresenter>;
    updateTagIndexUseCaseV2 = { execute: jest.fn() } as jest.Mocked<any>;
    readJsonDocumentUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    writeJsonDocumentUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    deleteJsonDocumentUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    searchJsonDocumentsUseCase = { execute: jest.fn() } as jest.Mocked<any>;
    updateJsonIndexUseCase = { execute: jest.fn() } as jest.Mocked<any>;

    // モックメソッドの実装 (already done by jest.fn())
    // readBranchDocumentUseCase.execute = jest.fn(); // No longer needed
    writeBranchDocumentUseCase.execute = jest.fn();
    searchDocumentsByTagsUseCase.execute = jest.fn();
    updateTagIndexUseCase.execute = jest.fn();
    getRecentBranchesUseCase.execute = jest.fn();
    readBranchCoreFilesUseCase.execute = jest.fn();
    createBranchCoreFilesUseCase.execute = jest.fn();
    presenter.present = jest.fn();
    presenter.presentError = jest.fn();
    updateTagIndexUseCaseV2.execute = jest.fn();
    readJsonDocumentUseCase.execute = jest.fn();
    writeJsonDocumentUseCase.execute = jest.fn();
    deleteJsonDocumentUseCase.execute = jest.fn();
    searchJsonDocumentsUseCase.execute = jest.fn();
    updateJsonIndexUseCase.execute = jest.fn();

    // コントローラーのインスタンス化
    controller = new BranchController(
      readBranchDocumentUseCase,
      writeBranchDocumentUseCase,
      searchDocumentsByTagsUseCase,
      updateTagIndexUseCase,
      getRecentBranchesUseCase,
      readBranchCoreFilesUseCase,
      createBranchCoreFilesUseCase,
      presenter as any,
      {
        updateTagIndexUseCaseV2,
        readJsonDocumentUseCase,
        writeJsonDocumentUseCase,
        deleteJsonDocumentUseCase,
        searchJsonDocumentsUseCase,
        updateJsonIndexUseCase
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
      readBranchDocumentUseCase.execute.mockResolvedValue({
        document: mockDocument
      });
      presenter.present.mockReturnValue({
        success: true,
        data: mockDocument
      });

      // テスト対象のメソッド実行
      const result = await controller.readDocument('test-branch', 'test.json');

      // 検証
      expect(readBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName: 'test-branch',
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
      readBranchDocumentUseCase.execute.mockRejectedValue(mockError);
      presenter.presentError.mockReturnValue({
        success: false,
        error: {
          code: 'DOMAIN_ERROR.NOT_FOUND',
          message: 'Document not found'
        }
      });

      // テスト対象のメソッド実行
      const result = await controller.readDocument('test-branch', 'test.json');

      // 検証
      expect(readBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName: 'test-branch',
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

    it('JSONドキュメントのcontent.textフィールドが自動的にパースされること', async () => {
      // モックの戻り値を設定（JSONドキュメントの場合）
      const mockDocument = {
        path: 'test.json',
        content: JSON.stringify({
          schema: 'memory_document_v2',
          content: {
            text: JSON.stringify({ parsed: 'content' })
          }
        }),
        tags: ['test'],
        lastModified: '2025-03-28T00:00:00Z'
      };
      readBranchDocumentUseCase.execute.mockResolvedValue({
        document: mockDocument
      });
      presenter.present.mockReturnValue({
        success: true,
        data: mockDocument
      });

      // テスト対象のメソッド実行
      const result = await controller.readDocument('test-branch', 'test.json');

      // 検証
      expect(readBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName: 'test-branch',
        path: 'test.json'
      });

      // パース後のコンテンツを確認（mockDocumentの内容が変更されるはず）
      const expectedContent = {
        schema: 'memory_document_v2',
        content: {
          text: { parsed: 'content' } // 文字列からオブジェクトにパースされる
        }
      };
      expect(JSON.parse(mockDocument.content)).toEqual(expectedContent);
      expect(presenter.present).toHaveBeenCalledWith(mockDocument);
      expect(result).toEqual({
        success: true,
        data: mockDocument
      });
    });
  });

  describe('writeDocument', () => {
    it('正常系: ドキュメントが正常に書き込まれること', async () => {
      // モックの戻り値を設定
      writeBranchDocumentUseCase.execute.mockResolvedValue({
        success: true
      });
      presenter.present.mockReturnValue({
        success: true,
        data: { success: true }
      });

      // テスト対象のメソッド実行
      const result = await controller.writeDocument(
        'test-branch',
        'test.json',
        '{"test": "content"}',
        ['test']
      );

      // 検証
      expect(writeBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName: 'test-branch',
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
      writeBranchDocumentUseCase.execute.mockResolvedValue({
        success: true
      });
      presenter.present.mockReturnValue({
        success: true,
        data: { success: true }
      });

      // テスト対象のメソッド実行（tagsを省略）
      const result = await controller.writeDocument(
        'test-branch',
        'test.json',
        '{"test": "content"}'
      );

      // 検証
      expect(writeBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName: 'test-branch',
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

    it('異常系: エラーが適切に処理されること', async () => {
      // エラーをスローするように設定
      const mockError = new InfrastructureError('WRITE_FAILED', 'Failed to write document');
      writeBranchDocumentUseCase.execute.mockRejectedValue(mockError);
      presenter.presentError.mockReturnValue({
        success: false,
        error: {
          code: 'INFRA_ERROR.WRITE_FAILED',
          message: 'Failed to write document'
        }
      });

      // テスト対象のメソッド実行
      const result = await controller.writeDocument(
        'test-branch',
        'test.json',
        '{"test": "content"}',
        ['test']
      );

      // 検証
      expect(writeBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName: 'test-branch',
        document: {
          path: 'test.json',
          content: '{"test": "content"}',
          tags: ['test']
        }
      });
      expect(presenter.presentError).toHaveBeenCalledWith(mockError);
      expect(result).toEqual({
        success: false,
        error: {
          code: 'INFRA_ERROR.WRITE_FAILED',
          message: 'Failed to write document'
        }
      });
    });
  });

  describe('readCoreFiles', () => {
    it('正常系: コアファイルが正常に読み込まれること', async () => {
      // モックの戻り値を設定
      const mockCoreFiles = {
        activeContext: { currentWork: 'test work' },
        progress: { status: 'in-progress' },
        systemPatterns: { technicalDecisions: [] }
      };
      readBranchCoreFilesUseCase.execute.mockResolvedValue({
        files: mockCoreFiles
      });

      // readBranchDocumentUseCaseの戻り値も設定（branchContextファイル用）
      readBranchDocumentUseCase.execute.mockResolvedValue({
        document: {
          path: 'branchContext.json',
          content: '{"branchName": "test-branch"}',
          tags: ['core', 'branch-context'],
          lastModified: '2025-03-28T00:00:00Z'
        }
      });

      // presenterの戻り値を設定
      presenter.present.mockImplementation(data => ({
        success: true,
        data
      }));

      // テスト対象のメソッド実行
      const result = await controller.readCoreFiles('test-branch');

      // 検証
      expect(readBranchCoreFilesUseCase.execute).toHaveBeenCalledWith({
        branchName: 'test-branch'
      });
      expect(readBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName: 'test-branch',
        path: 'branchContext.json'
      });

      // 結果にはJSONファイルとして文字列化されたオブジェクトが含まれているはず
      expect(result.success).toBe(true);
      expect(Object.keys(result.data)).toContain('activeContext.json');
      expect(Object.keys(result.data)).toContain('progress.json');
      expect(Object.keys(result.data)).toContain('systemPatterns.json');
      expect(Object.keys(result.data)).toContain('branchContext.json');
    });

    it('異常系: branchContextファイルの読み込みに失敗した場合も他のファイルは返されること', async () => {
      // モックの戻り値を設定
      const mockCoreFiles = {
        activeContext: { currentWork: 'test work' },
        progress: { status: 'in-progress' },
        systemPatterns: { technicalDecisions: [] }
      };
      readBranchCoreFilesUseCase.execute.mockResolvedValue({
        files: mockCoreFiles
      });

      // readBranchDocumentUseCaseがエラーをスローするように設定
      readBranchDocumentUseCase.execute.mockRejectedValue(
        new DomainError('NOT_FOUND', 'branchContext.json not found')
      );

      // presenterの戻り値を設定
      presenter.present.mockImplementation(data => ({
        success: true,
        data
      }));

      // テスト対象のメソッド実行
      const result = await controller.readCoreFiles('test-branch');

      // 検証
      expect(readBranchCoreFilesUseCase.execute).toHaveBeenCalledWith({
        branchName: 'test-branch'
      });
      expect(readBranchDocumentUseCase.execute).toHaveBeenCalledWith({
        branchName: 'test-branch',
        path: 'branchContext.json'
      });

      // branchContext.jsonは含まれていないはず
      expect(result.success).toBe(true);
      expect(Object.keys(result.data)).toContain('activeContext.json');
      expect(Object.keys(result.data)).toContain('progress.json');
      expect(Object.keys(result.data)).toContain('systemPatterns.json');
      expect(Object.keys(result.data)).not.toContain('branchContext.json');
    });
  });

  describe('writeCoreFiles', () => {
    it('正常系: コアファイルが正常に書き込まれること', async () => {
      // モックの入力データ
      const mockInputFiles = {
        'activeContext.json': { currentWork: 'test work' },
        'progress.json': { status: 'in-progress' },
        'systemPatterns.json': { technicalDecisions: [] }
      };

      // モックの戻り値を設定
      createBranchCoreFilesUseCase.execute.mockResolvedValue({
        success: true
      });
      presenter.present.mockReturnValue({
        success: true,
        data: { success: true }
      });

      // テスト対象のメソッド実行
      const result = await controller.writeCoreFiles('test-branch', mockInputFiles);

      // 検証
      expect(createBranchCoreFilesUseCase.execute).toHaveBeenCalledWith({
        branchName: 'test-branch',
        files: {
          activeContext: { currentWork: 'test work' },
          progress: { status: 'in-progress' },
          systemPatterns: { technicalDecisions: [] }
        }
      });
      expect(presenter.present).toHaveBeenCalledWith({ success: true });
      expect(result).toEqual({
        success: true,
        data: { success: true }
      });
    });

    it('異常系: 入力が不正な場合はエラーになること', async () => {
      // プレゼンターのエラー出力をモック
      presenter.presentError.mockReturnValue({
        success: false,
        error: {
          code: 'DOMAIN_ERROR.VALIDATION_ERROR',
          message: 'Files must be provided as an object'
        }
      });

      // テスト対象のメソッド実行（nullを渡す）
      const result = await controller.writeCoreFiles('test-branch', null as any);

      // 検証
      expect(createBranchCoreFilesUseCase.execute).not.toHaveBeenCalled();
      expect(presenter.presentError).toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: {
          code: 'DOMAIN_ERROR.VALIDATION_ERROR',
          message: 'Files must be provided as an object'
        }
      });
    });
  });

  describe('getRecentBranches', () => {
    it('正常系: 最近のブランチリストが取得できること', async () => {
      // モックの戻り値を設定
      const mockBranches = ['branch1', 'branch2', 'branch3'];
      getRecentBranchesUseCase.execute.mockResolvedValue({
        branches: mockBranches
      });
      presenter.present.mockReturnValue({
        success: true,
        data: mockBranches
      });

      // テスト対象のメソッド実行
      const result = await controller.getRecentBranches(3);

      // 検証
      expect(getRecentBranchesUseCase.execute).toHaveBeenCalledWith({
        limit: 3
      });
      expect(presenter.present).toHaveBeenCalledWith(mockBranches);
      expect(result).toEqual({
        success: true,
        data: mockBranches
      });
    });

    it('正常系: limitパラメータが省略された場合、デフォルト値(10)が使用されること', async () => {
      // モックの戻り値を設定
      const mockBranches = ['branch1', 'branch2', 'branch3'];
      getRecentBranchesUseCase.execute.mockResolvedValue({
        branches: mockBranches
      });
      presenter.present.mockReturnValue({
        success: true,
        data: mockBranches
      });

      // テスト対象のメソッド実行（limitパラメータを省略）
      const result = await controller.getRecentBranches();

      // 検証
      expect(getRecentBranchesUseCase.execute).toHaveBeenCalledWith({
        limit: 10 // デフォルト値
      });
      expect(presenter.present).toHaveBeenCalledWith(mockBranches);
      expect(result).toEqual({
        success: true,
        data: mockBranches
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
      const result = await controller.findDocumentsByTags('test-branch', ['test'], true);

      // 検証
      expect(searchDocumentsByTagsUseCase.execute).toHaveBeenCalledWith({
        branchName: 'test-branch',
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

  // この後もメソッドごとに同様のテストを追加していく...
});
