import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
import { WriteBranchDocumentUseCase } from '../../../../../src/application/usecases/branch/WriteBranchDocumentUseCase.js'; // .js 追加
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository.js'; // .js 追加
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js'; // .js 追加
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument.js'; // .js 追加
import { Tag } from '../../../../../src/domain/entities/Tag.js'; // .js 追加
import type { IGitService } from '../../../../../src/infrastructure/git/IGitService.js'; // .js 追加
import type { IConfigProvider } from '../../../../../src/infrastructure/config/interfaces/IConfigProvider.js'; // .js 追加
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js'; // .js 追加
import { ApplicationError, ApplicationErrors } from '../../../../../src/shared/errors/index.js'; // ApplicationError を追加

// --- モックの準備 ---
// jest.Mocked と satisfies を削除し、手動モックの型を指定
const mockBranchRepository: IBranchMemoryBankRepository = {
  exists: vi.fn(), // jest -> vi
  initialize: vi.fn(), // jest -> vi
  getDocument: vi.fn(), // jest -> vi
  saveDocument: vi.fn(), // jest -> vi
  deleteDocument: vi.fn(), // jest -> vi
  listDocuments: vi.fn(), // jest -> vi
  findDocumentsByTags: vi.fn(), // jest -> vi
  getRecentBranches: vi.fn(), // jest -> vi
  validateStructure: vi.fn(), // jest -> vi
  saveTagIndex: vi.fn(), // jest -> vi
  getTagIndex: vi.fn(), // jest -> vi
  findDocumentPathsByTagsUsingIndex: vi.fn(), // jest -> vi
};

// jest.Mocked と satisfies を削除し、手動モックの型を指定

// jest.Mocked と satisfies を削除し、手動モックの型を指定

// jest.Mocked と satisfies を削除し、手動モックの型を指定

// jest.Mocked を削除し、手動モックの型を指定
const mockGitService: IGitService = {
  getCurrentBranchName: vi.fn(), // jest -> vi
};

// jest.Mocked を削除し、手動モックの型を指定
const mockConfigProvider: IConfigProvider = {
  initialize: vi.fn(), // jest -> vi
  getConfig: vi.fn(), // jest -> vi
  getGlobalMemoryPath: vi.fn(), // jest -> vi
  getBranchMemoryPath: vi.fn(), // jest -> vi
  getLanguage: vi.fn(), // jest -> vi
};

// UpdateTagIndexUseCaseV2 のモック (execute のみモック)

// DocumentWriterService のモック (write メソッドのみ)
const mockDocumentWriterService = {
  write: vi.fn(), // jest -> vi
  // patchService は DocumentWriterService のコンストラクタ引数なので、
  // UseCase のテストでは直接モックする必要はないことが多い。
  // UseCase が内部で patchService を直接使っている場合は必要。
  // 今回は DocumentWriterService の write をモックするので不要と判断。
};
// --- モックの準備ここまで ---
// --- モックの準備ここまで ---


describe('WriteBranchDocumentUseCase', () => {
  let useCase: WriteBranchDocumentUseCase;

  beforeEach(() => {
    vi.clearAllMocks(); // jest -> vi
    // WriteBranchDocumentUseCase のインスタンス化 (正しい引数で)
    useCase = new WriteBranchDocumentUseCase(
      mockBranchRepository,
      mockDocumentWriterService as any, // private プロパティのエラー回避のため as any を使用
      mockGitService,
      mockConfigProvider
    );
  });

  describe('execute', () => {
    it('新しいドキュメントを content で作成できること', async () => {
      const branchName = 'feature/new-doc';
      const docPath = DocumentPath.create('newDoc.txt');
      const content = 'This is a new document.';
      const tags = [Tag.create('new'), Tag.create('test')];
      const branchInfo = BranchInfo.create(branchName); // BranchInfo を使う
      const documentInput = { path: docPath.value, content, tags: tags.map(t => t.value) };
      const expectedSavedDoc = MemoryDocument.create({ path: docPath, content, tags, lastModified: new Date() });

      // モックの設定
      (mockGitService.getCurrentBranchName as Mock).mockResolvedValue(branchName); // as Mock 追加
      (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`); // as Mock 追加
      (mockBranchRepository.exists as Mock).mockResolvedValue(false); // as Mock 追加
      (mockBranchRepository.initialize as Mock).mockResolvedValue(undefined); // as Mock 追加
      // documentWriterService.write は、渡されたリポジトリアダプタ経由で saveDocument を呼ぶはず
      // ここでは write が成功し、保存されたドキュメントを返すようにモック
      (mockDocumentWriterService.write as Mock).mockResolvedValue(expectedSavedDoc); // as Mock 追加

      // 実行
      const result = await useCase.execute({ branchName, document: documentInput, returnContent: true });

      // 検証
      expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName);
      expect(mockBranchRepository.initialize).toHaveBeenCalledWith(branchInfo);
      expect(mockDocumentWriterService.write).toHaveBeenCalledWith(
        expect.objectContaining({ // リポジトリアダプタの検証 (部分的に)
          // getDocument: expect.any(Function), // 必要なら追加
          saveDocument: expect.any(Function),
        }),
        expect.objectContaining({ // writerInput の検証
          path: docPath,
          content: content,
          patches: undefined, // content を指定したので patches は undefined
          tags: expect.arrayContaining(tags),
        })
      );
      expect(result.document.path).toBe(docPath.value);
      expect(result.document.content).toBe(content);
      expect(result.document.tags).toEqual(tags.map(t => t.value));
      expect(result.document.lastModified).toBeDefined(); // lastModified があることを確認
    });
    it('既存のドキュメントを content で上書きできること', async () => {
      const branchName = 'feature/existing-doc';
      const docPath = DocumentPath.create('existingDoc.txt');
      const existingContent = 'This is the original content.';
      const newContent = 'This is the updated content.';
      const tags = [Tag.create('update'), Tag.create('test')];
      const branchInfo = BranchInfo.create(branchName);
      const existingDoc = MemoryDocument.create({ path: docPath, content: existingContent, tags: [Tag.create('original')], lastModified: new Date(Date.now() - 10000) }); // 少し前の日付
      const documentInput = { path: docPath.value, content: newContent, tags: tags.map(t => t.value) };
      const expectedSavedDoc = existingDoc.updateContent(newContent).updateTags(tags); // 上書きされたドキュメント

      // モックの設定
      (mockGitService.getCurrentBranchName as Mock).mockResolvedValue(branchName); // as Mock 追加
      (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`); // as Mock 追加
      (mockBranchRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
      // documentWriterService.write は既存ドキュメントを内部で取得し、更新して保存する
      (mockDocumentWriterService.write as Mock).mockResolvedValue(expectedSavedDoc); // as Mock 追加

      // 実行
      const result = await useCase.execute({ branchName, document: documentInput, returnContent: true });

      // 検証
      expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName);
      expect(mockBranchRepository.initialize).not.toHaveBeenCalled(); // 初期化は呼ばれない
      expect(mockDocumentWriterService.write).toHaveBeenCalledWith(
        expect.objectContaining({ saveDocument: expect.any(Function) }), // リポジトリアダプタ
        expect.objectContaining({ // writerInput
          path: docPath,
          content: newContent,
          patches: undefined,
          tags: expect.arrayContaining(tags),
        })
      );
      expect(result.document.path).toBe(docPath.value);
      expect(result.document.content).toBe(newContent); // 内容が更新されている
      expect(result.document.tags).toEqual(tags.map(t => t.value)); // タグが更新されている
      // lastModified が更新されていることを確認 (厳密な比較は難しいので存在確認)
      expect(result.document.lastModified).toBeDefined();
      // expect(new Date(result.document.lastModified)).toBeGreaterThan(existingDoc.lastModified); // 必要なら日付比較
    });
    it('既存のドキュメントを patches で更新できること', async () => {
      const branchName = 'feature/patch-doc';
      const docPath = DocumentPath.create('data.json');
      const existingContent = JSON.stringify({ name: 'old name', value: 10 });
      const patches = [{ op: 'replace', path: '/name', value: 'new name' }];
      const expectedPatchedContent = JSON.stringify({ name: 'new name', value: 10 }, null, 2); // write 内で整形される想定
      const tags = [Tag.create('patch'), Tag.create('json')];
      const branchInfo = BranchInfo.create(branchName);
      const existingDoc = MemoryDocument.create({ path: docPath, content: existingContent, tags: [], lastModified: new Date() });
      const documentInput = { path: docPath.value }; // content は含めない
      const expectedSavedDoc = existingDoc.updateContent(expectedPatchedContent).updateTags(tags); // パッチ適用後のドキュメント

      // モックの設定
      (mockGitService.getCurrentBranchName as Mock).mockResolvedValue(branchName); // as Mock 追加
      (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`); // as Mock 追加
      (mockBranchRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
      // documentWriterService.write がパッチ適用後のドキュメントを返すようにモック
      (mockDocumentWriterService.write as Mock).mockResolvedValue(expectedSavedDoc); // as Mock 追加

      // 実行
      const result = await useCase.execute({ branchName, document: documentInput, patches, returnContent: true }); // patches を渡す

      // 検証
      expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName);
      expect(mockBranchRepository.initialize).not.toHaveBeenCalled();
      expect(mockDocumentWriterService.write).toHaveBeenCalledWith(
        expect.objectContaining({ saveDocument: expect.any(Function) }), // リポジトリアダプタ
        expect.objectContaining({ // writerInput
          path: docPath,
          content: undefined, // patches を指定したので content は undefined
          patches: patches, // patches が渡されている
          tags: expect.arrayContaining([]), // tags が指定されない場合は空配列が渡されるはず
        })
      );
      expect(result.document.path).toBe(docPath.value);
      expect(result.document.content).toBe(expectedPatchedContent); // 内容がパッチ適用されている
      expect(result.document.tags).toEqual(tags.map(t => t.value)); // write が返したタグ
      expect(result.document.lastModified).toBeDefined();
    });
    it('content と tags を指定してドキュメントを作成/上書きできること', async () => {
      const branchName = 'feature/content-tags';
      const docPath = DocumentPath.create('docWithTags.md');
      const existingContent = '# Old Title';
      const newContent = '# New Title';
      const existingTags = [Tag.create('old')];
      const newTags = [Tag.create('new'), Tag.create('markdown')];
      const branchInfo = BranchInfo.create(branchName);
      const existingDoc = MemoryDocument.create({ path: docPath, content: existingContent, tags: existingTags, lastModified: new Date() });
      // 入力には tags を含める
      const documentInput = { path: docPath.value, content: newContent, tags: newTags.map(t => t.value) };
      const expectedSavedDoc = existingDoc.updateContent(newContent).updateTags(newTags); // content と tags が更新されたドキュメント

      // モックの設定
      (mockGitService.getCurrentBranchName as Mock).mockResolvedValue(branchName); // as Mock 追加
      (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`); // as Mock 追加
      (mockBranchRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
      // write が更新されたドキュメントを返すようにモック
      (mockDocumentWriterService.write as Mock).mockResolvedValue(expectedSavedDoc); // as Mock 追加

      // 実行
      const result = await useCase.execute({ branchName, document: documentInput, returnContent: true });

      // 検証
      expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName);
      expect(mockBranchRepository.initialize).not.toHaveBeenCalled();
      expect(mockDocumentWriterService.write).toHaveBeenCalledWith(
        expect.objectContaining({ saveDocument: expect.any(Function) }),
        expect.objectContaining({ // writerInput の検証
          path: docPath,
          content: newContent,
          patches: undefined,
          tags: expect.arrayContaining(newTags), // newTags が渡されている
        })
      );
      expect(result.document.path).toBe(docPath.value);
      expect(result.document.content).toBe(newContent);
      expect(result.document.tags).toEqual(newTags.map(t => t.value)); // タグが更新されている
      expect(result.document.lastModified).toBeDefined();
    });
    it('patches と tags を指定してドキュメントを更新できること', async () => {
      const branchName = 'feature/patch-tags';
      const docPath = DocumentPath.create('patchTags.json');
      const existingContent = JSON.stringify({ value: 1, status: 'old' });
      const patches = [{ op: 'replace', path: '/status', value: 'new' }];
      const existingTags = [Tag.create('initial')];
      const newTags = [Tag.create('patched'), Tag.create('final')];
      const expectedPatchedContent = JSON.stringify({ value: 1, status: 'new' }, null, 2);
      const branchInfo = BranchInfo.create(branchName);
      const existingDoc = MemoryDocument.create({ path: docPath, content: existingContent, tags: existingTags, lastModified: new Date() });
      // 入力には path と tags を含める (content は含めない)
      const documentInput = { path: docPath.value, tags: newTags.map(t => t.value) };
      const expectedSavedDoc = existingDoc.updateContent(expectedPatchedContent).updateTags(newTags); // content と tags が更新されたドキュメント

      // モックの設定
      (mockGitService.getCurrentBranchName as Mock).mockResolvedValue(branchName); // as Mock 追加
      (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`); // as Mock 追加
      (mockBranchRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
      // write が更新されたドキュメントを返すようにモック
      (mockDocumentWriterService.write as Mock).mockResolvedValue(expectedSavedDoc); // as Mock 追加

      // 実行 (patches と document.tags を両方渡す)
      const result = await useCase.execute({ branchName, document: documentInput, patches, returnContent: true });

      // 検証
      expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName);
      expect(mockBranchRepository.initialize).not.toHaveBeenCalled();
      expect(mockDocumentWriterService.write).toHaveBeenCalledWith(
        expect.objectContaining({ saveDocument: expect.any(Function) }),
        expect.objectContaining({ // writerInput の検証
          path: docPath,
          content: undefined, // patches を指定したので content は undefined
          patches: patches, // patches が渡されている
          tags: expect.arrayContaining(newTags), // newTags が渡されている
        })
      );
      expect(result.document.path).toBe(docPath.value);
      expect(result.document.content).toBe(expectedPatchedContent); // 内容がパッチ適用されている
      expect(result.document.tags).toEqual(newTags.map(t => t.value)); // タグが更新されている
      expect(result.document.lastModified).toBeDefined();
    });

    it('ブランチ名が指定されない場合に自動検出されること (プロジェクトモード)', async () => {
      const detectedBranchName = 'feature/auto-detect'; // Gitから検出される想定のブランチ名
      const docPath = DocumentPath.create('autoDetect.txt');
      const content = 'Content for auto-detected branch.';
      const branchInfo = BranchInfo.create(detectedBranchName);
      const documentInput = { path: docPath.value, content };
      const expectedSavedDoc = MemoryDocument.create({ path: docPath, content, tags: [], lastModified: new Date() });

      // モックの設定
      (mockConfigProvider.getConfig as Mock).mockReturnValue({ isProjectMode: true, language: 'en', docsRoot: '/mock/docs', verbose: false }); // as Mock 追加
      (mockGitService.getCurrentBranchName as Mock).mockResolvedValue(detectedBranchName); // as Mock 追加
      (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${detectedBranchName}`); // as Mock 追加
      (mockBranchRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
      (mockDocumentWriterService.write as Mock).mockResolvedValue(expectedSavedDoc); // as Mock 追加

      // 実行 (branchName を省略)
      const result = await useCase.execute({ document: documentInput });

      // 検証
      expect(mockConfigProvider.getConfig).toHaveBeenCalled(); // 設定が読み込まれたか
      expect(mockGitService.getCurrentBranchName).toHaveBeenCalled(); // Gitからブランチ名を取得したか
      expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName); // 検出されたブランチ名でチェック
      expect(mockDocumentWriterService.write).toHaveBeenCalledWith(
        expect.objectContaining({ saveDocument: expect.any(Function) }),
        expect.objectContaining({ path: docPath, content })
      );
      expect(result.document.path).toBe(docPath.value);
    });
    it('ブランチ名が指定されない場合にエラーが発生すること (非プロジェクトモード)', async () => {
      const docPath = DocumentPath.create('someDoc.txt');
      const content = 'Some content.';
      const documentInput = { path: docPath.value, content };
      const expectedError = ApplicationErrors.invalidInput('Branch name is required when not running in project mode.');

      // モックの設定
      (mockConfigProvider.getConfig as Mock).mockReturnValue({ isProjectMode: false, language: 'en', docsRoot: '/mock/docs', verbose: false }); // as Mock 追加

      // 実行＆検証 (branchName を省略)
      try {
        await useCase.execute({ document: documentInput });
        throw new Error('Expected ApplicationError but no error was thrown.');
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect((error as ApplicationError).message).toBe(expectedError.message);
        expect((error as ApplicationError).code).toBe(expectedError.code);
      }

      // 検証
      expect(mockConfigProvider.getConfig).toHaveBeenCalled();
      expect(mockGitService.getCurrentBranchName).not.toHaveBeenCalled(); // Gitからは取得しないはず
      expect(mockBranchRepository.exists).not.toHaveBeenCalled(); // ブランチチェックもしないはず
      expect(mockDocumentWriterService.write).not.toHaveBeenCalled(); // 書き込みもしないはず
    });

    it('必須パラメータ (path) が不足している場合にエラーが発生すること', async () => {
      const branchName = 'feature/missing-path';
      // documentInput から path を意図的に除外
      const documentInput = { content: 'Some content' } as any; // path がないので any でキャスト
      const expectedError = ApplicationErrors.invalidInput('Document path is required');

      // モックの設定 (branchName は指定するが、他は呼ばれないはず)
      (mockGitService.getCurrentBranchName as Mock).mockResolvedValue(branchName); // as Mock 追加
      (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`); // as Mock 追加

      // 実行＆検証
      // Check only code and message using toMatchObject
      await expect(useCase.execute({ branchName, document: documentInput }))
        .rejects.toThrow(expect.objectContaining({
          code: ApplicationErrors.invalidInput('').code, // Get code from factory
          message: 'Document path is required',
        }));

      // 検証 (主要な処理が呼ばれていないことを確認)
      expect(mockBranchRepository.exists).not.toHaveBeenCalled();
      expect(mockDocumentWriterService.write).not.toHaveBeenCalled();
    });
    it('content と patches が同時に指定された場合にエラーが発生すること', async () => {
      const branchName = 'feature/content-and-patches';
      const docPath = DocumentPath.create('invalid.json');
      const content = '{"key":"value"}';
      const patches = [{ op: 'add', path: '/newKey', value: 'newValue' }];
      const documentInput = { path: docPath.value, content }; // content を含む
      const expectedError = ApplicationErrors.invalidInput('Cannot provide both document content and patches simultaneously');

      // モックの設定 (branchName は指定するが、他は呼ばれないはず)
      (mockGitService.getCurrentBranchName as Mock).mockResolvedValue(branchName); // as Mock 追加
      (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`); // as Mock 追加

      // 実行＆検証 (content と patches を両方渡す)
      await expect(useCase.execute({ branchName, document: documentInput, patches }))
        .rejects.toThrow(expectedError);

      // 検証 (主要な処理が呼ばれていないことを確認)
      expect(mockBranchRepository.exists).not.toHaveBeenCalled();
      expect(mockDocumentWriterService.write).not.toHaveBeenCalled();
    });
    it('patches が指定されたが、対象ドキュメントがJSONでない場合にエラーが発生すること', async () => {
      const branchName = 'feature/patch-non-json';
      const docPath = DocumentPath.create('notJson.txt');
      const patches = [{ op: 'add', path: '/someKey', value: 'someValue' }];
      const documentInput = { path: docPath.value };
      // DocumentWriterService内でJSONパースエラーが起きることを想定
      const expectedError = ApplicationErrors.executionFailed('Failed to parse existing document content as JSON for patching'); // エラーメッセージは内部実装に依存する可能性あり

      // モックの設定
      (mockGitService.getCurrentBranchName as Mock).mockResolvedValue(branchName); // as Mock 追加
      (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`); // as Mock 追加
      (mockBranchRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
      // DocumentWriterService.write がエラーを投げるように設定
      // (実際には write の内部で getDocument してパースしようとして失敗する)
      (mockDocumentWriterService.write as Mock).mockRejectedValue(expectedError); // as Mock 追加

      // 実行＆検証
      await expect(useCase.execute({ branchName, document: documentInput, patches }))
        .rejects.toThrow(expectedError);

      // 検証 (write が呼ばれたことを確認)
      expect(mockDocumentWriterService.write).toHaveBeenCalledWith(
        expect.anything(), // リポジトリアダプタ
        expect.objectContaining({ path: docPath, patches }) // writerInput
      );
      // saveDocument は呼ばれないはず
      // (write の中でエラーになるため)
    });
    it('patches が指定されたが、対象ドキュメントが存在しない場合にエラーが発生すること', async () => {
      const branchName = 'feature/patch-non-existent';
      const docPath = DocumentPath.create('nonExistent.json');
      const patches = [{ op: 'add', path: '/key', value: 'value' }];
      const documentInput = { path: docPath.value };
      // DocumentWriterService内で getDocument が null を返し、notFound エラーになることを想定
      const expectedError = ApplicationErrors.notFound('Document', docPath.value, { message: 'Cannot apply patches to non-existent document.' });

      // モックの設定
      (mockGitService.getCurrentBranchName as Mock).mockResolvedValue(branchName); // as Mock 追加
      (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`); // as Mock 追加
      (mockBranchRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
      // DocumentWriterService.write がエラーを投げるように設定
      // (実際には write の内部で getDocument して null が返り、エラーになる)
      (mockDocumentWriterService.write as Mock).mockRejectedValue(expectedError); // as Mock 追加

      // 実行＆検証
      await expect(useCase.execute({ branchName, document: documentInput, patches }))
        .rejects.toThrow(expectedError);

      // 検証 (write が呼ばれたことを確認)
      expect(mockDocumentWriterService.write).toHaveBeenCalledWith(
        expect.anything(), // リポジトリアダプタ
        expect.objectContaining({ path: docPath, patches }) // writerInput
      );
    });

    it('存在しないブランチに書き込もうとした場合にエラーが発生すること', async () => {
      const branchName = 'feature/non-existent-branch';
      const docPath = DocumentPath.create('someDoc.txt');
      const content = 'Content for non-existent branch.';
      const documentInput = { path: docPath.value, content };
      const branchInfo = BranchInfo.create(branchName);
      const initializationError = new Error('Failed to initialize branch storage');
      // ApplicationErrors.branchInitializationFailed を期待する
      const expectedError = ApplicationErrors.branchInitializationFailed(branchName, initializationError);

      // モックの設定
      (mockGitService.getCurrentBranchName as Mock).mockResolvedValue(branchName); // as Mock 追加
      (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`); // as Mock 追加
      (mockBranchRepository.exists as Mock).mockResolvedValue(false); // as Mock 追加
      (mockBranchRepository.initialize as Mock).mockRejectedValue(initializationError); // as Mock 追加

      // 実行＆検証
      // エラーオブジェクト全体ではなく、code と message で比較
      await expect(useCase.execute({ branchName, document: documentInput }))
        .rejects.toMatchObject({ code: expectedError.code, message: expectedError.message });

      // 検証
      expect(mockBranchRepository.exists).toHaveBeenCalledWith(branchInfo.safeName);
      expect(mockBranchRepository.initialize).toHaveBeenCalledWith(branchInfo); // initialize は呼ばれるが失敗する
      expect(mockDocumentWriterService.write).not.toHaveBeenCalled(); // write は呼ばれない
    });
    it('リポジトリ (saveDocument) でエラーが発生した場合にエラーが伝播すること', async () => {
      const branchName = 'feature/repo-save-error';
      const docPath = DocumentPath.create('saveError.txt');
      const content = 'This content will fail to save.';
      const documentInput = { path: docPath.value, content };
      BranchInfo.create(branchName);
      const repositoryError = new Error('Disk full or permission denied'); // リポジトリ層のエラー
      // DocumentWriterService.write が内部で saveDocument を呼び出し、それが失敗するケース
      const expectedError = ApplicationErrors.executionFailed(`Unexpected error: ${repositoryError.message}`, repositoryError); // UseCase がラップして返すエラー

      // モックの設定
      (mockGitService.getCurrentBranchName as Mock).mockResolvedValue(branchName); // as Mock 追加
      (mockConfigProvider.getBranchMemoryPath as Mock).mockReturnValue(`/mock/path/to/${branchName}`); // as Mock 追加
      (mockBranchRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
      // DocumentWriterService.write がリポジトリのエラーをそのまま投げるか、ラップして投げるかを確認
      // ここでは write がエラーを投げるように設定
      (mockDocumentWriterService.write as Mock).mockRejectedValue(expectedError); // as Mock 追加

      // 実行＆検証
      await expect(useCase.execute({ branchName, document: documentInput }))
        .rejects.toThrow(expectedError);

      // 検証 (write が呼ばれたことを確認)
      expect(mockDocumentWriterService.write).toHaveBeenCalledWith(
        expect.anything(), // リポジトリアダプタ
        expect.objectContaining({ path: docPath, content }) // writerInput
      );
    });
    it.todo('タグ更新 (UpdateTagIndexUseCase) でエラーが発生した場合にエラーが伝播すること');
    it.todo('JSON Patch適用 (JsonPatchService) でエラーが発生した場合にエラーが伝播すること');
  });
});
