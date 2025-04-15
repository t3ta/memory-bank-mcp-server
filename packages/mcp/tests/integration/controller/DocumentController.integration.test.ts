/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, createBranchDir, type TestEnv } from '../helpers/test-env.js';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js';
import { DocumentController } from '../../../src/interface/controllers/DocumentController.js';
import { logger } from '../../../src/shared/utils/logger.js';

describe('DocumentController Integration Tests', () => {
  let testEnv: TestEnv;
  let container: DIContainer;
  const TEST_BRANCH = 'feature/test-branch';

  // スキーマ変更に合わせて documentType をトップレベルに配置
  const testDocument = {
    schema: "memory_document_v2",
    documentType: "test", // トップレベルに documentType を配置
    metadata: {
      id: "test-doc",
      title: "テストドキュメント",
      path: 'test-document.json',
      tags: ["test", "document"],
      lastModified: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      version: 1
    },
    content: {
      value: "テストコンテンツ"
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
      const controller = await container.get<DocumentController>('documentController');
      const result = await controller.readDocument({
        scope: 'branch',
        branchName: TEST_BRANCH,
        path: 'non-existent.json'
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error('Expected error but got success');
      expect(result.error).toBeDefined();
    });

    it('should write and read a branch document successfully', async () => {
      const controller = await container.get<DocumentController>('documentController');
      const documentPath = 'test-document.json';
      const documentContent = JSON.stringify(testDocument);

      // 書き込み操作
      const writeResult = await controller.writeDocument({
        scope: 'branch',
        branchName: TEST_BRANCH,
        path: documentPath,
        content: documentContent,
        tags: testDocument.metadata.tags
      });

      expect(writeResult.success).toBe(true);
      if (!writeResult.success) throw new Error('Expected success but got error');
      expect(writeResult.data).toBeDefined();

      // 読み取り操作
      const readResult = await controller.readDocument({
        scope: 'branch',
        branchName: TEST_BRANCH,
        path: documentPath
      });

      expect(readResult.success).toBe(true);
      if (!readResult.success) throw new Error('Expected success but got error');
      expect(readResult.data).toBeDefined();

      // DocumentControllerはオブジェクト形式でdocumentプロパティに値を返す
      if (!readResult.data || !readResult.data.document || !readResult.data.document.content) {
        logger.error("--- Assertion Error: readResult.data does not have expected structure.", {
          actualData: readResult.data,
          component: 'DocumentController.integration.test'
        });
        throw new Error('Expected readResult.data to contain document with content');
      }

      // オブジェクト形式の場合は直接contentにアクセス
      const documentData = readResult.data.document;
      const parsedContent = typeof documentData.content === 'string'
        ? JSON.parse(documentData.content)
        : documentData.content;

      // 検証
      expect(parsedContent.metadata.id).toBe(testDocument.metadata.id);
      expect(parsedContent.metadata.title).toBe(testDocument.metadata.title);
      expect(parsedContent.documentType).toBe(testDocument.documentType); // トップレベルのdocumentType
      expect(parsedContent.content.value).toBe(testDocument.content.value);
    });

    it('should return an error when reading from a non-existent branch', async () => {
      const controller = await container.get<DocumentController>('documentController');
      const result = await controller.readDocument({
        scope: 'branch',
        branchName: 'non-existent-branch',
        path: 'some-file.json'
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error('Expected error but got success');
      expect(result.error).toBeDefined();
    });
  });

  describe('writeDocument', () => {
    it('should create a new branch and write a document successfully', async () => {
      const controller = await container.get<DocumentController>('documentController');
      const NEW_BRANCH = 'feature/new-test-branch';
      const documentPath = 'new-branch-file.json';

      // 新しいドキュメント作成
      const newBranchDoc = {
        ...testDocument,
        documentType: "new-branch-type",
        metadata: {
          ...testDocument.metadata,
          id: "new-branch-test",
          title: "新規ブランチテスト",
          path: documentPath,
          tags: ["test", "new-branch"]
        },
        content: {
          value: "新規ブランチのドキュメント"
        }
      };

      const documentContent = JSON.stringify(newBranchDoc);

      // 書き込み操作
      const writeResult = await controller.writeDocument({
        scope: 'branch',
        branchName: NEW_BRANCH,
        path: documentPath,
        content: documentContent,
        tags: newBranchDoc.metadata.tags
      });

      expect(writeResult.success).toBe(true);
      if (!writeResult.success) throw new Error('Expected success but got error');
      expect(writeResult.data).toBeDefined();

      // 読み取り操作
      const readResult = await controller.readDocument({
        scope: 'branch',
        branchName: NEW_BRANCH,
        path: documentPath
      });

      expect(readResult.success).toBe(true);
      if (!readResult.success) throw new Error('Expected success but got error');
      expect(readResult.data).toBeDefined();

      // DocumentControllerはオブジェクト形式でdocumentプロパティに値を返す
      if (!readResult.data || !readResult.data.document || !readResult.data.document.content) {
        logger.error("--- Assertion Error: readResult.data does not have expected structure.", {
          actualData: readResult.data,
          component: 'DocumentController.integration.test'
        });
        throw new Error('Expected readResult.data to contain document with content');
      }

      // オブジェクト形式の場合は直接contentにアクセス
      const documentData = readResult.data.document;
      const parsedContent = typeof documentData.content === 'string'
        ? JSON.parse(documentData.content)
        : documentData.content;

      // 検証
      expect(parsedContent.metadata.id).toBe(newBranchDoc.metadata.id);
      expect(parsedContent.content.value).toBe(newBranchDoc.content.value);
    });

    it('should update (overwrite) an existing document successfully', async () => {
      const controller = await container.get<DocumentController>('documentController');
      const documentPath = 'test-document-to-update.json';

      // 初期ドキュメント
      const initialDoc = {
        ...testDocument,
        documentType: "update-test",
        metadata: {
          ...testDocument.metadata,
          id: "update-test-initial",
          path: documentPath,
          version: 1
        },
        content: {
          value: "Initial content"
        }
      };

      // 更新ドキュメント
      const updatedDoc = {
        ...testDocument,
        documentType: "update-test",
        metadata: {
          ...testDocument.metadata,
          id: "update-test-updated",
          title: "Updated Title",
          path: documentPath,
          version: 2
        },
        content: {
          value: "Updated content"
        }
      };

      const initialContent = JSON.stringify(initialDoc);
      const updatedContent = JSON.stringify(updatedDoc);

      // 初期ドキュメント書き込み
      const initialWriteResult = await controller.writeDocument({
        scope: 'branch',
        branchName: TEST_BRANCH,
        path: documentPath,
        content: initialContent,
        tags: initialDoc.metadata.tags
      });

      expect(initialWriteResult.success).toBe(true);
      if (!initialWriteResult.success) throw new Error('Expected success but got error on initial write');
      expect(initialWriteResult.data).toBeDefined();

      // 更新ドキュメント書き込み
      const updateResult = await controller.writeDocument({
        scope: 'branch',
        branchName: TEST_BRANCH,
        path: documentPath,
        content: updatedContent,
        tags: updatedDoc.metadata.tags
      });

      expect(updateResult.success).toBe(true);
      if (!updateResult.success) throw new Error('Expected success but got error on update write');
      expect(updateResult.data).toBeDefined();

      // 読み取り操作
      const readResult = await controller.readDocument({
        scope: 'branch',
        branchName: TEST_BRANCH,
        path: documentPath
      });

      expect(readResult.success).toBe(true);
      if (!readResult.success) throw new Error('Expected success but got error on read after update');
      expect(readResult.data).toBeDefined();

      // DocumentControllerはオブジェクト形式でdocumentプロパティに値を返す
      if (!readResult.data || !readResult.data.document || !readResult.data.document.content) {
        logger.error("--- Assertion Error: readResult.data does not have expected structure.", {
          actualData: readResult.data,
          component: 'DocumentController.integration.test'
        });
        throw new Error('Expected readResult.data to contain document with content');
      }

      // オブジェクト形式の場合は直接contentにアクセス
      const documentData = readResult.data.document;
      const parsedContent = typeof documentData.content === 'string'
        ? JSON.parse(documentData.content)
        : documentData.content;

      // 検証
      expect(parsedContent.metadata.id).toBe(updatedDoc.metadata.id);
      expect(parsedContent.metadata.title).toBe(updatedDoc.metadata.title);
      expect(parsedContent.metadata.version).toBe(updatedDoc.metadata.version);
      expect(parsedContent.content.value).toBe(updatedDoc.content.value);
    });

    it('should throw error when both content and patches are provided', async () => {
      const controller = await container.get<DocumentController>('documentController');

      // contentとpatchesを両方提供
      await expect(controller.writeDocument({
        scope: 'branch',
        branchName: TEST_BRANCH,
        path: 'test/conflict-document.json',
        content: JSON.stringify(testDocument),
        patches: [{ op: 'add', path: '/content/newValue', value: 'test' }]
      })).rejects.toThrow('Cannot provide both content and patches simultaneously');
    });

    it('should throw error when neither content nor patches are provided', async () => {
      const controller = await container.get<DocumentController>('documentController');

      // contentもpatchesも提供しない
      await expect(controller.writeDocument({
        scope: 'branch',
        branchName: TEST_BRANCH,
        path: 'test/missing-data-document.json',
      })).rejects.toThrow('Either document content or patches must be provided');
    });
  });

  describe('global document operations', () => {
    it('should write and read a global document successfully', async () => {
      const controller = await container.get<DocumentController>('documentController');
      const documentPath = 'test/global-document.json';

      // グローバルドキュメント
      const globalDoc = {
        ...testDocument,
        documentType: "global-test",
        metadata: {
          ...testDocument.metadata,
          id: "global-test-doc",
          title: "グローバルテスト",
          path: documentPath
        },
        content: {
          value: "グローバルドキュメントのコンテンツ"
        }
      };

      const documentContent = JSON.stringify(globalDoc);

      // グローバルドキュメント書き込み
      const writeResult = await controller.writeDocument({
        scope: 'global',
        path: documentPath,
        content: documentContent,
        tags: globalDoc.metadata.tags
      });

      expect(writeResult.success).toBe(true);
      if (!writeResult.success) throw new Error('Expected success but got error');
      expect(writeResult.data).toBeDefined();

      // グローバルドキュメント読み取り
      const readResult = await controller.readDocument({
        scope: 'global',
        path: documentPath
      });

      expect(readResult.success).toBe(true);
      if (!readResult.success) throw new Error('Expected success but got error');
      expect(readResult.data).toBeDefined();

      // DocumentControllerはオブジェクト形式でdocumentプロパティに値を返す
      if (!readResult.data || !readResult.data.document || !readResult.data.document.content) {
        logger.error("--- Assertion Error: readResult.data does not have expected structure.", {
          actualData: readResult.data,
          component: 'DocumentController.integration.test'
        });
        throw new Error('Expected readResult.data to contain document with content');
      }

      // オブジェクト形式の場合は直接contentにアクセス
      const documentData = readResult.data.document;
      const parsedContent = typeof documentData.content === 'string'
        ? JSON.parse(documentData.content)
        : documentData.content;

      // 検証
      expect(parsedContent.metadata.id).toBe(globalDoc.metadata.id);
      expect(parsedContent.metadata.title).toBe(globalDoc.metadata.title);
      expect(parsedContent.documentType).toBe(globalDoc.documentType);
      expect(parsedContent.content.value).toBe(globalDoc.content.value);
    });

    it('should return error when global document does not exist', async () => {
      const controller = await container.get<DocumentController>('documentController');
      const result = await controller.readDocument({
        scope: 'global',
        path: 'non-existent.json'
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error('Expected error but got success');
      expect(result.error).toBeDefined();
    });
  });
});
