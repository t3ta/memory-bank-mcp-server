import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { ConfigProvider } from '../../../src/infrastructure/config/ConfigProvider';
import { IConfigProvider } from '../../../src/infrastructure/config/interfaces/IConfigProvider';
import { IGlobalMemoryBankRepository } from '../../../src/domain/repositories/IGlobalMemoryBankRepository';
import { BranchController } from '../../../src/interface/controllers/BranchController';
import { FileSystemBranchMemoryBankRepository } from '../../../src/infrastructure/repositories/file-system/FileSystemBranchMemoryBankRepository';
import { WriteBranchDocumentUseCase } from '../../../src/application/usecases/branch/WriteBranchDocumentUseCase';
import { ReadBranchDocumentUseCase } from '../../../src/application/usecases/branch/ReadBranchDocumentUseCase';
import { SearchDocumentsByTagsUseCase } from '../../../src/application/usecases/common/SearchDocumentsByTagsUseCase';
import { UpdateTagIndexUseCase } from '../../../src/application/usecases/common/UpdateTagIndexUseCase';
import { GetRecentBranchesUseCase } from '../../../src/application/usecases/common/GetRecentBranchesUseCase';
import { ReadBranchCoreFilesUseCase } from '../../../src/application/usecases/common/ReadBranchCoreFilesUseCase';
import { CreateBranchCoreFilesUseCase } from '../../../src/application/usecases/common/CreateBranchCoreFilesUseCase';
import { MCPResponsePresenter } from '../../../src/interface/presenters/MCPResponsePresenter';
import { FileSystemService } from '../../../src/infrastructure/storage/FileSystemService';


/**
 * Integration Test: BranchController
 *
 * このテストでは、BranchControllerと関連リポジトリの統合テストを行います。
 * モックサーバーを使わず実際のコントローラーとリポジトリを使用して、
 * ドキュメントの読み書きとエラーケースの検証を行います。
 * 
 * 主なテストケース:
 * - ドキュメントの書き込みと読み取り
 * - 存在しないドキュメントの読み取り（エラー確認）
 * - 存在しないブランチの使用（エラー確認）
 * 
 * TODO: 以下のテストケースを追加する
 * - タグを指定したドキュメントの書き込みと検索
 * - コアファイルの読み書き
 * - 最近のブランチ取得
 * - タグインデックスの更新
 */
describe('BranchController Integration Tests', () => {
  // Test directory
  let testDir: string;
  let branchDir: string;
  let testBranch: string;

  // Test target instances
  let repository: FileSystemBranchMemoryBankRepository;
  // let tagRepository: FileSystemTagIndexRepositoryImpl;
  let writeUseCase: WriteBranchDocumentUseCase;
  let readUseCase: ReadBranchDocumentUseCase;
  let searchUseCase: SearchDocumentsByTagsUseCase;
  let updateTagIndexUseCase: UpdateTagIndexUseCase;
  let getRecentBranchesUseCase: GetRecentBranchesUseCase;
  let readCoreFilesUseCase: ReadBranchCoreFilesUseCase;
  let createCoreFilesUseCase: CreateBranchCoreFilesUseCase;
  let presenter: MCPResponsePresenter;
  let controller: BranchController;

  beforeAll(async () => {
    // テスト環境のセットアップ
    const testId = uuidv4();
    testDir = path.join(process.cwd(), 'tests', '.temp', `integration-${testId}`);
    branchDir = path.join(testDir, 'branch-memory-bank');
    testBranch = `feature/test-branch-${testId}`;

    // テスト用ディレクトリの作成
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(branchDir, { recursive: true });

    // "feature/test-branch-xxx"は、BranchInfoにより"feature-test-branch-xxx"に変換される
    // 変換された名前でディレクトリを作成
    const safeBranchName = testBranch.replace('/', '-');
    const branchTestDir = path.join(branchDir, safeBranchName);
    await fs.mkdir(branchTestDir, { recursive: true });
    console.log(`Branch directory created: ${branchTestDir}`);

    // コンポーネントの初期化
    const configProvider: IConfigProvider = new ConfigProvider();
    await configProvider.initialize({
      workspace: testDir,
      memoryRoot: testDir
    });

    // FileSystemServiceを正しく渡す
    const fileSystemService = new FileSystemService();
    repository = new FileSystemBranchMemoryBankRepository(fileSystemService, configProvider);

    // IGlobalMemoryBankRepositoryのモック作成
    const globalRepository: IGlobalMemoryBankRepository = {
      initialize: async () => { },
      validateStructure: async () => true,
      getDocument: async () => null,
      saveDocument: async () => { },
      deleteDocument: async () => true,
      findDocumentsByTags: async () => [],
      updateTagsIndex: async () => { },
      getTagIndex: async () => null,
      saveTagIndex: async () => { },
      findDocumentPathsByTagsUsingIndex: async () => [],
      listDocuments: async () => []
    };

    // 実際にファイルシステム操作を行うサービスはrepositoryが保持している
    readUseCase = new ReadBranchDocumentUseCase(repository);
    writeUseCase = new WriteBranchDocumentUseCase(repository);
    searchUseCase = new SearchDocumentsByTagsUseCase(globalRepository, repository);
    updateTagIndexUseCase = new UpdateTagIndexUseCase(globalRepository, repository);
    getRecentBranchesUseCase = new GetRecentBranchesUseCase(repository);
    readCoreFilesUseCase = new ReadBranchCoreFilesUseCase(repository);
    createCoreFilesUseCase = new CreateBranchCoreFilesUseCase(repository);
    presenter = new MCPResponsePresenter();

    controller = new BranchController(
      readUseCase,
      writeUseCase,
      searchUseCase,
      updateTagIndexUseCase,
      getRecentBranchesUseCase,
      readCoreFilesUseCase,
      createCoreFilesUseCase,
      presenter
    );

    // テスト環境のセットアップログ
    console.log(`Test environment setup completed: ${testDir}`);
  });

  afterAll(async () => {
    // テスト環境のクリーンアップ
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log(`Test environment deleted: ${testDir}`);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  it('Should write and read document successfully', async () => {
    // テストデータ
    const docPath = 'test-document.json';
    const content = JSON.stringify({
      schema: "memory_document_v2",
      metadata: {
        id: uuidv4(),
        title: "Test Document",
        documentType: "text",
        path: docPath,
        tags: ["test", "integration"],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        text: "This document was created in integration test.\nCreated at: " + new Date().toISOString() + "\nTest ID: " + testBranch
      }
    }, null, 2);

    try {
      // ディレクトリ構造の確認
      console.log('Checking if branch directory exists:');
      // BranchInfoクラスによってブランチ名がbranchへの変換される
      const safeBranchName = testBranch.replace('/', '-');
      const branchTestDir = path.join(branchDir, safeBranchName);
      const dirExists = await fileExistsAsync(branchTestDir);
      console.log(`Branch directory exists: ${dirExists} (${branchTestDir})`);

      if (dirExists) {
        const files = await fs.readdir(branchTestDir);
        console.log('Files in branch directory:', files);
      }
    } catch (error) {
      console.error('Error checking directory:', error);
    }

    // ドキュメント書き込み
    console.log("Test - Write content:", content);
    const writeResult = await controller.writeDocument(testBranch, docPath, content);

    // 書き込み結果の検証
    console.log('Test - Write result:', JSON.stringify(writeResult, null, 2));
    // エラーがあれば詳細情報を表示
    if (!writeResult.success) {
      const errorResponse = writeResult as { success: false, error: { code: string, message: string } };
      console.error('Test - Error details:', errorResponse.error);
    }
    console.log('Test - Branch name:', testBranch);
    console.log('Test - Document path:', docPath);
    console.log('Test - Branch directory:', branchDir);
    console.log('Test - File path to verify:', path.join(branchDir, testBranch.replace('/', '-'), docPath));

    // ディレクトリの内容確認
    try {
      const baseDirContents = await fs.readdir(branchDir);
      console.log('Test - Base directory contents:', baseDirContents);

      const safeBranchName = testBranch.replace('/', '-');
      const branchDirPath = path.join(branchDir, safeBranchName);
      const branchDirExists = await fileExistsAsync(branchDirPath);
      console.log('Test - Branch directory exists:', branchDirExists, branchDirPath);

      if (branchDirExists) {
        const branchDirContents = await fs.readdir(branchDirPath);
        console.log('Test - Branch directory contents:', branchDirContents);
      }
    } catch (error) {
      console.error('Test - Directory check error:', error);
    }
    expect(writeResult.success).toBe(true);

    // ファイルが実際に存在するかを確認
    const safeBranchName = testBranch.replace('/', '-');
    const filePath = path.join(branchDir, safeBranchName, docPath);
    const fileExists = await fileExistsAsync(filePath);
    console.log(`Test - File path check: ${filePath}`);
    console.log(`Test - File exists: ${fileExists}`);
    expect(fileExists).toBe(true);

    // ファイル内容の検証
    const fileContent = await fs.readFile(filePath, 'utf-8');
    console.log('Test - File content check:', fileContent);
    // 保存時にフォーマットが変わる可能性があるためJSONをパースして検証
    const originalJson = JSON.parse(content);
    const savedJson = JSON.parse(fileContent);
    expect(savedJson.schema).toBe(originalJson.schema);
    expect(savedJson.metadata.title).toBe(originalJson.metadata.title);
    expect(savedJson.content.text).toBe(originalJson.content.text);

    // ドキュメント読み込み
    console.log('Test - Target branch for reading:', testBranch);
    console.log('Test - Target path for reading:', docPath);
    const readResult = await controller.readDocument(testBranch, docPath);

    // エラー詳細の表示
    if (!readResult.success) {
      const errorResponse = readResult as { success: false, error: { code: string, message: string } };
      console.log('Test - Read error:', JSON.stringify(errorResponse.error, null, 2));
    } else {
      console.log('Test - Read result:', JSON.stringify(readResult.data, null, 2));
    }

    // 読み込み結果の検証
    expect(readResult.success).toBe(true);
    if (readResult.success) {
      // readResult.data.contentがオブジェクト、JSON文字列、テキストのどれか判定
      console.log('Read content type:', typeof readResult.data.content);
      console.log('Read content:', readResult.data.content);

      try {
        if (typeof readResult.data.content === 'string' && readResult.data.content.startsWith('{')) {
          // JSON文字列の場合、解析して構造を確認
          const parsedContent = JSON.parse(readResult.data.content);
          console.log('Parsed content structure:', Object.keys(parsedContent));
        }
      } catch (err) {
        console.error('Error parsing content:', err);
      }

      // JSON形式の検証
      if (typeof readResult.data.content === 'object' && readResult.data.content !== null) {
        // すでにオブジェクト（パース済みJSON）の場合
        expect(readResult.data.content).toHaveProperty('text');
      } else if (typeof readResult.data.content === 'string' && readResult.data.content.startsWith('{')) {
        // JSON文字列の場合
        const parsedContent = JSON.parse(readResult.data.content);
        expect(parsedContent).toHaveProperty('content');
        expect(parsedContent.content).toHaveProperty('text');
      } else {
        // テキスト形式の場合
        expect(readResult.data.content).toContain("Test Document");
      }
    } else {
      fail('Read operation should have succeeded but failed');
    }
  });

  it('Should return error when reading non-existent document', async () => {
    // 存在しないドキュメント
    const docPath = 'non-existent-document.json';

    // ドキュメント読み込み
    const readResult = await controller.readDocument(testBranch, docPath);

    // 失敗結果の検証
    expect(readResult.success).toBe(false);
    if (!readResult.success) {
      const errorResponse = readResult as { success: false, error: { code: string, message: string } };
      expect(errorResponse.error).toBeDefined();
    }
  });

  it('Should return error when using non-existent branch', async () => {
    // 存在しないブランチ
    const branchName = 'feature/non-existent-branch';
    const docPath = 'test-document.json';

    // ドキュメント読み込み
    const readResult = await controller.readDocument(branchName, docPath);

    // 失敗結果の検証
    expect(readResult.success).toBe(false);
    if (!readResult.success) {
      const errorResponse = readResult as { success: false, error: { code: string, message: string } };
      expect(errorResponse.error).toBeDefined();
    }
  });

  /**
   * Integration Test: Document search by tags
   * 
   * This test verifies the document search functionality using tags with both
   * OR and AND conditions. It ensures that:
   * 1. Documents can be found using any of the specified tags (OR condition)
   * 2. Documents can be found that match all specified tags (AND condition)
   * 3. Tag index updates correctly reflect the document metadata
   */
  it('Should find documents by tags', async () => {
    // Test data - JSON document format
    const docPath1 = 'tagged-document-1.json';
    const content1 = JSON.stringify({
      schema: "memory_document_v2",
      metadata: {
        id: uuidv4(),
        title: "Tagged Document 1",
        documentType: "text",
        path: docPath1,
        tags: ["test", "integration", "tag-search"],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        text: "This document has specific tags."
      }
    }, null, 2);
    
    const docPath2 = 'tagged-document-2.json';
    const content2 = JSON.stringify({
      schema: "memory_document_v2",
      metadata: {
        id: uuidv4(),
        title: "Tagged Document 2",
        documentType: "text",
        path: docPath2,
        tags: ["test", "different"],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        text: "This document has different tags."
      }
    }, null, 2);

    // Write documents to the branch
    await controller.writeDocument(testBranch, docPath1, content1);
    await controller.writeDocument(testBranch, docPath2, content2);

    // Update tag index to ensure searchability
    const updateResult = await controller.updateTagsIndex(testBranch);
    expect(updateResult.success).toBe(true);

    // Tag search with OR condition - should find both documents
    const searchResult1 = await controller.findDocumentsByTags(testBranch, ['tag-search', 'different'], false);
    expect(searchResult1.success).toBe(true);
    if (searchResult1.success && 'data' in searchResult1) {
      expect(searchResult1.data).toHaveLength(2); // Both documents should match
      
      // Verify document paths are included in results
      const resultPaths = searchResult1.data.map(doc => doc.path);
      expect(resultPaths).toContain(docPath1);
      expect(resultPaths).toContain(docPath2);
    } else {
      fail('Search should have succeeded but failed');
    }

    // Tag search with AND condition - should find only the first document
    const searchResult2 = await controller.findDocumentsByTags(testBranch, ['test', 'integration'], true);
    expect(searchResult2.success).toBe(true);
    if (searchResult2.success && 'data' in searchResult2) {
      expect(searchResult2.data).toHaveLength(1); // Only first document matches both tags
      expect(searchResult2.data[0].path).toBe(docPath1);
    } else {
      fail('Search should have succeeded but failed');
    }
  });

  /**
   * Integration Test: Core files operations
   * 
   * This test verifies the core files read/write functionality using the JSON format.
   * It tests writing structured core files and then reading them back to verify
   * the persistence and retrieval mechanisms work correctly.
   */
  it('Should handle core files operations', async () => {
    // Define core files data in JSON format
    const coreFilesData = {
      branchContext: JSON.stringify({
        schema: "memory_document_v2",
        metadata: {
          title: "Branch Context",
          documentType: "branchContext",
          path: "branchContext.json",
          lastModified: new Date().toISOString()
        },
        content: { 
          purpose: "Test branch purpose description.",
          description: "Test branch for core files operations"
        }
      }),
      activeContext: JSON.stringify({
        schema: "memory_document_v2",
        metadata: {
          title: "Active Context",
          documentType: "activeContext",
          path: "activeContext.json",
          lastModified: new Date().toISOString()
        },
        content: { 
          currentWork: "Testing core files operations", 
          recentChanges: ["Added core files test"],
          activeDecisions: ["Using JSON format for all files"]
        }
      }),
      progress: JSON.stringify({
        schema: "memory_document_v2",
        metadata: {
          title: "Progress",
          documentType: "progress",
          path: "progress.json",
          lastModified: new Date().toISOString()
        },
        content: { 
          status: "In progress",
          completedTasks: ["Core files structure definition"],
          pendingTasks: ["Core files integration test"]
        }
      }),
      systemPatterns: JSON.stringify({
        schema: "memory_document_v2",
        metadata: {
          title: "System Patterns",
          documentType: "systemPatterns",
          path: "systemPatterns.json",
          lastModified: new Date().toISOString()
        },
        content: { 
          technicalDecisions: [
            {
              context: "Core files format",
              decision: "Using JSON structure",
              impact: "Better type safety and structure"
            }
          ]
        }
      })
    };

    // Write each core file individually
    for (const [key, content] of Object.entries(coreFilesData)) {
      const writeResult = await controller.writeDocument(testBranch, `${key}.json`, content);
      expect(writeResult.success).toBe(true);
      if (!writeResult.success) {
      const errorResponse = writeResult as { success: false, error: { code: string, message: string } };
        console.error(`Failed to write ${key}.json:`, errorResponse.error);
        }
    }

    // Read core files
    const readResult = await controller.readCoreFiles(testBranch);
    expect(readResult.success).toBe(true);
    
    if (readResult.success && 'data' in readResult) {
      // Verify all core files are properly returned
      expect(readResult.data).toBeDefined();
      expect(readResult.data.branchContext).toBeDefined();
      expect(readResult.data.activeContext).toBeDefined();
      expect(readResult.data.progress).toBeDefined();
      expect(readResult.data.systemPatterns).toBeDefined();
      
      // Verify content structure is preserved (for at least one file)
      // Extract content for better type safety
      if (typeof readResult.data.activeContext === 'object' && readResult.data.activeContext !== null) {
        const activeContentObj = readResult.data.activeContext.content;
        if (typeof activeContentObj === 'object' && activeContentObj !== null) {
          // Now safely check properties
          expect(Object.keys(activeContentObj)).toContain('currentWork');
          // Extra safety check: Check specific content value if it exists
          const activeContent = activeContentObj as any;
          if (activeContent && 'currentWork' in activeContent) {
            expect((activeContent as any).currentWork).toBe("Testing core files operations");
          }
        }
      }
    } else {
      fail('Reading core files should have succeeded but failed');
    }
  });

  /**
   * Integration Test: Recent branches retrieval
   * 
   * This test verifies the functionality to get recently updated branches.
   * It ensures that after updating a document in a branch, that branch
   * appears in the recent branches list with correct metadata.
   */
  it('Should get recent branches', async () => {
    // Update a document to make the branch recent
    const updateDocPath = 'update-for-recent.json';
    const updateContent = JSON.stringify({
      schema: "memory_document_v2",
      metadata: {
        id: uuidv4(),
        title: "Updated Document",
        documentType: "text",
        path: updateDocPath,
        tags: ["recent"],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        text: "This document was updated to test recent branches functionality."
      }
    }, null, 2);
    
    // Write document to update branch's last modified time
    const writeResult = await controller.writeDocument(testBranch, updateDocPath, updateContent);
    expect(writeResult.success).toBe(true);

    // Get recent branches with limit 1
    const result = await controller.getRecentBranches(1);
    expect(result.success).toBe(true);
    
    if (result.success && 'data' in result && result.data && 'branches' in result.data) {
      // At least one branch should be returned
      expect(result.data.branches.length).toBeGreaterThanOrEqual(1);
      
      // The test branch should be in the result (likely the first one)
      const testBranchFound = result.data.branches.some((branch: { name: string }) => branch.name === testBranch);
      expect(testBranchFound).toBe(true);
      
      // Check branch metadata is properly returned
      const branch = result.data.branches.find((branch: { name: string }) => branch.name === testBranch);
      if (branch) {
        expect(branch.name).toBe(testBranch);
        expect(branch.lastModified).toBeDefined();
        
        // Verify lastModified is recent (within the last minute)
        const lastModifiedDate = new Date(branch.lastModified);
        const now = new Date();
        const diffMs = now.getTime() - lastModifiedDate.getTime();
        expect(diffMs).toBeLessThan(60000); // Less than 1 minute
      }
    } else {
      fail('Recent branches should have been returned');
    }
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
