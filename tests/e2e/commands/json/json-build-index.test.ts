/**
 * E2E tests for the json build-index command
 */

import * as path from 'path';
import * as fs from 'fs';
import { runCli, runCliSuccessful } from '../../helpers/cli-runner';
import { 
  createTempTestDir, 
  createDocsStructure, 
  deleteTempDir
} from '../../helpers/setup';
import {
  assertFileExists,
  assertJsonFileProperties
} from '../../helpers/test-utils';

// Test suite configuration
let testDir: string;
let docsDir: string;
let globalDir: string;
let branchDir: string;
let testBranchDir: string;

// Setup before each test
beforeEach(() => {
  testDir = createTempTestDir('json-build-index');
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

describe.skip('Memory Bank CLI - json build-index command', () => {
  // Helper function to create test documents with tags
  const createTestDocument = (dir: string, name: string, title: string, type: string, tags: string[]) => {
    const doc = {
      schema: 'memory_document_v2',
      metadata: {
        id: `index-${name}`,
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
  
  test('should build global JSON document index', async () => {
    // Create test documents with different tags
    createTestDocument(globalDir, 'index1', 'Index Test 1', 'generic', ['test', 'index']);
    createTestDocument(globalDir, 'index2', 'Index Test 2', 'generic', ['test', 'document']);
    createTestDocument(globalDir, 'index3', 'Index Test 3', 'generic', ['index', 'global']);
    
    // Run the build-index command
    const result = await runCliSuccessful([
      'json', 
      'build-index',
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the output indicates successful index build
    expect(result.stdout).toContain('completed successfully');
    expect(result.stdout).toContain('global memory bank');
    
    // Verify the index statistics
    expect(result.stdout).toContain('Index Statistics');
    expect(result.stdout).toContain('Documents indexed');
    expect(result.stdout).toContain('Tags indexed');
    
    // Verify the index file was created (assuming _index.json is used)
    const indexPath = path.join(globalDir, '_index.json');
    assertFileExists(indexPath);
    
    // Verify the index contains our documents and tags
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const index = JSON.parse(indexContent);
    
    // Check that the tags we've used are in the index
    expect(index.tags).toBeDefined();
    expect(Object.keys(index.tags)).toContain('test');
    expect(Object.keys(index.tags)).toContain('index');
    expect(Object.keys(index.tags)).toContain('document');
    expect(Object.keys(index.tags)).toContain('global');
  });

  test('should build branch JSON document index', async () => {
    const branchName = 'feature/test-branch';
    
    // Create test documents in branch
    createTestDocument(testBranchDir, 'branch-index1', 'Branch Index 1', 'branchContext', ['branch', 'index']);
    createTestDocument(testBranchDir, 'branch-index2', 'Branch Index 2', 'activeContext', ['branch', 'context']);
    
    // Run the build-index command with branch option
    const result = await runCliSuccessful([
      'json', 
      'build-index',
      '--branch', 
      branchName,
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the output indicates successful branch index build
    expect(result.stdout).toContain('completed successfully');
    expect(result.stdout).toContain(`branch ${branchName}`);
    
    // Verify the branch index file was created
    const indexPath = path.join(testBranchDir, '_index.json');
    assertFileExists(indexPath);
    
    // Verify the branch index contains our documents and tags
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const index = JSON.parse(indexContent);
    
    // Check that the branch-specific tags are in the index
    expect(index.tags).toBeDefined();
    expect(Object.keys(index.tags)).toContain('branch');
    expect(Object.keys(index.tags)).toContain('index');
    expect(Object.keys(index.tags)).toContain('context');
  });

  test('should force rebuild index', async () => {
    // Create test documents
    createTestDocument(globalDir, 'force1', 'Force Rebuild 1', 'generic', ['force', 'rebuild']);
    createTestDocument(globalDir, 'force2', 'Force Rebuild 2', 'generic', ['force', 'complete']);
    
    // Run the build-index command with force flag
    const result = await runCliSuccessful([
      'json', 
      'build-index',
      '--force',
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the output indicates a forced rebuild
    expect(result.stdout).toContain('Forced complete rebuild');
    expect(result.stdout).not.toContain('Incremental update');
  });

  test('should handle empty directory', async () => {
    // Run the build-index command on an empty directory
    const result = await runCliSuccessful([
      'json', 
      'build-index',
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the index statistics show zero or minimal documents
    expect(result.stdout).toContain('Documents indexed: 0');
  });

  test('should fail with non-existent branch', async () => {
    // Run the build-index command with a non-existent branch
    const result = await runCli([
      'json', 
      'build-index',
      '--branch', 
      'feature/non-existent',
      '--docs', 
      docsDir
    ]);
    
    // Verify the error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Error building index');
  });

  test('should update existing index', async () => {
    // Step 1: Create initial documents and build index
    createTestDocument(globalDir, 'update1', 'Update Test 1', 'generic', ['update', 'initial']);
    
    // Build initial index
    await runCliSuccessful([
      'json', 
      'build-index',
      '--docs', 
      docsDir
    ]);
    
    // Verify the index file was created
    const indexPath = path.join(globalDir, '_index.json');
    assertFileExists(indexPath);
    
    // Get the initial modification time
    const initialStats = fs.statSync(indexPath);
    const initialModTime = initialStats.mtimeMs;
    
    // Wait a moment to ensure file modification time would change
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 2: Add a new document
    createTestDocument(globalDir, 'update2', 'Update Test 2', 'generic', ['update', 'new']);
    
    // Run the build-index command again (incremental update)
    const result = await runCliSuccessful([
      'json', 
      'build-index',
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the output indicates an incremental update
    expect(result.stdout).toContain('Incremental update');
    expect(result.stdout).not.toContain('Forced complete rebuild');
    
    // Verify the index was updated
    const updatedStats = fs.statSync(indexPath);
    const updatedModTime = updatedStats.mtimeMs;
    
    // The modification time should have changed
    expect(updatedModTime).toBeGreaterThan(initialModTime);
    
    // Verify the updated index contains the new document's tags
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const index = JSON.parse(indexContent);
    
    expect(Object.keys(index.tags)).toContain('update');
    expect(Object.keys(index.tags)).toContain('initial');
    expect(Object.keys(index.tags)).toContain('new');
  });
});
