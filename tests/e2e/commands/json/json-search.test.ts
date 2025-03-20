/**
 * E2E tests for the json search command
 */

import * as path from 'path';
import * as fs from 'fs';
import { runCli, runCliSuccessful } from '../../helpers/cli-runner';
import { 
  createTempTestDir, 
  createDocsStructure, 
  deleteTempDir
} from '../../helpers/setup';

// Test suite configuration
let testDir: string;
let docsDir: string;
let globalDir: string;
let branchDir: string;
let testBranchDir: string;

// Setup before each test
beforeEach(() => {
  testDir = createTempTestDir('json-search');
  const dirs = createDocsStructure(testDir);
  docsDir = dirs.docsDir;
  globalDir = dirs.globalDir;
  branchDir = dirs.branchDir;
  
  // Create a test branch directory
  testBranchDir = path.join(branchDir, 'feature-test-branch');
  fs.mkdirSync(testBranchDir, { recursive: true });
});

// Cleanup after each test
afterEach(() => {
  deleteTempDir(testDir);
});

describe.skip('Memory Bank CLI - json search command', () => {
  // Helper function to create test documents with tags
  const createTestDocument = (dir: string, name: string, title: string, type: string, tags: string[]) => {
    const doc = {
      schema: 'memory_document_v2',
      metadata: {
        id: `search-${name}`,
        title,
        documentType: type,
        path: `${name}.json`,
        tags,
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        name,
        tags
      }
    };
    
    fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(doc, null, 2), 'utf8');
    return doc;
  };
  
  test('should search for documents by single tag in global memory bank', async () => {
    // Create test documents with different tags
    createTestDocument(globalDir, 'doc1', 'Document 1', 'generic', ['architecture', 'design']);
    createTestDocument(globalDir, 'doc2', 'Document 2', 'generic', ['testing', 'design']);
    createTestDocument(globalDir, 'doc3', 'Document 3', 'generic', ['architecture', 'patterns']);
    
    // Run the search command for a single tag
    const result = await runCliSuccessful([
      'json', 
      'search', 
      'architecture',
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the output contains the documents with the 'architecture' tag
    expect(result.stdout).toContain('Document 1');
    expect(result.stdout).toContain('Document 3');
    expect(result.stdout).not.toContain('Document 2');
  });

  test('should search for documents matching any tag', async () => {
    // Create test documents with different tags
    createTestDocument(globalDir, 'any1', 'Any Tag 1', 'generic', ['api', 'implementation']);
    createTestDocument(globalDir, 'any2', 'Any Tag 2', 'generic', ['documentation', 'api']);
    createTestDocument(globalDir, 'any3', 'Any Tag 3', 'generic', ['testing', 'implementation']);
    createTestDocument(globalDir, 'any4', 'Any Tag 4', 'generic', ['config', 'deployment']);
    
    // Run the search command for multiple tags (OR logic - default)
    const result = await runCliSuccessful([
      'json', 
      'search', 
      'api', 
      'implementation',
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the output contains all documents with 'api' OR 'implementation' tags
    expect(result.stdout).toContain('Any Tag 1'); // has both tags
    expect(result.stdout).toContain('Any Tag 2'); // has 'api' tag
    expect(result.stdout).toContain('Any Tag 3'); // has 'implementation' tag
    expect(result.stdout).not.toContain('Any Tag 4'); // has neither tag
  });

  test('should search for documents matching all tags', async () => {
    // Create test documents with different tag combinations
    createTestDocument(globalDir, 'all1', 'All Tags 1', 'generic', ['frontend', 'backend', 'security']);
    createTestDocument(globalDir, 'all2', 'All Tags 2', 'generic', ['frontend', 'security']);
    createTestDocument(globalDir, 'all3', 'All Tags 3', 'generic', ['frontend', 'backend', 'performance']);
    createTestDocument(globalDir, 'all4', 'All Tags 4', 'generic', ['backend', 'security']);
    
    // Run the search command with the --all flag (AND logic)
    const result = await runCliSuccessful([
      'json', 
      'search', 
      'frontend', 
      'backend',
      '--all',
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the output contains only documents with BOTH 'frontend' AND 'backend' tags
    expect(result.stdout).toContain('All Tags 1'); // has both 'frontend' and 'backend'
    expect(result.stdout).toContain('All Tags 3'); // has both 'frontend' and 'backend'
    expect(result.stdout).not.toContain('All Tags 2'); // missing 'backend'
    expect(result.stdout).not.toContain('All Tags 4'); // missing 'frontend'
  });

  test('should search for documents in branch memory bank', async () => {
    const branchName = 'feature/test-branch';
    
    // Create test documents in branch
    createTestDocument(testBranchDir, 'branch1', 'Branch Doc 1', 'branchContext', ['feature', 'specs']);
    createTestDocument(testBranchDir, 'branch2', 'Branch Doc 2', 'activeContext', ['active', 'work']);
    createTestDocument(testBranchDir, 'branch3', 'Branch Doc 3', 'systemPatterns', ['patterns', 'architecture']);
    
    // Run the search command with branch option
    const result = await runCliSuccessful([
      'json', 
      'search', 
      'architecture',
      '--branch', 
      branchName,
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the output contains only the branch document with 'architecture' tag
    expect(result.stdout).toContain('Branch Doc 3');
    expect(result.stdout).not.toContain('Branch Doc 1');
    expect(result.stdout).not.toContain('Branch Doc 2');
  });

  test('should filter search results by document type', async () => {
    // Create test documents with different types
    createTestDocument(globalDir, 'type1', 'Type Doc 1', 'activeContext', ['common', 'specific']);
    createTestDocument(globalDir, 'type2', 'Type Doc 2', 'progress', ['common', 'tracking']);
    createTestDocument(globalDir, 'type3', 'Type Doc 3', 'activeContext', ['tracking', 'status']);
    
    // Run the search command with type filter
    const result = await runCliSuccessful([
      'json', 
      'search', 
      'common',
      '--type', 
      'activeContext',
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the output contains only activeContext documents with 'common' tag
    expect(result.stdout).toContain('Type Doc 1');
    expect(result.stdout).not.toContain('Type Doc 2'); // wrong type
    expect(result.stdout).not.toContain('Type Doc 3'); // doesn't have 'common' tag
  });

  test('should output search results in JSON format', async () => {
    // Create test documents
    createTestDocument(globalDir, 'json1', 'JSON Format 1', 'generic', ['format', 'json']);
    createTestDocument(globalDir, 'json2', 'JSON Format 2', 'generic', ['format', 'output']);
    
    // Run the search command with JSON format
    const result = await runCliSuccessful([
      'json', 
      'search', 
      'format',
      '--format', 
      'json',
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the output is valid JSON
    let outputJson;
    expect(() => {
      outputJson = JSON.parse(result.stdout);
    }).not.toThrow();
    
    // Verify the JSON output contains the expected documents
    expect(outputJson).toBeInstanceOf(Array);
    expect(outputJson.length).toBe(2);
    
    // Find our test documents in the output
    const doc1 = outputJson.find((d: any) => d.id === 'search-json1');
    const doc2 = outputJson.find((d: any) => d.id === 'search-json2');
    
    expect(doc1).toBeDefined();
    expect(doc1.title).toBe('JSON Format 1');
    expect(doc1.tags).toContain('format');
    expect(doc1.tags).toContain('json');
    
    expect(doc2).toBeDefined();
    expect(doc2.title).toBe('JSON Format 2');
    expect(doc2.tags).toContain('format');
    expect(doc2.tags).toContain('output');
  });

  test('should handle search with no results gracefully', async () => {
    // Create documents that won't match the search
    createTestDocument(globalDir, 'nomatch1', 'No Match 1', 'generic', ['tag1', 'tag2']);
    createTestDocument(globalDir, 'nomatch2', 'No Match 2', 'generic', ['tag3', 'tag4']);
    
    // Run search that won't match any documents
    const result = await runCliSuccessful([
      'json', 
      'search', 
      'nonexistent-tag',
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the output indicates no documents found
    expect(result.stdout).toContain('No documents found');
  });

  test('should fail with non-existent branch', async () => {
    // Run the search command with a non-existent branch
    const result = await runCli([
      'json', 
      'search',
      '--branch', 
      'feature/non-existent',
      '--docs', 
      docsDir
    ]);
    
    // Verify the error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Error searching JSON documents');
  });

  test('should search all documents when no tags are provided', async () => {
    // Create various test documents
    createTestDocument(globalDir, 'all1', 'All Doc 1', 'generic', ['tag1', 'tag2']);
    createTestDocument(globalDir, 'all2', 'All Doc 2', 'progress', ['tag3', 'tag4']);
    createTestDocument(globalDir, 'all3', 'All Doc 3', 'branchContext', ['tag5', 'tag6']);
    
    // Run search with no tags (should return all documents)
    const result = await runCliSuccessful([
      'json', 
      'search',
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the output contains all documents
    expect(result.stdout).toContain('All Doc 1');
    expect(result.stdout).toContain('All Doc 2');
    expect(result.stdout).toContain('All Doc 3');
  });
});
