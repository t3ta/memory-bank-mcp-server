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
let branchDir: string;
let testBranchDir: string;

// Setup before each test
beforeEach(() => {
  testDir = createTempTestDir('json-list');
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

describe.skip('Memory Bank CLI - json list command', () => {
  test('should list JSON documents in global memory bank', async () => {
    // Create multiple test documents in global memory bank
    const doc1 = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'list-test-1',
        title: 'List Test Document 1',
        documentType: 'generic',
        path: 'list-test-1.json',
        tags: ['test', 'list', 'global'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: { index: 1 }
    };
    
    const doc2 = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'list-test-2',
        title: 'List Test Document 2',
        documentType: 'activeContext',
        path: 'list-test-2.json',
        tags: ['test', 'list', 'active'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: { index: 2 }
    };
    
    // Write the documents
    fs.writeFileSync(path.join(globalDir, 'list-test-1.json'), JSON.stringify(doc1, null, 2), 'utf8');
    fs.writeFileSync(path.join(globalDir, 'list-test-2.json'), JSON.stringify(doc2, null, 2), 'utf8');
    
    // Run the list command
    const result = await runCliSuccessful([
      'json', 
      'list',
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the output contains both documents
    expect(result.stdout).toContain('List Test Document 1');
    expect(result.stdout).toContain('list-test-1.json');
    expect(result.stdout).toContain('generic');
    
    expect(result.stdout).toContain('List Test Document 2');
    expect(result.stdout).toContain('list-test-2.json');
    expect(result.stdout).toContain('activeContext');
  });

  test('should list JSON documents in branch memory bank', async () => {
    const branchName = 'feature/test-branch';
    
    // Create test documents in the branch
    const doc1 = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'branch-list-1',
        title: 'Branch List Document 1',
        documentType: 'branchContext',
        path: 'branch-list-1.json',
        tags: ['branch', 'list'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: { branch: true, index: 1 }
    };
    
    const doc2 = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'branch-list-2',
        title: 'Branch List Document 2',
        documentType: 'systemPatterns',
        path: 'branch-list-2.json',
        tags: ['branch', 'list', 'patterns'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: { branch: true, index: 2 }
    };
    
    // Write the documents to branch directory
    fs.writeFileSync(path.join(testBranchDir, 'branch-list-1.json'), JSON.stringify(doc1, null, 2), 'utf8');
    fs.writeFileSync(path.join(testBranchDir, 'branch-list-2.json'), JSON.stringify(doc2, null, 2), 'utf8');
    
    // Run the list command with branch option
    const result = await runCliSuccessful([
      'json', 
      'list',
      '--branch', 
      branchName,
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the output mentions the branch
    expect(result.stdout).toContain(`branch ${branchName}`);
    
    // Verify the output contains both branch documents
    expect(result.stdout).toContain('Branch List Document 1');
    expect(result.stdout).toContain('branch-list-1.json');
    expect(result.stdout).toContain('branchContext');
    
    expect(result.stdout).toContain('Branch List Document 2');
    expect(result.stdout).toContain('branch-list-2.json');
    expect(result.stdout).toContain('systemPatterns');
  });

  test('should filter documents by type', async () => {
    // Create documents of different types
    const doc1 = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'type-filter-1',
        title: 'Type Filter Document 1',
        documentType: 'activeContext',
        path: 'type-filter-1.json',
        tags: ['filter', 'type'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: { filtered: true, type: 'activeContext' }
    };
    
    const doc2 = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'type-filter-2',
        title: 'Type Filter Document 2',
        documentType: 'progress',
        path: 'type-filter-2.json',
        tags: ['filter', 'type'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: { filtered: true, type: 'progress' }
    };
    
    // Write the documents
    fs.writeFileSync(path.join(globalDir, 'type-filter-1.json'), JSON.stringify(doc1, null, 2), 'utf8');
    fs.writeFileSync(path.join(globalDir, 'type-filter-2.json'), JSON.stringify(doc2, null, 2), 'utf8');
    
    // Run the list command with type filter
    const result = await runCliSuccessful([
      'json', 
      'list',
      '--type', 
      'activeContext',
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the output contains only the activeContext document
    expect(result.stdout).toContain('Type Filter Document 1');
    expect(result.stdout).toContain('activeContext');
    expect(result.stdout).not.toContain('Type Filter Document 2');
    expect(result.stdout).not.toContain('progress');
  });

  test('should output in JSON format when requested', async () => {
    // Create a test document
    const doc = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'json-format-test',
        title: 'JSON Format Test',
        documentType: 'generic',
        path: 'json-format.json',
        tags: ['format', 'json'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: { format: 'json' }
    };
    
    // Write the document
    fs.writeFileSync(path.join(globalDir, 'json-format.json'), JSON.stringify(doc, null, 2), 'utf8');
    
    // Run the list command with JSON format
    const result = await runCliSuccessful([
      'json', 
      'list',
      '--format', 
      'json',
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the output is valid JSON and contains the document
    let outputJson;
    expect(() => {
      outputJson = JSON.parse(result.stdout);
    }).not.toThrow();
    
    expect(outputJson).toBeInstanceOf(Array);
    expect(outputJson.length).toBeGreaterThan(0);
    
    // Find our test document in the JSON output
    const foundDoc = outputJson.find((d: any) => d.id === 'json-format-test');
    expect(foundDoc).toBeDefined();
    expect(foundDoc.title).toBe('JSON Format Test');
    expect(foundDoc.documentType).toBe('generic');
    expect(foundDoc.path).toBe('json-format.json');
  });

  test('should handle empty result gracefully', async () => {
    // Create an empty branch directory
    const emptyBranchName = 'feature/empty-branch';
    const emptyBranchDir = path.join(branchDir, 'feature-empty-branch');
    fs.mkdirSync(emptyBranchDir, { recursive: true });
    
    // Run the list command on the empty branch
    const result = await runCliSuccessful([
      'json', 
      'list',
      '--branch', 
      emptyBranchName,
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the output indicates no documents found
    expect(result.stdout).toContain('No JSON documents found');
    expect(result.stdout).toContain(emptyBranchName);
  });

  test('should fail with non-existent branch', async () => {
    // Run the list command with a non-existent branch
    const result = await runCli([
      'json', 
      'list',
      '--branch', 
      'feature/non-existent',
      '--docs', 
      docsDir
    ]);
    
    // Verify the error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Error listing JSON documents');
  });

  test('should filter by type in branch memory bank', async () => {
    const branchName = 'feature/test-branch';
    
    // Create documents of different types in the branch
    const doc1 = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'branch-type-1',
        title: 'Branch Type Document 1',
        documentType: 'progress',
        path: 'branch-type-1.json',
        tags: ['branch', 'type'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: { branch: true, type: 'progress' }
    };
    
    const doc2 = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'branch-type-2',
        title: 'Branch Type Document 2',
        documentType: 'branchContext',
        path: 'branch-type-2.json',
        tags: ['branch', 'type'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: { branch: true, type: 'branchContext' }
    };
    
    // Write the documents to branch directory
    fs.writeFileSync(path.join(testBranchDir, 'branch-type-1.json'), JSON.stringify(doc1, null, 2), 'utf8');
    fs.writeFileSync(path.join(testBranchDir, 'branch-type-2.json'), JSON.stringify(doc2, null, 2), 'utf8');
    
    // Run the list command with branch and type filter
    const result = await runCliSuccessful([
      'json', 
      'list',
      '--branch', 
      branchName,
      '--type', 
      'progress',
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the output contains only the progress document
    expect(result.stdout).toContain('Branch Type Document 1');
    expect(result.stdout).toContain('progress');
    expect(result.stdout).not.toContain('Branch Type Document 2');
    expect(result.stdout).not.toContain('branchContext');
  });
});
