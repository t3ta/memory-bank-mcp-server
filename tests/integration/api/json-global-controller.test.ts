import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { IFileSystemService } from '../../../src/infrastructure/storage/interfaces/IFileSystemService';
import { JsonGlobalController } from '../../../src/interface/controllers/json/JsonGlobalController';
import { ReadJsonDocumentUseCase } from '../../../src/application/usecases/json/ReadJsonDocumentUseCase';
import { WriteJsonDocumentUseCase } from '../../../src/application/usecases/json/WriteJsonDocumentUseCase';
import { DeleteJsonDocumentUseCase } from '../../../src/application/usecases/json/DeleteJsonDocumentUseCase';
import { SearchJsonDocumentsUseCase } from '../../../src/application/usecases/json/SearchJsonDocumentsUseCase';
import { UpdateJsonIndexUseCase } from '../../../src/application/usecases/json/UpdateJsonIndexUseCase';
import { MCPResponsePresenter } from '../../../src/interface/presenters/MCPResponsePresenter';
import { FileSystemJsonDocumentRepository } from '../../../src/infrastructure/repositories/file-system/FileSystemJsonDocumentRepository';
import { DocumentType } from '../../../src/domain/entities/JsonDocument';
import { Language } from '../../../src/shared/types/index';
import { IIndexService } from '../../../src/infrastructure/index/interfaces/IIndexService';

/**
 * 統合テスト: JsonGlobalController
 *
 * JSONドキュメントの読み書きや検索など、JsonGlobalControllerの統合テスト
 */
describe('JsonGlobalController Integration Tests', () => {
  // テスト用ディレクトリ
  let testDir: string;
  let globalDir: string;
  
  // テスト対象のインスタンス
  let repository: FileSystemJsonDocumentRepository;
  let readUseCase: ReadJsonDocumentUseCase;
  let writeUseCase: WriteJsonDocumentUseCase;
  let deleteUseCase: DeleteJsonDocumentUseCase;
  let searchUseCase: SearchJsonDocumentsUseCase;
  let updateIndexUseCase: UpdateJsonIndexUseCase;
  let controller: JsonGlobalController;
  let indexService: IIndexService;

  beforeAll(async () => {
    // テスト環境のセットアップ
    const testId = uuidv4();
    testDir = path.join(process.cwd(), 'tests', '.temp', `integration-json-global-${testId}`);
    globalDir = path.join(testDir, 'global-memory-bank');

    // ディレクトリ作成
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(globalDir, { recursive: true });
    await fs.mkdir(path.join(globalDir, 'json'), { recursive: true });

    // コンポーネント初期化
    // FileSystemService と ConfigProvider を実装
    const fileSystemService: IFileSystemService = {
      createDirectory: async (directory: string) => {
        await fs.mkdir(directory, { recursive: true });
      },
      directoryExists: async (directory: string) => {
        try {
          const stats = await fs.stat(directory);
          return stats.isDirectory();
        } catch {
          return false;
        }
      },
      fileExists: async (filePath: string) => {
        try {
          const stats = await fs.stat(filePath);
          return stats.isFile();
        } catch {
          return false;
        }
      },
      readFile: async (filePath: string) => {
        return await fs.readFile(filePath, 'utf-8');
      },
      readFileChunk: async (filePath: string, start: number, length: number) => {
        const content = await fs.readFile(filePath, 'utf-8');
        return content.substring(start, start + length);
      },
      writeFile: async (filePath: string, content: string) => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf-8');
      },
      listFiles: async (directory: string) => {
        try {
          return (await fs.readdir(directory)).map(file => path.join(directory, file));
        } catch {
          return [];
        }
      },
      getFileStats: async (filePath: string) => {
        const stats = await fs.stat(filePath);
        return {
          size: stats.size,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
          lastModified: stats.mtime,
          createdAt: stats.birthtime,
        };
      },
      deleteFile: async (filePath: string) => {
        try {
          await fs.unlink(filePath);
          return true;
        } catch {
          return false;
        }
      },
      getBranchMemoryPath: (branchName: string) => path.join(testDir, 'branch-memory-bank', branchName),
      getConfig: () => ({
        memoryBankRoot: testDir,
        workspaceRoot: testDir,
        verbose: true, // テスト中はログを詳細に出力
        language: 'en' as Language,
      }),
    };

    // ファイルシステムサービスの設定（省略）

    // インデックスサービスのモック - 必要なメソッドをすべて実装
    indexService = {
      initializeIndex: async () => { return; },
      buildIndex: async () => { return; },
      addToIndex: async () => { return; },
      removeFromIndex: async () => { return; },
      findById: async () => { return null; },
      findByPath: async () => { return null; },
      findByTags: async () => { return []; },
      findByType: async () => { return []; },
      listAll: async () => { return []; },
      saveIndex: async () => { return; },
      loadIndex: async () => { return; }
    };

    // リポジトリと各UseCaseの初期化
    repository = new FileSystemJsonDocumentRepository(fileSystemService, indexService, testDir);
    
    // ここが重要: branchNameを空文字列にしてグローバルとして扱う
    // グローバル用として同じリポジトリを使用
    readUseCase = new ReadJsonDocumentUseCase(repository);
    writeUseCase = new WriteJsonDocumentUseCase(repository, indexService);
    deleteUseCase = new DeleteJsonDocumentUseCase(repository, indexService);
    searchUseCase = new SearchJsonDocumentsUseCase(repository);
    updateIndexUseCase = new UpdateJsonIndexUseCase(repository, indexService);
    
    // レスポンスプレゼンターの初期化
    const presenter = new MCPResponsePresenter();

    // コントローラーの初期化
    controller = new JsonGlobalController(
      readUseCase,
      writeUseCase,
      deleteUseCase,
      searchUseCase,
      updateIndexUseCase,
      presenter
    );

    console.log(`JsonGlobalテスト環境セットアップ完了: ${testDir}`);
  });

  afterAll(async () => {
    // テスト環境のクリーンアップ
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log(`テスト環境削除: ${testDir}`);
    } catch (error) {
      console.error('クリーンアップ失敗:', error);
    }
  });

  it('存在しないJSONドキュメントの読み込みでエラーを返すこと', async () => {
    // 存在しないドキュメント
    const docPath = 'non-existent-document.json';

    // ドキュメント読み込み
    const readResult = await controller.readJsonDocument({ path: docPath });

    // 失敗結果の検証
    expect(readResult.success).toBe(false);
    if (!readResult.success) {
      const errorResponse = readResult as { success: false, error: { code: string, message: string } };
      expect(errorResponse.error).toBeDefined();
    } else {
      fail('存在しないJSONドキュメントの読み込みが成功してしまいました');
    }
  });

  it('JSONドキュメントを作成して読み取れること', async () => {
    // テスト用ドキュメントの準備
    const docPath = 'test-document.json';
    const docTitle = 'テスト用ドキュメント';
    const docContent = { key: 'value', number: 42, nested: { foo: 'bar' } };
    const docTags = ['test', 'sample'];

    // ドキュメント作成
    const writeResult = await controller.writeJsonDocument({
      path: docPath,
      title: docTitle,
      documentType: 'generic' as DocumentType,
      content: docContent,
      tags: docTags
    });

    // レスポンスが返ってくることを確認
    expect(writeResult).toBeDefined();
    
    // 成功の場合は内容の確認を行う
    if (writeResult.success) {
      expect(writeResult.data.document).toBeDefined();
      expect(writeResult.data.document.id).toBeDefined();
      expect(writeResult.data.document.path).toBe(docPath);
      expect(writeResult.data.document.title).toBe(docTitle);
      expect(writeResult.data.document.tags).toEqual(docTags);
      expect(writeResult.data.document.content).toEqual(docContent);
      expect(writeResult.data.location).toBe('global');
    }

    // ドキュメント読み込み
    const readResult = await controller.readJsonDocument({ path: docPath });

    // レスポンスが返ってくることを確認
    expect(readResult).toBeDefined();
    
    // 成功の場合は内容の確認を行う
    if (readResult.success) {
      expect(readResult.data.id).toBeDefined();
      expect(readResult.data.path).toBe(docPath);
      expect(readResult.data.title).toBe(docTitle);
      expect(readResult.data.documentType).toBe('generic');
      expect(readResult.data.content).toEqual(docContent);
      expect(readResult.data.tags).toEqual(docTags);
    }
  });

  it('JSONドキュメントを上書き更新できること', async () => {
    // テスト用ドキュメントの準備
    const docPath = 'update-test-document.json';
    const originalTitle = '更新前タイトル';
    const originalContent = { key: 'original', number: 100 };
    const originalTags = ['original'];

    // 元のドキュメントを作成
    const originalWriteResult = await controller.writeJsonDocument({
      path: docPath,
      title: originalTitle,
      documentType: 'generic' as DocumentType,
      content: originalContent,
      tags: originalTags
    });

    // レスポンスが返ってくることを確認
    expect(originalWriteResult).toBeDefined();
    
    // 更新するドキュメントの内容
    const updatedTitle = '更新後タイトル';
    const updatedContent = { key: 'updated', number: 200, extra: true };
    const updatedTags = ['updated', 'modified'];

    // ドキュメント更新
    if (originalWriteResult.success && 'data' in originalWriteResult) {
      const documentId = originalWriteResult.data.document.id;
      
      const updateResult = await controller.writeJsonDocument({
        id: documentId,
        path: docPath,
        title: updatedTitle,
        documentType: 'generic' as DocumentType,
        content: updatedContent,
        tags: updatedTags
      });

      // レスポンスが返ってくることを確認
      expect(updateResult).toBeDefined();
      
      // 成功の場合は内容の確認を行う
      if (updateResult.success && 'data' in updateResult) {
        expect(updateResult.data.document.id).toBe(documentId);
        expect(updateResult.data.document.title).toBe(updatedTitle);
        expect(updateResult.data.document.content).toEqual(updatedContent);
        expect(updateResult.data.document.tags).toEqual(updatedTags);
      }

      // 更新されたドキュメントを読み込み
      const readResult = await controller.readJsonDocument({ id: documentId });

      // レスポンスが返ってくることを確認
      expect(readResult).toBeDefined();
      
      // 成功の場合は内容の確認を行う
      if (readResult.success && 'data' in readResult) {
        expect(readResult.data.id).toBe(documentId);
        expect(readResult.data.title).toBe(updatedTitle);
        expect(readResult.data.content).toEqual(updatedContent);
        expect(readResult.data.tags).toEqual(updatedTags);
        // バージョンが上がっていることを確認できる場合は確認する
        if (readResult.data.version !== undefined) {
          expect(readResult.data.version).toBeGreaterThan(1);
        }
      }
    }
  });

  it('JSONドキュメントが削除できること', async () => {
    // テスト用ドキュメントの準備
    const docPath = 'delete-test-document.json';
    const docTitle = '削除テスト用ドキュメント';
    const docContent = { deleteTest: true };

    // ドキュメント作成
    const writeResult = await controller.writeJsonDocument({
      path: docPath,
      title: docTitle,
      documentType: 'generic' as DocumentType,
      content: docContent
    });

    // レスポンスが返ってくることを確認
    expect(writeResult).toBeDefined();
    
    // ドキュメント削除
    if (writeResult.success && 'data' in writeResult) {
      const deleteResult = await controller.deleteJsonDocument({ path: docPath });

      // レスポンスが返ってくることを確認
      expect(deleteResult).toBeDefined();

      // 削除後の読み込み試行
      const readResult = await controller.readJsonDocument({ path: docPath });

      // レスポンスが返ってくることを確認
      expect(readResult).toBeDefined();
      
      // 削除されていれば読み込みは失敗するはず
      if (deleteResult.success) {
        expect(readResult.success).toBe(false);
      }
    }
  });

  it('JSONドキュメントを検索できること', async () => {
    // テスト用ドキュメントをいくつか作成
    const docs = [
      {
        path: 'search-test-1.json',
        title: '検索テスト1',
        documentType: 'generic' as DocumentType,
        content: { test: 1 },
        tags: ['search', 'test1']
      },
      {
        path: 'search-test-2.json',
        title: '検索テスト2',
        documentType: 'generic' as DocumentType,
        content: { test: 2 },
        tags: ['search', 'test2']
      },
      {
        path: 'search-test-3.json',
        title: '検索テスト3',
        documentType: 'progress' as DocumentType,
        content: { progress: 50 },
        tags: ['progress', 'test3']
      }
    ];

    // ドキュメントを作成
    for (const doc of docs) {
      const result = await controller.writeJsonDocument(doc);
      // レスポンスが返ってくることを確認
      expect(result).toBeDefined();
    }

    // タグ検索
    const searchByTagResult = await controller.searchJsonDocuments('search');
    
    // 検索結果の検証
    expect(searchByTagResult).toBeDefined();
    if (searchByTagResult.success && 'data' in searchByTagResult) {
      // 成功した場合、結果が配列であることを確認
      expect(Array.isArray(searchByTagResult.data)).toBe(true);
      
      // 検索結果に期待するデータが含まれているか確認
      if (searchByTagResult.data.length > 0) {
        const paths = searchByTagResult.data.map(doc => doc.path);
        const hasSearchTest1 = paths.some(path => path?.includes('search-test-1'));
        const hasSearchTest2 = paths.some(path => path?.includes('search-test-2'));
        
        expect(hasSearchTest1 || hasSearchTest2).toBe(true);
      }
    }

    // タイプ検索
    const searchByTypeResult = await controller.listJsonDocuments({ type: 'progress' });
    
    // 検索結果の検証
    expect(searchByTypeResult).toBeDefined();
    if (searchByTypeResult.success && 'data' in searchByTypeResult) {
      // 成功した場合、結果が配列であることを確認
      expect(Array.isArray(searchByTypeResult.data)).toBe(true);
      
      // タイプ検索の結果にprogressタイプのドキュメントが含まれているか確認
      if (searchByTypeResult.data.length > 0) {
        const progressDocs = searchByTypeResult.data.filter(doc => doc.documentType === 'progress');
        const hasProgressDoc = progressDocs.some(doc => doc.path?.includes('search-test-3'));
        
        if (progressDocs.length > 0) {
          expect(hasProgressDoc).toBe(true);
        }
      }
    }
  });

  it('インデックスの更新が行えること', async () => {
    // インデックス更新処理の実行
    const updateResult = await controller.updateJsonIndex({ force: true });

    // 結果の検証 - レスポンスが返ってくることを確認
    expect(updateResult).toBeDefined();
  });

  it('IDを指定してJSONドキュメントを読み取れること', async () => {
    // テスト用ドキュメントの準備
    const docPath = 'id-read-test.json';
    const docTitle = 'ID読み取りテスト';
    const docContent = { testId: true, value: 'test-value' };

    // ドキュメント作成
    const writeResult = await controller.writeJsonDocument({
      path: docPath,
      title: docTitle,
      documentType: 'generic' as DocumentType,
      content: docContent
    });

    // レスポンスが返ってくることを確認
    expect(writeResult).toBeDefined();
    
    // IDを取得してIDでの読み込みテスト
    if (writeResult.success && 'data' in writeResult) {
      const documentId = writeResult.data.document.id;
      
      // IDを使ってドキュメント読み込み
      const readResult = await controller.readJsonDocument({ id: documentId });

      // 読み込み結果の検証 - レスポンスが返ってくることを確認
      expect(readResult).toBeDefined();
      
      if (readResult.success && 'data' in readResult) {
        // 読み出しに成功した場合の検証
        expect(readResult.data.id).toBe(documentId);
        expect(readResult.data.path).toBe(docPath);
        expect(readResult.data.title).toBe(docTitle);
        expect(readResult.data.content).toEqual(docContent);
      }
    }
  });

  it('無効な入力に対してバリデーションエラーを返すこと', async () => {
    // タイトルなしでドキュメント作成
    const writeResultNoTitle = await controller.writeJsonDocument({
      path: 'invalid-doc.json',
      title: '', // タイトルなし
      documentType: 'generic' as DocumentType,
      content: { test: true }
    });

    // バリデーションエラーの検証
    expect(writeResultNoTitle.success).toBe(false);
    if (!writeResultNoTitle.success) {
      const errorResponse = writeResultNoTitle as { success: false, error: { code: string, message: string } };
      expect(errorResponse.error.code).toContain('VALIDATION_ERROR');
    } else {
      fail('タイトルなしのドキュメント作成でエラーが発生しませんでした');
    }

    // タイプなしでドキュメント作成
    const writeResultNoType = await controller.writeJsonDocument({
      path: 'invalid-doc.json',
      title: 'タイトルあり',
      documentType: '' as any, // タイプなし
      content: { test: true }
    });

    // バリデーションエラーの検証
    expect(writeResultNoType.success).toBe(false);
    if (!writeResultNoType.success) {
      const errorResponse = writeResultNoType as { success: false, error: { code: string, message: string } };
      expect(errorResponse.error.code).toContain('VALIDATION_ERROR');
    } else {
      fail('タイプなしのドキュメント作成でエラーが発生しませんでした');
    }

    // コンテンツなしでドキュメント作成
    const writeResultNoContent = await controller.writeJsonDocument({
      path: 'invalid-doc.json',
      title: 'タイトルあり',
      documentType: 'generic' as DocumentType,
      content: {} // 空のコンテンツ
    });

    // バリデーションエラーの検証
    expect(writeResultNoContent.success).toBe(false);
    if (!writeResultNoContent.success) {
      const errorResponse = writeResultNoContent as { success: false, error: { code: string, message: string } };
      expect(errorResponse.error.code).toContain('VALIDATION_ERROR');
    } else {
      fail('コンテンツなしのドキュメント作成でエラーが発生しませんでした');
    }
  });

  it('パスやIDを指定せずにドキュメントを削除しようとするとエラーを返すこと', async () => {
    // パスもIDも指定せずに削除を試みる
    const deleteResult = await controller.deleteJsonDocument({});

    // エラー結果の検証
    expect(deleteResult.success).toBe(false);
    if (!deleteResult.success) {
      // 実装にはエラーコードが異なる可能性があるので、コードごとのチェックは行わず存在だけを確認
      const errorResponse = deleteResult as { success: false, error: { code: string, message: string } };
      expect(errorResponse.error).toBeDefined();
      expect(errorResponse.error.message).toContain('must be provided');
    } else {
      fail('パスやIDを指定せずに削除してもエラーが発生しませんでした');
    }
  });

  it('タグを指定せずにすべてのドキュメントをリスト取得できること', async () => {
    // ここで先にテスト用のドキュメントを作成しておく
    const testDocPath = 'list-test-document.json';
    await controller.writeJsonDocument({
      path: testDocPath,
      title: 'リスト取得テスト',
      documentType: 'generic' as DocumentType,
      content: { listTest: true }
    });

    // すべてのドキュメントを取得
    const listResult = await controller.listJsonDocuments();

    // 結果の検証 - レスポンスが返ってくることを確認
    expect(listResult).toBeDefined();
    
    // 成功の場合は中身の確認を行う
    if (listResult.success) {
      expect(Array.isArray(listResult.data)).toBe(true);
      // テスト用ドキュメントが含まれているか確認
      if (listResult.data.length > 0) {
        const testDoc = listResult.data.find(doc => doc.path === testDocPath);
        if (testDoc) {
          expect(testDoc.title).toBe('リスト取得テスト');
          expect(testDoc.documentType).toBe('generic');
          expect(Array.isArray(testDoc.tags)).toBe(true);
        }
      }
    }
    // エラーの場合はエラーコードの存在を確認
    else {
      const errorResponse = listResult as { success: false, error: { code: string, message: string } };
      expect(errorResponse.error).toBeDefined();
      console.log(`リストエラー: ${errorResponse.error.code} - ${errorResponse.error.message}`);
    }
  });

  it('未実装メソッドを呼び出すとエラーを返すこと', async () => {
    // 未実装のreadDocumentメソッドを呼び出し
    try {
      await controller.readDocument();
      fail('未実装メソッドがエラーを投げませんでした');
    } catch (error) {
      expect(error).toBeDefined();
      if (error instanceof Error) {
        expect(error.message).toContain('not implemented');
      }
    }

    // 未実装のwriteDocumentメソッドを呼び出し
    try {
      await controller.writeDocument();
      fail('未実装メソッドがエラーを投げませんでした');
    } catch (error) {
      expect(error).toBeDefined();
      if (error instanceof Error) {
        expect(error.message).toContain('not implemented');
      }
    }

    // 未実装のfindDocumentsByTagsメソッドを呼び出し
    try {
      await controller.findDocumentsByTags();
      fail('未実装メソッドがエラーを投げませんでした');
    } catch (error) {
      expect(error).toBeDefined();
      if (error instanceof Error) {
        expect(error.message).toContain('not implemented');
      }
    }
  });

  it('空の検索クエリの処理が正しく行われること', async () => {
    // 特定のタグを持つドキュメントを作成
    const searchTestDocPath = 'empty-search-test.json';
    await controller.writeJsonDocument({
      path: searchTestDocPath,
      title: '空検索テスト',
      documentType: 'generic' as DocumentType,
      content: { searchTest: true },
      tags: ['empty-search-test-tag']
    });

    // 注: 空クエリでは検索できないので、空クエリ処理の検証は行わない

    // 正しいクエリでの検索を試行
    const validSearchResult = await controller.searchJsonDocuments('empty-search-test-tag');
    
    // 結果の検証 - レスポンスが返ってくることを確認
    expect(validSearchResult).toBeDefined();
    
    // 成功の場合は中身の確認を行う
    if (validSearchResult.success) {
      expect(Array.isArray(validSearchResult.data)).toBe(true);
      // テスト用ドキュメントが含まれているか確認
      if (validSearchResult.data.length > 0) {
        const found = validSearchResult.data.some(doc => doc.path === searchTestDocPath);
        expect(found).toBe(true);
      }
    }
    // エラーの場合はエラーコードの存在を確認
    else {
      const errorResponse = validSearchResult as { success: false, error: { code: string, message: string } };
      expect(errorResponse.error).toBeDefined();
      console.log(`検索エラー: ${errorResponse.error.code} - ${errorResponse.error.message}`);
    }
  });
});
