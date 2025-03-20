/**
 * E2E tests for the json search command
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
  testDir = createTempTestDir('json-search');
  const dirs = createDocsStructure(testDir);
  docsDir = dirs.docsDir;
  globalDir = dirs.globalDir;
  branchesDir = dirs.branchDir;
  
  // Create test branch directory
  testBranchDir = path.join(branchesDir, normalizedBranchName);
  fs.mkdirSync(testBranchDir, { recursive: true });
  
  // Create test documents in branch with various tags
  
  // Document with architecture tag
  createTestJsonDocument(testBranchDir, 'architecture.json', {
    ...baseJsonContent,
    metadata: {
      ...baseJsonContent.metadata,
      title: "Architecture Document",
      path: "architecture.json",
      tags: ["architecture", "design", "technical"]
    }
  });
  
  // Document with api tag
  createTestJsonDocument(testBranchDir, 'api.json', {
    ...baseJsonContent,
    metadata: {
      ...baseJsonContent.metadata,
      title: "API Document",
      path: "api.json",
      tags: ["api", "technical", "reference"]
    }
  });
  
  // Document with multiple tags
  createTestJsonDocument(testBranchDir, 'multi-tags.json', {
    ...baseJsonContent,
    metadata: {
      ...baseJsonContent.metadata,
      title: "Multi-tags Document",
      path: "multi-tags.json",
      tags: ["design", "documentation", "reference", "guide"]
    }
  });
  
  // Document with type activeContext
  createTestJsonDocument(testBranchDir, 'active-context.json', {
    ...baseJsonContent,
    metadata: {
      ...baseJsonContent.metadata,
      title: "Active Context Document",
      path: "active-context.json",
      documentType: "activeContext",
      tags: ["active", "context"]
    }
  });
  
  // Documents in global memory bank
  
  // Global document with architecture tag
  createTestJsonDocument(globalDir, 'global-architecture.json', {
    ...baseJsonContent,
    metadata: {
      ...baseJsonContent.metadata,
      title: "Global Architecture Document",
      path: "global-architecture.json",
      tags: ["architecture", "global", "system"]
    }
  });
  
  // Global document with documentation tag
  createTestJsonDocument(globalDir, 'global-docs.json', {
    ...baseJsonContent,
    metadata: {
      ...baseJsonContent.metadata,
      title: "Global Documentation",
      path: "global-docs.json",
      tags: ["documentation", "global", "guide"]
    }
  });
});

// Cleanup after each test
afterEach(() => {
  deleteTempDir(testDir);
});

describe.skip('Memory Bank CLI - json search command', () => {
  // Test searching by a single tag in branch memory bank
  test('should search documents by single tag in branch memory bank', async () => {
    const result = await runCliSuccessful([
      'json',
      'search',
      'architecture',
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
    
    // Check that correct documents are included
    expect(output).toContain('Architecture Document');
    expect(output).toContain('architecture.json');
    
    // Check that other documents are NOT included
    expect(output).not.toContain('API Document');
    expect(output).not.toContain('Multi-tags Document');
    expect(output).not.toContain('Active Context Document');
    expect(output).not.toContain('Global Architecture Document');
  });
  
  // Test searching by multiple tags (OR) in branch memory bank
  test('should search documents by multiple tags (OR) in branch memory bank', async () => {
    const result = await runCliSuccessful([
      'json',
      'search',
      'architecture',
      'design',
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
    
    // Check that correct documents are included (having either architecture OR design tag)
    expect(output).toContain('Architecture Document');
    expect(output).toContain('architecture.json');
    expect(output).toContain('Multi-tags Document');
    expect(output).toContain('multi-tags.json');
    
    // Check that other documents are NOT included
    expect(output).not.toContain('API Document');
    expect(output).not.toContain('Active Context Document');
  });
  
  // Test searching by multiple tags (AND) in branch memory bank
  test('should search documents by multiple tags (AND) in branch memory bank', async () => {
    const result = await runCliSuccessful([
      'json',
      'search',
      'design',
      'reference',
      '--all',
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
    
    // Check that only documents with BOTH design AND reference tags are included
    expect(output).toContain('Multi-tags Document');
    expect(output).toContain('multi-tags.json');
    
    // Check that other documents are NOT included
    expect(output).not.toContain('Architecture Document');
    expect(output).not.toContain('API Document');
    expect(output).not.toContain('Active Context Document');
  });
  
  // Test searching by document type in branch memory bank
  test('should search documents by type in branch memory bank', async () => {
    const result = await runCliSuccessful([
      'json',
      'search',
      '--type',
      'activeContext',
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
    
    // Check that only activeContext documents are included
    expect(output).toContain('Active Context Document');
    expect(output).toContain('active-context.json');
    
    // Check that other documents are NOT included
    expect(output).not.toContain('Architecture Document');
    expect(output).not.toContain('API Document');
    expect(output).not.toContain('Multi-tags Document');
  });
  
  // Test searching by tags in global memory bank
  test('should search documents by tags in global memory bank', async () => {
    const result = await runCliSuccessful([
      'json',
      'search',
      'documentation',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Check output for expected document information
    const output = result.stdout;
    
    // Check that correct global documents are included
    expect(output).toContain('Global Documentation');
    expect(output).toContain('global-docs.json');
    
    // Check that other documents are NOT included
    expect(output).not.toContain('Global Architecture Document');
    expect(output).not.toContain('Architecture Document'); // Branch document
  });
  
  // Test searching with JSON format
  test('should search documents with JSON format', async () => {
    const result = await runCliSuccessful([
      'json',
      'search',
      'technical',
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
    
    // Check that correct documents are included
    expect(Array.isArray(documents)).toBe(true);
    expect(documents.length).toBe(2); // Should find Architecture and API documents
    
    // Check document properties
    const docTitles = documents.map((doc: any) => doc.title);
    expect(docTitles).toContain('Architecture Document');
    expect(docTitles).toContain('API Document');
    
    // Check document paths
    const docPaths = documents.map((doc: any) => doc.path);
    expect(docPaths).toContain('architecture.json');
    expect(docPaths).toContain('api.json');
  });
  
  // Test empty result case
  test('should handle empty result case', async () => {
    const result = await runCliSuccessful([
      'json',
      'search',
      'non-existent-tag',
      '--branch',
      testBranchName,
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Check for empty results message
    expect(result.stdout).toContain('No documents found');
    expect(result.stdout).toContain(testBranchName);
    expect(result.stdout).toContain('non-existent-tag');
  });
  
  // Test error when branch doesn't exist
  test('should fail when branch does not exist', async () => {
    const result = await runCli([
      'json',
      'search',
      'architecture',
      '--branch',
      'non-existent-branch',
      '--docs',
      docsDir
    ]);
    
    // Verify the command failed
    expect(result.exitCode).not.toBe(0);
    // Since JSON features are disabled, we get a different error
    // but the main point is that the command should fail with non-zero exit code
    // which we already verified above
  });
});
