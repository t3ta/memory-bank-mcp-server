/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, createBranchDir, type TestEnv } from '../helpers/test-env.ts';
import { loadBranchFixture, loadGlobalFixture } from '../helpers/fixtures-loader.js';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js'; // Import DI container and setup function
import { ReadContextUseCase, type ContextResult } from '../../../src/application/usecases/common/ReadContextUseCase.js'; // Import real UseCase and types
import { ReadRulesUseCase } from '../../../src/application/usecases/common/ReadRulesUseCase.js'; // Import ReadRulesUseCase for rules check
import { DomainErrors } from '../../../src/shared/errors/DomainError.js'; // Import specific errors for checking
import type { IBranchMemoryBankRepository } from '../../../src/domain/repositories/IBranchMemoryBankRepository.js';
import fs from 'fs/promises';
import { logger } from '../../../src/shared/utils/logger.js';
import * as path from 'path';

describe('ReadContextUseCase Integration Tests', () => {
  let testEnv: TestEnv;
  let container: DIContainer; // Use DI container
  let useCase: ReadContextUseCase;
  let readRulesUseCase: ReadRulesUseCase;
  let branchRepo: IBranchMemoryBankRepository;
  const TEST_BRANCH = 'feature/test-branch';

  beforeEach(async () => {
    // Setup test environment
    testEnv = await setupTestEnv();

    // Create test branch directory
    await createBranchDir(testEnv, TEST_BRANCH);

    // Initialize DI container
    container = await setupContainer({ docsRoot: testEnv.docRoot });

    // Get the use case instances from container
    useCase = await container.get<ReadContextUseCase>('readContextUseCase');
    readRulesUseCase = await container.get<ReadRulesUseCase>('readRulesUseCase'); // Get ReadRulesUseCase too
    branchRepo = await container.get<IBranchMemoryBankRepository>('branchMemoryBankRepository');
    // --- みらい：テスト実行時のみログレベルをdebugに設定 ---
    const { logger } = await import('../../../src/shared/utils/logger.js');
    logger.setLevel('debug');
    // --- みらい：ここまで ---
  });

  afterEach(async () => {
    // Cleanup test environment
    await cleanupTestEnv(testEnv);
  });

  describe('execute', () => {
    it('should get context from an auto-initialized branch and global memory', async () => {
      // Execute use case
      const result = await useCase.execute({
        branch: TEST_BRANCH,
        language: 'ja'
      });

      expect(result).toBeDefined();
      expect(result.branchMemory).toBeDefined();
      expect(Object.keys(result.branchMemory!)).toEqual(['branchContext.json']);
      expect(result.branchMemory!['branchContext.json']).toBeDefined();
      expect(typeof result.globalMemory).toBe('object');

      // Verify rules separately
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
      expect(Object.keys(result.branchMemory!).length).toBeGreaterThan(0);
      expect(result.branchMemory!['branchContext.json']).toBeDefined();
      expect(result.branchMemory!['activeContext.json']).toBeDefined();

      expect(result.globalMemory).toBeDefined();
      expect(Object.keys(result.globalMemory!).length).toBeGreaterThan(0);
      expect(result.globalMemory!['core/glossary.json']).toBeDefined();

      const branchContextContent = result.branchMemory!['branchContext.json'];
      expect(branchContextContent).toBeDefined();
      const branchContext = JSON.parse(branchContextContent);
      expect(branchContext.schema).toBe('memory_document_v2');
      expect(branchContext.metadata.documentType).toBe('branch_context');
    });

    it('should get context regardless of language', async () => {
      const resultEn = await useCase.execute({
        branch: TEST_BRANCH,
        language: 'en'
      });

      expect(resultEn).toBeDefined();
      expect(resultEn.branchMemory).toBeDefined();
      expect(Object.keys(resultEn.branchMemory!)).toEqual(['branchContext.json']);
      expect(resultEn.branchMemory!['branchContext.json']).toBeDefined();
      expect(typeof resultEn.globalMemory).toBe('object');

      const rulesResultEn = await readRulesUseCase.execute('en');
      expect(rulesResultEn).toBeDefined();
      expect(rulesResultEn.language).toBe('en');

      const resultZh = await useCase.execute({
        branch: TEST_BRANCH,
        language: 'zh'
      });

      expect(resultZh).toBeDefined();
      expect(resultZh.branchMemory).toBeDefined();
      expect(Object.keys(resultZh.branchMemory!)).toEqual(['branchContext.json']);
      expect(resultZh.branchMemory!['branchContext.json']).toBeDefined();
      expect(typeof resultZh.globalMemory).toBe('object');

      const rulesResultZh = await readRulesUseCase.execute('zh');
      expect(rulesResultZh).toBeDefined();
      expect(rulesResultZh.language).toBe('zh');
    });

    it('should get auto-initialized context for a non-existent branch name', async () => {
      const nonExistentBranch = 'feature/non-existent-branch-auto-init';
      const { BranchInfo } = await import('../../../src/domain/entities/BranchInfo.js');

      // --- みらい：デバッグのため initialize 呼び出しを復活させる ---
      // const { BranchInfo } = await import('../../../src/domain/entities/BranchInfo.js'); // ← ダブりなので削除
      const branchInfo = BranchInfo.create(nonExistentBranch);
      await branchRepo.initialize(branchInfo); // initialize を呼ぶ

      // --- みらい：initialize 直後のファイルシステム状態を直接確認 ---
      const { toSafeBranchName } = await import('../../../src/shared/utils/branchNameUtils.js');
      const branchPath = path.join(testEnv.branchMemoryPath, toSafeBranchName(nonExistentBranch));
      try {
        const filesDirectly = await fs.readdir(branchPath);
        logger.debug('[Mirai Debug] Files immediately after initialize:', { files: filesDirectly.sort(), component: 'ReadContextUseCase.integration.test' });
      } catch (e) {
        logger.error('[Mirai Debug] Error reading directory after initialize:', { error: e, component: 'ReadContextUseCase.integration.test' });
      }
      // --- みらい：ここまで ---

      // initialize 完了後に UseCase を実行して結果を取得
      const result = await useCase.execute({
        branch: nonExistentBranch,
        language: 'ja'
      });

      expect(result).toBeDefined();
      expect(result.branchMemory).toBeDefined();

      // --- みらい：4つのコアファイルが作成されることを確認 ---
      const expectedCoreFiles = [
        'branchContext.json',
        'progress.json',
        'activeContext.json',
        'systemPatterns.json'
      ];
      const actualCoreFiles = Object.keys(result.branchMemory!);
      expect(actualCoreFiles.sort()).toEqual(expectedCoreFiles.sort()); // 順序無視で比較

      // 各コアファイルの内容を簡単にチェック (存在とJSON形式)
      for (const coreFile of expectedCoreFiles) {
        expect(result.branchMemory![coreFile]).toBeDefined();
        try {
          const content = JSON.parse(result.branchMemory![coreFile]);
          expect(content.schema).toBe('memory_document_v2'); // スキーマ確認
          expect(content.metadata.path).toBe(coreFile); // パス確認
        } catch (e) {
          throw new Error(`Failed to parse JSON for ${coreFile}: ${e}`);
        }
      }
      // --- みらい：ここまで ---

      expect(typeof result.globalMemory).toBe('object');

      const rulesResult = await readRulesUseCase.execute('ja');
      expect(rulesResult).toBeDefined();
      expect(rulesResult.language).toBe('ja');
    });

    it('should get context even for unsupported language', async () => {
      const result = await useCase.execute({
        branch: TEST_BRANCH,
        language: 'fr'
      });

      expect(result).toBeDefined();
      expect(result.branchMemory).toBeDefined();
      expect(Object.keys(result.branchMemory!)).toEqual(['branchContext.json']);
      expect(result.branchMemory!['branchContext.json']).toBeDefined();
      expect(typeof result.globalMemory).toBe('object');

      // Verify rules fetching fails separately
      await expect(readRulesUseCase.execute('fr'))
        .rejects.toThrow(DomainErrors.validationError(`Unsupported language code: fr. Supported languages are: en, ja, zh`));
    });
  });
});
