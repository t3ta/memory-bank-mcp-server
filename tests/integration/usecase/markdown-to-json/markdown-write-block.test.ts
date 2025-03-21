import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { IConfigProvider } from '../../../../src/infrastructure/config/interfaces/IConfigProvider.js';
import { IGlobalMemoryBankRepository } from '../../../../src/domain/repositories/IGlobalMemoryBankRepository.js';
import { ITagIndexRepository } from '../../../../src/domain/repositories/ITagIndexRepository.js';
import { IFileSystemService } from '../../../../src/infrastructure/storage/interfaces/IFileSystemService.js';
import { BranchController } from '../../../../src/interface/controllers/BranchController.js';
import { FileSystemBranchMemoryBankRepository } from '../../../../src/infrastructure/repositories/file-system/FileSystemBranchMemoryBankRepository.js';
import { WriteBranchDocumentUseCase } from '../../../../src/application/usecases/branch/WriteBranchDocumentUseCase.js';
import { ReadBranchDocumentUseCase } from '../../../../src/application/usecases/branch/ReadBranchDocumentUseCase.js';
import { SearchDocumentsByTagsUseCase } from '../../../../src/application/usecases/common/SearchDocumentsByTagsUseCase.js';
import { UpdateTagIndexUseCase } from '../../../../src/application/usecases/common/UpdateTagIndexUseCase.js';
import { GetRecentBranchesUseCase } from '../../../../src/application/usecases/common/GetRecentBranchesUseCase.js';
import { ReadBranchCoreFilesUseCase } from '../../../../src/application/usecases/common/ReadBranchCoreFilesUseCase.js';
import { CreateBranchCoreFilesUseCase } from '../../../../src/application/usecases/common/CreateBranchCoreFilesUseCase.js';
import { MCPResponsePresenter } from '../../../../src/interface/presenters/MCPResponsePresenter.js';
import { MCPErrorResponse } from '../../../../src/interface/presenters/types/MCPResponse.js';

/**
 * Integration Test: Markdown Write Block
 *
 * Test to verify that Markdown writes are blocked
 */
describe('Markdown Write Block Integration Tests', () => {
  // Test directories
  let testDir: string;
  let branchDir: string;
  let testBranch: string;

  // Test target instances
  let repository: FileSystemBranchMemoryBankRepository;
  let writeUseCase: WriteBranchDocumentUseCase;
  let readUseCase: ReadBranchDocumentUseCase;
  let searchUseCase: SearchDocumentsByTagsUseCase;
  let updateTagIndexUseCase: UpdateTagIndexUseCase;
  let getRecentBranchesUseCase: GetRecentBranchesUseCase;
  let readCoreFilesUseCase: ReadBranchCoreFilesUseCase;
  let createCoreFilesUseCase: CreateBranchCoreFilesUseCase;
  let presenter: MCPResponsePresenter;
  let controller: BranchController;

  // Normal controller (Markdown writes enabled)
  let normalController: BranchController;

  beforeAll(async () => {
    // Test environment setup
    const testId = uuidv4();
    testDir = path.join(process.cwd(), 'tests', '.temp', `markdown-block-${testId}`);
    branchDir = path.join(testDir, 'branch-memory-bank');
    testBranch = `feature/test-branch-${testId}`;

    // Create directories
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(branchDir, { recursive: true });

    // Create 'feature' directory to support 'feature/test-branch-xxx' format
    const featureDir = path.join(branchDir, 'feature');
    await fs.mkdir(featureDir, { recursive: true });

    // Create 'test-branch-xxx' directory
    const branchNameWithoutNamespace = testBranch.split('/')[1];
    await fs.mkdir(path.join(featureDir, branchNameWithoutNamespace), { recursive: true });

    // Initialize components
    // Create objects implementing FileSystemService and ConfigProvider
    const fileSystemService: IFileSystemService = {
      createDirectory: async (directory: string) => {
        await fs.mkdir(directory, { recursive: true });
      },
      directoryExists: async (directory: string) => {
        try {
          const stats = await fs.stat(directory);
          return stats.isDirectory();
        } catch {
          return false;
        }
      },
      fileExists: async (filePath: string) => {
        try {
          const stats = await fs.stat(filePath);
          return stats.isFile();
        } catch {
          return false;
        }
      },
      readFile: async (filePath: string) => {
        return await fs.readFile(filePath, 'utf-8');
      },
      writeFile: async (filePath: string, content: string) => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf-8');
      },
      listFiles: async (directory: string) => {
        return (await fs.readdir(directory)).map(file => path.join(directory, file));
      },
      getFileStats: async (filePath: string) => {
        const stats = await fs.stat(filePath);
        return {
          size: stats.size,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
          lastModified: stats.mtime,
          createdAt: stats.birthtime,
        };
      },
      deleteFile: async (filePath: string) => {
        try {
          await fs.unlink(filePath);
          return true;
        } catch {
          return false;
        }
      },
      getBranchMemoryPath: (branchName: string) => path.join(testDir, 'branch-memory-bank', branchName),
      getConfig: () => ({
        memoryBankRoot: testDir,
        workspaceRoot: testDir,
        verbose: false,
        language: 'en',
      }),
    };

    // Create ConfigProvider object conforming to the interface
    const configProvider: IConfigProvider = {
      initialize: async () => ({
        workspaceRoot: testDir,
        memoryBankRoot: testDir,
        verbose: false,
        language: 'en'
      }),
      getConfig: () => ({
        memoryBankRoot: testDir,
        workspaceRoot: testDir,
        verbose: false,
        language: 'en',
      }),
      getBranchMemoryPath: (branchName: string) => path.join(testDir, 'branch-memory-bank', branchName),
      getGlobalMemoryPath: () => path.join(testDir, 'global-memory-bank'),
      getLanguage: () => 'en',
    };

    repository = new FileSystemBranchMemoryBankRepository(fileSystemService, configProvider);

    // Create mock implementing IGlobalMemoryBankRepository interface
    const globalRepository: IGlobalMemoryBankRepository = {
      initialize: async () => {},
      validateStructure: async () => true,
      getDocument: async () => null,
      saveDocument: async () => {},
      deleteDocument: async () => true,
      findDocumentsByTags: async () => [],
      updateTagsIndex: async () => {},
      getTagIndex: async () => null,
      saveTagIndex: async () => {},
      findDocumentPathsByTagsUsingIndex: async () => [],
      listDocuments: async () => []
    };

    // Create TagIndexRepository mock
    const tagRepository: ITagIndexRepository = {
      updateBranchTagIndex: async () => ({ tags: [], documentCount: 0, updateInfo: { fullRebuild: false, timestamp: new Date().toISOString() } }),
      updateGlobalTagIndex: async () => ({ tags: [], documentCount: 0, updateInfo: { fullRebuild: false, timestamp: new Date().toISOString() } }),
      findBranchDocumentsByTags: async () => [],
      findGlobalDocumentsByTags: async () => [],
      addDocumentToBranchIndex: async () => {},
      addDocumentToGlobalIndex: async () => {},
      removeDocumentFromBranchIndex: async () => {},
      removeDocumentFromGlobalIndex: async () => {},
      getBranchTags: async () => [],
      getGlobalTags: async () => []
    };
    readUseCase = new ReadBranchDocumentUseCase(repository);

    // Create UseCase with Markdown write disable option
    writeUseCase = new WriteBranchDocumentUseCase(repository, {
      disableMarkdownWrites: true
    });

    // Normal UseCase (Markdown writes enabled)
    const normalWriteUseCase = new WriteBranchDocumentUseCase(repository);

    searchUseCase = new SearchDocumentsByTagsUseCase(globalRepository, repository);
    updateTagIndexUseCase = new UpdateTagIndexUseCase(globalRepository, repository);
    getRecentBranchesUseCase = new GetRecentBranchesUseCase(repository);
    readCoreFilesUseCase = new ReadBranchCoreFilesUseCase(repository);
    createCoreFilesUseCase = new CreateBranchCoreFilesUseCase(repository);
    presenter = new MCPResponsePresenter();

    // Controller with Markdown writes disabled
    controller = new BranchController(
      readUseCase,
      writeUseCase,
      searchUseCase,
      updateTagIndexUseCase,
      getRecentBranchesUseCase,
      readCoreFilesUseCase,
      createCoreFilesUseCase,
      presenter
    );

    // Normal controller (Markdown writes enabled)
    normalController = new BranchController(
      readUseCase,
      normalWriteUseCase,
      searchUseCase,
      updateTagIndexUseCase,
      getRecentBranchesUseCase,
      readCoreFilesUseCase,
      createCoreFilesUseCase,
      presenter
    );

    // Test environment setup log
    console.log(`Test environment setup completed: ${testDir}`);
  });

  afterAll(async () => {
    // Test environment cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log(`Test environment deleted: ${testDir}`);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  it('Should allow Markdown writes with normal controller', async () => {
    // Test data
    const docPath = 'normal-test-document.md';
    const content = `# Normal Write Test

This document was created with an unrestricted controller.
Created at: ${new Date().toISOString()}
Test ID: ${testBranch}
`;

    // Write document (normal controller)
    const writeResult = await normalController.writeDocument(testBranch, docPath, content);

    // Verify write result
    expect(writeResult.success).toBe(true);

    // Verify file exists
    const [ns0, bn0] = testBranch.split('/');
    const filePath = path.join(branchDir, ns0, bn0, docPath);
    const fileExists = await fileExistsAsync(filePath);
    expect(fileExists).toBe(true);

    // Verify file content
    const fileContent = await fs.readFile(filePath, 'utf-8');
    expect(fileContent).toEqual(content);
  });

  it('Should block Markdown writes with restricted controller', async () => {
    // Test data
    const docPath = 'blocked-test-document.md';
    const content = `# Should Be Blocked Write Test

This document should be created with a restricted controller.
Created at: ${new Date().toISOString()}
Test ID: ${testBranch}
`;

    // Write document (controller with Markdown writes disabled)
    const writeResult = await controller.writeDocument(testBranch, docPath, content);

    // Verify error occurs
    expect(writeResult.success).toBe(false);

    // Cast error result for type safety
    const errorResult = writeResult as MCPErrorResponse;
    expect(errorResult.error).toBeDefined();

    // Verify error message suggests using JSON format
    if (errorResult.error) {
      expect(errorResult.error.message).toContain('JSON format');
      expect(errorResult.error.message).toContain('.json');
    }

    // Verify file was not created
    const [ns1, bn1] = testBranch.split('/');
    const filePath = path.join(branchDir, ns1, bn1, docPath);
    const fileExists = await fileExistsAsync(filePath);
    expect(fileExists).toBe(false);
  });

  it('Should allow JSON file writes', async () => {
    // Test data
    const docPath = 'allowed-test-document.json';
    const content = JSON.stringify({
      title: "Allowed Write Test",
      createdAt: new Date().toISOString(),
      testId: testBranch,
      content: "This JSON document should be created even with a restricted controller."
    }, null, 2);

    // Write document (controller with Markdown writes disabled)
    const writeResult = await controller.writeDocument(testBranch, docPath, content);

    // Verify success
    expect(writeResult.success).toBe(true);

    // Verify file was created
    const [ns2, bn2] = testBranch.split('/');
    const filePath = path.join(branchDir, ns2, bn2, docPath);
    const fileExists = await fileExistsAsync(filePath);
    expect(fileExists).toBe(true);

    // Verify file content
    const fileContent = await fs.readFile(filePath, 'utf-8');
    expect(fileContent).toEqual(content);
  });

  it('Should continue to allow reading Markdown files', async () => {
    // Test data
    const docPath = 'read-test-document.md';
    const content = `# Read Test

This document is for testing read operations.
Created at: ${new Date().toISOString()}
Test ID: ${testBranch}
`;

    // Create file directly first (using normal controller)
    await normalController.writeDocument(testBranch, docPath, content);

    // Read document (controller with Markdown writes disabled)
    const readResult = await controller.readDocument(testBranch, docPath);

    // Verify read result
    expect(readResult.success).toBe(true);
    if (readResult.success && readResult.data) {
      expect(readResult.data.content).toEqual(content);
    }
  });
});

// Helper function
async function fileExistsAsync(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
