/**
 * E2E tests for the json build-index command
 */

import * as path from 'path';
import * as fs from 'fs';
import { runCli, runCliSuccessful } from '../../helpers/cli-runner';
import { 
  createTempTestDir, 
  createDocsStructure, 
  deleteTempDir, 
  createTestJsonDocument
} from '../../helpers/setup';

// Test suite configuration
let testDir: string;
let docsDir: string;
let globalDir: string;
let branchesDir: string;
let testBranchDir: string;

// Branch name for testing
const testBranchName = 'feature/test-branch';
const normalizedBranchName = 'feature-test-branch';

// Test document base data
const baseJsonContent = {
  schema: "memory_document_v1",
  metadata: {
    documentType: "generic",
    lastModified: new Date().toISOString()
  },
  content: {
    message: "This is a test document"
  }
};

// Setup before each test
beforeEach(() => {
  testDir = createTempTestDir('json-build-index');
  const dirs = createDocsStructure(testDir);
  docsDir = dirs.docsDir;
  globalDir = dirs.globalDir;
  branchesDir = dirs.branchDir;
  
  // Create test branch directory
  testBranchDir = path.join(branchesDir, normalizedBranchName);
  fs.mkdirSync(testBranchDir, { recursive: true });
  
  // Create some test documents in branch
  createTestJsonDocument(testBranchDir, 'document1.json', {
    ...baseJsonContent,
    metadata: {
      ...baseJsonContent.metadata,
      title: "Document 1",
      path: "document1.json",
      tags: ["tag1", "tag2"]
    }
  });
  
  createTestJsonDocument(testBranchDir, 'document2.json', {
    ...baseJsonContent,
    metadata: {
      ...baseJsonContent.metadata,
      title: "Document 2",
      path: "document2.json",
      tags: ["tag2", "tag3"]
    }
  });
  
  // Create some global test documents
  createTestJsonDocument(globalDir, 'global1.json', {
    ...baseJsonContent,
    metadata: {
      ...baseJsonContent.metadata,
      title: "Global Document 1",
      path: "global1.json",
      tags: ["global", "tag1"]
    }
  });
  
  createTestJsonDocument(globalDir, 'global2.json', {
    ...baseJsonContent,
    metadata: {
      ...baseJsonContent.metadata,
      title: "Global Document 2",
      path: "global2.json",
      tags: ["global", "tag3"]
    }
  });
});

// Cleanup after each test
afterEach(() => {
  deleteTempDir(testDir);
});

describe('Memory Bank CLI - json build-index command', () => {
  // Test building index for branch memory bank
  test('should build index for branch memory bank', async () => {
    const result = await runCliSuccessful([
      'json',
      'build-index',
      '--branch',
      testBranchName,
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Check output for success message
    const output = result.stdout;
    expect(output).toContain('JSON document index');
    expect(output).toContain(testBranchName);
    expect(output).toContain('completed successfully');
    
    // Check for statistics
    expect(output).toContain('Index Statistics');
    expect(output).toContain('Documents indexed');
    expect(output).toContain('Tags indexed');
    expect(output).toContain('Execution time');
    
    // Check tag index file was created
    const indexPath = path.join(testBranchDir, '_index.json');
    expect(fs.existsSync(indexPath)).toBe(true);
    
    // Check if the index has the right content
    try {
      const indexContent = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      expect(indexContent.tags).toBeDefined();
      expect(Object.keys(indexContent.tags).length).toBeGreaterThan(0);
      
      // Check tag entries
      expect(indexContent.tags.tag1).toBeDefined();
      expect(indexContent.tags.tag2).toBeDefined();
      expect(indexContent.tags.tag3).toBeDefined();
      
      // Check document references
      expect(indexContent.tags.tag1).toContain('document1.json');
      expect(indexContent.tags.tag2).toContain('document1.json');
      expect(indexContent.tags.tag2).toContain('document2.json');
      expect(indexContent.tags.tag3).toContain('document2.json');
    } catch (error) {
      fail('Index file is not valid JSON or does not have expected structure');
    }
  });
  
  // Test building index for global memory bank
  test('should build index for global memory bank', async () => {
    const result = await runCliSuccessful([
      'json',
      'build-index',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Check output for success message
    const output = result.stdout;
    expect(output).toContain('JSON document index');
    expect(output).toContain('global memory bank');
    expect(output).toContain('completed successfully');
    
    // Check for statistics
    expect(output).toContain('Index Statistics');
    
    // Check tag index file was created
    const indexPath = path.join(globalDir, '_index.json');
    expect(fs.existsSync(indexPath)).toBe(true);
    
    // Check if the index has the right content
    try {
      const indexContent = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      expect(indexContent.tags).toBeDefined();
      expect(Object.keys(indexContent.tags).length).toBeGreaterThan(0);
      
      // Check tag entries
      expect(indexContent.tags.global).toBeDefined();
      expect(indexContent.tags.tag1).toBeDefined();
      expect(indexContent.tags.tag3).toBeDefined();
      
      // Check document references
      expect(indexContent.tags.global).toContain('global1.json');
      expect(indexContent.tags.global).toContain('global2.json');
      expect(indexContent.tags.tag1).toContain('global1.json');
      expect(indexContent.tags.tag3).toContain('global2.json');
    } catch (error) {
      fail('Index file is not valid JSON or does not have expected structure');
    }
  });
  
  // Test force rebuild option
  test('should force rebuild index', async () => {
    // First, build the index normally
    await runCliSuccessful([
      'json',
      'build-index',
      '--branch',
      testBranchName,
      '--docs',
      docsDir
    ]);
    
    // Then force rebuild
    const result = await runCliSuccessful([
      'json',
      'build-index',
      '--branch',
      testBranchName,
      '--force',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Check output for force rebuild message
    const output = result.stdout;
    expect(output).toContain('Forced complete rebuild');
    expect(output).toContain(testBranchName);
    expect(output).toContain('completed successfully');
  });
  
  // Test error when branch doesn't exist
  test('should fail when branch does not exist', async () => {
    const result = await runCli([
      'json',
      'build-index',
      '--branch',
      'non-existent-branch',
      '--docs',
      docsDir
    ]);
    
    // Verify the command failed
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Error building index');
    expect(result.stderr).toContain('non-existent-branch');
  });
  
  // Test rebuilding after adding new documents
  test('should update index when new documents are added', async () => {
    // First build the index
    await runCliSuccessful([
      'json',
      'build-index',
      '--branch',
      testBranchName,
      '--docs',
      docsDir
    ]);
    
    // Get initial index content
    const indexPath = path.join(testBranchDir, '_index.json');
    const initialIndexContent = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    
    // Add a new document
    createTestJsonDocument(testBranchDir, 'new-document.json', {
      ...baseJsonContent,
      metadata: {
        ...baseJsonContent.metadata,
        title: "New Document",
        path: "new-document.json",
        tags: ["new-tag", "tag1"]
      }
    });
    
    // Rebuild the index
    await runCliSuccessful([
      'json',
      'build-index',
      '--branch',
      testBranchName,
      '--docs',
      docsDir
    ]);
    
    // Check if the index was updated
    const updatedIndexContent = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    
    // The updated index should have the new tag
    expect(updatedIndexContent.tags['new-tag']).toBeDefined();
    expect(updatedIndexContent.tags['new-tag']).toContain('new-document.json');
    
    // And the existing tag should now reference the new document too
    expect(updatedIndexContent.tags.tag1).toContain('new-document.json');
  });
});
