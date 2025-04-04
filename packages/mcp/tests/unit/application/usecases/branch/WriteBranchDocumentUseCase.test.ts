import { WriteBranchDocumentUseCase } from '../../../../../src/application/usecases/branch/WriteBranchDocumentUseCase';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository';
import { IGlobalMemoryBankRepository } from '../../../../../src/domain/repositories/IGlobalMemoryBankRepository'; // TagIndex更新で使うかも
import { IDocumentRepository } from '../../../../../src/domain/repositories/IDocumentRepository'; // TagIndex更新で使うかも
import { JsonPatchService } from '../../../../../src/domain/jsonpatch/JsonPatchService'; // Patch適用で使うかも
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath';
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument';
import { Tag } from '../../../../../src/domain/entities/Tag';
import type { IGitService } from '../../../../../src/infrastructure/git/IGitService';
import type { IConfigProvider } from '../../../../../src/infrastructure/config/interfaces/IConfigProvider';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo'; // BranchInfo をインポート
import { UpdateTagIndexUseCaseV2 } from '../../../../../src/application/usecases/common/UpdateTagIndexUseCaseV2'; // 内部で使ってる可能性
import { DocumentWriterService } from '../../../../../src/application/services/DocumentWriterService'; // 内部で使ってる可能性
import { DomainErrors } from '../../../../../src/shared/errors'; // 必要に応じてコメント解除
import { ApplicationErrors } from '../../../../../src/shared/errors'; // 必要に応じてコメント解除

// --- モックの準備 ---
const mockBranchRepository = {
  exists: jest.fn(),
  initialize: jest.fn(),
  getDocument: jest.fn(),
  saveDocument: jest.fn(),
  deleteDocument: jest.fn(),
  listDocuments: jest.fn(),
  findDocumentsByTags: jest.fn(),
  getRecentBranches: jest.fn(),
  validateStructure: jest.fn(),
  saveTagIndex: jest.fn(),
  getTagIndex: jest.fn(),
  findDocumentPathsByTagsUsingIndex: jest.fn(),
} satisfies jest.Mocked<IBranchMemoryBankRepository>;

const mockGlobalRepository = { // 追加
  // 必要なメソッドをモック化
} satisfies Partial<jest.Mocked<IGlobalMemoryBankRepository>>;

const mockDocumentRepository = { // 追加
  // 必要なメソッドをモック化
} satisfies Partial<jest.Mocked<IDocumentRepository>>;

const mockJsonPatchService = { // 追加
  apply: jest.fn(),
  validate: jest.fn(),
  generatePatch: jest.fn(),
} satisfies jest.Mocked<JsonPatchService>;

const mockGitService: jest.Mocked<IGitService> = {
  getCurrentBranchName: jest.fn(),
};

const mockConfigProvider: jest.Mocked<IConfigProvider> = {
  initialize: jest.fn(),
  getConfig: jest.fn(),
  getGlobalMemoryPath: jest.fn(),
  getBranchMemoryPath: jest.fn(),
  getLanguage: jest.fn(),
};

// UpdateTagIndexUseCaseV2 のモック (execute のみモック)
const mockUpdateTagIndexUseCase = {
  execute: jest.fn(),
};

// DocumentWriterService のモック (write メソッドのみ)
const mockDocumentWriterService = {
  write: jest.fn(),
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
    jest.clearAllMocks();
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
      mockGitService.getCurrentBranchName.mockResolvedValue(branchName);
      mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`);
      mockBranchRepository.exists.mockResolvedValue(false); // ブランチは存在しない
      mockBranchRepository.initialize.mockResolvedValue(undefined); // 初期化は成功
      // documentWriterService.write は、渡されたリポジトリアダプタ経由で saveDocument を呼ぶはず
      // ここでは write が成功し、保存されたドキュメントを返すようにモック
      mockDocumentWriterService.write.mockResolvedValue(expectedSavedDoc);

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
      mockGitService.getCurrentBranchName.mockResolvedValue(branchName);
      mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`);
      mockBranchRepository.exists.mockResolvedValue(true); // ブランチは存在する
      // documentWriterService.write は既存ドキュメントを内部で取得し、更新して保存する
      mockDocumentWriterService.write.mockResolvedValue(expectedSavedDoc); // 更新されたドキュメントを返す

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
      mockGitService.getCurrentBranchName.mockResolvedValue(branchName);
      mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`);
      mockBranchRepository.exists.mockResolvedValue(true); // ブランチは存在する
      // documentWriterService.write がパッチ適用後のドキュメントを返すようにモック
      mockDocumentWriterService.write.mockResolvedValue(expectedSavedDoc);

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
      mockGitService.getCurrentBranchName.mockResolvedValue(branchName);
      mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`);
      mockBranchRepository.exists.mockResolvedValue(true);
      // write が更新されたドキュメントを返すようにモック
      mockDocumentWriterService.write.mockResolvedValue(expectedSavedDoc);

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
      mockGitService.getCurrentBranchName.mockResolvedValue(branchName);
      mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`);
      mockBranchRepository.exists.mockResolvedValue(true);
      // write が更新されたドキュメントを返すようにモック
      mockDocumentWriterService.write.mockResolvedValue(expectedSavedDoc);

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
      mockConfigProvider.getConfig.mockReturnValue({ isProjectMode: true, language: 'en', docsRoot: '/mock/docs', verbose: false }); // docsRoot と verbose を追加
      mockGitService.getCurrentBranchName.mockResolvedValue(detectedBranchName); // Gitがブランチ名を返す
      mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${detectedBranchName}`);
      mockBranchRepository.exists.mockResolvedValue(true); // ブランチは存在する想定
      mockDocumentWriterService.write.mockResolvedValue(expectedSavedDoc);

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
      mockConfigProvider.getConfig.mockReturnValue({ isProjectMode: false, language: 'en', docsRoot: '/mock/docs', verbose: false }); // プロジェクトモードOFF

      // 実行＆検証 (branchName を省略)
      await expect(useCase.execute({ document: documentInput }))
        .rejects.toThrow(expectedError);

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
      mockGitService.getCurrentBranchName.mockResolvedValue(branchName);
      mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`);

      // 実行＆検証
      await expect(useCase.execute({ branchName, document: documentInput }))
        .rejects.toThrow(expectedError);

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
      mockGitService.getCurrentBranchName.mockResolvedValue(branchName);
      mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`);

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
      mockGitService.getCurrentBranchName.mockResolvedValue(branchName);
      mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`);
      mockBranchRepository.exists.mockResolvedValue(true); // ブランチは存在する
      // DocumentWriterService.write がエラーを投げるように設定
      // (実際には write の内部で getDocument してパースしようとして失敗する)
      mockDocumentWriterService.write.mockRejectedValue(expectedError);

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
      mockGitService.getCurrentBranchName.mockResolvedValue(branchName);
      mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`);
      mockBranchRepository.exists.mockResolvedValue(true); // ブランチは存在する
      // DocumentWriterService.write がエラーを投げるように設定
      // (実際には write の内部で getDocument して null が返り、エラーになる)
      mockDocumentWriterService.write.mockRejectedValue(expectedError);

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
      mockGitService.getCurrentBranchName.mockResolvedValue(branchName); // branchName は指定されている
      mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`);
      mockBranchRepository.exists.mockResolvedValue(false); // ブランチは存在しない
      mockBranchRepository.initialize.mockRejectedValue(initializationError); // ブランチ初期化が失敗する

      // 実行＆検証
      await expect(useCase.execute({ branchName, document: documentInput }))
        .rejects.toThrow(expectedError);

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
      const branchInfo = BranchInfo.create(branchName);
      const repositoryError = new Error('Disk full or permission denied'); // リポジトリ層のエラー
      // DocumentWriterService.write が内部で saveDocument を呼び出し、それが失敗するケース
      const expectedError = ApplicationErrors.executionFailed(`Unexpected error: ${repositoryError.message}`, repositoryError); // UseCase がラップして返すエラー

      // モックの設定
      mockGitService.getCurrentBranchName.mockResolvedValue(branchName);
      mockConfigProvider.getBranchMemoryPath.mockReturnValue(`/mock/path/to/${branchName}`);
      mockBranchRepository.exists.mockResolvedValue(true); // ブランチは存在する
      // DocumentWriterService.write がリポジトリのエラーをそのまま投げるか、ラップして投げるかを確認
      // ここでは write がエラーを投げるように設定
      mockDocumentWriterService.write.mockRejectedValue(expectedError); // write がラップしたエラーを返す想定

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
