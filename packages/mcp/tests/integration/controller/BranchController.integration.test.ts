/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, createBranchDir, type TestEnv } from '../helpers/test-env.js';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js'; // Import DI container and setup function
import { BranchController } from '../../../src/interface/controllers/BranchController.js'; // Import real controller
// ★★★ WriteBranchDocumentOutput をインポート ★★★
import type { WriteBranchDocumentOutput } from '../../../src/application/usecases/branch/WriteBranchDocumentUseCase.js';
import { logger } from '../../../src/shared/utils/logger.js';
// Custom Type Guard function to check if data matches the expected output structure
// (content and tags are optional)
function isWriteBranchDocumentOutputData(data: any): data is WriteBranchDocumentOutput['document'] {
  return data &&
         typeof data === 'object' &&
         'path' in data && typeof data.path === 'string' &&
         'lastModified' in data && typeof data.lastModified === 'string' &&
         // content and tags are optional
         (!('content' in data) || typeof data.content === 'string') &&
         (!('tags' in data) || Array.isArray(data.tags));
}

describe('BranchController Integration Tests', () => {
  let testEnv: TestEnv;
  let container: DIContainer;
  const TEST_BRANCH = 'feature/test-branch';
  // スキーマ変更に合わせて documentType をトップレベルに移動
  const simpleDocument = {
    schema: "memory_document_v2",
    documentType: "test", // documentType をトップレベルに
    metadata: {
      id: "test-branch-doc",
      title: "テストブランチドキュメント",
      // documentType: "test", // metadata から削除
      path: 'test-document.json', // Default path, can be overridden in tests
      tags: ["test", "branch"],
      lastModified: new Date().toISOString(), // Use valid ISO string
      createdAt: expect.any(String), // createdAt は write 時に設定されるので any で OK
      version: 1
    },
    content: {
      value: "ブランチドキュメントのテスト内容"
    }
  };
  beforeEach(async () => {
    testEnv = await setupTestEnv();
    await createBranchDir(testEnv, TEST_BRANCH);
    container = await setupContainer({ docsRoot: testEnv.docRoot });
  });

  afterEach(async () => {
    await cleanupTestEnv(testEnv);
  });

  describe('readDocument', () => {
    it('should return an error when trying to read from an empty branch', async () => {
      const controller = await container.get<BranchController>('branchController');
      const result = await controller.readDocument(TEST_BRANCH, 'non-existent.json');

      expect(result.success).toBe(false);
      if (result.success) throw new Error('Expected error but got success'); // Use throw new Error
      expect(result.error).toBeDefined();
    });

    it('should write and read a branch document successfully', async () => {
      const controller = await container.get<BranchController>('branchController');
      const documentPath = 'test-document.json';
      // Use the common simpleDocument definition, potentially overriding path if needed
      // スキーマ変更に合わせて修正 (documentType はトップレベルなので metadata の外)
      const testDoc = { ...simpleDocument, metadata: { ...simpleDocument.metadata, path: documentPath } };
      const documentContentString = JSON.stringify(testDoc, null, 2);

      // Call writeDocument with a single params object
      const writeResult = await controller.writeDocument({
        branchName: TEST_BRANCH,
        path: documentPath,
        content: documentContentString,
        tags: testDoc.metadata.tags // Pass tags too
      });

      expect(writeResult.success).toBe(true);
      if (!writeResult.success) throw new Error('Expected success but got error'); // Use throw new Error
      expect(writeResult.data).toBeDefined();

      // ★★★ タイプガードの条件を反転させ、エラーケースを先に処理 ★★★
      if (!isWriteBranchDocumentOutputData(writeResult.data)) {
          // Log the actual data for debugging if the type guard fails
          logger.error("--- Assertion Error: writeResult.data did not match expected output structure.", { actualData: writeResult.data, component: 'BranchController.integration.test' });
          throw new Error('Expected writeResult.data to match the expected output structure');
      }
      // ★★★ タイプガードの後なので安全にアクセスできる ★★★
      expect(writeResult.data.path).toBe(documentPath);

      const readResult = await controller.readDocument(TEST_BRANCH, documentPath);

      expect(readResult.success).toBe(true);
      if (!readResult.success) throw new Error('Expected success but got error'); // Use throw new Error
      expect(readResult.data).toBeDefined();
      // readResult.data の型ガードも追加 (readDocument は DocumentDTO を返す想定)
      if (!readResult.data || !readResult.data.document || typeof readResult.data.document.content !== 'string') {
          logger.error("--- Assertion Error: readResult.data.document.content was not a string.", { actualData: readResult.data, component: 'BranchController.integration.test' });
          throw new Error('Expected readResult.data.document.content to be a string');
      }
      const parsed = JSON.parse(readResult.data.document.content);

      // Use testDoc for comparison as it has the correct path
      expect(parsed.metadata.id).toBe(testDoc.metadata.id);
      expect(parsed.metadata.title).toBe(testDoc.metadata.title);
      expect(parsed.documentType).toBe(testDoc.documentType); // documentType はトップレベル
      expect(parsed.metadata.path).toBe(testDoc.metadata.path);
      expect(parsed.metadata.tags).toEqual(testDoc.metadata.tags);
      expect(readResult.data.document.lastModified).toEqual(expect.any(String));
      expect(parsed.metadata.version).toBe(testDoc.metadata.version);
      expect(parsed.content.value).toBe(testDoc.content.value);
    });

    it('should return an error when reading from a non-existent branch', async () => {
      const controller = await container.get<BranchController>('branchController');
      const result = await controller.readDocument('non-existent-branch', 'some-file.json');

      expect(result.success).toBe(false);
      if (result.success) throw new Error('Expected error but got success'); // Use throw new Error
      expect(result.error).toBeDefined();
    });
  });

  describe('writeDocument', () => {

    it('should create a new branch and write a document successfully', async () => {
      const controller = await container.get<BranchController>('branchController');
      const NEW_BRANCH = 'feature/new-test-branch';
      const documentPath = 'new-branch-file.json';
      // Use the common simpleDocument definition, overriding necessary fields
      // スキーマ変更に合わせて修正
      const newBranchDoc = {
        ...simpleDocument,
        documentType: "new-branch-type", // 新しい documentType
        metadata: {
          ...simpleDocument.metadata,
          id: "new-branch-test",
          title: "新規ブランチテスト",
          path: documentPath,
          tags: ["test", "new-branch"],
          // documentType は metadata に含めない
        },
        content: {
          value: "新規ブランチのドキュメント"
        }
      };
      const documentContentString = JSON.stringify(newBranchDoc, null, 2);

      // Call writeDocument with a single params object
      const writeResult = await controller.writeDocument({
        branchName: NEW_BRANCH,
        path: documentPath,
        content: documentContentString,
        tags: newBranchDoc.metadata.tags // Pass tags too
      });

      expect(writeResult.success).toBe(true);
      if (!writeResult.success) throw new Error('Expected success but got error'); // Use throw new Error
      expect(writeResult.data).toBeDefined();

      const readResult = await controller.readDocument(NEW_BRANCH, documentPath);

      expect(readResult.success).toBe(true);
      if (!readResult.success) throw new Error('Expected success but got error'); // Use throw new Error
      expect(readResult.data).toBeDefined();
      // readResult.data の型ガードも追加
      if (!readResult.data || !readResult.data.document || typeof readResult.data.document.content !== 'string') {
          logger.error("--- Assertion Error: readResult.data.document.content was not a string.", { actualData: readResult.data, component: 'BranchController.integration.test' });
          throw new Error('Expected readResult.data.document.content to be a string');
      }
      const parsed = JSON.parse(readResult.data.document.content);
      // Use newBranchDoc for comparison
      expect(parsed.metadata.id).toBe(newBranchDoc.metadata.id);
      expect(parsed.content.value).toBe(newBranchDoc.content.value);
    });
    it('should update (overwrite) an existing document successfully', async () => {
      const controller = await container.get<BranchController>('branchController');
      const documentPath = 'test-document-to-update.json';
      // スキーマ変更に合わせて修正
      const initialDoc = {
        ...simpleDocument,
        documentType: "update-test", // documentType をトップレベルに
        metadata: { ...simpleDocument.metadata, id: "update-test-initial", path: documentPath, version: 1 }, // metadata から documentType 削除
        content: { value: "Initial content" }
      };
      // スキーマ変更に合わせて修正
      const updatedDoc = {
        ...simpleDocument,
        documentType: "update-test", // documentType は同じ
        metadata: { ...simpleDocument.metadata, id: "update-test-updated", title: "Updated Title", path: documentPath, version: 2 }, // metadata から documentType 削除
        content: { value: "Updated content" }
      };
      const initialContentString = JSON.stringify(initialDoc, null, 2);
      const updatedContentString = JSON.stringify(updatedDoc, null, 2);

      // 1. Write initial document
      // Call writeDocument with a single params object
      const initialWriteResult = await controller.writeDocument({
        branchName: TEST_BRANCH,
        path: documentPath,
        content: initialContentString,
        tags: initialDoc.metadata.tags // Pass tags too
      });
      expect(initialWriteResult.success).toBe(true);
      if (!initialWriteResult.success) throw new Error('Expected success but got error on initial write'); // Use throw new Error
      expect(initialWriteResult.data).toBeDefined();

      // 2. Write updated document (overwrite)
      // Call writeDocument with a single params object
      const updateResult = await controller.writeDocument({
        branchName: TEST_BRANCH,
        path: documentPath,
        content: updatedContentString,
        tags: updatedDoc.metadata.tags // Pass tags too
      });
      expect(updateResult.success).toBe(true);
      if (!updateResult.success) throw new Error('Expected success but got error on update write'); // Use throw new Error
      expect(updateResult.data).toBeDefined();

      // ★★★ タイプガードの条件を反転させ、エラーケースを先に処理 ★★★
      if (!isWriteBranchDocumentOutputData(updateResult.data)) {
           // Log the actual data for debugging if the type guard fails
           logger.error("--- Assertion Error: updateResult.data did not match expected output structure.", { actualData: updateResult.data, component: 'BranchController.integration.test' });
           throw new Error('Expected updateResult.data to match the expected output structure');
       }
       // ★★★ タイプガードの後なので安全にアクセスできる ★★★
       expect(updateResult.data.path).toBe(documentPath);

      // 3. Read the document and verify updated content
      const readResult = await controller.readDocument(TEST_BRANCH, documentPath);
      expect(readResult.success).toBe(true);
      if (!readResult.success) throw new Error('Expected success but got error on read after update'); // Use throw new Error
      expect(readResult.data).toBeDefined();
      // readResult.data の型ガードも追加
      if (!readResult.data || !readResult.data.document || typeof readResult.data.document.content !== 'string') {
          logger.error("--- Assertion Error: readResult.data.document.content was not a string.", { actualData: readResult.data, component: 'BranchController.integration.test' });
          throw new Error('Expected readResult.data.document.content to be a string');
      }
      const parsed = JSON.parse(readResult.data.document.content);

      expect(parsed.metadata.id).toBe(updatedDoc.metadata.id);
      expect(parsed.metadata.title).toBe(updatedDoc.metadata.title);
      expect(parsed.metadata.version).toBe(updatedDoc.metadata.version); // Check version increment (or update logic)
      expect(parsed.content.value).toBe(updatedDoc.content.value);
    });
  });
});
