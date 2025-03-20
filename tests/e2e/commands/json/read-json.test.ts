/**
 * E2E tests for the json read command
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

// Test document data
const testJsonContent = {
  schema: "memory_document_v1",
  metadata: {
    title: "Test Document",
    documentType: "generic",
    path: "test-document.json",
    tags: ["test", "e2e"],
    lastModified: new Date().toISOString()
  },
  content: {
    message: "This is a test document for reading",
    items: [1, 2, 3],
    nested: {
      key: "value"
    }
  }
};

// Setup before each test
beforeEach(() => {
  testDir = createTempTestDir('json-read');
  const dirs = createDocsStructure(testDir);
  docsDir = dirs.docsDir;
  globalDir = dirs.globalDir;
  branchesDir = dirs.branchDir;
  
  // Create test branch directory
  testBranchDir = path.join(branchesDir, normalizedBranchName);
  fs.mkdirSync(testBranchDir, { recursive: true });
  
  // Create test documents
  createTestJsonDocument(testBranchDir, 'test-document.json', testJsonContent);
  createTestJsonDocument(globalDir, 'global-document.json', {
    ...testJsonContent,
    metadata: {
      ...testJsonContent.metadata,
      title: "Global Test Document",
      path: "global-document.json"
    }
  });
  
  // Create nested document
  const nestedDir = path.join(testBranchDir, 'nested');
  fs.mkdirSync(nestedDir, { recursive: true });
  createTestJsonDocument(nestedDir, 'nested-document.json', {
    ...testJsonContent,
    metadata: {
      ...testJsonContent.metadata,
      title: "Nested Test Document",
      path: "nested/nested-document.json"
    }
  });
});

// Cleanup after each test
afterEach(() => {
  deleteTempDir(testDir);
});

describe.skip('Memory Bank CLI - json read command', () => {
  // Test reading a JSON document from branch memory bank with default format
  test('should read JSON document from branch memory bank with default format', async () => {
    const result = await runCliSuccessful([
      'json',
      'read',
      'test-document.json',
      '--branch',
      testBranchName,
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Parse output JSON
    let parsedOutput;
    try {
      parsedOutput = JSON.parse(result.stdout);
    } catch (error) {
      fail('Command output is not valid JSON');
    }
    
    // Check document content
    expect(parsedOutput.title).toBe(testJsonContent.metadata.title);
    expect(parsedOutput.documentType).toBe(testJsonContent.metadata.documentType);
    expect(parsedOutput.tags).toEqual(testJsonContent.metadata.tags);
    expect(parsedOutput.content.message).toBe(testJsonContent.content.message);
    expect(parsedOutput.content.items).toEqual(testJsonContent.content.items);
    expect(parsedOutput.content.nested.key).toBe(testJsonContent.content.nested.key);
  });
  
  // Test reading a JSON document from global memory bank
  test('should read JSON document from global memory bank', async () => {
    const result = await runCliSuccessful([
      'json',
      'read',
      'global-document.json',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Parse output JSON
    let parsedOutput;
    try {
      parsedOutput = JSON.parse(result.stdout);
    } catch (error) {
      fail('Command output is not valid JSON');
    }
    
    // Check document content
    expect(parsedOutput.title).toBe("Global Test Document");
    expect(parsedOutput.content.message).toBe(testJsonContent.content.message);
  });
  
  // Test reading a nested JSON document
  test('should read nested JSON document from branch memory bank', async () => {
    const result = await runCliSuccessful([
      'json',
      'read',
      'nested/nested-document.json',
      '--branch',
      testBranchName,
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Parse output JSON
    let parsedOutput;
    try {
      parsedOutput = JSON.parse(result.stdout);
    } catch (error) {
      fail('Command output is not valid JSON');
    }
    
    // Check document content
    expect(parsedOutput.title).toBe("Nested Test Document");
    expect(parsedOutput.content.message).toBe(testJsonContent.content.message);
  });
  
  // Test reading with pretty format
  test('should read JSON document with pretty format', async () => {
    const result = await runCliSuccessful([
      'json',
      'read',
      'test-document.json',
      '--branch',
      testBranchName,
      '--format',
      'pretty',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Parse output JSON
    let parsedOutput;
    try {
      parsedOutput = JSON.parse(result.stdout);
    } catch (error) {
      fail('Command output is not valid JSON');
    }
    
    // Check document content
    expect(parsedOutput.title).toBe(testJsonContent.metadata.title);
    expect(parsedOutput.content.message).toBe(testJsonContent.content.message);
    
    // Check that output is formatted (contains newlines and spaces)
    expect(result.stdout).toContain('\n');
    expect(result.stdout).toContain('  ');
  });
  
  // Test error when document doesn't exist
  test('should fail when document does not exist', async () => {
    const result = await runCli([
      'json',
      'read',
      'non-existent-document.json',
      '--branch',
      testBranchName,
      '--docs',
      docsDir
    ]);
    
    // Verify the command failed
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Error reading JSON document');
    expect(result.stderr).toContain('non-existent-document.json');
  });
  
  // Test error when branch doesn't exist
  test('should fail when branch does not exist', async () => {
    const result = await runCli([
      'json',
      'read',
      'test-document.json',
      '--branch',
      'non-existent-branch',
      '--docs',
      docsDir
    ]);
    
    // Verify the command failed
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Error reading JSON document');
    expect(result.stderr).toContain('non-existent-branch');
  });
  
  // Test error with invalid path
  test('should fail with invalid document path', async () => {
    const result = await runCli([
      'json',
      'read',
      '../outside-docs.json',
      '--docs',
      docsDir
    ]);
    
    // Verify the error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('invalid');
  });
});
