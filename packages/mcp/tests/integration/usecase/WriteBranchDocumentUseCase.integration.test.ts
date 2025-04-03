/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, createBranchDir, type TestEnv } from '../helpers/test-env.js';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js'; // Import DI container and setup function
import { WriteBranchDocumentUseCase, type WriteBranchDocumentOutput } from '../../../src/application/usecases/branch/WriteBranchDocumentUseCase.js'; // Import real UseCase and types
import { ReadBranchDocumentUseCase } from '../../../src/application/usecases/branch/ReadBranchDocumentUseCase.js'; // Keep Read UseCase for verification
import { DomainError, DomainErrors } from '../../../src/shared/errors/DomainError.js'; // Import specific errors for checking
import { ApplicationError, ApplicationErrors } from '../../../src/shared/errors/ApplicationError.js'; // Import specific errors for checking

import * as path from 'path';
import fs from 'fs-extra'; // Use default import for fs-extra

describe('WriteBranchDocumentUseCase Integration Tests', () => {
  let testEnv: TestEnv;
  let container: DIContainer; // Use DI container
  let writeUseCase: WriteBranchDocumentUseCase;
  let readUseCase: ReadBranchDocumentUseCase;
  const TEST_BRANCH = 'feature/test-branch';

  beforeEach(async () => {
    // Setup test environment
    testEnv = await setupTestEnv();

    // Create test branch directory
    await createBranchDir(testEnv, TEST_BRANCH);

    // Initialize DI container
    container = await setupContainer({ docsRoot: testEnv.docRoot });

    // Get the use case instances from container
    writeUseCase = await container.get<WriteBranchDocumentUseCase>('writeBranchDocumentUseCase');
    readUseCase = await container.get<ReadBranchDocumentUseCase>('readBranchDocumentUseCase');
  });

  afterEach(async () => {
    // Cleanup test environment
    await cleanupTestEnv(testEnv);
  });

  describe('execute', () => {
    it('should create a new branch document', async () => {
      const newDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "test-new-branch-document",
          title: "テスト新規ブランチドキュメント",
          documentType: "test",
          path: "test/new-document.json",
          tags: ["test", "integration", "branch"],
          lastModified: new Date().toISOString(), // Use valid ISO string
          createdAt: expect.any(String),
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
      expect(readDocument.metadata.documentType).toBe('test');
    });

    it('should update an existing branch document', async () => {
      const originalDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "test-update-branch-document",
          title: "更新前ブランチドキュメント",
          documentType: "test",
          path: "test/update-document.json",
          tags: ["test", "integration", "branch"],
          lastModified: expect.any(String),
          createdAt: expect.any(String),
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

      const updatedDocumentData = {
        ...originalDocument,
        metadata: {
          ...originalDocument.metadata,
          title: "更新後ブランチドキュメント",
          lastModified: new Date().toISOString(),
          version: 2
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
      const newBranchDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "test-new-branch",
          title: "新規ブランチテスト",
          documentType: "test",
          path: "test-new-branch.json",
          tags: ["test", "new-branch"],
          lastModified: new Date().toISOString(), // Use valid ISO string
          createdAt: expect.any(String),
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
      const documentContent = JSON.stringify({
        schema: "memory_document_v2",
        metadata: {
          id: "test-invalid-branch-path",
          title: "不正パスブランチドキュメント",
          documentType: "test",
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
      console.error('--- Raw content after patch read from file:', readResult.document.content);

      const readDocument = JSON.parse(readResult.document.content);
      // Log the parsed document object for debugging
      console.error('--- Parsed document object:', JSON.stringify(readDocument, null, 2));
      expect(readDocument.items).toEqual(["apple", "banana"]); // Verify patch applied correctly
      // Also verify tags if they were updated
      expect(readResult.document.tags).toEqual(["test", "patch", "updated"]);
    }); // Closing brace for it('should update a document using patches', ...)

    it('should return the created document content when returnContent is true', async () => {
      const newDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "test-return-content-true",
          title: "テスト returnContent: true",
          documentType: "test",
          path: "test/return-content-true.json",
          tags: ["test", "return-content"], // 小文字とハイフンに修正
          // lastModified と createdAt は writeUseCase が設定するので、ここでは含めないか、expect.any(String) を使う
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
      const expectedDocumentStructure = {
          schema: newDocument.schema,
          metadata: {
              id: newDocument.metadata.id,
              title: newDocument.metadata.title,
              documentType: newDocument.metadata.documentType,
              path: newDocument.metadata.path,
              tags: newDocument.metadata.tags,
              version: newDocument.metadata.version
              // lastModified と createdAt は content 文字列には含まれないので除外
          },
          content: newDocument.content
      };
      // returnedDocument (パース結果) と expectedDocumentStructure を比較する
      // lastModified は UseCase のレスポンスには含まれないので、それ以外のメタデータを比較
      const expectedMeta = expectedDocumentStructure.metadata;
      expect(returnedDocument.metadata).toEqual(expectedMeta);
      expect(returnedDocument.content).toEqual(expectedDocumentStructure.content);
      expect(returnedDocument.schema).toEqual(expectedDocumentStructure.schema);
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
      expect(readMeta).toEqual(expectedMeta); // UseCase のレスポンスと同じ期待値と比較
      expect(parsedReadResult.content).toEqual(expectedDocumentStructure.content);
      expect(parsedReadResult.schema).toEqual(expectedDocumentStructure.schema);
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

      // returnContent: false を指定
      const result = await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: documentPath,
          content: documentContentString,
          tags: newDocument.metadata.tags
        },
        returnContent: false // ★★★ 明示的に false を指定 ★★★
      });

      expect(result).toBeDefined();
      // ★★★ 本来は document.content や document.tags が undefined であることを期待 (今は実装がないので失敗するはず) ★★★
      expect(result.document).toBeDefined(); // document 自体は存在するかもしれない (型定義による)
      expect(result.document.path).toBe(documentPath);
      expect(result.document.lastModified).toEqual(expect.any(String));
      expect(result.document.content).toBeUndefined(); // 実装後に期待するアサーション (今は失敗するはず)
      expect(result.document.tags).toBeUndefined(); // 実装後に期待するアサーション (今は失敗するはず)
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

       // returnContent を指定しない
       const result = await writeUseCase.execute({
         branchName: TEST_BRANCH,
         document: {
           path: documentPath,
           content: documentContentString,
           tags: newDocument.metadata.tags
         }
         // returnContent は指定しない
       }); // writeUseCase.execute の閉じ括弧

       expect(result).toBeDefined();
       // ★★★ 本来は document.content や document.tags が undefined であることを期待 (今は実装がないので失敗するはず) ★★★
       expect(result.document).toBeDefined(); // document 自体は存在するかもしれない (型定義による)
       expect(result.document.path).toBe(documentPath);
       expect(result.document.lastModified).toEqual(expect.any(String));
       expect(result.document.content).toBeUndefined(); // 実装後に期待するアサーション (今は失敗するはず)
       expect(result.document.tags).toBeUndefined(); // 実装後に期待するアサーション (今は失敗するはず)
    });

    // --- branchContext.json Guard Tests ---

    it('should successfully write valid content to branchContext.json', async () => {
      const validBranchContext = {
        schema: "memory_document_v2",
        metadata: {
          id: `${TEST_BRANCH}-context`,
          documentType: "branch_context",
          path: "branchContext.json",
          tags: ["context", "branch"],
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          version: 1
        },
        content: {
          value: "Valid context content for test"
        }
      };
      const documentPath = 'branchContext.json';
      const contentString = JSON.stringify(validBranchContext, null, 2);

      const result = await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: documentPath,
          content: contentString,
          tags: validBranchContext.metadata.tags
        }
      });

      expect(result).toBeDefined();
      expect(result.document.path).toBe(documentPath);

      // Verify content was written
      const readResult = await readUseCase.execute({ branchName: TEST_BRANCH, path: documentPath });
      const readContent = JSON.parse(readResult.document.content);
      expect(readContent.content.value).toBe("Valid context content for test");
    });

    // [修正] 新仕様: branchContext.json への空文字列書き込みはエラーにならないはず (ただし、有効なJSONである必要はある)
    // → このテストは意図的に空ファイルを作るテストに置き換える
    // it('should throw error when writing empty string content to branchContext.json', async () => { ... });

    // [修正] 新仕様: branchContext.json への空オブジェクト文字列書き込みはエラーにならないはず (有効なJSONとして)
    // → このテストは有効なJSONなら書き込めるテストに含めるか、別途正常系テストで確認
    // it('should throw error when writing empty object string content to branchContext.json', async () => { ... });

    // [追加] content: "" で空ファイルが作成されるテスト (branchContext.json 以外)
    it('should create an empty file when content is an empty string (non-branchContext)', async () => {
      const documentPath = 'test/empty-file-branch.txt';
      const tags = ['test', 'empty-string', 'branch'];

      const writeResult = await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: {
          path: documentPath,
          content: "", // ★★★ Empty string content ★★★
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
      // First, create a valid branchContext.json
      const validBranchContext = {
        schema: "memory_document_v2",
        metadata: { id: `${TEST_BRANCH}-context`, documentType: "branch_context", path: "branchContext.json" },
        content: { value: "Initial context" }
      };
      await writeUseCase.execute({
        branchName: TEST_BRANCH,
        document: { path: 'branchContext.json', content: JSON.stringify(validBranchContext) }
      });

      // Attempt to apply patches
      const patches = [{ op: 'replace', path: '/content/value', value: 'Patched context' }];
      await expect(writeUseCase.execute({
        branchName: TEST_BRANCH,
        // content は省略し、as any でキャスト
        document: { path: 'branchContext.json' } as any,
        patches: patches
      })).rejects.toThrow(ApplicationErrors.invalidInput('Patch operations are currently not allowed for branchContext.json'));
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

  }); // describe('execute', ...) の閉じ括弧
}); // 一番外側の describe の閉じ括弧
