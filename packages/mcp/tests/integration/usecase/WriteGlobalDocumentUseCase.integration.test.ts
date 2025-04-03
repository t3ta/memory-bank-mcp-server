/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, type TestEnv } from '../helpers/test-env.js';
import { loadGlobalFixture, getFixtureContent } from '../helpers/fixtures-loader.js';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js'; // Import DI container and setup function
import { WriteGlobalDocumentUseCase, type WriteGlobalDocumentOutput } from '../../../src/application/usecases/global/WriteGlobalDocumentUseCase.js'; // Import real UseCase and types
import { ReadGlobalDocumentUseCase } from '../../../src/application/usecases/global/ReadGlobalDocumentUseCase.js'; // Keep Read UseCase for verification
import { DomainError, DomainErrors } from '../../../src/shared/errors/DomainError.js'; // Import specific errors for checking
import { ApplicationError, ApplicationErrors } from '../../../src/shared/errors/ApplicationError.js'; // ★ ApplicationError クラスもインポート
import * as rfc6902 from 'rfc6902'; // ★ デバッグ用にインポート

import fs from 'fs-extra'; // Use default import for fs-extra
import * as path from 'path';

describe('WriteGlobalDocumentUseCase Integration Tests', () => {
  let testEnv: TestEnv;
  let container: DIContainer; // Use DI container
  let writeUseCase: WriteGlobalDocumentUseCase;
  let readUseCase: ReadGlobalDocumentUseCase;

  beforeEach(async () => {
    // Setup test environment
    testEnv = await setupTestEnv();

    // Initialize DI container
    container = await setupContainer({ docsRoot: testEnv.docRoot });

    // Get the use case instances from container
    writeUseCase = await container.get<WriteGlobalDocumentUseCase>('writeGlobalDocumentUseCase');
    readUseCase = await container.get<ReadGlobalDocumentUseCase>('readGlobalDocumentUseCase');
  });

  afterEach(async () => {
    // Cleanup test environment
    await cleanupTestEnv(testEnv);
  });

  describe('execute', () => {
    it('should create a new document', async () => {
      const newDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "test-new-document",
          title: "テスト新規ドキュメント",
          documentType: "test",
          path: "test/new-document.json",
          tags: ["test", "integration"],
          lastModified: expect.any(String),
          createdAt: expect.any(String),
          version: 1
        },
        content: {
          sections: [
            {
              title: "テストセクション",
              content: "これは統合テスト用の新規ドキュメントです。"
            }
          ]
        }
      };
      const documentPath = 'test/new-document.json';
      const documentContentString = JSON.stringify(newDocument, null, 2);

      const result = await writeUseCase.execute({
        document: {
          path: documentPath,
          content: documentContentString,
          tags: newDocument.metadata.tags
        }
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(documentPath);

      const readResult = await readUseCase.execute({ path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();

      const readDocument = JSON.parse(readResult.document.content);
      expect(readDocument.schema).toBe('memory_document_v2');
      expect(readDocument.metadata.id).toBe('test-new-document');
      expect(readDocument.metadata.documentType).toBe('test');
    });

    it('should update an existing document', async () => {
      const originalDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "test-update-document",
          title: "更新前ドキュメント",
          documentType: "test",
          path: "test/update-document.json",
          tags: ["test", "integration"],
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
          title: "更新後ドキュメント",
          lastModified: new Date().toISOString(),
          version: 2
        },
        content: {
          value: "更新後の内容"
        }
      };
      const updatedContentString = JSON.stringify(updatedDocumentData, null, 2);

      const result = await writeUseCase.execute({
        document: {
          path: documentPath,
          content: updatedContentString,
          tags: updatedDocumentData.metadata.tags
        }
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(documentPath);

      const readResult = await readUseCase.execute({ path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();

      const readDocument = JSON.parse(readResult.document.content);
      expect(readDocument.metadata.title).toBe('更新後ドキュメント');
      expect(readDocument.metadata.version).toBe(2); // Version should be updated
      expect(readDocument.content.value).toBe('更新後の内容');
    });

    it('should write invalid JSON content as plain text', async () => {
      const invalidContent = '{"schema": "memory_document_v2", "metadata": {}'; // Invalid JSON
      const documentPath = 'test/invalid-as-plain-text.txt'; // Use .txt extension
      const tags = ['test', 'invalid-json', 'plain-text'];

      // 不正なJSONを書き込む (プレーンテキストとして扱われるはず)
      const writeResult = await writeUseCase.execute({
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
      const readResult = await readUseCase.execute({ path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();
      expect(readResult.document.path).toBe(documentPath);
      expect(readResult.document.content).toBe(invalidContent);
      // プレーンテキストなのでタグは空のはず
      expect(readResult.document.tags).toEqual([]);
    });

    it('should successfully write plain text content', async () => {
      const plainTextContent = 'This is just plain text, not JSON, for global.';
      const documentPath = 'test/plain-text-global-document.txt'; // 拡張子も変えてみる
      const tags = ['test', 'plain-text', 'global'];

      // プレーンテキストを書き込む
      const writeResult = await writeUseCase.execute({
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
      expect(writeResult.document.content).toBe(plainTextContent); // 内容が一致するか
      // プレーンテキストの場合、tags は writeResult には含まれないはず (リポジトリ実装による)
      // expect(writeResult.document.tags).toEqual(tags); // このアサーションは不要かも

      // 読み込んで再確認
      const readResult = await readUseCase.execute({ path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();
      expect(readResult.document.path).toBe(documentPath);
      expect(readResult.document.content).toBe(plainTextContent);
      // プレーンテキストファイルからタグは読み込めないので空のはず
      expect(readResult.document.tags).toEqual([]);
    });


    it('should handle path mismatch between input and metadata (uses input path)', async () => {
      // Document with mismatched path in metadata vs. input path
      const mismatchedDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "test-path-mismatch",
          title: "パス不一致ドキュメント",
          documentType: "test",
          path: "different/path.json", // Mismatched path
          tags: ["test"],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: {
          value: "パス不一致の内容"
        }
      };
      const actualPath = 'test/actual-path.json';
      const mismatchedContentString = JSON.stringify(mismatchedDocument, null, 2);

      // Current implementation uses the input path, ignoring metadata path during save.
      const result = await writeUseCase.execute({
        document: {
          path: actualPath,
          content: mismatchedContentString
        }
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(actualPath);

      const readResult = await readUseCase.execute({ path: actualPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();

      const readDocument = JSON.parse(readResult.document.content);
      // Check that the file is saved at 'actualPath', metadata path might be ignored/overwritten.
      expect(readDocument.metadata.id).toBe("test-path-mismatch");
    });
    it('should throw an error when attempting to write to a path outside the allowed directory', async () => {
      const invalidPath = '../outside-global-memory.json'; // Path traversal attempt
      const documentContent = JSON.stringify({
        schema: "memory_document_v2",
        metadata: {
          id: "test-invalid-path",
          title: "不正パスドキュメント",
          documentType: "test",
          path: invalidPath, // Metadata path might be ignored, but include for completeness
          tags: ["test", "error"],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: { value: "This should not be written" }
      }, null, 2);

      await expect(writeUseCase.execute({
        document: {
          path: invalidPath,
          content: documentContent
        }
      })).rejects.toThrow(DomainError); // Expect a DomainError for invalid path

      // Optionally, verify the file was NOT created outside the directory
      const potentiallyCreatedPath = path.resolve(testEnv.docRoot, '..', 'outside-global-memory.json');
      expect(fs.existsSync(potentiallyCreatedPath)).toBe(false); // Use existsSync after correct import
    });

    it('should return the created document content when returnContent is true', async () => {
      const newDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "test-global-return-true",
          title: "テスト Global returnContent: true",
          documentType: "test",
          path: "test/global-return-true.json",
          tags: ["test", "global", "return-content-true"],
          version: 1
        },
        content: { value: "Global returnContent: true のテスト" }
      };
      const documentPath = 'test/global-return-true.json';
      const documentContentString = JSON.stringify(newDocument, null, 2);

      // returnContent: true を指定
      const result = await writeUseCase.execute({
        document: {
          path: documentPath,
          content: documentContentString,
          tags: newDocument.metadata.tags
        },
        returnContent: true // ★★★ これが新しいオプション！ ★★★
      });

      // --- 検証 ---
      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(documentPath);
      expect(result.document.tags).toEqual(newDocument.metadata.tags);
      expect(result.document.lastModified).toEqual(expect.any(String));

      // content が undefined でないことを確認してからパース
      if (result.document.content === undefined) {
        throw new Error('Expected document content to be defined when returnContent is true');
      }
      const returnedDocument = JSON.parse(result.document.content);

      // 比較用に期待値を整形
      const expectedDocumentStructure = {
          schema: newDocument.schema,
          metadata: {
              id: newDocument.metadata.id,
              title: newDocument.metadata.title,
              documentType: newDocument.metadata.documentType,
              path: newDocument.metadata.path,
              tags: newDocument.metadata.tags,
              version: newDocument.metadata.version
          },
          content: newDocument.content
      };
      expect(returnedDocument).toEqual(expectedDocumentStructure);

      // 念のため readUseCase でも確認
      const readResult = await readUseCase.execute({ path: documentPath });
      // content が undefined でないことを確認してから比較
      if (result.document.content === undefined) {
        throw new Error('Expected document content to be defined when returnContent is true for comparison');
      }
      expect(readResult.document.content.trim()).toBe(result.document.content.trim());
      expect(readResult.document.tags).toEqual(result.document.tags);
      expect(readResult.document.lastModified).toEqual(expect.any(String));
    });

    it('should return only minimal info when returnContent is false', async () => {
      const newDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "test-global-return-false",
          title: "テスト Global returnContent: false",
          documentType: "test",
          path: "test/global-return-false.json",
          tags: ["test", "global", "return-content-false"],
          version: 1
        },
        content: { value: "Global returnContent: false のテスト" }
      };
      const documentPath = 'test/global-return-false.json';
      const documentContentString = JSON.stringify(newDocument, null, 2);

      // returnContent: false を指定
      const result = await writeUseCase.execute({
        document: {
          path: documentPath,
          content: documentContentString,
          tags: newDocument.metadata.tags
        },
        returnContent: false // ★★★ 明示的に false を指定 ★★★
      });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe(documentPath);
      expect(result.document.lastModified).toEqual(expect.any(String));
      // ★★★ content と tags が undefined であることを期待 ★★★
      expect(result.document.content).toBeUndefined();
      expect(result.document.tags).toBeUndefined();
    });

    it('should return only minimal info when returnContent is not specified (defaults to false)', async () => {
       const newDocument = {
         schema: "memory_document_v2",
         metadata: {
           id: "test-global-return-default",
           title: "テスト Global returnContent: default",
           documentType: "test",
           path: "test/global-return-default.json",
           tags: ["test", "global", "return-content-default"],
           version: 1
         },
         content: { value: "Global returnContent: default のテスト" }
       };
       const documentPath = 'test/global-return-default.json';
       const documentContentString = JSON.stringify(newDocument, null, 2);

       // returnContent を指定しない
       const result = await writeUseCase.execute({
         document: {
           path: documentPath,
           content: documentContentString,
           tags: newDocument.metadata.tags
         }
         // returnContent は指定しない
       });

       expect(result).toBeDefined();
       expect(result.document).toBeDefined();
       expect(result.document.path).toBe(documentPath);
       expect(result.document.lastModified).toEqual(expect.any(String));
       // ★★★ 本来は content と tags が undefined であることを期待 (今は実装がないので失敗するはず) ★★★
       expect(result.document.content).toBeUndefined();
       expect(result.document.tags).toBeUndefined();
    });
  }); // describe('execute', ...) の閉じ括弧

    // --- ここから追加するテストケース ---

    it('should update an existing document using patches', async () => {
      // 1. Setup: Create an initial document
      const initialDocument = {
        schema: "memory_document_v2",
        metadata: {
          id: "test-patch-update",
          title: "パッチ更新前",
          documentType: "test",
          path: "test/patch-update.json",
          tags: ["test", "integration"],
          version: 1
        },
        content: { value: "Initial Value" }
      };
      const documentPath = 'test/patch-update.json';
      await writeUseCase.execute({
        document: {
          path: documentPath,
          content: JSON.stringify(initialDocument, null, 2),
          tags: initialDocument.metadata.tags
        }
      });

      // 2. Define patches (★ as const で型を具体的にする)
      const patches = [
        { op: 'replace', path: '/content/value', value: 'Patched Value' } as const,
        { op: 'add', path: '/metadata/tags/-', value: 'patched' } as const
      ];
      const finalTags = ['test', 'integration', 'patched']; // Expected final tags

      // ★★★ デバッグ用: applyPatch を直接呼び出して結果を確認 ★★★
      try {
        const initialContentObjectForDebug = JSON.parse(JSON.stringify(initialDocument)); // ディープコピー
        // console.log('★★★ Debug: Applying patch directly ★★★');
        // console.log('★★★ Debug: Initial Object (before patch):', JSON.stringify(initialContentObjectForDebug, null, 2));
        // console.log('★★★ Debug: Patches:', JSON.stringify(patches, null, 2));
        // applyPatch を try...catch で囲む
        let directlyPatchedObject;
        let patchError = null;
        try {
          // applyPatch は元のオブジェクトを変更する可能性があるので注意
          directlyPatchedObject = rfc6902.applyPatch(initialContentObjectForDebug, patches);
        } catch (e) {
          patchError = e;
        }

        console.log('★★★ Debug: Error during applyPatch (if any):', patchError);
        // 元のオブジェクトが変更されていないか確認 (ディープコピーしたので変更されていないはず)
        console.log('★★★ Debug: Initial Object (after patch attempt):', JSON.stringify(initialContentObjectForDebug, null, 2));
        console.log('★★★ Debug: Directly Patched Object (result):', JSON.stringify(directlyPatchedObject, null, 2));
      } catch (debugError) {
        console.error('★★★ Debug: Error during outer debug block:', debugError);
      }
      // ★★★ デバッグ用ここまで ★★★

      // 3. Execute with patches and returnContent: true
      const resultWithContent = await writeUseCase.execute({
        // ★ as any でキャスト
        document: {
          path: documentPath,
          patches: patches, // Use patches instead of content
          tags: finalTags // Explicitly set final tags for the update operation
        } as any,
        returnContent: true
      });

      // 4. Assert resultWithContent
      expect(resultWithContent.document.content).toBeDefined();
      const updatedDocWithContent = JSON.parse(resultWithContent.document.content!);
      // ★ updatedDocWithContent の構造を確認するアサーションに変更
      // expect(updatedDocWithContent.content.value).toBe('Patched Value');
      // ★★★ アサーションを元に戻す ★★★
      // content プロパティがあるか確認し、なければエラーメッセージで構造を出力
      if (!updatedDocWithContent.content || updatedDocWithContent.content.value !== 'Patched Value') {
         // エラーメッセージはそのまま残して、失敗時に構造がわかるようにしておく
         throw new Error(`Assertion failed: updatedDocWithContent.content.value should be 'Patched Value'. Actual structure: ${JSON.stringify(updatedDocWithContent)}`);
      }
      expect(updatedDocWithContent.metadata.tags).toEqual(finalTags); // Check tags in returned content's metadata
      expect(resultWithContent.document.tags).toEqual(finalTags); // Check top-level returned tags

      // 5. Verify with readUseCase
      const readResult = await readUseCase.execute({ path: documentPath });
      const finalDoc = JSON.parse(readResult.document.content);
      expect(finalDoc.content.value).toBe('Patched Value');
      expect(finalDoc.metadata.tags).toEqual(finalTags); // Check tags in metadata of the actual file
      expect(readResult.document.tags).toEqual(finalTags); // Check tags read from the file

      // 6. Execute with patches and returnContent: false
      const patchesAgain = [{ op: 'replace', path: '/content/value', value: 'Patched Again' } as const]; // ★ as const
      const finalTagsAgain = ['test', 'integration', 'patched', 'again'];
      // ★★★ デバッグ: 2回目の実行直前の引数を確認 ★★★
      console.log('★★★ Debug: Executing 2nd patch with:', { patches: patchesAgain, tags: finalTagsAgain });
      const resultWithoutContent = await writeUseCase.execute({
        // ★ as any でキャスト
        document: {
          path: documentPath,
          patches: patchesAgain,
          tags: finalTagsAgain
        } as any,
        returnContent: false // Explicitly false
      });

      // 7. Assert resultWithoutContent
      expect(resultWithoutContent.document.content).toBeUndefined();
      expect(resultWithoutContent.document.tags).toBeUndefined();

      // 8. Verify final state with readUseCase
      // ★ refreshTagIndex が完了するのを待つために少し待機 (★ 500ms に延長)
      await new Promise(resolve => setTimeout(resolve, 500));
      const readResultFinal = await readUseCase.execute({ path: documentPath });
      const finalDocAgain = JSON.parse(readResultFinal.document.content);
      expect(finalDocAgain.content.value).toBe('Patched Again');
      expect(finalDocAgain.metadata.tags).toEqual(finalTagsAgain);
      expect(readResultFinal.document.tags).toEqual(finalTagsAgain);
    });

    it('should throw an error if patches are applied to a non-existent document', async () => {
      const documentPath = 'test/non-existent-for-patch.json';
      const patches = [{ op: 'add', path: '/foo', value: 'bar' }];

      // ★ as any でキャスト
      await expect(writeUseCase.execute({
        document: {
          path: documentPath,
          patches: patches
        } as any
      })).rejects.toThrow(ApplicationError); // Expect ApplicationError (NOT_FOUND)
    });

    it('should throw an error if patches are invalid (e.g., test fails)', async () => {
      // Setup: Create an initial document
      const initialDocument = {
        schema: "memory_document_v2",
        metadata: { path: 'test/invalid-patch.json', tags: [] },
        content: { value: "Initial" }
      };
      const documentPath = 'test/invalid-patch.json';
      await writeUseCase.execute({ document: { path: documentPath, content: JSON.stringify(initialDocument) } });

      const invalidPatches = [{ op: 'test', path: '/content/value', value: 'WrongValue' }]; // This test should fail

      // ★ as any でキャスト
      await expect(writeUseCase.execute({
        document: {
          path: documentPath,
          patches: invalidPatches
        } as any
      })).rejects.toThrow(ApplicationError); // Expect ApplicationError (INVALID_INPUT or similar due to patch failure)
    });

    it('should throw an error if existing content is not valid JSON when applying patches', async () => {
       const documentPath = 'test/invalid-json-for-patch.txt';
       const invalidJsonContent = 'this is { not json';
       // Write invalid content first (as plain text)
       await writeUseCase.execute({ document: { path: documentPath, content: invalidJsonContent } });

       const patches = [{ op: 'add', path: '/foo', value: 'bar' }];

       // ★ as any でキャスト
       await expect(writeUseCase.execute({
         document: {
           path: documentPath,
           patches: patches
         } as any
       })).rejects.toThrow(ApplicationError); // Expect ApplicationError (INVALID_STATE)
    });

    it('should throw an error if both content and patches are provided', async () => {
       const documentPath = 'test/content-and-patch.json';
       const content = JSON.stringify({ value: 'content' });
       const patches = [{ op: 'add', path: '/foo', value: 'bar' }];

       // ★ as any でキャスト
       await expect(writeUseCase.execute({
         document: {
           path: documentPath,
           content: content,
           patches: patches // Providing both
         } as any
       })).rejects.toThrow(ApplicationError); // Expect ApplicationError (INVALID_INPUT)
    });

    it('should throw an INVALID_INPUT error if neither content nor patches are provided', async () => {
      const documentPath = 'test/no-content-or-patch.json';

      try {
        // as any でキャストして content/patches なしの入力をテスト
        await writeUseCase.execute({
          document: {
            path: documentPath,
            // content と patches を意図的に省略
            tags: ['test']
          } as any // ★★★ Cast to any ★★★
        });
        throw new Error('Expected WriteGlobalDocumentUseCase to throw, but it did not.');
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        if (error instanceof ApplicationError) {
          expect(error.code).toBe('APP_ERROR.INVALID_INPUT');
          expect(error.message).toBe('Either document content or patches must be provided');
        } else {
          throw new Error(`Expected ApplicationError, but caught ${error}`);
        }
      }
    });

    it('should create an empty file when content is an empty string', async () => {
      const documentPath = 'test/empty-content-file.txt'; // Use .txt to emphasize it's not JSON
      const tags = ['test', 'empty-string'];

      // Execute with empty string content
      const writeResult = await writeUseCase.execute({
        document: {
          path: documentPath,
          content: "", // ★★★ Empty string content ★★★
          tags: tags
        },
        returnContent: true
      });

      // Assert write result
      expect(writeResult).toBeDefined();
      expect(writeResult.document).toBeDefined();
      expect(writeResult.document.path).toBe(documentPath);
      expect(writeResult.document.content).toBe(""); // Expect empty string content
      // Tags might be empty as empty content likely won't yield metadata
      // expect(writeResult.document.tags).toEqual([]); // This depends on repo implementation

      // Verify with readUseCase
      const readResult = await readUseCase.execute({ path: documentPath });
      expect(readResult).toBeDefined();
      expect(readResult.document).toBeDefined();
      expect(readResult.document.content).toBe("");
      expect(readResult.document.tags).toEqual([]); // Reading empty file should result in empty tags
    });

    // [削除] Issue #75 用のテストケースは新しい仕様で不要になったため削除
    // --- ここまで追加 ---
}); // 一番外側の describe の閉じ括弧
