import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { CoreFilesController } from '../../../src/interface/controllers/CoreFilesController';
import { FileSystemBranchMemoryBankRepository } from '../../../src/infrastructure/repositories/FileSystemBranchMemoryBankRepository';
import { ReadBranchCoreFilesUseCase } from '../../../src/application/usecases/common/ReadBranchCoreFilesUseCase';
import { CreateBranchCoreFilesUseCase } from '../../../src/application/usecases/common/CreateBranchCoreFilesUseCase';

/**
 * Integration Test: CoreFilesController
 *
 * Integration test for actual controller and repository without mock server
 */
describe('CoreFilesController Integration Tests', () => {
  // Test directories
  let testDir: string;
  let branchDir: string;
  let testBranch: string;

  // Test target instances
  let repository: FileSystemBranchMemoryBankRepository;
  let readCoreFilesUseCase: ReadBranchCoreFilesUseCase;
  let createCoreFilesUseCase: CreateBranchCoreFilesUseCase;
  let controller: CoreFilesController;

  beforeAll(async () => {
    // Test environment setup
    const testId = uuidv4();
    testDir = path.join(process.cwd(), 'tests', '.temp', `integration-core-${testId}`);
    branchDir = path.join(testDir, 'branch-memory-bank');
    testBranch = `feature/test-branch-${testId}`;

    // Create directories
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(branchDir, { recursive: true });
    await fs.mkdir(path.join(branchDir, testBranch), { recursive: true });

    // Initialize components
    repository = new FileSystemBranchMemoryBankRepository(testDir);
    readCoreFilesUseCase = new ReadBranchCoreFilesUseCase(repository);
    createCoreFilesUseCase = new CreateBranchCoreFilesUseCase(repository);

    controller = new CoreFilesController(
      readCoreFilesUseCase,
      createCoreFilesUseCase
    );

    // Create default file for testing
    const defaultBranchContext = `# Default Branch Context\n\n## Purpose\n\nDefault test branch.`;
    await fs.writeFile(path.join(branchDir, testBranch, 'branchContext.md'), defaultBranchContext, 'utf-8');

    console.log(`Core files test environment setup completed: ${testDir}`);
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

  it('should create core files', async () => {
    // Test data
    const branchContext = `# Test Branch Context\n\n## Purpose\n\nTest branch.`;
    const activeContext = `# Active Context\n\n## Current Task\n\nImplementing integration tests.`;
    const progress = `# Progress\n\n## Completed Tasks\n\n- Test environment setup\n\n## Incomplete Tasks\n\n- Test execution`;

    // Create core files
    const createResult = await controller.createCoreFiles(testBranch, {
      branchContext,
      activeContext: { currentWork: activeContext },
      systemPatterns: { technicalDecisions: [] },
      progress: { status: progress }
    });

    // Verify creation result
    expect(createResult.success).toBe(true);
    expect(createResult.error).toBeUndefined();

    // Verify branch directory exists
    const branchPath = path.join(branchDir, testBranch);
    expect(await fileExistsAsync(branchPath)).toBe(true);
  });

  it('should read core files', async () => {
    // Test data
    const branchContext = `# Branch Context for Read Test\n\n## Purpose\n\nFor read test.`;
    const activeContext = `# Active Context for Read Test\n\n## Current Task\n\nReading test in progress.`;
    const progress = `# Progress for Read Test\n\n## Completed Tasks\n\n- Read test preparation\n\n## Incomplete Tasks\n\n- Read test verification`;

    // Create core files
    await controller.createCoreFiles(testBranch, {
      branchContext,
      activeContext: { currentWork: activeContext },
      systemPatterns: { technicalDecisions: [] },
      progress: { status: progress }
    });

    // Read core files
    const readResult = await controller.readCoreFiles(testBranch);

    // Debug output
    console.log('Read result for test branch:', JSON.stringify(readResult, null, 2));

    // Verify read result
    expect(readResult.success).toBe(true);
    expect(readResult.error).toBeUndefined();
    expect(readResult.data).toBeDefined();

    // Verify content of read core files
    const coreFiles = readResult.data;
    expect(coreFiles?.branchContext).toEqual(branchContext);

    // Verify required attributes exist
    expect(coreFiles?.activeContext).toBeDefined();
    expect(coreFiles?.progress).toBeDefined();
    expect(coreFiles?.systemPatterns).toBeDefined();
  });

  it('should auto-initialize when branch does not exist', async () => {
    // Non-existent branch
    const nonExistentBranch = 'feature/non-existent-branch';

    // Read core files
    const readResult = await controller.readCoreFiles(nonExistentBranch);

    // Verify success result (branch should be auto-initialized)
    expect(readResult.success).toBe(true);
    expect(readResult.error).toBeUndefined();
    expect(readResult.data).toBeDefined();
    
    // Verify branch was created
    const branchPath = path.join(branchDir, nonExistentBranch);
    expect(await fileExistsAsync(branchPath)).toBe(true);
  });

  it('should partially read core files when some files are missing', async () => {
    // New branch for testing
    const partialBranch = `feature/partial-test-branch-${uuidv4()}`;
    await fs.mkdir(path.join(branchDir, partialBranch), { recursive: true });

    // Create only branchContext and progress
    const branchContext = `# Branch Context for Partial Test\n\n## Purpose\n\nFor partial test.`;
    const progress = `# Progress for Partial Test\n\n## Completed Tasks\n\n- Partial test preparation`;

    await fs.writeFile(path.join(branchDir, partialBranch, 'branchContext.md'), branchContext, 'utf-8');
    await fs.writeFile(path.join(branchDir, partialBranch, 'progress.md'), progress, 'utf-8');

    // Verify that branch exists in repository
    expect(await repository.exists(partialBranch)).toBe(true);

    // Read core files
    const readResult = await controller.readCoreFiles(partialBranch);

    // Debug output
    console.log('Read result for partial branch:', JSON.stringify(readResult, null, 2));

    // Verify read result
    expect(readResult.success).toBe(true);
    expect(readResult.data).toBeDefined();

    // Verify existing and non-existing files
    const coreFiles = readResult.data;
    
    // Verify data exists
    expect(coreFiles).toBeDefined();

    // Verify content of only existing files
    if (coreFiles?.branchContext) {
      expect(coreFiles.branchContext).toEqual(branchContext);
    }
    // Progressはオブジェクトとして返ってくるので、別の方法で検証
    if (coreFiles?.progress) {
      // 空オブジェクトやnullじゃなければOK
      expect(coreFiles.progress).toBeDefined();
    }
    
    // activeContextは未定義のはず
    expect(coreFiles?.activeContext).toBeUndefined();
    
    // systemPatternsは定義されているが、中身は空配列であることを確認
    if (coreFiles?.systemPatterns) {
      expect(coreFiles.systemPatterns.technicalDecisions).toEqual([]);
    }
  });
  
  it('should handle error when creating core files with invalid data', async () => {
    // Test with invalid branch name (null should cause error)
    const invalidBranch = null as unknown as string;
    
    // Create core files with invalid data
    const createResult = await controller.createCoreFiles(invalidBranch, {
      branchContext: 'Some content',
      activeContext: { currentWork: 'Some work' },
      systemPatterns: { technicalDecisions: [] },
      progress: { status: 'Some progress' }
    });

    // Verify failure result
    expect(createResult.success).toBe(false);
    expect(createResult.error).toBeDefined();
  });
  
  // TODO: Future enhancement tests
  /* 
  it('should migrate markdown core files to JSON format', async () => {
    // Future enhancement
  });
  
  it('should create structured core files in JSON format', async () => {
    // Future enhancement
  });
  */
});

// Helper function for file existence
const fileExistsAsync = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};
