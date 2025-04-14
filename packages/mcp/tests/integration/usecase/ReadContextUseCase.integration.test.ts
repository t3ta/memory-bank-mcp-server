/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, createBranchDir, type TestEnv } from '../helpers/test-env.js';
import { loadBranchFixture, loadGlobalFixture } from '../helpers/fixtures-loader.js';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js';
import { ReadContextUseCase } from '../../../src/application/usecases/common/ReadContextUseCase.js';
import { ReadRulesUseCase } from '../../../src/application/usecases/common/ReadRulesUseCase.js';
import type { IBranchMemoryBankRepository } from '../../../src/domain/repositories/IBranchMemoryBankRepository.js';
import fs from 'fs-extra';
import { logger } from '../../../src/shared/utils/logger.js';
import * as path from 'path';

describe('ReadContextUseCase Integration Tests', () => {
  let testEnv: TestEnv;
  let container: DIContainer;
  let useCase: ReadContextUseCase;
  let readRulesUseCase: ReadRulesUseCase;
  let branchRepo: IBranchMemoryBankRepository;
  const TEST_BRANCH = 'feature/test-branch';

  beforeEach(async () => {
    testEnv = await setupTestEnv();
    container = await setupContainer({ docsRoot: testEnv.docRoot });
    useCase = await container.get<ReadContextUseCase>('readContextUseCase');
    readRulesUseCase = await container.get<ReadRulesUseCase>('readRulesUseCase');
    branchRepo = await container.get<IBranchMemoryBankRepository>('branchMemoryBankRepository');
    logger.setLevel('debug');
  });

  afterEach(async () => {
    await cleanupTestEnv(testEnv);
  });

  describe('execute', () => {
    it.skip('should get context from an auto-initialized branch and global memory', async () => {
      const result = await useCase.execute({
        branch: TEST_BRANCH,
        language: 'ja'
      });

      expect(result).toBeDefined();
      expect(result.branchMemory).toBeDefined();
      expect(result.branchMemory.coreFiles).toBeDefined();
      expect(result.branchMemory.availableFiles).toBeDefined();

      // コアファイルの存在確認
      expect(result.branchMemory.coreFiles['branchContext.json']).toBeDefined();
      expect(result.branchMemory.coreFiles['activeContext.json']).toBeDefined();
      expect(result.branchMemory.coreFiles['progress.json']).toBeDefined();
      expect(result.branchMemory.coreFiles['systemPatterns.json']).toBeDefined();

      expect(result.globalMemory).toBeDefined();
      expect(result.globalMemory.coreFiles).toBeDefined();
      expect(result.globalMemory.availableFiles).toBeDefined();

      const rulesResult = await readRulesUseCase.execute('ja');
      expect(rulesResult).toBeDefined();
      expect(rulesResult.language).toBe('ja');
    });

    it('should get context from populated branch and global memory', async () => {
      const { toSafeBranchName } = await import('../../../src/shared/utils/branchNameUtils.js');
      const branchDir = path.join(testEnv.branchMemoryPath, toSafeBranchName(TEST_BRANCH));
      await loadBranchFixture(branchDir, 'basic');
      await loadGlobalFixture(testEnv.globalMemoryPath, 'minimal');

      const result = await useCase.execute({
        branch: TEST_BRANCH,
        language: 'ja'
      });

      expect(result).toBeDefined();
      expect(result.branchMemory).toBeDefined();
      expect(result.branchMemory.coreFiles).toBeDefined();
      expect(result.branchMemory.availableFiles).toBeDefined();

      // コアファイルの存在確認
      expect(result.branchMemory.coreFiles['branchContext.json']).toBeDefined();
      expect(result.branchMemory.coreFiles['activeContext.json']).toBeDefined();

      expect(result.globalMemory).toBeDefined();
      expect(result.globalMemory.coreFiles).toBeDefined();
      expect(result.globalMemory.availableFiles).toBeDefined();
      expect(result.globalMemory.coreFiles['core/glossary.json']).toBeDefined();

      const branchContext = result.branchMemory.coreFiles['branchContext.json'];
      expect(branchContext).toBeDefined();
      expect(typeof branchContext).toBe('object');
      expect((branchContext as any).schema).toBe('memory_document_v2');
      expect((branchContext as any).documentType).toBe('branch_context'); // documentType はトップレベルに移動
    });

    it.skip('should get context regardless of language', async () => {
      const resultEn = await useCase.execute({
        branch: TEST_BRANCH,
        language: 'en'
      });

      expect(resultEn).toBeDefined();
      expect(resultEn.branchMemory).toBeDefined();
      expect(resultEn.branchMemory.coreFiles).toBeDefined();
      expect(resultEn.branchMemory.coreFiles['branchContext.json']).toBeDefined();
      expect(resultEn.branchMemory.coreFiles['activeContext.json']).toBeDefined();
      expect(resultEn.globalMemory).toBeDefined();

      const rulesResultEn = await readRulesUseCase.execute('en');
      expect(rulesResultEn).toBeDefined();
      expect(rulesResultEn.language).toBe('en');

      const resultZh = await useCase.execute({
        branch: TEST_BRANCH,
        language: 'zh'
      });

      expect(resultZh).toBeDefined();
      expect(resultZh.branchMemory).toBeDefined();
      expect(resultZh.branchMemory.coreFiles).toBeDefined();
      expect(resultZh.branchMemory.coreFiles['branchContext.json']).toBeDefined();
      expect(resultZh.branchMemory.coreFiles['activeContext.json']).toBeDefined();
      expect(resultZh.globalMemory).toBeDefined();

      const rulesResultZh = await readRulesUseCase.execute('zh');
      expect(rulesResultZh).toBeDefined();
      expect(rulesResultZh.language).toBe('zh');
    });

    it.skip('should get auto-initialized context for a non-existent branch name', async () => {
      const nonExistentBranch = 'feature/non-existent-branch-auto-init';
      const { BranchInfo } = await import('../../../src/domain/entities/BranchInfo.js');
      const branchInfo = BranchInfo.create(nonExistentBranch);

      const result = await useCase.execute({
        branch: nonExistentBranch,
        language: 'ja'
      });

      expect(result).toBeDefined();
      expect(result.branchMemory).toBeDefined();
      expect(result.branchMemory.coreFiles).toBeDefined();
      expect(result.branchMemory.availableFiles).toBeDefined();

      const expectedCoreFiles = [
        'branchContext.json',
        'progress.json',
        'activeContext.json',
        'systemPatterns.json'
      ];

      // コアファイルの存在確認
      for (const coreFile of expectedCoreFiles) {
        expect(result.branchMemory.coreFiles[coreFile]).toBeDefined();
        const content = result.branchMemory.coreFiles[coreFile];
        expect(typeof content).toBe('object');
        expect((content as any).schema).toBe('memory_document_v2');
        expect((content as any).metadata.path).toBe(coreFile);
      }

      expect(result.globalMemory).toBeDefined();
      const rulesResult = await readRulesUseCase.execute('ja');
      expect(rulesResult).toBeDefined();
      expect(rulesResult.language).toBe('ja');
    });

    it('should return context with undefined rules for unsupported language', async () => {
      const dummyGlobalPath = path.join(testEnv.globalMemoryPath, 'dummy-global.json');
      await fs.outputJson(dummyGlobalPath, { dummy: 'data' });

      const result = await useCase.execute({ branch: TEST_BRANCH, language: 'fr' });

      expect(result).toBeDefined();
      expect(result.rules).toBeUndefined();
      expect(result.branchMemory).toBeDefined();
      expect(result.branchMemory.coreFiles).toBeDefined();
      expect(result.branchMemory.availableFiles).toBeDefined();
      expect(Object.keys(result.branchMemory.coreFiles).length).toBeGreaterThan(0);
      expect(result.globalMemory).toEqual({
        coreFiles: {},
        availableFiles: expect.any(Array)
      });
    });
  });
});
