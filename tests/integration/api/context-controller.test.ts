import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { ContextController } from '../../../src/interface/controllers/ContextController';
import { SimpleBranchMemoryBankRepository } from '../../../src/infrastructure/repositories/simple/SimpleBranchMemoryBankRepository';
import { SimpleGlobalMemoryBankRepository } from '../../../src/infrastructure/repositories/simple/SimpleGlobalMemoryBankRepository';
import { ReadContextUseCase } from '../../../src/application/usecases/common/ReadContextUseCase';
import { ReadRulesUseCase } from '../../../src/application/usecases/common/ReadRulesUseCase';

/**
 * Integration Test: ContextController
 *
 * Integration test for actual controller and repository without mock server
 */
describe('ContextController Integration Tests', () => {
  // Test directories
  let testDir: string;
  let branchDir: string;
  let globalDir: string;
  let rulesDir: string;
  let testBranch: string;

  // Test target instances
  let branchRepository: SimpleBranchMemoryBankRepository;
  let globalRepository: SimpleGlobalMemoryBankRepository;
  let readContextUseCase: ReadContextUseCase;
  let readRulesUseCase: ReadRulesUseCase;
  let controller: ContextController;

  beforeAll(async () => {
    // Set up the test environment
    const testId = uuidv4();
    testDir = path.join(process.cwd(), 'tests', '.temp', `integration-context-${testId}`);
    branchDir = path.join(testDir, 'branch-memory-bank');
    globalDir = path.join(testDir, 'global-memory-bank');
    rulesDir = path.join(testDir, 'rules');
    testBranch = `test-branch-${testId}`;

    // Create directories
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(branchDir, { recursive: true });
    await fs.mkdir(globalDir, { recursive: true });
    await fs.mkdir(rulesDir, { recursive: true });
    await fs.mkdir(path.join(branchDir, testBranch), { recursive: true });

    // Create rule files
    await fs.writeFile(
      path.join(rulesDir, 'rules-en.md'),
      '# Rules\n\nThese are the English rules.',
      'utf-8'
    );
    await fs.writeFile(
      path.join(rulesDir, 'rules-ja.md'),
      '# ルール\n\nこれは日本語のルールです。',
      'utf-8'
    );

    // Create test files
    await fs.writeFile(
      path.join(branchDir, testBranch, 'branchContext.md'),
      '# Branch Context\n\nThis is a test branch.',
      'utf-8'
    );
    await fs.writeFile(
      path.join(branchDir, testBranch, 'activeContext.md'),
      '# Active Context\n\nThis is the current context.',
      'utf-8'
    );
    await fs.writeFile(
      path.join(globalDir, 'architecture.md'),
      '# Architecture\n\nThis is a description of the system architecture.',
      'utf-8'
    );
    await fs.writeFile(
      path.join(globalDir, 'glossary.md'),
      '# Glossary\n\nThis is a description of important terms.',
      'utf-8'
    );

    // Initialize components
    branchRepository = new SimpleBranchMemoryBankRepository(testDir);
    globalRepository = new SimpleGlobalMemoryBankRepository(testDir);

    readContextUseCase = new ReadContextUseCase(branchRepository, globalRepository);
    readRulesUseCase = new ReadRulesUseCase(rulesDir);

    controller = new ContextController(
      readContextUseCase,
      readRulesUseCase
    );

    console.log(`Context test environment setup completed: ${testDir}`);
  }, 10000);

  afterAll(async () => {
    // Test environment cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log(`Test environment deleted: ${testDir}`);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  it('Should be able to read rules', async () => {
    // Read English rules
    const enResult = await controller.readRules('en');

    // Verify read result
    expect(enResult.success).toBe(true);
    expect(enResult.error).toBeUndefined();
    expect(enResult.data).toBeDefined();
    expect(enResult.data?.content).toContain('English rules');

    // Read Japanese rules
    const jaResult = await controller.readRules('ja');

    // Verify read result
    expect(jaResult.success).toBe(true);
    expect(jaResult.data?.content).toContain('日本語のルール');
  });

  it('Should return an error for unsupported language code', async () => {
    // Unsupported language code
    const unsupportedResult = await controller.readRules('fr');

    // Verify failure result
    expect(unsupportedResult.success).toBe(false);
    expect(unsupportedResult.error).toBeDefined();
  });

  it.skip('Should be able to read complete context', async () => {
    // Read complete context
    const contextResult = await controller.readContext({
      branch: testBranch,
      language: 'ja',
      includeRules: true,
      includeBranchMemory: true,
      includeGlobalMemory: true
    });

    // Verify read result
    expect(contextResult.success).toBe(true);
    expect(contextResult.error).toBeUndefined();
    expect(contextResult.data).toBeDefined();

    // Verify context data structure
    const context = contextResult.data;
    expect(context?.rules).toBeDefined();
    expect(context?.branchMemory).toBeDefined();
    expect(context?.globalMemory).toBeDefined();

    // Verify content of each file
    expect(context?.rules?.content).toContain('日本語のルール');
    expect(context?.branchMemory?.['branchContext.md']).toBeDefined();
    expect(context?.branchMemory?.['activeContext.md']).toBeDefined();
    expect(context?.globalMemory?.['architecture.md']).toBeDefined();
    expect(context?.globalMemory?.['glossary.md']).toBeDefined();
  });

  it.skip('Should be able to read branch memory only context', async () => {
    // Read branch memory only context
    const branchOnlyResult = await controller.readContext({
      branch: testBranch,
      language: 'en',
      includeRules: false,
      includeBranchMemory: true,
      includeGlobalMemory: false
    });

    // Verify read result
    expect(branchOnlyResult.success).toBe(true);
    expect(branchOnlyResult.data).toBeDefined();
    expect(branchOnlyResult.data?.rules).toBeUndefined();
    expect(branchOnlyResult.data?.branchMemory).toBeDefined();
    expect(branchOnlyResult.data?.branchMemory?.['branchContext.md']).toBeDefined();
    expect(branchOnlyResult.data?.branchMemory?.['activeContext.md']).toBeDefined();
    expect(branchOnlyResult.data?.globalMemory).toBeUndefined();
  });

  it.skip('Should be able to read global memory only context', async () => {
    // Read global memory only context
    const globalOnlyResult = await controller.readContext({
      branch: testBranch,
      language: 'en',
      includeRules: false,
      includeBranchMemory: false,
      includeGlobalMemory: true
    });

    // Verify read result
    expect(globalOnlyResult.success).toBe(true);
    expect(globalOnlyResult.data).toBeDefined();
    expect(globalOnlyResult.data?.rules).toBeUndefined();
    expect(globalOnlyResult.data?.branchMemory).toBeUndefined();
    expect(globalOnlyResult.data?.globalMemory).toBeDefined();
    expect(globalOnlyResult.data?.globalMemory?.['architecture.md']).toBeDefined();
    expect(globalOnlyResult.data?.globalMemory?.['glossary.md']).toBeDefined();
  });

  it.skip('Should be able to read rules only context', async () => {
    // Read rules only context
    const rulesOnlyResult = await controller.readContext({
      branch: testBranch,
      language: 'en',
      includeRules: true,
      includeBranchMemory: false,
      includeGlobalMemory: false
    });

    // Verify read result
    expect(rulesOnlyResult.success).toBe(true);
    expect(rulesOnlyResult.data).toBeDefined();
    expect(rulesOnlyResult.data?.rules).toBeDefined();
    expect(rulesOnlyResult.data?.rules?.content).toContain('English rules');
    expect(rulesOnlyResult.data?.branchMemory).toBeUndefined();
    expect(rulesOnlyResult.data?.globalMemory).toBeUndefined();
  });

  it.skip('Should support both JSON and MD file formats', async () => {
    // JSONファイル
    await fs.writeFile(
      path.join(branchDir, testBranch, 'config.json'),
      '{"name": "test", "value": 123}',
      'utf-8'
    );

    // コンテキスト読み込み
    const contextResult = await controller.readContext({
      branch: testBranch,
      language: 'en',
      includeBranchMemory: true
    });

    // 読み込み結果の検証
    expect(contextResult.success).toBe(true);
    expect(contextResult.data?.branchMemory?.['config.json']).toBeDefined();
    expect(contextResult.data?.branchMemory?.['config.json']).toContain('"value": 123');
  });

  it('Should return an error when reading context of non-existent branch', async () => {
    // Non-existent branch
    const nonExistentBranch = 'non-existent-branch';

    // Read context
    const contextResult = await controller.readContext({
      branch: nonExistentBranch,
      language: 'en',
      includeBranchMemory: true
    });

    // Verify failure result
    expect(contextResult.success).toBe(false);
    expect(contextResult.error).toBeDefined();
  });
});

// Helper function
// Helper function has been removed as it's not used in this test file
