/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, createBranchDir, type TestEnv } from '../helpers/test-env.js';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js'; // Import DI container and setup function
import { WriteBranchDocumentUseCase, type WriteBranchDocumentOutput } from '../../../src/application/usecases/branch/WriteBranchDocumentUseCase.js'; // Import real UseCase and types
import { ReadBranchDocumentUseCase } from '../../../src/application/usecases/branch/ReadBranchDocumentUseCase.js'; // Keep Read UseCase for verification
import { DomainError, DomainErrors } from '../../../src/shared/errors/DomainError.js'; // Import specific errors for checking
import { ApplicationError, ApplicationErrors } from '../../../src/shared/errors/ApplicationError.js'; // Import specific errors for checking
import { IGitService } from '../../../src/infrastructure/git/IGitService.js';
import { IConfigProvider } from '../../../src/infrastructure/config/interfaces/IConfigProvider.js';
import { IBranchMemoryBankRepository } from '../../../src/domain/repositories/IBranchMemoryBankRepository.js'; // Import missing interface
import type { WorkspaceConfig } from '../../../src/infrastructure/config/WorkspaceConfig.js';
import { BranchInfo } from '../../../src/domain/entities/BranchInfo.js';
import { jest } from '@jest/globals';
import { execSync } from 'child_process';
import { logger } from '../../../src/shared/utils/logger.js';
import { JsonPatchService } from '../../../src/domain/jsonpatch/JsonPatchService.js'; // Import JsonPatchService interface
import { Rfc6902JsonPatchAdapter } from '../../../src/domain/jsonpatch/Rfc6902JsonPatchAdapter.js'; // Import concrete implementation for testing
import { DocumentWriterService } from '../../../src/application/services/DocumentWriterService.js'; // Import DocumentWriterService

import * as path from 'path';
import fs from 'fs-extra'; // Use default import for fs-extra

describe('WriteBranchDocumentUseCase Integration Tests', () => {
  let testEnv: TestEnv;
  let container: DIContainer; // Use DI container
  let writeUseCase: WriteBranchDocumentUseCase;
  let readUseCase: ReadBranchDocumentUseCase;
  let mockGitService: jest.Mocked<IGitService>;
  let mockConfigProvider: jest.Mocked<IConfigProvider>;
  const TEST_BRANCH = 'feature/test-branch';

  beforeEach(async () => {
    // Setup test environment
    testEnv = await setupTestEnv();

    // Create test branch directory
    // Gitリポジトリ内でテストブランチを作成・チェックアウト
    try {
      execSync(`git checkout -b ${TEST_BRANCH}`, { cwd: testEnv.tempDir, stdio: 'ignore' });
      logger.debug(`[Test Setup] Checked out to new branch: ${TEST_BRANCH}`);
    } catch (gitError) {
      logger.error(`[Test Setup] Error creating/checking out branch ${TEST_BRANCH}:`, gitError);
      throw gitError; // エラーがあればテストを中断
    }

    // Create test branch directory (after checking out branch in git)
    await createBranchDir(testEnv, TEST_BRANCH);

    // Initialize DI container
    container = await setupContainer({ docsRoot: testEnv.docRoot });


    mockGitService = {
      getCurrentBranchName: jest.fn<() => Promise<string>>() // モック関数を作成
    };
    // getCurrentBranchNameが呼ばれたらTEST_BRANCHを返すように設定
    mockGitService.getCurrentBranchName.mockResolvedValue(TEST_BRANCH);
    container.register<IGitService>('gitService', mockGitService); // コンテナにGitServiceモックを登録


    mockConfigProvider = {
      initialize: jest.fn(),
      getConfig: jest.fn<() => WorkspaceConfig>(),
      getGlobalMemoryPath: jest.fn<() => string>(),
      getBranchMemoryPath: jest.fn<() => string>(),
      getLanguage: jest.fn<() => 'en' | 'ja' | 'zh'>()
    };
    // デフォルトの getConfig の戻り値を設定 (isProjectMode: true)
    mockConfigProvider.getConfig.mockReturnValue({
      docsRoot: testEnv.docRoot,
      verbose: false,
      language: 'en',
      isProjectMode: true // デフォルトはプロジェクトモードとしておく
    });
    // 他のメソッドのデフォルト戻り値も設定 (必要に応じて)
    const SAFE_TEST_BRANCH = BranchInfo.create(TEST_BRANCH).safeName; // safeName をここで計算
    mockConfigProvider.getGlobalMemoryPath.mockReturnValue(testEnv.globalMemoryPath);
    mockConfigProvider.getBranchMemoryPath.mockReturnValue(path.join(testEnv.branchMemoryPath, SAFE_TEST_BRANCH));
    mockConfigProvider.getLanguage.mockReturnValue('en');

    container.register<IConfigProvider>('configProvider', mockConfigProvider); // コンテナにConfigProviderモックを登録

   // Register JsonPatchService and DocumentWriterService for the test
   const jsonPatchService = new Rfc6902JsonPatchAdapter();
   container.register<JsonPatchService>('jsonPatchService', jsonPatchService);
   const documentWriterService = new DocumentWriterService(jsonPatchService);
   container.register<DocumentWriterService>('documentWriterService', documentWriterService);

   // Manually instantiate WriteBranchDocumentUseCase with mocks and real services for integration test
   // This bypasses the potentially complex factory setup in providers.ts for focused testing
   const branchRepository = await container.get<IBranchMemoryBankRepository>('branchMemoryBankRepository');
   writeUseCase = new WriteBranchDocumentUseCase(
       branchRepository,
       documentWriterService, // Inject the real service instance
       mockGitService,
       mockConfigProvider
   );

   // Get ReadUseCase from container as before
   readUseCase = await container.get<ReadBranchDocumentUseCase>('readBranchDocumentUseCase');
  });

  afterEach(async () => {
    // Cleanup test environment
    await cleanupTestEnv(testEnv);
  });

  describe('execute', () => {
    it('should create a new branch document', async () => {
      // スキーマ変更に合わせて documentType をトップレベルに移動
      const newDocument = {
        schema: "memory_document_v2",
        documentType: "test", // documentType をトップレベルに
        metadata: {
          id: "test-new-branch-document",
          title: "テスト新規ブランチドキュメント",
          // documentType: "test", // metadata から削除
          path: "test/new-document.json",
          tags: ["test", "integration", "branch"],
          lastModified: new Date().toISOString(), // Use valid ISO string
          createdAt: expect.any(String), // writeUseCase が設定
          version: 1
        },
        content: {
          sections: [
            {
              title: "テストセクション",
              content: "これはブランチテスト用の新規ドキュメントです。"
            }
          ]
        }
      };
      const documentPath = 'test/new-document.json';
      const documentContentString = JSON.stringify(newDocument, null, 2);

      const result = await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: documentPath,
          content: documentContentString,
          tags: newDocument.metadata.tags
        }
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(documentPath);

      const readResult = await readUseCase.execute({ branchName: TEST_BRANCH, path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();

      const readDocument = JSON.parse(readResult.document.content);
      expect(readDocument.schema).toBe('memory_document_v2');
      expect(readDocument.metadata.id).toBe('test-new-branch-document');
      expect(readDocument.documentType).toBe('test'); // トップレベルの documentType をチェック
    });

    it('should update an existing branch document', async () => {
      // スキーマ変更に合わせて documentType をトップレベルに移動
      const originalDocument = {
        schema: "memory_document_v2",
        documentType: "test", // documentType をトップレベルに
        metadata: {
          id: "test-update-branch-document",
          title: "更新前ブランチドキュメント",
          // documentType: "test", // metadata から削除
          path: "test/update-document.json",
          tags: ["test", "integration", "branch"],
          lastModified: expect.any(String), // writeUseCase が設定
          createdAt: expect.any(String), // writeUseCase が設定
          version: 1
        },
        content: {
          value: "更新前の内容"
        }
      };
      const documentPath = 'test/update-document.json';
      const originalContentString = JSON.stringify(originalDocument, null, 2);

      await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: documentPath,
          content: originalContentString,
          tags: originalDocument.metadata.tags
        }
      });

      // スキーマ変更に合わせて修正 (documentType は originalDocument から引き継がれる)
      const updatedDocumentData = {
        ...originalDocument, // documentType もコピーされる
        metadata: {
          ...originalDocument.metadata, // id, path, tags などもコピー
          title: "更新後ブランチドキュメント",
          lastModified: new Date().toISOString(), // 更新日時を更新
          version: 2 // バージョンを更新
          // documentType は metadata に含めない
        },
        content: {
          value: "更新後の内容"
        }
      };
      const updatedContentString = JSON.stringify(updatedDocumentData, null, 2);

      const result = await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: documentPath,
          content: updatedContentString,
          tags: updatedDocumentData.metadata.tags
        }
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(documentPath);

      const readResult = await readUseCase.execute({ branchName: TEST_BRANCH, path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();

      const readDocument = JSON.parse(readResult.document.content);
      expect(readDocument.metadata.title).toBe('更新後ブランチドキュメント');
      expect(readDocument.content.value).toBe('更新後の内容');
    });

    it('should write invalid JSON content as plain text', async () => {
      const invalidContent = '{"schema": "memory_document_v2", "metadata": {}'; // Invalid JSON
      const documentPath = 'test/invalid-as-plain-text-branch.txt'; // Use .txt extension
      const tags = ['test', 'invalid-json', 'plain-text', 'branch'];

      // 不正なJSONを書き込む (プレーンテキストとして扱われるはず)
      const writeResult = await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: documentPath,
          content: invalidContent,
          tags: tags
        },
        returnContent: true
      });

      // 書き込み成功を確認
      expect(writeResult).toBeDefined();
      expect(writeResult.document).toBeDefined();
      expect(writeResult.document.path).toBe(documentPath);
      expect(writeResult.document.content).toBe(invalidContent); // 内容がそのまま保存されているか

      // 読み込んで再確認
      const readResult = await readUseCase.execute({ branchName: TEST_BRANCH, path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();
      expect(readResult.document.path).toBe(documentPath);
      expect(readResult.document.content).toBe(invalidContent);
      // プレーンテキストなのでタグは空のはず
      expect(readResult.document.tags).toEqual([]);
    });

    it('should successfully write plain text content', async () => {
      const plainTextContent = 'This is just plain text, not JSON.';
      const documentPath = 'test/plain-text-document.txt'; // 拡張子も変えてみる
      const tags = ['test', 'plain-text'];

      // プレーンテキストを書き込む
      const writeResult = await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: documentPath,
          content: plainTextContent,
          tags: tags
        },
        returnContent: true // 内容を確認するために true にする
      });

      // 書き込み結果を確認
      expect(writeResult).toBeDefined();
      expect(writeResult.document).toBeDefined();
      expect(writeResult.document.path).toBe(documentPath);
      expect(writeResult.document.content).toBe(plainTextContent);

      // 読み込んで再確認
      const readResult = await readUseCase.execute({ branchName: TEST_BRANCH, path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();
      expect(readResult.document.path).toBe(documentPath);
      expect(readResult.document.content).toBe(plainTextContent);
      // プレーンテキストファイルからタグは読み込めないので空のはず
      expect(readResult.document.tags).toEqual([]);
    });


    it('should create a document when initializing a new branch', async () => {
      const NEW_BRANCH = 'feature/new-branch-test-auto-init';
      // スキーマ変更に合わせて documentType をトップレベルに移動
      const newBranchDocument = {
        schema: "memory_document_v2",
        documentType: "test", // documentType をトップレベルに
        metadata: {
          id: "test-new-branch",
          title: "新規ブランチテスト",
          // documentType: "test", // metadata から削除
          path: "test-new-branch.json",
          tags: ["test", "new-branch"],
          lastModified: new Date().toISOString(), // Use valid ISO string
          createdAt: expect.any(String), // writeUseCase が設定
          version: 1
        },
        content: {
          value: "新規ブランチのテストドキュメント"
        }
      };
      const documentPath = 'test-new-branch.json';
      const documentContentString = JSON.stringify(newBranchDocument, null, 2);

      const result = await writeUseCase.execute({
        branchName: NEW_BRANCH,
        document: {
          path: documentPath,
          content: documentContentString,
          tags: newBranchDocument.metadata.tags
        }
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(documentPath);

      const readResult = await readUseCase.execute({ branchName: NEW_BRANCH, path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();

      const readDocument = JSON.parse(readResult.document.content);
      expect(readDocument.metadata.id).toBe('test-new-branch');
      expect(readDocument.content.value).toBe('新規ブランチのテストドキュメント');
    });
    it('should throw an error when attempting to write to a path outside the allowed branch directory', async () => {
      const invalidPath = '../outside-branch-memory.json'; // Path traversal attempt
      // スキーマ変更に合わせて documentType をトップレベルに移動
      const documentContent = JSON.stringify({
        schema: "memory_document_v2",
        documentType: "test", // documentType をトップレベルに
        metadata: {
          id: "test-invalid-branch-path",
          title: "不正パスブランチドキュメント",
          // documentType: "test", // metadata から削除
          path: invalidPath, // Metadata path might be ignored
          tags: ["test", "error", "branch"],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: { value: "This should not be written in branch" }
      }, null, 2);

      await expect(writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: invalidPath,
          content: documentContent
        }
      })).rejects.toThrow(DomainErrors.validationError('Document path cannot contain ".."')); // Match actual error message

      // Optionally, verify the file was NOT created outside the branch directory
      const branchPath = path.join(testEnv.branchMemoryPath, TEST_BRANCH);
      const potentiallyCreatedPath = path.resolve(branchPath, invalidPath);
      // Ensure the potentially created path is not within the expected branch directory structure
      // This check might be complex depending on the exact path resolution logic,
      // but checking existence outside the main doc root is a good start.
      const pathOutsideDocsRoot = path.resolve(testEnv.docRoot, '..', 'outside-branch-memory.json');
      expect(fs.existsSync(potentiallyCreatedPath)).toBe(false);
      expect(fs.existsSync(pathOutsideDocsRoot)).toBe(false);
    });

    it('should update a document using patches', async () => {
      const initialDocument = {
        items: ["apple"]
      };
      const documentPath = 'test/patch-document.json';
      const initialContentString = JSON.stringify(initialDocument, null, 2);

      // 1. Create initial document with content
      await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: documentPath,
          content: initialContentString,
          tags: ["test", "patch"]
        }
      });

      // 2. Update the document using patches
      const patches = [
        { op: 'add', path: '/items/-', value: 'banana' }
      ];

      const patchResult = await writeUseCase.execute({
        branchName: TEST_BRANCH,
        // content は省略し、as any でキャスト
        document: {
          path: documentPath,
          tags: ["test", "patch", "updated"] // Optionally update tags too
        } as any,
        patches: patches
      });

      expect(patchResult).toBeDefined();
      expect(patchResult.document).toBeDefined();
      expect(patchResult.document.path).toBe(documentPath);

      // 3. Read the document and verify the patch was applied
      const readResult = await readUseCase.execute({ branchName: TEST_BRANCH, path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();
      // Log the actual content read from the file for debugging
      // Log the raw content string read from the file before parsing
      logger.error('--- Raw content after patch read from file:', { content: readResult.document.content, component: 'WriteBranchDocumentUseCase.integration.test' });

      const readDocument = JSON.parse(readResult.document.content);
      // Log the parsed document object for debugging
      logger.error('--- Parsed document object:', { document: readDocument, component: 'WriteBranchDocumentUseCase.integration.test' });
      expect(readDocument.items).toEqual(["apple", "banana"]); // Verify patch applied correctly
      // Also verify tags if they were updated
      expect(readResult.document.tags).toEqual(["test", "patch", "updated"]);
    });

    it('should throw an error if patches are applied to a non-existent document (branch)', async () => {
      const documentPath = 'test/non-existent-patch-target.json';
      const patches = [{ op: 'add', path: '/newField', value: 'newValue' }];

      await expect(writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: { path: documentPath } as any, // Cast to avoid content requirement for this test
        patches: patches
      })).rejects.toThrow(ApplicationErrors.notFound('Document', documentPath));
    });

    it('should throw an error if patches test operation fails (branch)', async () => {
      const initialDocument = { value: 'initial' };
      const documentPath = 'test/patch-test-fail.json';
      await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: { path: documentPath, content: JSON.stringify(initialDocument) }
      });

      const patches = [{ op: 'test', path: '/value', value: 'wrong-value' }];

      await expect(writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: { path: documentPath } as any,
        patches: patches
      })).rejects.toThrow(/Patch test operation failed/); // Match specific error if possible, otherwise general message
    });

    it('should throw an error if existing content is not valid JSON when applying patches (branch)', async () => {
      const invalidContent = 'this is not json';
      const documentPath = 'test/patch-invalid-json.txt';
      await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: { path: documentPath, content: invalidContent }
      });

      const patches = [{ op: 'add', path: '/newField', value: 'newValue' }];

      await expect(writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: { path: documentPath } as any,
        patches: patches
      })).rejects.toThrow(/Failed to parse existing document content as JSON/);
    });

    it('should throw an error if both content and patches are provided (branch)', async () => {
      const documentPath = 'test/content-and-patch.json';
      const content = JSON.stringify({ initial: 'data' });
      const patches = [{ op: 'add', path: '/newField', value: 'newValue' }];

      await expect(writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: { path: documentPath, content: content },
        patches: patches
      })).rejects.toThrow('Cannot provide both document content and patches simultaneously');
    });

    it('should throw an INVALID_INPUT error if neither content nor patches are provided (branch)', async () => {
      const documentPath = 'test/no-content-no-patch.json';

      await expect(writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: { path: documentPath } // content と patches がない
      })).rejects.toThrow('Either document content or patches must be provided');
    });

    it('should return the created document content when returnContent is true', async () => {
      // スキーマ変更に合わせて documentType をトップレベルに移動
      const newDocument = {
        schema: "memory_document_v2",
        documentType: "test", // documentType をトップレベルに
        metadata: {
          id: "test-return-content-true",
          title: "テスト returnContent: true",
          // documentType: "test", // metadata から削除
          path: "test/return-content-true.json",
          tags: ["test", "return-content"], // 小文字とハイフンに修正
          // lastModified と createdAt は writeUseCase が設定
          version: 1
        },
        content: { value: "returnContent: true のテスト" }
      };
      const documentPath = 'test/return-content-true.json';
      const documentContentString = JSON.stringify(newDocument, null, 2);

      // returnContent: true を指定して書き込み
      const result = await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: documentPath,
          content: documentContentString,
          tags: newDocument.metadata.tags // ここも修正後のタグを使う
        },
        returnContent: true // ★★★ これが新しいオプション！ ★★★
      });

      // --- 検証 ---
      expect(result).toBeDefined();
      // ★★★ 本来はここに document が返ってくるはず！ (今はまだ実装されてないので失敗するはず) ★★★
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(documentPath);
      expect(result.document.tags).toEqual(newDocument.metadata.tags); // ここも修正後のタグを使う
      expect(result.document.lastModified).toEqual(expect.any(String)); // 日時は生成されるはず

      // 返却された content が正しいか検証
      // content が undefined でないことを確認してからパース
      if (result.document.content === undefined) {
        throw new Error('Expected document content to be defined when returnContent is true');
      }
      const returnedDocument = JSON.parse(result.document.content);

      // 比較用に期待値を整形 ★★★ content 文字列に含まれるべき構造だけを newDocument から抽出 ★★★
      // 期待される構造から documentType を削除し、トップレベルでチェックするようにする
      const expectedMetadataStructure = {
          id: newDocument.metadata.id,
          title: newDocument.metadata.title,
          // documentType: newDocument.documentType, // トップレベルでチェック
          path: newDocument.metadata.path,
          tags: newDocument.metadata.tags,
          version: newDocument.metadata.version
          // lastModified と createdAt は writeUseCase が設定するので、ここでは比較しない
      }; // expectedMetadataStructure の閉じ括弧
      // 551, 552 行目を削除

      // returnedDocument (パース結果) と期待値を比較する
      // lastModified と createdAt は writeUseCase が設定するので、それ以外のメタデータを比較
      expect(returnedDocument.metadata).toMatchObject(expectedMetadataStructure); // Use toMatchObject for partial comparison if needed, or adjust expectedMetadataStructure
      expect(returnedDocument.content).toEqual(newDocument.content); // Compare content separately
      expect(returnedDocument.schema).toEqual(newDocument.schema); // Compare schema separately
      // returnedLastModified のチェックは削除

      // 念のため readUseCase でも確認 (返却された内容と同じはず)
      const readResult = await readUseCase.execute({ branchName: TEST_BRANCH, path: documentPath });
      // content が undefined でないことを確認してから比較
      if (result.document.content === undefined || readResult.document.content === undefined) {
        throw new Error('Expected document content to be defined for comparison');
      }
      // パースして lastModified を除いて比較
      const parsedReadResult = JSON.parse(readResult.document.content);
      const { lastModified: readLastModified, ...readMeta } = parsedReadResult.metadata;
      expect(readMeta).toEqual(expectedMetadataStructure); // 正しい期待値と比較
      expect(parsedReadResult.content).toEqual(newDocument.content); // 正しい期待値と比較
      expect(parsedReadResult.schema).toEqual(newDocument.schema); // 正しい期待値と比較
      expect(readLastModified).toEqual(expect.any(String)); // ★ ファイルから読んだものには lastModified があることを確認 ★

      expect(readResult.document.tags).toEqual(result.document.tags);
      // lastModified はミリ秒単位でずれる可能性があるので、存在と型だけチェック
      expect(result.document.lastModified).toEqual(expect.any(String));
      expect(readResult.document.lastModified).toEqual(expect.any(String));
    });

    it('should return only minimal info when returnContent is false', async () => {
      const newDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "test-return-content-false",
          title: "テスト returnContent: false",
          documentType: "test",
          path: "test/return-content-false.json",
          tags: ["test", "return-content-false"],
          version: 1
        },
        content: { value: "returnContent: false のテスト" }
      };
      const documentPath = 'test/return-content-false.json';
      const documentContentString = JSON.stringify(newDocument, null, 2);

      // returnContent: false を指定して書き込み
      const result = await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: documentPath,
          content: documentContentString,
          tags: newDocument.metadata.tags
        },
        returnContent: false // ★★★ false を指定 ★★★
      });

      // --- 検証 ---
      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(documentPath);
      expect(result.document.lastModified).toEqual(expect.any(String));
      // ★★★ content と tags が返却されないことを確認 ★★★
      expect(result.document.content).toBeUndefined();
      expect(result.document.tags).toBeUndefined();

      // 念のため readUseCase でも確認 (ファイルには書き込まれているはず)
      const readResult = await readUseCase.execute({ branchName: TEST_BRANCH, path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();
      expect(readResult.document.content).toBeDefined(); // ファイルには content がある
      expect(readResult.document.tags).toEqual(newDocument.metadata.tags); // ファイルには tags がある
    });

    it('should return only minimal info when returnContent is not specified (defaults to false)', async () => {
      const newDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "test-return-content-default",
          title: "テスト returnContent: default",
          documentType: "test",
          path: "test/return-content-default.json",
          tags: ["test", "return-content-default"],
          version: 1
        },
        content: { value: "returnContent: default のテスト" }
      };
      const documentPath = 'test/return-content-default.json';
      const documentContentString = JSON.stringify(newDocument, null, 2);

      // returnContent を指定せずに書き込み
      const result = await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: documentPath,
          content: documentContentString,
          tags: newDocument.metadata.tags
        }
        // returnContent は指定しない
      });

      // --- 検証 ---
      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(documentPath);
      expect(result.document.lastModified).toEqual(expect.any(String));
      // ★★★ content と tags が返却されないことを確認 (デフォルトは false なので) ★★★
      expect(result.document.content).toBeUndefined();
      expect(result.document.tags).toBeUndefined();

      // 念のため readUseCase でも確認
      const readResult = await readUseCase.execute({ branchName: TEST_BRANCH, path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();
      expect(readResult.document.content).toBeDefined();
      expect(readResult.document.tags).toEqual(newDocument.metadata.tags);
    });


    it('should successfully write valid content to branchContext.json', async () => {
      const documentPath = 'branchContext.json';
      const validContent = {
        schema: "memory_document_v2",
        metadata: {
          id: `${BranchInfo.create(TEST_BRANCH).safeName}-context`,
          title: "Valid Branch Context",
          documentType: "branch_context",
          path: documentPath,
          tags: ["valid", "context"],
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          version: 1
        },
        content: { description: "This is a valid branch context." }
      };
      const contentString = JSON.stringify(validContent, null, 2);

      const result = await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: documentPath,
          content: contentString,
          tags: validContent.metadata.tags
        }
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(documentPath);

      const readResult = await readUseCase.execute({ branchName: TEST_BRANCH, path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();
      const readContent = JSON.parse(readResult.document.content);
      expect(readContent.content.description).toBe("This is a valid branch context.");
      expect(readContent.metadata.tags).toEqual(["valid", "context"]);
    });


    it('should create an empty file when content is an empty string (non-branchContext)', async () => {
      const documentPath = 'test/empty-file-branch.txt'; // Use .txt to avoid JSON validation
      const tags = ['test', 'empty'];

      // 空文字列を content として書き込む
      const writeResult = await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: documentPath,
          content: "", // 空文字列
          tags: tags
        },
        returnContent: true
      });

      expect(writeResult).toBeDefined();
      expect(writeResult.document).toBeDefined();
      expect(writeResult.document.path).toBe(documentPath);
      expect(writeResult.document.content).toBe("");

      const readResult = await readUseCase.execute({ branchName: TEST_BRANCH, path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();
      expect(readResult.document.content).toBe("");
      expect(readResult.document.tags).toEqual([]); // Empty file has no tags
    });

    it('should throw error when writing invalid JSON content to branchContext.json', async () => {
      const documentPath = 'branchContext.json';
      const invalidJson = '{"schema": "v2", "metadata": {';
      await expect(writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: { path: documentPath, content: invalidJson }
      })).rejects.toThrow(/Invalid JSON content for branchContext.json/);
    });

    it('should throw error when writing JSON content missing required keys to branchContext.json', async () => {
      const documentPath = 'branchContext.json';
      const missingKeysJson = JSON.stringify({
        schema: "memory_document_v2",
        // metadata is missing
        content: { value: "test" }
      }, null, 2);
      await expect(writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: { path: documentPath, content: missingKeysJson }
      })).rejects.toThrow(/Invalid JSON content for branchContext.json: Missing required key: metadata/);
    });

    it('should throw error when attempting to use patches on branchContext.json', async () => {
      // ★★★ branchContext.json に書き込む内容は正しいスキーマ構造にする ★★★
      const initialDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: `${BranchInfo.create(TEST_BRANCH).safeName}-context`, // IDも合わせる
          title: "Test Branch Context",
          documentType: "branch_context",
          path: "branchContext.json",
          tags: ["context"], // ★ tags を追加 ★
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          version: 1
        },
        content: { initial: "content" } // ★ テストの期待値に合わせる ★
      };
      const documentPath = 'branchContext.json';
      const initialContentString = JSON.stringify(initialDocument, null, 2);

      // 1. Create initial document with valid structure and tags
      await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: documentPath,
          content: initialContentString,
          tags: initialDocument.metadata.tags // ★ tags を渡す ★
        }
      });

      // ★★★ デバッグコードは削除 ★★★

      // 2. Attempt to update using patches (should fail with specific error)
      const patches = [{ op: 'replace', path: '/content/initial', value: 'patched' }]; // ★ path も修正 ★
      await expect(writeUseCase.execute({
        branchName: TEST_BRANCH,
        // content は省略し、as any でキャスト
        document: { path: 'branchContext.json', tags: ["context", "patched"] } as any, // ★★★ tags も渡すように修正 ★★★
        patches: patches
      // ★★★ 期待するエラーを ApplicationErrors.invalidInput のメッセージ文字列に変更 ★★★
      })).rejects.toThrow('Patch operations are currently not allowed for branchContext.json');
    });
    // [削除] Issue #75 用のテストケースは新しい仕様で不要になったため削除

    // [追加] content も patches も指定しない場合にエラーになるテスト
    it('should throw an INVALID_INPUT error if neither content nor patches are provided (branch)', async () => {
      const documentPath = 'test/no-content-or-patch-branch.json';

      try {
        await writeUseCase.execute({
          branchName: TEST_BRANCH,
          // document オブジェクトは必要だが、content は省略 (patches もなし)
          document: {
            path: documentPath,
            tags: ['test']
          } as any // Cast to allow missing content for testing
        });
        throw new Error('Expected WriteBranchDocumentUseCase to throw, but it did not.');
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        if (error instanceof ApplicationError) {
          // WriteBranchDocumentUseCase では初期化ロジックがあるため、
          // content/patches なしでもエラーにならない場合がある。
          // ここでは、初期化されないファイルパスでエラーになることを期待する。
          // (より厳密なテストは UseCase のロジックに依存する)
          // → 仕様変更により、初期化ロジックは削除され、エラーになるはず
           expect(error.code).toBe('APP_ERROR.INVALID_INPUT');
           expect(error.message).toBe('Either document content or patches must be provided');
        } else {
          throw new Error(`Expected ApplicationError, but caught ${error}`);
        }
      }
    });

    describe('when branchName is omitted in project mode (isProjectMode: true)', () => {
      beforeEach(() => {
        // この describe 内では isProjectMode: true を強制
        mockConfigProvider.getConfig.mockReturnValue({
          docsRoot: testEnv.docRoot, verbose: false, language: 'en', isProjectMode: true
        });
      });

      it('should create a document using the current git branch', async () => {
        const newDocument = { schema: "v2", content: "auto branch" };
        const documentPath = 'test/created-no-branchname-project.json';
        const contentString = JSON.stringify(newDocument);

        const result = await writeUseCase.execute({
          // branchName is omitted
          document: { path: documentPath, content: contentString, tags: ["auto"] }
        });

        expect(result).toBeDefined();
        expect(result.document.path).toBe(documentPath);

        // Verify using the detected branch name
        const readResult = await readUseCase.execute({ branchName: TEST_BRANCH, path: documentPath });
        // --- みらい：content をパースして中身を比較 ---
        const readContentParsed = JSON.parse(readResult?.document?.content ?? '{}');
        const expectedContentParsed = JSON.parse(contentString);
        expect(readContentParsed.schema).toBe(expectedContentParsed.schema);
        expect(readContentParsed.content).toEqual(expectedContentParsed.content); // content はオブジェクトなので toEqual
        // --- みらい：ここまで ---
        expect(readResult?.document?.tags).toEqual(["auto"]); // タグのチェックはそのまま
      });

      it('should update a document using patches using the current git branch', async () => {
        const initialDoc = { items: ["a"] };
        const docPath = 'test/patched-no-branchname-project.json';
        await writeUseCase.execute({ branchName: TEST_BRANCH, document: { path: docPath, content: JSON.stringify(initialDoc), tags: ["initial"] } });

        const patches = [{ op: 'add', path: '/items/-', value: 'b' }];
        const result = await writeUseCase.execute({
          // branchName is omitted
          document: { path: docPath, tags: ["patched"] } as any,
          patches: patches
        });

        expect(result).toBeDefined();
        expect(result.document.path).toBe(docPath);

        const readResult = await readUseCase.execute({ branchName: TEST_BRANCH, path: docPath });
        const finalDoc = JSON.parse(readResult!.document!.content);
        expect(finalDoc.items).toEqual(["a", "b"]);
        expect(readResult!.document!.tags).toEqual(["patched"]);
      });

      it('should return an error if current branch cannot be determined', async () => {
        mockGitService.getCurrentBranchName.mockRejectedValue(new Error('Not a git repository'));

        await expect(writeUseCase.execute({
          // branchName is omitted
          document: { path: 'test.json', content: '{}' }
        })).rejects.toThrow(/Branch name is required but could not be automatically determined/);
      });
    });

    describe('when branchName is omitted outside of project mode (isProjectMode: false)', () => {
      beforeEach(() => {
        // この describe 内では isProjectMode: false を強制
        mockConfigProvider.getConfig.mockReturnValue({
          docsRoot: testEnv.docRoot, verbose: false, language: 'en', isProjectMode: false
        });
      });

      it('should return an error when creating a document because branchName is required', async () => {
        await expect(writeUseCase.execute({
          // branchName is omitted
          document: { path: 'test/created-no-branchname-no-project.json', content: '{}' }
        // ★★★ エラーメッセージ文字列で比較 ★★★
        })).rejects.toThrow('Branch name is required when not running in project mode.');
      });

      it('should return an error when updating with patches because branchName is required', async () => {
         // First create a document to patch
         const docPath = 'test/patched-no-branchname-no-project.json';
         await writeUseCase.execute({ branchName: TEST_BRANCH, document: { path: docPath, content: '{"a":1}' } });

         const patches = [{ op: 'replace', path: '/a', value: 2 }];
         await expect(writeUseCase.execute({
           // branchName is omitted
           document: { path: docPath } as any,
           patches: patches
         // ★★★ エラーメッセージ文字列で比較 ★★★
         })).rejects.toThrow('Branch name is required when not running in project mode.');
      });
    });
  });
});
