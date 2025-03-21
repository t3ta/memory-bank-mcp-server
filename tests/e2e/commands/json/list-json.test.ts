/**
 * E2E tests for the json list command
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
    tags: ["test", "e2e"],
    lastModified: new Date().toISOString()
  },
  content: {
    message: "This is a test document"
  }
};

// Setup before each test
beforeEach(() => {
  testDir = createTempTestDir('json-list');
  const dirs = createDocsStructure(testDir);
  docsDir = dirs.docsDir;
  globalDir = dirs.globalDir;
  branchesDir = dirs.branchDir;
  
  // Create test branch directory
  testBranchDir = path.join(branchesDir, normalizedBranchName);
  fs.mkdirSync(testBranchDir, { recursive: true });
  
  // Create test documents in branch
  createTestJsonDocument(testBranchDir, 'generic-document.json', {
    ...baseJsonContent,
    metadata: {
      ...baseJsonContent.metadata,
      title: "Generic Document",
      path: "generic-document.json",
      documentType: "generic"
    }
  });
  
  createTestJsonDocument(testBranchDir, 'active-context.json', {
    ...baseJsonContent,
    metadata: {
      ...baseJsonContent.metadata,
      title: "Active Context Document",
      path: "active-context.json",
      documentType: "activeContext",
      tags: ["active", "context", "test"]
    }
  });
  
  createTestJsonDocument(testBranchDir, 'branch-context.json', {
    ...baseJsonContent,
    metadata: {
      ...baseJsonContent.metadata,
      title: "Branch Context Document",
      path: "branch-context.json",
      documentType: "branchContext",
      tags: ["branch", "context", "test"]
    }
  });
  
  // Create nested directory with document
  const nestedDir = path.join(testBranchDir, 'nested');
  fs.mkdirSync(nestedDir, { recursive: true });
  createTestJsonDocument(nestedDir, 'nested-document.json', {
    ...baseJsonContent,
    metadata: {
      ...baseJsonContent.metadata,
      title: "Nested Document",
      path: "nested/nested-document.json"
    }
  });
  
  // Create global test documents
  createTestJsonDocument(globalDir, 'global-generic.json', {
    ...baseJsonContent,
    metadata: {
      ...baseJsonContent.metadata,
      title: "Global Generic Document",
      path: "global-generic.json",
      documentType: "generic",
      tags: ["global", "test"]
    }
  });
  
  createTestJsonDocument(globalDir, 'global-progress.json', {
    ...baseJsonContent,
    metadata: {
      ...baseJsonContent.metadata,
      title: "Global Progress Document",
      path: "global-progress.json",
      documentType: "progress",
      tags: ["global", "progress", "test"]
    }
  });
});

// Cleanup after each test
afterEach(() => {
  deleteTempDir(testDir);
});

describe('Memory Bank CLI - json list command', () => {
  // Test listing all JSON documents in branch memory bank
  test('should list all JSON documents in branch memory bank', async () => {
    const result = await runCliSuccessful([
      'json',
      'list',
      '--branch',
      testBranchName,
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Check output for expected document information
    const output = result.stdout;
    
    // Check branch name in output
    expect(output).toContain(testBranchName);
    
    // Check that all branch documents are included
    expect(output).toContain('Generic Document');
    expect(output).toContain('generic-document.json');
    expect(output).toContain('Active Context Document');
    expect(output).toContain('active-context.json');
    expect(output).toContain('Branch Context Document');
    expect(output).toContain('branch-context.json');
    expect(output).toContain('Nested Document');
    expect(output).toContain('nested/nested-document.json');
    
    // Check document types and tags
    expect(output).toContain('generic');
    expect(output).toContain('activeContext');
    expect(output).toContain('branchContext');
    expect(output).toContain('test');
    expect(output).toContain('e2e');
    expect(output).toContain('active');
    expect(output).toContain('context');
    expect(output).toContain('branch');
  });
  
  // Test listing all JSON documents in global memory bank
  test('should list all JSON documents in global memory bank', async () => {
    const result = await runCliSuccessful([
      'json',
      'list',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Check output for expected document information
    const output = result.stdout;
    
    // Check global indication in output
    expect(output).toContain('global');
    
    // Check that all global documents are included
    expect(output).toContain('Global Generic Document');
    expect(output).toContain('global-generic.json');
    expect(output).toContain('Global Progress Document');
    expect(output).toContain('global-progress.json');
    
    // Check document types and tags
    expect(output).toContain('generic');
    expect(output).toContain('progress');
    expect(output).toContain('global');
    expect(output).toContain('test');
    
    // Check that branch documents are NOT included
    expect(output).not.toContain('Active Context Document');
    expect(output).not.toContain('Branch Context Document');
  });
  
  // Test listing documents with JSON format
  test('should list documents with JSON format', async () => {
    const result = await runCliSuccessful([
      'json',
      'list',
      '--branch',
      testBranchName,
      '--format',
      'json',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Parse output JSON
    let documents;
    try {
      documents = JSON.parse(result.stdout);
    } catch (error) {
      fail('Command output is not valid JSON');
    }
    
    // Check that all documents are included
    expect(Array.isArray(documents)).toBe(true);
    expect(documents.length).toBe(4); // All branch documents
    
    // Check document properties
    const docTitles = documents.map((doc: any) => doc.title);
    expect(docTitles).toContain('Generic Document');
    expect(docTitles).toContain('Active Context Document');
    expect(docTitles).toContain('Branch Context Document');
    expect(docTitles).toContain('Nested Document');
    
    // Check document types
    const docTypes = documents.map((doc: any) => doc.documentType);
    expect(docTypes).toContain('generic');
    expect(docTypes).toContain('activeContext');
    expect(docTypes).toContain('branchContext');
    
    // Check document paths
    const docPaths = documents.map((doc: any) => doc.path);
    expect(docPaths).toContain('generic-document.json');
    expect(docPaths).toContain('active-context.json');
    expect(docPaths).toContain('branch-context.json');
    expect(docPaths).toContain('nested/nested-document.json');
  });
  
  // Test filtering by document type
  test('should filter documents by type', async () => {
    const result = await runCliSuccessful([
      'json',
      'list',
      '--branch',
      testBranchName,
      '--type',
      'activeContext',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    const output = result.stdout;
    
    // Check that only activeContext documents are included
    expect(output).toContain('Active Context Document');
    expect(output).toContain('active-context.json');
    expect(output).toContain('activeContext');
    
    // Check that other documents are NOT included
    expect(output).not.toContain('Generic Document');
    expect(output).not.toContain('Branch Context Document');
    expect(output).not.toContain('Nested Document');
  });
  
  // Test empty result case
  test('should handle empty result case', async () => {
    const result = await runCliSuccessful([
      'json',
      'list',
      '--branch',
      testBranchName,
      '--type',
      'systemPatterns', // No documents with this type in our test setup
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Check for empty results message
    expect(result.stdout).toContain('No');
    expect(result.stdout).toContain('documents found');
    expect(result.stdout).toContain(testBranchName);
    expect(result.stdout).toContain('systemPatterns');
  });
  
  // Test error when branch doesn't exist
  test('should fail when branch does not exist', async () => {
    const result = await runCli([
      'json',
      'list',
      '--branch',
      'non-existent-branch',
      '--docs',
      docsDir
    ]);
    
    // Verify the command failed
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Error');
    expect(result.stderr).toContain('non-existent-branch');
  });
});
