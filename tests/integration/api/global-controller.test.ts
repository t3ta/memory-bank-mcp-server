import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { IFileSystemService } from '../../../src/infrastructure/storage/interfaces/IFileSystemService';
import { IConfigProvider } from '../../../src/infrastructure/config/interfaces/IConfigProvider';
import { IBranchMemoryBankRepository } from '../../../src/domain/repositories/IBranchMemoryBankRepository';
import { GlobalController } from '../../../src/interface/controllers/GlobalController';
import { FileSystemGlobalMemoryBankRepository } from '../../../src/infrastructure/repositories/file-system/FileSystemGlobalMemoryBankRepository';
import { WriteGlobalDocumentUseCase } from '../../../src/application/usecases/global/WriteGlobalDocumentUseCase';
import { ReadGlobalDocumentUseCase } from '../../../src/application/usecases/global/ReadGlobalDocumentUseCase';
import { SearchDocumentsByTagsUseCase } from '../../../src/application/usecases/common/SearchDocumentsByTagsUseCase';
import { UpdateTagIndexUseCase } from '../../../src/application/usecases/common/UpdateTagIndexUseCase';
import { MCPResponsePresenter } from '../../../src/interface/presenters/MCPResponsePresenter';
import { Language } from '../../../src/shared/types/index';

/**
 * 統合テスト: GlobalController
 *
 * このテストでは、GlobalControllerと関連リポジトリの統合テストを行います。
 * モックサーバーを使わず実際のコントローラーとリポジトリを使用して、
 * グローバルメモリバンクのドキュメント操作を検証します。
 * 
 * 主なテストケース:
 * - マークダウンドキュメントの書き込みと読み取り
 * - JSONドキュメントの書き込みと読み取り
 * - 存在しないドキュメントの読み取り（エラー確認）
 * 
 * TODO: 以下のテストケースを追加する
 * - タグを使ったドキュメント検索
 * - タグインデックスの更新
 * - ドキュメントの削除
 */
describe('GlobalController Integration Tests', () => {
  // テスト用ディレクトリ
  let testDir: string;
  let globalDir: string;

  // テスト対象のインスタンス
  let repository: FileSystemGlobalMemoryBankRepository;
  let writeUseCase: WriteGlobalDocumentUseCase;
  let readUseCase: ReadGlobalDocumentUseCase;
  let controller: GlobalController;

  beforeAll(async () => {
    // テスト環境のセットアップ
    const testId = uuidv4();
    testDir = path.join(process.cwd(), 'tests', '.temp', `integration-global-${testId}`);
    globalDir = path.join(testDir, 'global-memory-bank');

    // ディレクトリ作成
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(globalDir, { recursive: true });

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
        return (await fs.readdir(directory)).map(file => path.join(directory, file));
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
        verbose: false,
        language: 'en' as Language,
      }),
    };

    const configProvider: IConfigProvider = {
      initialize: async () => ({
        memoryBankRoot: testDir,
        workspaceRoot: testDir,
        verbose: false,
        language: 'en' as Language
      }),
      getConfig: () => ({
        memoryBankRoot: testDir,
        workspaceRoot: testDir,
        verbose: false,
        language: 'en' as Language
      }),
      getBranchMemoryPath: (branchName: string) => path.join(testDir, 'branch-memory-bank', branchName),
      getGlobalMemoryPath: () => path.join(testDir, 'global-memory-bank'),
      getLanguage: () => 'en' as Language
    };

    // IBranchMemoryBankRepositoryのモック実装
    const branchRepositoryMock: IBranchMemoryBankRepository = {
      exists: async () => false,
      initialize: async () => { },
      getDocument: async () => null,
      saveDocument: async () => { },
      deleteDocument: async () => false,
      listDocuments: async () => [],
      findDocumentsByTags: async () => [],
      getRecentBranches: async () => [],
      validateStructure: async () => false,
      saveTagIndex: async () => { },
      getTagIndex: async () => null,
      findDocumentPathsByTagsUsingIndex: async () => [],
    };

    repository = new FileSystemGlobalMemoryBankRepository(fileSystemService, configProvider);
    writeUseCase = new WriteGlobalDocumentUseCase(repository);
    readUseCase = new ReadGlobalDocumentUseCase(repository);

    // GlobalController に必要なパラメータを追加
    const searchUseCase = new SearchDocumentsByTagsUseCase(repository, branchRepositoryMock);
    const updateTagIndexUseCase = new UpdateTagIndexUseCase(repository, branchRepositoryMock);
    const presenter = new MCPResponsePresenter();

    controller = new GlobalController(
      readUseCase,
      writeUseCase,
      searchUseCase,
      updateTagIndexUseCase,
      presenter
    );

    console.log(`グローバルテスト環境セットアップ完了: ${testDir}`);
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

  it('グローバルドキュメントの書き込みと読み込みができること', async () => {
    // テストデータ - マークダウン形式
    const docPath = 'test-global-doc.md';
    const content = `# グローバルテストドキュメント

このドキュメントは統合テストで作成されたグローバルドキュメントです。
作成時刻: ${new Date().toISOString()}
`;

    // ドキュメント書き込み
    const writeResult = await controller.writeDocument(docPath, content);

    // 書き込み結果の検証
    expect(writeResult.success).toBe(true);
    if ('error' in writeResult) {
      expect(writeResult.error).toBeDefined();
    } else {
      expect('error' in writeResult).toBe(false);
    }

    // ファイルが実際に存在するか確認
    const filePath = path.join(globalDir, docPath);
    const fileExists = await fileExistsAsync(filePath);
    expect(fileExists).toBe(true);

    // ファイル内容の確認
    const fileContent = await fs.readFile(filePath, 'utf-8');
    expect(fileContent).toEqual(content);

    // ドキュメント読み込み
    const readResult = await controller.readDocument(docPath);

    // 読み込み結果の検証
    expect(readResult.success).toBe(true);
    if ('data' in readResult) {
      expect(readResult.data.content).toEqual(content);
    } else {
      fail('読み込みが成功するはずが失敗しました');
    }
  });

  it('存在しないグローバルドキュメントの読み込みでエラーを返すこと', async () => {
    // 存在しないドキュメント
    const docPath = 'non-existent-global-doc.md';

    // ドキュメント読み込み
    const readResult = await controller.readDocument(docPath);

    // 失敗結果の検証
    expect(readResult.success).toBe(false);
    if ('error' in readResult) {
      expect(readResult.error).toBeDefined();
    } else {
      fail('存在しないファイルの読み込みが成功してしまいました');
    }
  });

  it('JSONドキュメントの書き込みと読み込みができること', async () => {
    // テストデータ - JSON形式
    const docPath = 'test-data.json';
    const data = {
      title: "テストJSONドキュメント",
      createdAt: new Date().toISOString(),
      items: [1, 2, 3, 4, 5],
      metadata: {
        version: "1.0",
        author: "統合テスト"
      }
    };
    const content = JSON.stringify(data, null, 2);

    // ドキュメント書き込み
    const writeResult = await controller.writeDocument(docPath, content);

    // 書き込み結果の検証
    expect(writeResult.success).toBe(true);

    // ドキュメント読み込み
    const readResult = await controller.readDocument(docPath);

    // 読み込み結果の検証
    expect(readResult.success).toBe(true);

    if ('data' in readResult) {
      expect(readResult.data.content).toEqual(content);

      // JSONとして解析できることを確認
      const parsedData = JSON.parse(readResult.data.content);
      expect(parsedData.title).toEqual(data.title);
      expect(parsedData.items.length).toEqual(5);
    } else {
      fail('JSONファイルの読み込みが失敗しました');
    }
  });

  // TODO: タグ検索のテスト
  it.skip('タグに基づいてドキュメントを検索できること', async () => {
    // テスト用のドキュメントを複数作成 (異なるタグ付き)
    const docPaths = [
      { path: 'tagged-doc-1.md', content: '# ドキュメント1', tags: ['test', 'global', 'important'] },
      { path: 'tagged-doc-2.md', content: '# ドキュメント2', tags: ['test', 'global'] },
      { path: 'tagged-doc-3.md', content: '# ドキュメント3', tags: ['test'] }
    ];

    // ドキュメントを保存
    for (const doc of docPaths) {
      await controller.writeDocument(doc.path, doc.content, doc.tags);
    }

    // タグインデックスを更新
    await controller.updateTagsIndex();

    // 'global' タグで検索
    const searchResult = await controller.findDocumentsByTags(['global']);
    expect(searchResult.success).toBe(true);
    if (searchResult.success && 'data' in searchResult) {
      expect(searchResult.data.length).toBe(2); // 2つのドキュメントが見つかるはず
      const foundPaths = searchResult.data.map(doc => doc.path);
      expect(foundPaths).toContain('tagged-doc-1.md');
      expect(foundPaths).toContain('tagged-doc-2.md');
    }

    // 複数タグでAND検索
    const andSearchResult = await controller.findDocumentsByTags(['global', 'important'], true);
    expect(andSearchResult.success).toBe(true);
    if (andSearchResult.success && 'data' in andSearchResult) {
      expect(andSearchResult.data.length).toBe(1); // 1つのドキュメントだけが両方のタグを持つ
      expect(andSearchResult.data[0].path).toBe('tagged-doc-1.md');
    }
  });

  // TODO: ドキュメント削除のテスト
  it.skip('グローバルドキュメントを削除できること', async () => {
    // テスト用ドキュメントを作成
    const docPath = 'doc-to-delete.md';
    const content = '# 削除するドキュメント';
    
    await controller.writeDocument(docPath, content);
    
    // 削除前に存在を確認
    const filePath = path.join(globalDir, docPath);
    let exists = await fileExistsAsync(filePath);
    expect(exists).toBe(true);
    
    // ドキュメント削除
    const deleteResult = await controller.deleteJsonDocument({path: docPath});
    expect(deleteResult.success).toBe(true);
    
    // 削除後に存在しないことを確認
    exists = await fileExistsAsync(filePath);
    expect(exists).toBe(false);
    
    // 削除されたドキュメントの読み込みがエラーを返すことを確認
    const readResult = await controller.readDocument(docPath);
    expect(readResult.success).toBe(false);
  });
});

// ヘルパー関数
async function fileExistsAsync(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
