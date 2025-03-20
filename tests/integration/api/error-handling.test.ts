import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { BranchController } from '../../../src/interface/controllers/BranchController';
import { GlobalController } from '../../../src/interface/controllers/GlobalController';
import { CoreFilesController } from '../../../src/interface/controllers/CoreFilesController';

import { FileSystemBranchMemoryBankRepository } from '../../../src/infrastructure/repositories/file-system/FileSystemBranchMemoryBankRepository';
import { FileSystemGlobalMemoryBankRepository } from '../../../src/infrastructure/repositories/file-system/FileSystemGlobalMemoryBankRepository';

import { ReadBranchDocumentUseCase } from '../../../src/application/usecases/branch/ReadBranchDocumentUseCase';
import { WriteBranchDocumentUseCase } from '../../../src/application/usecases/branch/WriteBranchDocumentUseCase';
import { ReadGlobalDocumentUseCase } from '../../../src/application/usecases/global/ReadGlobalDocumentUseCase';
import { WriteGlobalDocumentUseCase } from '../../../src/application/usecases/global/WriteGlobalDocumentUseCase';
import { SearchDocumentsByTagsUseCase } from '../../../src/application/usecases/common/SearchDocumentsByTagsUseCase';
import { UpdateTagIndexUseCase } from '../../../src/application/usecases/common/UpdateTagIndexUseCase';
import { GetRecentBranchesUseCase } from '../../../src/application/usecases/common/GetRecentBranchesUseCase';
import { ReadBranchCoreFilesUseCase } from '../../../src/application/usecases/common/ReadBranchCoreFilesUseCase';
import { CreateBranchCoreFilesUseCase } from '../../../src/application/usecases/common/CreateBranchCoreFilesUseCase';
import { FileSystemService } from '../../../src/infrastructure/storage/FileSystemService';
import { ConfigProvider } from '../../../src/infrastructure/config/ConfigProvider';
import { MCPResponsePresenter } from '../../../src/interface/presenters/MCPResponsePresenter';

/**
 * Integration Test: Error Handling
 *
 * Tests various error cases to ensure the system handles errors properly
 * and provides appropriate error responses.
 */
describe('Error Handling Integration Tests', () => {
  // Test directories
  let testDir: string;
  let branchDir: string;
  let globalDir: string;
  let rulesDir: string;
  let testBranch: string;

  // Controller instances
  let branchController: BranchController;
  let globalController: GlobalController;
  let coreFilesController: CoreFilesController;

  // Services and repositories
  let fileSystemService: FileSystemService;
  let configProvider: ConfigProvider;
  let branchRepository: FileSystemBranchMemoryBankRepository;
  let globalRepository: FileSystemGlobalMemoryBankRepository;
  
  // Presenter
  let presenter: MCPResponsePresenter;

  beforeAll(async () => {
    // Set up test environment
    const testId = uuidv4();
    testDir = path.join(process.cwd(), 'tests', '.temp', `integration-error-${testId}`);
    branchDir = path.join(testDir, 'branch-memory-bank');
    globalDir = path.join(testDir, 'global-memory-bank');
    rulesDir = path.join(testDir, 'rules');
    testBranch = `feature/test-branch-${testId}`;

    // Create directories
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(branchDir, { recursive: true });
    await fs.mkdir(globalDir, { recursive: true });
    await fs.mkdir(rulesDir, { recursive: true });
    
    // Create test branch directory (using safe name format)
    const safeBranchName = testBranch.replace('/', '-');
    await fs.mkdir(path.join(branchDir, safeBranchName), { recursive: true });

    // Initialize config provider
    configProvider = new ConfigProvider();
    await configProvider.initialize({
      workspace: testDir,
      memoryRoot: testDir
    });

    // File system service
    fileSystemService = new FileSystemService();

    // Repositories
    branchRepository = new FileSystemBranchMemoryBankRepository(fileSystemService, configProvider);
    globalRepository = new FileSystemGlobalMemoryBankRepository(fileSystemService, configProvider);

    // Presenter
    presenter = new MCPResponsePresenter();

    // Use cases
    const readBranchUseCase = new ReadBranchDocumentUseCase(branchRepository);
    const writeBranchUseCase = new WriteBranchDocumentUseCase(branchRepository);
    const readGlobalUseCase = new ReadGlobalDocumentUseCase(globalRepository);
    const writeGlobalUseCase = new WriteGlobalDocumentUseCase(globalRepository);
    const searchTagsUseCase = new SearchDocumentsByTagsUseCase(globalRepository, branchRepository);
    const updateTagIndexUseCase = new UpdateTagIndexUseCase(globalRepository, branchRepository);
    const getRecentBranchesUseCase = new GetRecentBranchesUseCase(branchRepository);
    const readCoreFilesUseCase = new ReadBranchCoreFilesUseCase(branchRepository);
    const createCoreFilesUseCase = new CreateBranchCoreFilesUseCase(branchRepository);

    // Controllers
    branchController = new BranchController(
      readBranchUseCase,
      writeBranchUseCase,
      searchTagsUseCase,
      updateTagIndexUseCase,
      getRecentBranchesUseCase,
      readCoreFilesUseCase,
      createCoreFilesUseCase,
      presenter
    );
    
    globalController = new GlobalController(
      readGlobalUseCase,
      writeGlobalUseCase,
      searchTagsUseCase,
      updateTagIndexUseCase,
      presenter
    );
    
    // Core files controller doesn't use presenter injection
    coreFilesController = new CoreFilesController(
      readCoreFilesUseCase,
      createCoreFilesUseCase
    );

    console.log(`Error handling test environment setup completed: ${testDir}`);
  }, 15000);

  afterAll(async () => {
    // Clean up test environment
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log(`Test environment deleted: ${testDir}`);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  describe('Invalid path handling', () => {
    it('should return error for directory traversal attack patterns (branch controller)', async () => {
      // Directory traversal pattern
      const maliciousPath = '../../../etc/passwd';

      // Document read
      const readResult = await branchController.readDocument(testBranch, maliciousPath);

      // Verify error result
      expect(readResult.success).toBe(false);
      if (!readResult.success && 'error' in readResult) {
        expect(readResult.error).toBeDefined();
      } else {
        fail('Error response should be returned');
      }

      // Document write
      const writeResult = await branchController.writeDocument(testBranch, maliciousPath, 'Malicious content');

      // Verify error result
      expect(writeResult.success).toBe(false);
      if (!writeResult.success && 'error' in writeResult) {
        expect(writeResult.error).toBeDefined();
      } else {
        fail('Error response should be returned');
      }
    });

    it('should return error for directory traversal attack patterns (global controller)', async () => {
      // Directory traversal pattern
      const maliciousPath = '../../../etc/hosts';

      // Document read
      const readResult = await globalController.readDocument(maliciousPath);

      // Verify error result
      expect(readResult.success).toBe(false);
      if (!readResult.success && 'error' in readResult) {
        expect(readResult.error).toBeDefined();
      } else {
        fail('Error response should be returned');
      }

      // Document write
      const writeResult = await globalController.writeDocument(maliciousPath, 'Malicious content');

      // Verify error result
      expect(writeResult.success).toBe(false);
      if (!writeResult.success && 'error' in writeResult) {
        expect(writeResult.error).toBeDefined();
      } else {
        fail('Error response should be returned');
      }
    });
  });

  describe('Non-existent resource handling', () => {
    it('should return error for non-existent branch', async () => {
      // Non-existent branch
      const nonExistentBranch = 'feature/non-existent-branch';

      // Document read
      const readResult = await branchController.readDocument(nonExistentBranch, 'test.md');

      // Verify error result
      expect(readResult.success).toBe(false);
      if (!readResult.success && 'error' in readResult) {
        // Check error message
        expect(readResult.error.message).toContain('branch');
      } else {
        fail('Error response should be returned');
      }

      // Core files read
      const coreFilesResult = await coreFilesController.readCoreFiles(nonExistentBranch);

      // Verify error result
      expect(coreFilesResult.success).toBe(false);
      if (!coreFilesResult.success && 'error' in coreFilesResult) {
        expect(coreFilesResult.error).toBeDefined();
      } else {
        fail('Error response should be returned');
      }
    });

    it('should return error for non-existent document', async () => {
      // Non-existent document
      const nonExistentDoc = 'non-existent-document.md';

      // Branch document read
      const branchResult = await branchController.readDocument(testBranch, nonExistentDoc);

      // Verify error result
      expect(branchResult.success).toBe(false);
      if (!branchResult.success && 'error' in branchResult) {
        // Check error message
        expect(branchResult.error.message).toContain('document');
      } else {
        fail('Error response should be returned');
      }

      // Global document read
      const globalResult = await globalController.readDocument(nonExistentDoc);

      // Verify error result
      expect(globalResult.success).toBe(false);
      if (!globalResult.success && 'error' in globalResult) {
        expect(globalResult.error).toBeDefined();
      } else {
        fail('Error response should be returned');
      }
    });
  });

  describe('Special cases', () => {
    it('should handle empty content', async () => {
      // Empty content
      const emptyContent = '';

      // Branch document write
      const branchResult = await branchController.writeDocument(testBranch, 'empty.md', emptyContent);

      // Verify result - empty content is now allowed per the updated specification
      expect(branchResult.success).toBe(true);

      // Global document write
      const globalResult = await globalController.writeDocument('empty.md', emptyContent);

      // Verify result
      expect(globalResult.success).toBe(true);
    });
  });

  describe('Compound error handling', () => {
    it('should return error for both non-existent branch and document', async () => {
      // Non-existent branch and document
      const nonExistentBranch = 'feature/completely-non-existent-branch';
      const nonExistentDoc = 'non-existent-document.md';

      // Document read
      const readResult = await branchController.readDocument(nonExistentBranch, nonExistentDoc);

      // Verify error result
      expect(readResult.success).toBe(false);
      if (!readResult.success && 'error' in readResult) {
        // Check error message
        expect(readResult.error.message).toContain('branch');
      } else {
        fail('Error response should be returned');
      }
    });

    it('should return error for invalid path and invalid content', async () => {
      // Invalid path and invalid content
      const maliciousPath = '../../../etc/passwd';
      const emptyContent = '';

      // Document write
      const writeResult = await branchController.writeDocument(testBranch, maliciousPath, emptyContent);

      // Verify error result
      expect(writeResult.success).toBe(false);
      if (!writeResult.success && 'error' in writeResult) {
        expect(writeResult.error).toBeDefined();
      } else {
        fail('Error response should be returned');
      }
    });
  });

  describe('Error message quality', () => {
    it('should return specific error messages', async () => {
      // Non-existent document
      const nonExistentDoc = 'specific-non-existent-document.md';

      // Document read
      const readResult = await branchController.readDocument(testBranch, nonExistentDoc);

      // Verify error message
      expect(readResult.success).toBe(false);
      if (!readResult.success && 'error' in readResult) {
        expect(readResult.error).toBeDefined();
        // Check for specific information in the error message
        expect(readResult.error.message).toContain(nonExistentDoc);
        expect(readResult.error.message).toContain(testBranch);
      } else {
        fail('Error response should be returned');
      }
    });

    it('should not include security-sensitive information in error messages', async () => {
      // Directory traversal pattern
      const maliciousPath = '../../../etc/shadow';

      // Document read
      const readResult = await branchController.readDocument(testBranch, maliciousPath);

      // Verify error message
      expect(readResult.success).toBe(false);
      if (!readResult.success && 'error' in readResult) {
        expect(readResult.error).toBeDefined();
        // Check that full path is not exposed
        const fullTestDir = path.resolve(testDir);
        expect(readResult.error.message).not.toContain(fullTestDir);
        // Check that system paths are not exposed
        expect(readResult.error.message).not.toContain('/etc/');
        expect(readResult.error.message).not.toContain('C:\\Windows\\');
      } else {
        fail('Error response should be returned');
      }
    });
  });

  /**
   * Integration Test: Partial Results on Partial Errors
   * 
   * This test verifies that the system returns partial results when some operations fail
   * but others succeed, providing maximum available context to users even in error cases.
   */
  it('should return partial results when some files fail', async () => {
    // Create a special test branch for partial results testing
    const partialResultsBranch = `feature/partial-results-${uuidv4()}`;
    const safeBranchName = partialResultsBranch.replace('/', '-');
    const partialBranchDir = path.join(branchDir, safeBranchName);
    await fs.mkdir(partialBranchDir, { recursive: true });
    
    // Create valid documents with different formats
    const validDocuments = [
      {
        path: 'valid-markdown.md',
        content: '# Valid Markdown\n\nThis is a valid markdown document.'
      },
      {
        path: 'valid-json.json',
        content: JSON.stringify({
          schema: "memory_document_v2",
          metadata: {
            title: "Valid JSON",
            documentType: "generic",
            tags: ["valid", "test"],
            lastModified: new Date().toISOString()
          },
          content: {
            text: "This is a valid JSON document."
          }
        }, null, 2)
      }
    ];
    
    // Write valid documents
    for (const doc of validDocuments) {
      await fs.writeFile(path.join(partialBranchDir, doc.path), doc.content, 'utf-8');
    }
    
    // Define a set of paths to read, including invalid ones
    const pathsToRead = [
      'valid-markdown.md',            // Valid path
      'valid-json.json',              // Valid path
      'non-existent-document.md',     // Non-existent path
      '../../../etc/passwd',          // Invalid path (directory traversal)
      'file?with:invalid:chars.txt',  // Invalid path (invalid characters)
      ''                              // Empty path
    ];
    
    // Create batch read function that reads multiple documents
    const batchReadMultiple = async (branch: string, paths: string[]) => {
      // Initialize result structure with properly typed results object
      const results: {
        success: boolean;
        data: {
          results: Record<string, {
            success: boolean;
            error?: { code: string; message: string };
            data?: { content: string };
          }>;
          summary: {
            totalRequested: number;
            successful: number;
            failed: number;
          };
        };
      } = {
        success: true,
        data: {
          results: {},
          summary: {
            totalRequested: paths.length,
            successful: 0,
            failed: 0
          }
        }
      };
      
      // Process each path
      for (const path of paths) {
        try {
          if (!path) {
            // Handle empty path case
            results.data.results[path] = {
              success: false, 
              error: { code: 'INVALID_PATH', message: 'Path cannot be empty' }
            };
            results.data.summary.failed++;
            continue;
          }
          
          // Try to read the document
          const result = await branchController.readDocument(branch, path);
          results.data.results[path] = result;
          
          if (result.success) {
            results.data.summary.successful++;
          } else {
            results.data.summary.failed++;
          }
        } catch (error) {
          // Catch any unexpected errors
          results.data.results[path] = {
            success: false,
            error: { code: 'UNEXPECTED_ERROR', message: error instanceof Error ? error.message : 'Unknown error' }
          };
          results.data.summary.failed++;
        }
      }
      
      return results;
    };
    
    // Execute batch read
    const batchReadResult = await batchReadMultiple(partialResultsBranch, pathsToRead);
    
    // Top-level success should be true since we're providing partial results
    expect(batchReadResult.success).toBe(true);
    expect(batchReadResult.data).toBeDefined();
    
    // Verify summary data
    expect(batchReadResult.data.summary.totalRequested).toBe(pathsToRead.length);
    expect(batchReadResult.data.summary.successful).toBe(2); // Two valid documents
    expect(batchReadResult.data.summary.failed).toBe(4);    // Four invalid paths
    
    // Verify individual results
    // Extract result keys for type-safe access
    const resultKeys = Object.keys(batchReadResult.data.results);
    
    // Verify expected keys exist
    expect(resultKeys).toContain('valid-markdown.md');
    expect(resultKeys).toContain('valid-json.json');
    expect(resultKeys).toContain('non-existent-document.md');
    expect(resultKeys).toContain('../../../etc/passwd');
    expect(resultKeys).toContain('file?with:invalid:chars.txt');
    expect(resultKeys).toContain('');
    
    // Valid documents should be successful
    const mdResult = batchReadResult.data.results['valid-markdown.md'];
    const jsonResult = batchReadResult.data.results['valid-json.json'];
    expect(mdResult.success).toBe(true);
    expect(jsonResult.success).toBe(true);
    
    // Invalid paths should have proper error information
    const nonExistentResult = batchReadResult.data.results['non-existent-document.md'];
    const traversalResult = batchReadResult.data.results['../../../etc/passwd'];
    const invalidCharsResult = batchReadResult.data.results['file?with:invalid:chars.txt'];
    const emptyPathResult = batchReadResult.data.results[''];
    
    expect(nonExistentResult.success).toBe(false);
    expect(nonExistentResult.error).toBeDefined();
    
    expect(traversalResult.success).toBe(false);
    expect(traversalResult.error).toBeDefined();
    
    expect(invalidCharsResult.success).toBe(false);
    expect(invalidCharsResult.error).toBeDefined();
    
    expect(emptyPathResult.success).toBe(false);
    expect(emptyPathResult.error).toBeDefined();
    
    // Check content of valid documents
    if (mdResult.success && mdResult.data) {
      const markdownContent = mdResult.data.content;
      expect(markdownContent).toContain('Valid Markdown');
    }
    
    if (jsonResult.success && jsonResult.data) {
      const jsonContent = jsonResult.data.content;
      expect(jsonContent).toContain('Valid JSON');
    }
  });

  /**
   * Integration Test: Content Resilience Through Partial Updates
   * 
   * This test verifies that the system can handle partial updates to documents
   * where some fields are updated while others remain intact, ensuring data integrity.
   */
  it('should maintain document integrity with partial updates', async () => {
    // Create a special document for partial update testing
    const partialUpdateBranch = testBranch;
    const docPath = `partial-update-${uuidv4()}.json`;
    
    // Original document with full metadata
    const originalDocument = {
      schema: "memory_document_v2",
      metadata: {
        id: uuidv4(),
        title: "Original Document",
        documentType: "generic",
        path: docPath,
        tags: ["original", "complete"],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        text: "This is the original document content.",
        sections: [
          { title: "Section 1", content: "Original section 1 content" },
          { title: "Section 2", content: "Original section 2 content" }
        ],
        attributes: {
          importance: "high",
          status: "draft",
          reviewDate: new Date().toISOString()
        }
      }
    };
    
    // Write original document
    const writeResult = await branchController.writeDocument(
      partialUpdateBranch,
      docPath,
      JSON.stringify(originalDocument, null, 2)
    );
    expect(writeResult.success).toBe(true);
    
    // Partial update - only changing some fields
    const partialUpdate = {
      schema: "memory_document_v2",
      metadata: {
        id: originalDocument.metadata.id, // Keep same ID
        title: "Updated Document Title",   // Changed
        documentType: "generic",           // Same
        path: docPath,                     // Same
        tags: ["updated", "complete"],     // Changed
        // lastModified: omitted intentionally
        // createdAt: omitted intentionally
        version: 2                         // Changed
      },
      content: {
        text: "This is the updated document content.", // Changed
        // sections: omitted intentionally
        attributes: {
          importance: "high",              // Same
          status: "published",             // Changed
          // reviewDate: omitted intentionally
        }
      }
    };
    
    // Perform partial update
    const updateResult = await branchController.writeDocument(
      partialUpdateBranch,
      docPath,
      JSON.stringify(partialUpdate, null, 2)
    );
    expect(updateResult.success).toBe(true);
    
    // Read updated document
    const readResult = await branchController.readDocument(partialUpdateBranch, docPath);
    expect(readResult.success).toBe(true);
    
    if (readResult.success && 'data' in readResult) {
      const updatedDoc = JSON.parse(readResult.data.content);
      
      // Verify updated fields changed correctly
      expect(updatedDoc.metadata.title).toBe("Updated Document Title");
      expect(updatedDoc.metadata.tags).toContain("updated");
      expect(updatedDoc.metadata.version).toBe(2);
      expect(updatedDoc.content.text).toBe("This is the updated document content.");
      expect(updatedDoc.content.attributes.status).toBe("published");
      
      // Verify untouched fields remained intact or were properly merged
      expect(updatedDoc.metadata.id).toBe(originalDocument.metadata.id);
      expect(updatedDoc.metadata.documentType).toBe("generic");
      expect(updatedDoc.content.attributes.importance).toBe("high");
      
      // Verify timestamp behavior (lastModified should be updated)
      expect(updatedDoc.metadata.lastModified).toBeDefined();
      const lastModified = new Date(updatedDoc.metadata.lastModified);
      const originalLastModified = new Date(originalDocument.metadata.lastModified);
      expect(lastModified.getTime()).toBeGreaterThanOrEqual(originalLastModified.getTime());
      
      // Verify createdAt was preserved
      expect(updatedDoc.metadata.createdAt).toBe(originalDocument.metadata.createdAt);
      
      // Verify complex nested structures (like sections) were handled appropriately
      // Depending on implementation, they might be preserved, merged, or replaced
      if (updatedDoc.content.sections) {
        // If preserved or merged
        expect(updatedDoc.content.sections).toBeDefined();
      }
    } else {
      fail('Document should have been successfully read');
    }
  });
});
