/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, createBranchDir, type TestEnv } from '../helpers/test-env.js';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js'; // Import DI container and setup function
import { BranchController } from '../../../src/interface/controllers/BranchController.js'; // Import real controller
import type { DocumentDTO } from '../../../src/application/dtos/DocumentDTO.js'; // Import DocumentDTO for type guard

// Custom Type Guard function to check if data is DocumentDTO
function isDocumentDTO(data: any): data is DocumentDTO {
  // Check for properties specific to DocumentDTO, like 'path' and 'content'
  return data && typeof data === 'object' && 'path' in data && 'content' in data && 'lastModified' in data;
}

describe('BranchController Integration Tests', () => {
  let testEnv: TestEnv;
  let container: DIContainer;
  const TEST_BRANCH = 'feature/test-branch';
  const simpleDocument = {
    schema: "memory_document_v2",
    metadata: {
      id: "test-branch-doc",
      title: "テストブランチドキュメント",
      documentType: "test",
      path: 'test-document.json', // Default path, can be overridden in tests
      tags: ["test", "branch"],
      lastModified: expect.any(String),
      createdAt: expect.any(String),
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
      // Assert that writeResult.data is a valid DocumentDTO using the type guard
      expect(writeResult.data).toBeDefined();
      if (!writeResult.data || !isDocumentDTO(writeResult.data)) {
          // Log the actual data for debugging if the type guard fails
          console.error("--- Assertion Error: writeResult.data was not DocumentDTO. Actual data:", JSON.stringify(writeResult.data, null, 2));
          throw new Error('Expected writeResult.data to be a valid DocumentDTO');
      }
      // If type guard passes, assert the path
      expect(writeResult.data.path).toBe(documentPath);

      const readResult = await controller.readDocument(TEST_BRANCH, documentPath);

      expect(readResult.success).toBe(true);
      if (!readResult.success) throw new Error('Expected success but got error'); // Use throw new Error
      expect(readResult.data).toBeDefined();
      const parsed = JSON.parse(readResult.data.document.content);

      // Use testDoc for comparison as it has the correct path
      expect(parsed.metadata.id).toBe(testDoc.metadata.id);
      expect(parsed.metadata.title).toBe(testDoc.metadata.title);
      expect(parsed.metadata.documentType).toBe(testDoc.metadata.documentType);
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
    it('should return an error when writing invalid JSON content', async () => {
      const controller = await container.get<BranchController>('branchController');
      const invalidContent = '{"schema": "memory_document_v2", "metadata": {}'; // Invalid JSON

      // Call writeDocument with a single params object
      const result = await controller.writeDocument({
        branchName: TEST_BRANCH,
        path: 'invalid.json',
        content: invalidContent
      });

      expect(result.success).toBe(false);
      if (result.success) throw new Error('Expected error but got success'); // Use throw new Error
      expect(result.error).toBeDefined();
    });

    it('should create a new branch and write a document successfully', async () => {
      const controller = await container.get<BranchController>('branchController');
      const NEW_BRANCH = 'feature/new-test-branch';
      const documentPath = 'new-branch-file.json';
      // Use the common simpleDocument definition, overriding necessary fields
      const newBranchDoc = {
        ...simpleDocument,
        metadata: {
          ...simpleDocument.metadata,
          id: "new-branch-test",
          title: "新規ブランチテスト",
          path: documentPath,
          tags: ["test", "new-branch"],
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
      const parsed = JSON.parse(readResult.data.document.content);
      // Use newBranchDoc for comparison
      expect(parsed.metadata.id).toBe(newBranchDoc.metadata.id);
      expect(parsed.content.value).toBe(newBranchDoc.content.value);
    });
    it('should update (overwrite) an existing document successfully', async () => {
      const controller = await container.get<BranchController>('branchController');
      const documentPath = 'test-document-to-update.json';
      const initialDoc = {
        ...simpleDocument,
        metadata: { ...simpleDocument.metadata, id: "update-test-initial", path: documentPath, version: 1 },
        content: { value: "Initial content" }
      };
      const updatedDoc = {
        ...simpleDocument,
        metadata: { ...simpleDocument.metadata, id: "update-test-updated", title: "Updated Title", path: documentPath, version: 2 },
        content: { value: "Updated content" }
      };
      const initialContentString = JSON.stringify(initialDoc, null, 2);
      const updatedContentString = JSON.stringify(updatedDoc, null, 2);

      // 1. Write initial document
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
      // Assert that updateResult.data is a valid DocumentDTO using the type guard
      expect(updateResult.data).toBeDefined();
       if (!updateResult.data || !isDocumentDTO(updateResult.data)) {
           // Log the actual data for debugging if the type guard fails
           console.error("--- Assertion Error: updateResult.data was not DocumentDTO. Actual data:", JSON.stringify(updateResult.data, null, 2));
           throw new Error('Expected updateResult.data to be a valid DocumentDTO');
       }
       // If type guard passes, assert the path
       expect(updateResult.data.path).toBe(documentPath);

      // 3. Read the document and verify updated content
      // 3. Read the document and verify updated content
      const readResult = await controller.readDocument(TEST_BRANCH, documentPath);
      expect(readResult.success).toBe(true);
      if (!readResult.success) throw new Error('Expected success but got error on read after update'); // Use throw new Error
      expect(readResult.data).toBeDefined();
      const parsed = JSON.parse(readResult.data.document.content);

      expect(parsed.metadata.id).toBe(updatedDoc.metadata.id);
      expect(parsed.metadata.title).toBe(updatedDoc.metadata.title);
      expect(parsed.metadata.version).toBe(updatedDoc.metadata.version); // Check version increment (or update logic)
      expect(parsed.content.value).toBe(updatedDoc.content.value);
    });
  });
});
