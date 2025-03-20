/**
 * E2E tests for the json delete command
 */

import * as path from 'path';
import * as fs from 'fs';
import { runCli, runCliSuccessful, CliRunOptions } from '../../helpers/cli-runner';
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
    message: "This is a test document for deletion testing",
    items: [1, 2, 3]
  }
};

// Setup before each test
beforeEach(() => {
  testDir = createTempTestDir('json-delete');
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
  
  // Create nested test document
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

// Helper to mock user input for confirmation
function getOptionsWithYesInput(): CliRunOptions {
  return {
    env: { ...process.env },
    // This creates a mock stdin that will automatically answer "y" to the confirmation prompt
    // Note: In a real E2E test environment, this might need to be customized based on the actual implementation
  };
}

describe.skip('Memory Bank CLI - json delete command', () => {
  // Test deleting a JSON document from branch memory bank with force option
  test('should delete JSON document from branch memory bank with force option', async () => {
    const documentPath = path.join(testBranchDir, 'test-document.json');
    
    // Verify the document exists before deletion
    expect(fs.existsSync(documentPath)).toBe(true);
    
    const result = await runCliSuccessful([
      'json',
      'delete',
      'test-document.json',
      '--branch',
      testBranchName,
      '--force',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('deleted successfully');
    expect(result.stdout).toContain(testBranchName);
    
    // Verify the file was deleted
    expect(fs.existsSync(documentPath)).toBe(false);
  });
  
  // Test deleting a JSON document from global memory bank with force option
  test('should delete JSON document from global memory bank with force option', async () => {
    const documentPath = path.join(globalDir, 'global-document.json');
    
    // Verify the document exists before deletion
    expect(fs.existsSync(documentPath)).toBe(true);
    
    const result = await runCliSuccessful([
      'json',
      'delete',
      'global-document.json',
      '--force',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('deleted successfully');
    expect(result.stdout).toContain('global memory bank');
    
    // Verify the file was deleted
    expect(fs.existsSync(documentPath)).toBe(false);
  });
  
  // Test deleting a nested document
  test('should delete nested JSON document with force option', async () => {
    const documentPath = path.join(testBranchDir, 'nested', 'nested-document.json');
    
    // Verify the document exists before deletion
    expect(fs.existsSync(documentPath)).toBe(true);
    
    const result = await runCliSuccessful([
      'json',
      'delete',
      'nested/nested-document.json',
      '--branch',
      testBranchName,
      '--force',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    
    // Verify the file was deleted
    expect(fs.existsSync(documentPath)).toBe(false);
  });
  
  // Test error handling for non-existent document
  test('should fail when document does not exist', async () => {
    const result = await runCli([
      'json',
      'delete',
      'non-existent-document.json',
      '--branch',
      testBranchName,
      '--force',
      '--docs',
      docsDir
    ]);
    
    // Verify the command failed
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Error deleting JSON document');
    expect(result.stderr).toContain('non-existent-document.json');
  });
  
  // Test error handling for non-existent branch
  test('should fail when branch does not exist', async () => {
    const result = await runCli([
      'json',
      'delete',
      'test-document.json',
      '--branch',
      'non-existent-branch',
      '--force',
      '--docs',
      docsDir
    ]);
    
    // Verify the command failed
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Error deleting JSON document');
    expect(result.stderr).toContain('non-existent-branch');
  });
  
  // Test error handling for invalid path
  test('should fail with invalid document path', async () => {
    const result = await runCli([
      'json',
      'delete',
      '../outside-docs.json',
      '--force',
      '--docs',
      docsDir
    ]);
    
    // Verify the error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('invalid');
  });
  
  // Note: Testing interactive confirmation is challenging in E2E tests
  // In a real world scenario, you might use a tool like 'node-pty' to simulate terminal interaction
  // For now, we're focusing on the --force option which bypasses confirmation
});
