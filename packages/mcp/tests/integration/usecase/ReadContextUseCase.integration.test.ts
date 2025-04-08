/**
 * @jest-environment node
 */
import { setupTestEnv, cleanupTestEnv, createBranchDir, type TestEnv } from '../helpers/test-env.js'; // 拡張子を .js に変更 (または削除)
import { loadBranchFixture, loadGlobalFixture } from '../helpers/fixtures-loader.js';
import { DIContainer, setupContainer } from '../../../src/main/di/providers.js'; // Import DI container and setup function
import { ReadContextUseCase } from '../../../src/application/usecases/common/ReadContextUseCase.js'; // Import real UseCase and types
import { ReadRulesUseCase } from '../../../src/application/usecases/common/ReadRulesUseCase.js'; // Import ReadRulesUseCase for rules check
import type { IBranchMemoryBankRepository } from '../../../src/domain/repositories/IBranchMemoryBankRepository.js';
import fs from 'fs-extra'; // fs/promises から fs-extra に変更
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

    // beforeEach でブランチディレクトリを作成しないように変更
    // (自動初期化のテストのため)
    // await createBranchDir(testEnv, TEST_BRANCH);
    // Initialize DI container
    container = await setupContainer({ docsRoot: testEnv.docRoot });

    // Get the use case instances from container
    useCase = await container.get<ReadContextUseCase>('readContextUseCase');
    readRulesUseCase = await container.get<ReadRulesUseCase>('readRulesUseCase'); // Get ReadRulesUseCase too
    branchRepo = await container.get<IBranchMemoryBankRepository>('branchMemoryBankRepository');

    const { logger } = await import('../../../src/shared/utils/logger.js');
    logger.setLevel('debug');

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
      // initialize で複数のコアファイルが作られるはずなので、toEqualではなく length > 0 をチェック
      expect(Object.keys(result.branchMemory!).length).toBeGreaterThan(0);
      expect(result.branchMemory!['branchContext.json']).toBeDefined(); // branchContext.json の存在は確認
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

      const branchContext = result.branchMemory!['branchContext.json']; // Content is already an object
      expect(branchContext).toBeDefined();
      expect(typeof branchContext).toBe('object'); // Verify it's an object
      expect((branchContext as any).schema).toBe('memory_document_v2');
      expect((branchContext as any).documentType).toBe('branch_context'); // トップレベルの documentType をチェック
    });

    it('should get context regardless of language', async () => {
      const resultEn = await useCase.execute({
        branch: TEST_BRANCH,
        language: 'en'
      });

      expect(resultEn).toBeDefined();
      expect(resultEn.branchMemory).toBeDefined();
      // initialize で複数のコアファイルが作られるはずなので、toEqualではなく length > 0 をチェック
      expect(Object.keys(resultEn.branchMemory!).length).toBeGreaterThan(0);
      expect(resultEn.branchMemory!['branchContext.json']).toBeDefined(); // branchContext.json の存在は確認
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
      // initialize で複数のコアファイルが作られるはずなので、toEqualではなく length > 0 をチェック
      expect(Object.keys(resultZh.branchMemory!).length).toBeGreaterThan(0);
      expect(resultZh.branchMemory!['branchContext.json']).toBeDefined(); // branchContext.json の存在は確認
      expect(resultZh.branchMemory!['branchContext.json']).toBeDefined();
      expect(typeof resultZh.globalMemory).toBe('object');

      const rulesResultZh = await readRulesUseCase.execute('zh');
      expect(rulesResultZh).toBeDefined();
      expect(rulesResultZh.language).toBe('zh');
    });

    it('should get auto-initialized context for a non-existent branch name', async () => {
      const nonExistentBranch = 'feature/non-existent-branch-auto-init';
      const { BranchInfo } = await import('../../../src/domain/entities/BranchInfo.js');


      // const { BranchInfo } = await import('../../../src/domain/entities/BranchInfo.js'); // ← ダブりなので削除
      const branchInfo = BranchInfo.create(nonExistentBranch);
      // useCase.execute に自動初期化を任せるため、ここでの initialize 呼び出しは削除
      // await branchRepo.initialize(branchInfo);


      const { toSafeBranchName } = await import('../../../src/shared/utils/branchNameUtils.js');
      const branchPath = path.join(testEnv.branchMemoryPath, toSafeBranchName(nonExistentBranch));
      try {
        const filesDirectly = await fs.readdir(branchPath);
        logger.debug('[Mirai Debug] Files immediately after initialize:', { files: filesDirectly.sort(), component: 'ReadContextUseCase.integration.test' });
      } catch (e) {
        logger.error('[Mirai Debug] Error reading directory after initialize:', { error: e, component: 'ReadContextUseCase.integration.test' });
      }


      // initialize 完了後に UseCase を実行して結果を取得
      const result = await useCase.execute({
        branch: nonExistentBranch,
        language: 'ja'
      });

      expect(result).toBeDefined();
      expect(result.branchMemory).toBeDefined();


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
          const content = result.branchMemory![coreFile]; // Content is already an object
          expect(typeof content).toBe('object'); // Verify it's an object
          expect((content as any).schema).toBe('memory_document_v2'); // スキーマ確認
          expect((content as any).metadata.path).toBe(coreFile); // パス確認
        } catch (e) {
          throw new Error(`Failed to parse JSON for ${coreFile}: ${e}`);
        }
      }


      expect(typeof result.globalMemory).toBe('object');

      const rulesResult = await readRulesUseCase.execute('ja');
      expect(rulesResult).toBeDefined();
      expect(rulesResult.language).toBe('ja');
    });

    it('should return context with undefined rules for unsupported language', async () => { // テスト名を変更
      // 準備: ダミーのグローバルファイルを作成
      const dummyGlobalPath = path.join(testEnv.globalMemoryPath, 'dummy-global.json');
      await fs.outputJson(dummyGlobalPath, { dummy: 'data' });

      // 実行: サポートされていない言語コードで ReadContextUseCase を実行
      const result = await useCase.execute({ branch: TEST_BRANCH, language: 'fr' });

      // 検証: rules が undefined であることを確認
      expect(result).toBeDefined();
      expect(result.rules).toBeUndefined(); // rules が undefined であることを期待
      // 他のコンテキスト（branchMemory, globalMemory）は取得できているはず
      expect(result.branchMemory).toBeDefined();
      expect(typeof result.globalMemory).toBe('object');
      // 念のため、他のコンテキストが空でないことも確認（必要に応じて）
      expect(Object.keys(result.branchMemory!).length).toBeGreaterThan(0);
      expect(result.globalMemory).toEqual({}); // グローバルメモリは空であることを期待
    });
  });
});
