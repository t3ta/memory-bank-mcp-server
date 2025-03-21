/**
 * E2E tests for the read-branch command
 */

import * as path from 'path';
import * as fs from 'fs';
import { runCli, runCliSuccessful } from '../../helpers/cli-runner';
import { 
  createTempTestDir, 
  createDocsStructure, 
  deleteTempDir, 
  createTestDocument,
  createTestJsonDocument
} from '../../helpers/setup';
import {
  assertFileExists
} from '../../helpers/test-utils';

// Test suite configuration
let testDir: string;
let docsDir: string;
let branchesDir: string;
let testBranchDir: string;

// Branch name for testing
const testBranchName = 'feature/test-branch';
const normalizedBranchName = 'feature-test-branch';

// Document content for testing
const testJsonContent = {
  schema: "memory_document_v1",
  metadata: {
    title: "Test Document",
    documentType: "test",
    path: "test-document.json",
    tags: ["test", "e2e"],
    lastModified: new Date().toISOString()
  },
  content: {
    message: "This is a test document",
    items: [1, 2, 3],
    nested: {
      key: "value"
    }
  }
};

const testMarkdownContent = '# Test Markdown Document\n\ntags: #test #e2e\n\nThis is a test markdown document.\n\n- Item 1\n- Item 2\n- Item 3';

// Setup before each test
beforeEach(() => {
  testDir = createTempTestDir('read-branch');
  const dirs = createDocsStructure(testDir);
  docsDir = dirs.docsDir;
  branchesDir = dirs.branchDir;
  
  // Create test branch directory
  testBranchDir = path.join(branchesDir, normalizedBranchName);
  fs.mkdirSync(testBranchDir, { recursive: true });
  
  // Create test documents
  createTestJsonDocument(testBranchDir, 'test-document.json', testJsonContent);
  createTestDocument(testBranchDir, 'test-document.md', testMarkdownContent);
  
  // Create a nested document
  const nestedDir = path.join(testBranchDir, 'nested', 'directory');
  fs.mkdirSync(nestedDir, { recursive: true });
  createTestJsonDocument(nestedDir, 'nested-document.json', {
    ...testJsonContent,
    content: {
      ...testJsonContent.content,
      message: "This is a nested document"
    }
  });
});

// Cleanup after each test
afterEach(() => {
  deleteTempDir(testDir);
});

describe('Memory Bank CLI - read-branch command', () => {
  // Test reading a JSON document
  test('should read a JSON document from branch memory bank', async () => {
    const result = await runCliSuccessful([
      'read-branch',
      testBranchName,
      'test-document.json',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Check content output
    const content = result.stdout;
    expect(content).toContain('This is a test document');
    expect(content).toContain(testJsonContent.metadata.title);
    expect(content).toContain(testJsonContent.metadata.tags[0]);
    expect(content).toContain(testJsonContent.metadata.tags[1]);
  });

  // Test reading a Markdown document
  test('should read a Markdown document from branch memory bank', async () => {
    const result = await runCliSuccessful([
      'read-branch',
      testBranchName,
      'test-document.md',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Check content output
    const content = result.stdout;
    expect(content).toContain('# Test Markdown Document');
    expect(content).toContain('tags: #test #e2e');
    expect(content).toContain('Item 1');
    expect(content).toContain('Item 2');
    expect(content).toContain('Item 3');
  });

  // Test reading a nested document
  test('should read a nested document from branch memory bank', async () => {
    const result = await runCliSuccessful([
      'read-branch',
      testBranchName,
      'nested/directory/nested-document.json',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Check content output
    const content = result.stdout;
    expect(content).toContain('This is a nested document');
  });

  // Test error when document doesn't exist
  test('should fail when document does not exist', async () => {
    const result = await runCli([
      'read-branch',
      testBranchName,
      'non-existent-document.json',
      '--docs',
      docsDir
    ]);
    
    // Verify the command failed
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Error reading document');
    expect(result.stderr).toContain('non-existent-document.json');
  });

  // Test error when branch doesn't exist
  test('should fail when branch does not exist', async () => {
    const result = await runCli([
      'read-branch',
      'non-existent-branch',
      'test-document.json',
      '--docs',
      docsDir
    ]);
    
    // Verify the command failed
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Error reading document');
    // The exact error message might change, but it should contain an error about the branch
  });

  // Test error with invalid path
  test('should fail with invalid document path', async () => {
    const result = await runCli([
      'read-branch',
      testBranchName,
      '../outside-docs.json',
      '--docs',
      docsDir
    ]);
    
    // Verify the error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Document path cannot contain ".."');
  });

  // Test language option
  test('should work with language option', async () => {
    // Test with English
    const resultEn = await runCliSuccessful([
      'read-branch',
      testBranchName,
      'test-document.json',
      '--docs',
      docsDir,
      '--language',
      'en'
    ]);
    expect(resultEn.exitCode).toBe(0);
    
    // Test with Japanese
    const resultJa = await runCliSuccessful([
      'read-branch',
      testBranchName,
      'test-document.json',
      '--docs',
      docsDir,
      '--language',
      'ja'
    ]);
    expect(resultJa.exitCode).toBe(0);
  });
});
