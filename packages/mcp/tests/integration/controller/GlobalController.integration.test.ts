/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, type TestEnv } from '../helpers/test-env.js';
import { loadGlobalFixture, getFixtureContent } from '../helpers/fixtures-loader.js';
// import { Application } from '../mocks/Application'; // Removed mock application
import * as path from 'path';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js'; // Import DI container and setup function
import { GlobalController } from '../../../src/interface/controllers/GlobalController.js'; // Import real controller
import type { DocumentDTO } from '../../../src/application/dtos/DocumentDTO.js'; // Import DTO type
import type { MCPResponse } from '../../../src/interface/presenters/types/MCPResponse.js'; // Import response types
import { DomainError } from '../../../src/shared/errors/DomainError.js';

describe('GlobalController Integration Tests', () => {
  let testEnv: TestEnv;
  // let app: Application; // Removed mock application instance
  let container: DIContainer; // Use DI container
  // スキーマ変更に合わせて documentType をトップレベルに移動
  const simpleDocument = {
    schema: "memory_document_v2",
    documentType: "test", // documentType をトップレベルに
    metadata: {
      id: "test-global-doc",
      title: "テストグローバルドキュメント",
      // documentType: "test", // metadata から削除
      path: 'test/global-document.json', // Default path, can be overridden
      tags: ["test", "global"],
      lastModified: expect.any(String), // write 時に設定されるので any で OK
      createdAt: expect.any(String), // write 時に設定されるので any で OK
      version: 1
    },
    content: {
      value: "グローバルドキュメントのテスト内容"
    }
  };

  beforeEach(async () => {
    // Setup test environment
    testEnv = await setupTestEnv();
    // Initialize DI container with test configuration
    container = await setupContainer({ docsRoot: testEnv.docRoot });
    // Removed mock application initialization
    // app = new Application({ docsRoot: testEnv.docRoot });
  });

  afterEach(async () => {
    // Cleanup test environment
    await cleanupTestEnv(testEnv);
  });

  describe('readDocument', () => {
    it('should read a document from the global memory bank', async () => {
      await loadGlobalFixture(testEnv.globalMemoryPath, 'minimal');

      const controller = await container.get<GlobalController>('globalController');

      const result = await controller.readDocument('core/glossary.json');

      expect(result.success).toBe(true);
      if (!result.success) fail('Expected success but got error'); // Add type guard
      expect(result.data).toBeDefined();
      expect(result.data.path).toBe('core/glossary.json');
      expect(typeof result.data.content).toBe('string');

      const parsed = JSON.parse(result.data.content);
      expect(parsed).toHaveProperty('schema');
      expect(parsed).toHaveProperty('metadata');
      expect(parsed).toHaveProperty('content');
    });

    it('should return an error when reading a non-existent document', async () => {
      const controller = await container.get<GlobalController>('globalController');

      const result = await controller.readDocument('non-existent.json');

      expect(result.success).toBe(false);
      if (result.success) fail('Expected error but got success'); // Add type guard
      expect(result.error).toBeDefined();
    });
  });

  describe('writeDocument', () => {
    it('should create a new global document successfully', async () => {
      const controller = await container.get<GlobalController>('globalController');

      const documentPath = 'test/simple-document.json';
      // Use common simpleDocument, override path and potentially other fields
      // スキーマ変更に合わせて修正
      const testDoc = {
        ...simpleDocument,
        documentType: "simple-test", // documentType をトップレベルに
        metadata: {
          ...simpleDocument.metadata,
          id: "test-simple-doc",
          title: "テストドキュメント",
          path: documentPath,
          tags: ["test"],
          // documentType は metadata に含めない
        },
        content: {
          value: "簡単なテストドキュメント"
        }
      };
      const documentContentString = JSON.stringify(testDoc, null, 2);

      const writeResult = await controller.writeDocument({
        path: documentPath,
        content: documentContentString
      });

      expect(writeResult.success).toBe(true);
      if (!writeResult.success) fail('Expected success but got error'); // Add type guard
      expect(writeResult.data).toBeDefined(); // Check data on success, remove message check

      const readResult = await controller.readDocument(documentPath);
      expect(readResult.success).toBe(true);
      if (!readResult.success) fail('Expected success but got error on read'); // Add type guard
      expect(readResult.data).toBeDefined();
      const parsedRead = JSON.parse(readResult.data.content);
      // Use testDoc for comparison
      expect(parsedRead.metadata.id).toBe(testDoc.metadata.id);
      expect(parsedRead.content.value).toBe(testDoc.content.value);
    });

    it('should write invalid JSON content as plain text', async () => {
      const controller = await container.get<GlobalController>('globalController');
      const invalidContent = '{"schema": "memory_document_v2", "metadata": {}'; // Invalid JSON
      const documentPath = 'test/invalid-as-plain-text-controller.txt'; // Use .txt extension

      // 不正なJSONを書き込む (プレーンテキストとして扱われるはず)
      const writeResult = await controller.writeDocument({
        path: documentPath,
        content: invalidContent
        // tags はコントローラーの writeDocument では直接受け付けない
      });

      // 書き込み成功を確認
      expect(writeResult.success).toBe(true);
      if (!writeResult.success) fail('Expected success but got error');
      expect(writeResult.data).toBeDefined();
      // 書き込み成功を確認 (returnContent: false なので最小限の情報のみ)
      expect(writeResult.success).toBe(true);
      if (!writeResult.success) fail('Expected success but got error');
      expect(writeResult.data).toBeDefined();
      // writeResult.data.document が期待通りの形か確認
      expect(writeResult.data.document).toBeDefined();
      expect(typeof writeResult.data.document.path).toBe('string');
      expect(typeof writeResult.data.document.lastModified).toBe('string');
      expect(writeResult.data.document.path).toBe(documentPath);
      expect(writeResult.data.document.lastModified).toEqual(expect.any(String));
      // content と tags が undefined であることを確認
      expect(writeResult.data.document.content).toBeUndefined();
      expect(writeResult.data.document.tags).toBeUndefined();

      // 読み込んで再確認
      const readResult = await controller.readDocument(documentPath);
      expect(readResult.success).toBe(true);
      if (!readResult.success) fail('Expected success but got error on read');
      expect(readResult.data).toBeDefined();
      expect(readResult.data.path).toBe(documentPath);
      expect(readResult.data.content).toBe(invalidContent); // 内容がそのまま保存されているか
      // プレーンテキストなのでタグは空のはず
      expect(readResult.data.tags).toEqual([]);
    });
    it('should update (overwrite) an existing global document successfully', async () => {
      const controller = await container.get<GlobalController>('globalController');
      const documentPath = 'test/document-to-update.json';

      // Initial document setup using common definition
      // スキーマ変更に合わせて修正
      const initialDoc = {
        ...simpleDocument,
        documentType: "update-test", // documentType をトップレベルに
        metadata: { ...simpleDocument.metadata, id: "update-test-initial", path: documentPath, version: 1 }, // metadata から documentType 削除
        content: { value: "Initial global content" }
      };
      const initialContentString = JSON.stringify(initialDoc, null, 2);

      // Updated document setup
      // スキーマ変更に合わせて修正
      const updatedDoc = {
        ...simpleDocument,
        documentType: "update-test", // documentType は同じ
        metadata: { ...simpleDocument.metadata, id: "update-test-updated", title: "Updated Global Title", path: documentPath, version: 2 }, // metadata から documentType 削除
        content: { value: "Updated global content" }
      };
      const updatedContentString = JSON.stringify(updatedDoc, null, 2);

      // 1. Write initial document
      const initialWriteResult = await controller.writeDocument({ path: documentPath, content: initialContentString });
      expect(initialWriteResult.success).toBe(true);
      if (!initialWriteResult.success) fail('Expected success but got error on initial write');
      expect(initialWriteResult.data).toBeDefined();

      // 2. Write updated document (overwrite)
      const updateResult = await controller.writeDocument({ path: documentPath, content: updatedContentString });
      expect(updateResult.success).toBe(true);
      if (!updateResult.success) fail('Expected success but got error on update write');
      expect(updateResult.data).toBeDefined(); // Remove message check

      // 3. Read the document and verify updated content
      const readResult = await controller.readDocument(documentPath);
      expect(readResult.success).toBe(true);
      if (!readResult.success) fail('Expected success but got error on read after update');
      expect(readResult.data).toBeDefined();
      const parsed = JSON.parse(readResult.data.content);

      expect(parsed.metadata.id).toBe(updatedDoc.metadata.id);
      expect(parsed.metadata.title).toBe(updatedDoc.metadata.title);
      expect(parsed.metadata.version).toBe(updatedDoc.metadata.version);
      expect(parsed.content.value).toBe(updatedDoc.content.value);
    });
  });
});
