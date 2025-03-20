/**
 * E2E tests for the json update command
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
let inputDir: string;

// Branch name for testing
const testBranchName = 'feature/test-branch';
const normalizedBranchName = 'feature-test-branch';

// Test document data
const testJsonContent = {
  schema: "memory_document_v1",
  metadata: {
    title: "Original Title",
    documentType: "generic",
    path: "test-document.json",
    tags: ["original", "test"],
    lastModified: new Date().toISOString()
  },
  content: {
    message: "This is the original document content",
    items: [1, 2, 3],
    version: 1
  }
};

// Setup before each test
beforeEach(() => {
  testDir = createTempTestDir('json-update');
  const dirs = createDocsStructure(testDir);
  docsDir = dirs.docsDir;
  globalDir = dirs.globalDir;
  branchesDir = dirs.branchDir;
  
  // Create test branch directory
  testBranchDir = path.join(branchesDir, normalizedBranchName);
  fs.mkdirSync(testBranchDir, { recursive: true });
  
  // Create directory for input files
  inputDir = path.join(testDir, 'input');
  fs.mkdirSync(inputDir, { recursive: true });
  
  // Create test documents
  createTestJsonDocument(testBranchDir, 'test-document.json', testJsonContent);
  createTestJsonDocument(globalDir, 'global-document.json', {
    ...testJsonContent,
    metadata: {
      ...testJsonContent.metadata,
      title: "Original Global Title",
      path: "global-document.json"
    }
  });
});

// Cleanup after each test
afterEach(() => {
  deleteTempDir(testDir);
});

describe.skip('Memory Bank CLI - json update command', () => {
  // Test updating a document title in branch memory bank
  test('should update document title in branch memory bank', async () => {
    const documentName = 'test-document.json';
    const newTitle = 'Updated Title';
    
    const result = await runCliSuccessful([
      'json',
      'update',
      documentName,
      '--branch',
      testBranchName,
      '--title',
      newTitle,
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('updated successfully');
    expect(result.stdout).toContain(testBranchName);
    
    // Verify the file was updated
    const documentPath = path.join(testBranchDir, documentName);
    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    
    // Check that title was updated
    expect(parsedContent.metadata.title).toBe(newTitle);
    
    // Check that other metadata was preserved
    expect(parsedContent.metadata.documentType).toBe(testJsonContent.metadata.documentType);
    expect(parsedContent.metadata.tags).toEqual(testJsonContent.metadata.tags);
    
    // Check that content was preserved
    expect(parsedContent.content.message).toBe(testJsonContent.content.message);
    expect(parsedContent.content.items).toEqual(testJsonContent.content.items);
  });
  
  // Test updating document content in branch memory bank
  test('should update document content in branch memory bank', async () => {
    const documentName = 'test-document.json';
    const newContent = {
      message: "This is the updated document content",
      items: [4, 5, 6],
      version: 2,
      newProperty: "added"
    };
    
    const result = await runCliSuccessful([
      'json',
      'update',
      documentName,
      '--branch',
      testBranchName,
      '--content',
      JSON.stringify(newContent),
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the file was updated
    const documentPath = path.join(testBranchDir, documentName);
    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    
    // Check that content was updated
    expect(parsedContent.content.message).toBe(newContent.message);
    expect(parsedContent.content.items).toEqual(newContent.items);
    expect(parsedContent.content.version).toBe(newContent.version);
    expect(parsedContent.content.newProperty).toBe(newContent.newProperty);
    
    // Check that metadata was preserved
    expect(parsedContent.metadata.title).toBe(testJsonContent.metadata.title);
    expect(parsedContent.metadata.documentType).toBe(testJsonContent.metadata.documentType);
    expect(parsedContent.metadata.tags).toEqual(testJsonContent.metadata.tags);
  });
  
  // Test updating document tags in branch memory bank
  test('should update document tags in branch memory bank', async () => {
    const documentName = 'test-document.json';
    const newTags = ['updated', 'e2e', 'test'];
    
    const result = await runCliSuccessful([
      'json',
      'update',
      documentName,
      '--branch',
      testBranchName,
      '--tags',
      ...newTags,
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    
    // Verify the file was updated
    const documentPath = path.join(testBranchDir, documentName);
    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    
    // Check that tags were updated
    expect(parsedContent.metadata.tags).toEqual(newTags);
    
    // Check that other metadata was preserved
    expect(parsedContent.metadata.title).toBe(testJsonContent.metadata.title);
    expect(parsedContent.metadata.documentType).toBe(testJsonContent.metadata.documentType);
  });
  
  // Test updating document type in branch memory bank
  test('should update document type in branch memory bank', async () => {
    const documentName = 'test-document.json';
    const newType = 'activeContext';
    
    const result = await runCliSuccessful([
      'json',
      'update',
      documentName,
      '--branch',
      testBranchName,
      '--type',
      newType,
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    
    // Verify the file was updated
    const documentPath = path.join(testBranchDir, documentName);
    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    
    // Check that type was updated
    expect(parsedContent.metadata.documentType).toBe(newType);
    
    // Check that other metadata was preserved
    expect(parsedContent.metadata.title).toBe(testJsonContent.metadata.title);
    expect(parsedContent.metadata.tags).toEqual(testJsonContent.metadata.tags);
  });
  
  // Test updating a document in global memory bank
  test('should update document in global memory bank', async () => {
    const documentName = 'global-document.json';
    const newTitle = 'Updated Global Title';
    const newContent = {
      message: "This is the updated global document content",
      items: [7, 8, 9]
    };
    
    const result = await runCliSuccessful([
      'json',
      'update',
      documentName,
      '--title',
      newTitle,
      '--content',
      JSON.stringify(newContent),
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('global memory bank');
    
    // Verify the file was updated
    const documentPath = path.join(globalDir, documentName);
    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    
    // Check that updates were applied
    expect(parsedContent.metadata.title).toBe(newTitle);
    expect(parsedContent.content.message).toBe(newContent.message);
    expect(parsedContent.content.items).toEqual(newContent.items);
  });
  
  // Test updating document content from file
  test('should update document content from file', async () => {
    const documentName = 'test-document.json';
    const contentFile = path.join(inputDir, 'updated-content.json');
    const newContent = {
      message: "This content comes from a file",
      items: [10, 11, 12],
      source: "file"
    };
    
    // Create input file
    fs.writeFileSync(contentFile, JSON.stringify(newContent), 'utf8');
    
    const result = await runCliSuccessful([
      'json',
      'update',
      documentName,
      '--branch',
      testBranchName,
      '--file',
      contentFile,
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    
    // Verify the file was updated
    const documentPath = path.join(testBranchDir, documentName);
    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    
    // Check that content was updated from file
    expect(parsedContent.content.message).toBe(newContent.message);
    expect(parsedContent.content.items).toEqual(newContent.items);
    expect(parsedContent.content.source).toBe(newContent.source);
  });
  
  // Test multiple updates at once
  test('should apply multiple updates at once', async () => {
    const documentName = 'test-document.json';
    const newTitle = 'Multiple Updates Title';
    const newType = 'systemPatterns';
    const newTags = ['multiple', 'updates', 'test'];
    const newContent = {
      message: "Updated with multiple changes",
      multipleUpdates: true
    };
    
    const result = await runCliSuccessful([
      'json',
      'update',
      documentName,
      '--branch',
      testBranchName,
      '--title',
      newTitle,
      '--type',
      newType,
      '--tags',
      ...newTags,
      '--content',
      JSON.stringify(newContent),
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    
    // Verify the file was updated
    const documentPath = path.join(testBranchDir, documentName);
    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    
    // Check all updates were applied
    expect(parsedContent.metadata.title).toBe(newTitle);
    expect(parsedContent.metadata.documentType).toBe(newType);
    expect(parsedContent.metadata.tags).toEqual(newTags);
    expect(parsedContent.content.message).toBe(newContent.message);
    expect(parsedContent.content.multipleUpdates).toBe(newContent.multipleUpdates);
  });
  
  // Test error handling for non-existent document
  test('should fail when document does not exist', async () => {
    const result = await runCli([
      'json',
      'update',
      'non-existent-document.json',
      '--branch',
      testBranchName,
      '--title',
      'New Title',
      '--docs',
      docsDir
    ]);
    
    // Verify the command failed
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Error reading JSON document');
    expect(result.stderr).toContain('non-existent-document.json');
  });
  
  // Test error handling for invalid JSON content
  test('should fail with invalid JSON content', async () => {
    const documentName = 'test-document.json';
    const invalidContent = '{ this is not valid JSON }';
    
    const result = await runCli([
      'json',
      'update',
      documentName,
      '--branch',
      testBranchName,
      '--content',
      invalidContent,
      '--docs',
      docsDir
    ]);
    
    // Verify the command failed
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Invalid JSON');
    
    // Verify the file was not modified
    const documentPath = path.join(testBranchDir, documentName);
    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    
    // Check content was not changed
    expect(parsedContent.content.message).toBe(testJsonContent.content.message);
  });
  
  // Test error handling for non-existent branch
  test('should fail when branch does not exist', async () => {
    const result = await runCli([
      'json',
      'update',
      'test-document.json',
      '--branch',
      'non-existent-branch',
      '--title',
      'New Title',
      '--docs',
      docsDir
    ]);
    
    // Verify the command failed
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Error reading JSON document');
    expect(result.stderr).toContain('non-existent-branch');
  });
});
