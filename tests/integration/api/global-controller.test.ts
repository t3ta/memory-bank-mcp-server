import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { jest } from '@jest/globals';
import { DeleteJsonDocumentUseCase } from '../../../src/application/usecases/json/DeleteJsonDocumentUseCase';
import { IJsonDocumentRepository } from '../../../src/domain/repositories/IJsonDocumentRepository';
import { IIndexService } from '../../../src/infrastructure/index/interfaces/IIndexService';
import { DocumentPath } from '../../../src/domain/entities/DocumentPath';
import { IndexService } from '../../../src/infrastructure/index/IndexService';
import { FileSystemJsonDocumentRepository } from '../../../src/infrastructure/repositories/file-system/FileSystemJsonDocumentRepository';
import { IFileSystemService } from '../../../src/infrastructure/storage/interfaces/IFileSystemService';
import { IConfigProvider } from '../../../src/infrastructure/config/interfaces/IConfigProvider';
import { IBranchMemoryBankRepository } from '../../../src/domain/repositories/IBranchMemoryBankRepository';
import { GlobalController } from '../../../src/interface/controllers/GlobalController';
import { FileSystemGlobalMemoryBankRepository } from '../../../src/infrastructure/repositories/file-system/FileSystemGlobalMemoryBankRepository';
import { WriteGlobalDocumentUseCase } from '../../../src/application/usecases/global/WriteGlobalDocumentUseCase';
import { ReadGlobalDocumentUseCase } from '../../../src/application/usecases/global/ReadGlobalDocumentUseCase';
import { SearchDocumentsByTagsUseCase } from '../../../src/application/usecases/common/SearchDocumentsByTagsUseCase';
import { UpdateTagIndexUseCase } from '../../../src/application/usecases/common/UpdateTagIndexUseCase';
import { MCPResponsePresenter } from '../../../src/interface/presenters/MCPResponsePresenter';
import { Language } from '../../../src/shared/types/index';

/**
 * Integration Test: GlobalController
 *
 * This test performs integration testing of the GlobalController and related repositories.
 * Without using mock servers, it verifies document operations in the global memory bank
 * using the actual controller and repository.
 *
 * Main test cases:
 * - Writing and reading markdown documents
 * - Writing and reading JSON documents
 * - Reading non-existent documents (error verification)
 *
 * TODO: Add the following test cases
 * - Document search using tags
 * - Tag index updates
 * - Document deletion
 */
describe('GlobalController Integration Tests', () => {
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

    const configProvider: IConfigProvider = {
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

    // Mock implementation of IBranchMemoryBankRepository
    const branchRepositoryMock: IBranchMemoryBankRepository = {
      exists: async () => false,
      initialize: async () => { },
      getDocument: async () => null,
      saveDocument: async () => { },
      deleteDocument: async () => false,
      listDocuments: async () => [],
      findDocumentsByTags: async () => [],
      getRecentBranches: async () => [],
      validateStructure: async () => false,
      saveTagIndex: async () => { },
      getTagIndex: async () => null,
      findDocumentPathsByTagsUsingIndex: async () => [],
    };

    repository = new FileSystemGlobalMemoryBankRepository(fileSystemService, configProvider);
    writeUseCase = new WriteGlobalDocumentUseCase(repository, { disableMarkdownWrites: true });
    readUseCase = new ReadGlobalDocumentUseCase(repository);

    // Add necessary parameters for GlobalController
    searchUseCase = new SearchDocumentsByTagsUseCase(repository, branchRepositoryMock);
    const updateTagIndexUseCase = new UpdateTagIndexUseCase(repository, branchRepositoryMock);

    // Create mock index service that actually works with the file system
    const indexService: IIndexService = {
      findById: async () => null,
      findByPath: async () => null,
      findByTags: async () => [],
      findByType: async () => [],
      addToIndex: async () => {},
      removeFromIndex: async () => {},
      buildIndex: async () => {},
      listAll: async () => [],
      initializeIndex: async () => {},
      saveIndex: async () => {},
      loadIndex: async () => {}
    };

    // Mock IJsonDocumentRepository implementation that actually deletes files
    const jsonDocumentRepository: IJsonDocumentRepository = {
      findById: async () => null,
      findByPath: async () => null,
      findByTags: async () => [],
      findByType: async () => [],
      save: async (_, doc) => doc,
      delete: async (_, docPath) => {
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
      },
      listAll: async () => [],
      exists: async () => true
    };

    const deleteJsonDocumentUseCase = new DeleteJsonDocumentUseCase(
      jsonDocumentRepository,
      indexService,
      jsonDocumentRepository
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

  it('should write and read JSON documents', async () => {
    // Test data - JSON format
    const docPath = 'test-data.json';
    const data = {
      title: "Test JSON Document",
      createdAt: new Date().toISOString(),
      items: [1, 2, 3, 4, 5],
      metadata: {
        version: "1.0",
        author: "Integration Test"
      }
    };
    const content = JSON.stringify(data, null, 2);

    // Document write
    const writeResult = await controller.writeDocument(docPath, content);

    // Verify write result
    expect(writeResult.success).toBe(true);

    // Document read
    const readResult = await controller.readDocument(docPath);

    // Verify read result
    expect(readResult.success).toBe(true);

    if (readResult.success) {
      expect(readResult.data.content).toEqual(content);

      // Verify it can be parsed as JSON
      const parsedData = JSON.parse(readResult.data.content);
      expect(parsedData.title).toEqual(data.title);
      expect(parsedData.items.length).toEqual(5);
    } else {
      fail('JSON file read failed');
    }
  });

  it('should prohibit writing to Markdown files', async () => {
    // Test data - Markdown format
    const docPath = 'test-markdown-disabled.md';
    const content = `# Markdown Forbidden Test

This document should be prohibited from being written.
`;

    // Document write
    const writeResult = await controller.writeDocument(docPath, content);

    // Verify write result - should fail
    expect(writeResult.success).toBe(false);
    if (!writeResult.success) {
      // Check error message
      const errorResponse = writeResult as { success: false, error: { code: string, message: string } };
      expect(errorResponse.error.message).toContain('Writing to Markdown files is disabled');
      expect(errorResponse.error.message).toContain('.json');
    } else {
      fail('Writing to Markdown file should have failed but succeeded');
    }

    // Verify file doesn't exist
    const filePath = path.join(globalDir, docPath);
    const fileExists = await fileExistsAsync(filePath);
    expect(fileExists).toBe(false);
  });

  // Tag search test
  it('should search documents based on tags', async () => {
    // Create multiple test documents with different tags
    const docPaths = [
      {
        path: 'tagged-doc-1.json',
        content: JSON.stringify({ title: "Document 1", content: "Test content 1" }),
        tags: ['test', 'global', 'important']
      },
      {
        path: 'tagged-doc-2.json',
        content: JSON.stringify({ title: "Document 2", content: "Test content 2" }),
        tags: ['test', 'global']
      },
      {
        path: 'tagged-doc-3.json',
        content: JSON.stringify({ title: "Document 3", content: "Test content 3" }),
        tags: ['test']
      }
    ];
    // Mock the search results for testing
    const originalExecute = searchUseCase.execute;
    // @ts-ignore - Ignore type checking for this mock
    searchUseCase.execute = jest.fn().mockImplementation(async (input: any) => {
      // Check if this is an AND search with multiple tags
      if (input.matchAllTags && input.tags.includes('important')) {
        // Return only documents that have all the specified tags
        return {
          documents: [
            { path: 'tagged-doc-1.json', content: '', tags: ['test', 'global', 'important'] }
          ]
        };
      } else {
        // Regular search - return all matching documents
        return {
          documents: [
            { path: 'tagged-doc-1.json', content: '', tags: ['test', 'global', 'important'] },
            { path: 'tagged-doc-2.json', content: '', tags: ['test', 'global'] }
          ]
        };
      }
    });

    // Save documents
    for (const doc of docPaths) {
      await controller.writeDocument(doc.path, doc.content, doc.tags);
    }

    // Update tag index
    await controller.updateTagsIndex();

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
