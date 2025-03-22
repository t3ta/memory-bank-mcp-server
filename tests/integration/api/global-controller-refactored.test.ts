import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { jest } from '@jest/globals';
import { DeleteJsonDocumentUseCase } from '../../../src/application/usecases/json/DeleteJsonDocumentUseCase';
import { DocumentPath } from '../../../src/domain/entities/DocumentPath';
import { GlobalController } from '../../../src/interface/controllers/GlobalController';
import { WriteGlobalDocumentUseCase } from '../../../src/application/usecases/global/WriteGlobalDocumentUseCase';
import { ReadGlobalDocumentUseCase } from '../../../src/application/usecases/global/ReadGlobalDocumentUseCase';
import { MCPResponsePresenter } from '../../../src/interface/presenters/MCPResponsePresenter';
import { Language } from '../../../src/shared/types/index';
import { FileSystemGlobalMemoryBankRepository } from '../../../src/infrastructure/repositories/file-system/FileSystemGlobalMemoryBankRepository';
import { SearchDocumentsByTagsUseCase } from '../../../src/application/usecases/common/SearchDocumentsByTagsUseCase';
import { UpdateTagIndexUseCase } from '../../../src/application/usecases/common/UpdateTagIndexUseCase';

// Import our new mock utilities
import {
  createMockBranchMemoryBankRepository,
  createMockIndexService,
  createMockJsonDocumentRepository,
  createMockSearchDocumentsByTagsUseCase
} from '../../mocks';
import { when, anything, deepEqual } from 'ts-mockito';

/**
 * Integration Test: GlobalController (Refactored with mock library)
 *
 * This test performs integration testing of the GlobalController and related repositories.
 * Uses the new mock library for consistent and maintainable mocks.
 */
describe('GlobalController Integration Tests (Refactored)', () => {
  // Test directory
  let testDir: string;
  let globalDir: string;

  // Test target instances
  let repository: FileSystemGlobalMemoryBankRepository;
  let writeUseCase: WriteGlobalDocumentUseCase;
  let readUseCase: ReadGlobalDocumentUseCase;
  let searchUseCase: SearchDocumentsByTagsUseCase;
  let controller: GlobalController;

  beforeAll(async () => {
    // Test environment setup
    const testId = uuidv4();
    testDir = path.join(process.cwd(), 'tests', '.temp', `integration-global-${testId}`);
    globalDir = path.join(testDir, 'global-memory-bank');

    // Create directories
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(globalDir, { recursive: true });

    // Component initialization
    // Implement FileSystemService and ConfigProvider
    const fileSystemService = {
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
      readFileChunk: async (filePath: string, start: number, length: number) => {
        const content = await fs.readFile(filePath, 'utf-8');
        return content.substring(start, start + length);
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
        language: 'en' as Language,
      }),
    };

    const configProvider = {
      initialize: async () => ({
        memoryBankRoot: testDir,
        workspaceRoot: testDir,
        verbose: false,
        language: 'en' as Language
      }),
      getConfig: () => ({
        memoryBankRoot: testDir,
        workspaceRoot: testDir,
        verbose: false,
        language: 'en' as Language
      }),
      getBranchMemoryPath: (branchName: string) => path.join(testDir, 'branch-memory-bank', branchName),
      getGlobalMemoryPath: () => path.join(testDir, 'global-memory-bank'),
      getLanguage: () => 'en' as Language
    };

    // Use our mock library instead of inline mocks
    // --------------------------------
    // Before: Hardcoded mock implementations
    // After: Using the mock library with customizations
    
    // 1. Create branch repository mock
    const { instanceRepo: branchRepo } = createMockBranchMemoryBankRepository();

    // 2. Create index service mock
    const { instanceService: indexService } = createMockIndexService();

    // 3. Create JSON document repository mock with customized file deletion
    const { instanceRepo: jsonDocRepo } = createMockJsonDocumentRepository(mockRepo => {
      // Customize delete behavior to actually delete files from the file system
      when(mockRepo.delete(anything(), anything())).thenCall(async (_, docPath) => {
        // Actually delete the file from the file system
        if (docPath instanceof DocumentPath) {
          const filePath = path.join(globalDir, docPath.value);
          try {
            await fs.unlink(filePath);
            return true;
          } catch {
            return false;
          }
        }
        return false;
      });
    });

    repository = new FileSystemGlobalMemoryBankRepository(fileSystemService, configProvider);
    writeUseCase = new WriteGlobalDocumentUseCase(repository, { disableMarkdownWrites: true });
    readUseCase = new ReadGlobalDocumentUseCase(repository);

    // Create real SearchDocumentsByTagsUseCase for normal tests
    searchUseCase = new SearchDocumentsByTagsUseCase(repository, branchRepo);
    const updateTagIndexUseCase = new UpdateTagIndexUseCase(repository, branchRepo);
    
    const deleteJsonDocumentUseCase = new DeleteJsonDocumentUseCase(
      jsonDocRepo,
      indexService,
      jsonDocRepo
    );
    
    const presenter = new MCPResponsePresenter();

    controller = new GlobalController(
      readUseCase,
      writeUseCase,
      searchUseCase,
      updateTagIndexUseCase,
      presenter,
      {
        deleteJsonDocumentUseCase
      }
    );

    console.log(`Global test environment setup complete: ${testDir}`);
  });

  afterAll(async () => {
    // Cleanup test environment
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log(`Test environment deleted: ${testDir}`);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  it('should write and read global documents', async () => {
    // Test data - JSON format
    const docPath = 'test-global-doc.json';
    const content = JSON.stringify({
      title: "Global Test Document",
      description: "This document was created by an integration test as a global document.",
      createdAt: new Date().toISOString()
    }, null, 2);  // Format with 2-space indentation to match the output

    // Document write
    const writeResult = await controller.writeDocument(docPath, content);

    // Verify write result
    expect(writeResult.success).toBe(true);
    if (!writeResult.success) {
      const errorResponse = writeResult as { success: false, error: { code: string, message: string } };
      expect(errorResponse.error).toBeDefined();
    } else {
      expect('error' in writeResult).toBe(false);
    }

    // Verify file exists
    const filePath = path.join(globalDir, docPath);
    const fileExists = await fileExistsAsync(filePath);
    expect(fileExists).toBe(true);

    // Verify file content
    const fileContent = await fs.readFile(filePath, 'utf-8');
    expect(fileContent).toEqual(content);

    // Document read
    const readResult = await controller.readDocument(docPath);

    // Verify read result
    expect(readResult.success).toBe(true);
    if (readResult.success) {
      expect(readResult.data.content).toEqual(content);
    } else {
      fail('Read should have succeeded but failed');
    }
  });

  it('should return an error when reading a non-existent global document', async () => {
    // Non-existent document
    const docPath = 'non-existent-global-doc.md';

    // Document read
    const readResult = await controller.readDocument(docPath);

    // Verify failure result
    expect(readResult.success).toBe(false);
    if (!readResult.success) {
      const errorResponse = readResult as { success: false, error: { code: string, message: string } };
      expect(errorResponse.error).toBeDefined();
    } else {
      fail('Reading a non-existent file unexpectedly succeeded');
    }
  });

  // Tag search test using our mock library
  it('should search documents based on tags', async () => {
    // Store original search use case
    const originalSearchUseCase = searchUseCase;
    
    try {
      // Create a mock search use case with custom behavior
      const { instanceUseCase: mockSearchUseCase } = createMockSearchDocumentsByTagsUseCase(mockUseCase => {
        // Setup behavior for regular tag search (OR search)
        when(mockUseCase.execute(deepEqual({ 
          tags: ['global'], 
          matchAllTags: false 
        }))).thenResolve({
          documents: [
            { path: 'tagged-doc-1.json', content: '', tags: ['test', 'global', 'important'], lastModified: new Date().toISOString() },
            { path: 'tagged-doc-2.json', content: '', tags: ['test', 'global'], lastModified: new Date().toISOString() }
          ],
          searchInfo: {
            count: 2,
            searchedTags: ['global'],
            matchedAllTags: false,
            searchLocation: 'global'
          }
        });
        
        // Setup behavior for AND search with multiple tags
        when(mockUseCase.execute(deepEqual({ 
          tags: ['global', 'important'], 
          matchAllTags: true 
        }))).thenResolve({
          documents: [
            { path: 'tagged-doc-1.json', content: '', tags: ['test', 'global', 'important'], lastModified: new Date().toISOString() }
          ],
          searchInfo: {
            count: 1,
            searchedTags: ['global', 'important'],
            matchedAllTags: true,
            searchLocation: 'global'
          }
        });
      });
      
      // Replace the original search use case with our mock
      (controller as any)._searchUseCase = mockSearchUseCase;
      
      // Search with 'global' tag
      const searchResult = await controller.findDocumentsByTags(['global']);
      expect(searchResult.success).toBe(true);
      if (searchResult.success && 'data' in searchResult) {
        expect(searchResult.data.length).toBe(2); // Should find 2 documents
        const foundPaths = searchResult.data.map(doc => doc.path);
        expect(foundPaths).toContain('tagged-doc-1.json');
        expect(foundPaths).toContain('tagged-doc-2.json');
      }

      // AND search with multiple tags
      const andSearchResult = await controller.findDocumentsByTags(['global', 'important'], true);
      expect(andSearchResult.success).toBe(true);
      if (andSearchResult.success && 'data' in andSearchResult) {
        expect(andSearchResult.data.length).toBe(1); // Only one document has both tags
        expect(andSearchResult.data[0].path).toBe('tagged-doc-1.json');
      }
    } finally {
      // Restore the original search use case
      (controller as any)._searchUseCase = originalSearchUseCase;
    }
  });

  it('should delete global documents', async () => {
    // Create test document
    const docPath = 'doc-to-delete.json';
    const content = '{"title": "Document to Delete", "content": "This document will be deleted."}';

    await controller.writeDocument(docPath, content);

    // Verify existence before deletion
    const filePath = path.join(globalDir, docPath);
    let exists = await fileExistsAsync(filePath);
    expect(exists).toBe(true);

    // Delete document
    const deleteResult = await controller.deleteJsonDocument({ path: docPath });
    expect(deleteResult.success).toBe(true);

    // Verify non-existence after deletion
    exists = await fileExistsAsync(filePath);
    expect(exists).toBe(false);

    // Verify reading the deleted document returns an error
    const readResult = await controller.readDocument(docPath);
    expect(readResult.success).toBe(false);
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
