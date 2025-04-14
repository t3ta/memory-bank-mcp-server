/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, createBranchDir, type TestEnv } from '../helpers/test-env.js';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js';
import { DocumentController } from '../../../src/interface/controllers/DocumentControllerModified.js';
import { logger } from '../../../src/shared/utils/logger.js';

describe('DocumentController (Modified) Integration Tests', () => {
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

      // アダプターレイヤー対応後のレスポンス構造確認
      if (!writeResult.data) {
        logger.error("--- Assertion Error: writeResult.data does not have expected structure.", {
          actualData: writeResult.data,
          component: 'DocumentControllerModified.integration.test'
        });
        throw new Error('Expected writeResult.data to be defined');
      }

      // 新しいレスポンス形式: 直接データが返される
      // documentData変数は後で定義するので、ここではwriteResultのデータのみ確認する

      // 読み取り操作
      const readResult = await controller.readDocument({
        scope: 'branch',
        branchName: TEST_BRANCH,
        path: documentPath
      });

      expect(readResult.success).toBe(true);
      if (!readResult.success) throw new Error('Expected success but got error');
      expect(readResult.data).toBeDefined();

      // アダプターレイヤー対応後のレスポンス構造確認
      if (!readResult.data) {
        logger.error("--- Assertion Error: readResult.data does not have expected structure.", {
          actualData: readResult.data,
          component: 'DocumentControllerModified.integration.test'
        });
        throw new Error('Expected readResult.data to be defined');
      }

      // アダプターレイヤー経由のレスポンス構造でアクセス
      // 新しいレスポンス形式: document直下ではなくプロパティとして存在
      const readDocumentData = readResult.data.document || readResult.data;

      // コンテンツはオブジェクト形式またはJSON文字列の可能性がある
      const parsedContent = typeof readDocumentData.content === 'string'
        ? JSON.parse(readDocumentData.content)
        : readDocumentData.content;

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

      // エラーレスポンスの構造確認（_metaのチェック）
      if (!result.error) throw new Error('Expected error object to be defined');
      expect(result.error.message).toBeDefined();
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

      // アダプターレイヤー対応後のレスポンス構造確認
      if (!writeResult.data) {
        logger.error("--- Assertion Error: writeResult.data does not have expected structure.", {
          actualData: writeResult.data,
          component: 'DocumentControllerModified.integration.test'
        });
        throw new Error('Expected writeResult.data to be defined');
      }

      // 新しいレスポンス形式: 直接データが返される
      // documentData変数は後で定義するので、ここではwriteResultのデータのみ確認する

      // 読み取り操作
      const readResult = await controller.readDocument({
        scope: 'branch',
        branchName: NEW_BRANCH,
        path: documentPath
      });

      expect(readResult.success).toBe(true);
      if (!readResult.success) throw new Error('Expected success but got error');
      expect(readResult.data).toBeDefined();

      // アダプターレイヤー対応後のレスポンス構造確認
      if (!readResult.data) {
        logger.error("--- Assertion Error: readResult.data does not have expected structure.", {
          actualData: readResult.data,
          component: 'DocumentControllerModified.integration.test'
        });
        throw new Error('Expected readResult.data to be defined');
      }

      // アダプターレイヤー経由のレスポンス構造でアクセス
      // 新しいレスポンス形式: document直下ではなくプロパティとして存在
      const readDocumentData = readResult.data.document || readResult.data;

      // コンテンツはオブジェクト形式またはJSON文字列の可能性がある
      const parsedContent = typeof readDocumentData.content === 'string'
        ? JSON.parse(readDocumentData.content)
        : readDocumentData.content;

      // 検証
      expect(parsedContent.metadata.id).toBe(newBranchDoc.metadata.id);
      expect(parsedContent.content.value).toBe(newBranchDoc.content.value);
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

      // アダプターレイヤー対応後のレスポンス構造確認
      if (!writeResult.data) {
        logger.error("--- Assertion Error: writeResult.data does not have expected structure.", {
          actualData: writeResult.data,
          component: 'DocumentControllerModified.integration.test'
        });
        throw new Error('Expected writeResult.data to be defined');
      }

      // 新しいレスポンス形式: 直接データが返される
      // documentData変数は後で定義するので、ここではwriteResultのデータのみ確認する

      // グローバルドキュメント読み取り
      const readResult = await controller.readDocument({
        scope: 'global',
        path: documentPath
      });

      expect(readResult.success).toBe(true);
      if (!readResult.success) throw new Error('Expected success but got error');
      expect(readResult.data).toBeDefined();

      // アダプターレイヤー対応後のレスポンス構造確認
      if (!readResult.data) {
        logger.error("--- Assertion Error: readResult.data does not have expected structure.", {
          actualData: readResult.data,
          component: 'DocumentControllerModified.integration.test'
        });
        throw new Error('Expected readResult.data to be defined');
      }

      // アダプターレイヤー経由のレスポンス構造でアクセス
      // 新しいレスポンス形式: document直下ではなくプロパティとして存在
      const readDocumentData = readResult.data.document || readResult.data;

      // コンテンツはオブジェクト形式またはJSON文字列の可能性がある
      const parsedContent = typeof readDocumentData.content === 'string'
        ? JSON.parse(readDocumentData.content)
        : readDocumentData.content;

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
