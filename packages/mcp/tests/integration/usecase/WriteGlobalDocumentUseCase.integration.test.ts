/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, type TestEnv } from '../helpers/test-env.js';
import { loadGlobalFixture, getFixtureContent } from '../helpers/fixtures-loader.js';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js'; // Import DI container and setup function
import { WriteGlobalDocumentUseCase, type WriteGlobalDocumentOutput } from '../../../src/application/usecases/global/WriteGlobalDocumentUseCase.js'; // Import real UseCase and types
import { ReadGlobalDocumentUseCase } from '../../../src/application/usecases/global/ReadGlobalDocumentUseCase.js'; // Keep Read UseCase for verification
import { DomainError, DomainErrors } from '../../../src/shared/errors/DomainError.js'; // Import specific errors for checking
import { ApplicationErrors } from '../../../src/shared/errors/ApplicationError.js'; // Import specific errors for checking

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
}); // 一番外側の describe の閉じ括弧
