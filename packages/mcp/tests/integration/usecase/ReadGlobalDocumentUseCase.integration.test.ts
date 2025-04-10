/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, type TestEnv } from '../helpers/test-env.js';
import { loadGlobalFixture } from '../helpers/fixtures-loader.js';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js'; // Import DI container and setup function
import { ReadGlobalDocumentUseCase } from '../../../src/application/usecases/global/ReadGlobalDocumentUseCase.js'; // Import real UseCase and types


describe('ReadGlobalDocumentUseCase Integration Tests', () => {
  let testEnv: TestEnv;
  let container: DIContainer; // Use DI container
  let useCase: ReadGlobalDocumentUseCase;

  beforeEach(async () => {
    // Setup test environment
    testEnv = await setupTestEnv();

    // Initialize DI container
    container = await setupContainer({ docsRoot: testEnv.docRoot });

    // Get the use case instance from container
    useCase = await container.get<ReadGlobalDocumentUseCase>('readGlobalDocumentUseCase');
  });

  afterEach(async () => {
    // Cleanup test environment
    await cleanupTestEnv(testEnv);
  });

  describe('execute', () => {
    it('should read a document from the global memory bank', async () => {
      await loadGlobalFixture(testEnv.globalMemoryPath, 'minimal');

      const result = await useCase.execute({ path: 'core/glossary.json' });

      expect(result).toBeDefined();
      expect(result.document).toBeDefined();
      expect(result.document.path).toBe('core/glossary.json');
      expect(typeof result.document.content).toBe('object'); // Expect object directly

      const document = result.document.content; // No need to parse
      expect(document).toHaveProperty('schema', 'memory_document_v2');
      // expect(document).toHaveProperty('documentType'); // documentType はトップレベルにはない
      expect(document).toHaveProperty('metadata'); // Check property exists
      expect(document).toHaveProperty('content');
      // expect(document.documentType).toBe('core'); // トップレベルの documentType はチェックしない
      expect((document as any).metadata).toHaveProperty('id', 'core-glossary-test'); // Update expected ID & assert type
      expect((document as any).metadata).toHaveProperty('documentType', 'core'); // metadata 内の documentType をチェック & assert type
    });

    it('should return an error if the document does not exist', async () => {
      await expect(useCase.execute({ path: 'non-existent/document.json' }))
        .rejects.toThrow('Document "non-existent/document.json" not found in global memory bank');
    });

    it('should return an error for an invalid path', async () => {
      await expect(useCase.execute({ path: '../outside-documents/sensitive.json' }))
        .rejects.toThrow('Document path cannot contain ".."');
    });

    it('should read documents of various types', async () => {
      await loadGlobalFixture(testEnv.globalMemoryPath, 'various-types');

      const planResult = await useCase.execute({ path: 'plan-document.json' });

      expect(planResult).toBeDefined();
      expect(planResult.document).toBeDefined();
      expect(planResult.document.path).toBe('plan-document.json');
      expect(typeof planResult.document.content).toBe('object'); // Expect object
      const planDocument = planResult.document.content; // No need to parse
      expect((planDocument as any).metadata).toHaveProperty('documentType', 'plan'); // metadata 内の documentType をチェック & assert type

      const guideResult = await useCase.execute({ path: 'guide-document.json' });

      expect(guideResult).toBeDefined();
      expect(guideResult.document).toBeDefined();
      expect(guideResult.document.path).toBe('guide-document.json');
      expect(typeof guideResult.document.content).toBe('object'); // Expect object
      const guideDocument = guideResult.document.content; // No need to parse
      expect((guideDocument as any).metadata).toHaveProperty('documentType', 'guide'); // metadata 内の documentType をチェック & assert type
    });
  });
});
