/**
 * E2E tests for the json create command
 */

import * as path from 'path';
import * as fs from 'fs';
import { runCli, runCliSuccessful } from '../../helpers/cli-runner';
import { 
  createTempTestDir, 
  createDocsStructure, 
  deleteTempDir, 
  createTestDocument
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
  message: "This is a test document content",
  items: [1, 2, 3],
  nested: {
    key: "value"
  }
};

// Setup before each test
beforeEach(() => {
  testDir = createTempTestDir('json-create');
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
});

// Cleanup after each test
afterEach(() => {
  deleteTempDir(testDir);
});

describe('Memory Bank CLI - json create command', () => {
  // Test creating a JSON document in a branch memory bank
  test('should create JSON document in branch memory bank', async () => {
    const documentName = 'test-document.json';
    const content = JSON.stringify(testJsonContent);
    
    const result = await runCliSuccessful([
      'json',
      'create',
      documentName,
      '--branch',
      testBranchName,
      '--title',
      'Test Document',
      '--content',
      content,
      '--tags',
      'test,e2e',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('created successfully');
    expect(result.stdout).toContain(testBranchName);
    
    // Verify the file was created
    const documentPath = path.join(testBranchDir, documentName);
    expect(fs.existsSync(documentPath)).toBe(true);
    
    // Check file content
    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    
    // Verify metadata
    expect(parsedContent.metadata).toBeDefined();
    expect(parsedContent.metadata.title).toBe('Test Document');
    expect(parsedContent.metadata.tags).toContain('test');
    expect(parsedContent.metadata.tags).toContain('e2e');
    
    // Verify content
    expect(parsedContent.content).toBeDefined();
    expect(parsedContent.content.message).toBe(testJsonContent.message);
    expect(parsedContent.content.items).toEqual(testJsonContent.items);
    expect(parsedContent.content.nested.key).toBe(testJsonContent.nested.key);
  });
  
  // Test creating a JSON document in global memory bank
  test('should create JSON document in global memory bank', async () => {
    const documentName = 'global-document.json';
    const content = JSON.stringify(testJsonContent);
    
    const result = await runCliSuccessful([
      'json',
      'create',
      documentName,
      '--title',
      'Global Document',
      '--content',
      content,
      '--tags',
      'global,test',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('created successfully');
    expect(result.stdout).toContain('global memory bank');
    
    // Verify the file was created
    const documentPath = path.join(globalDir, documentName);
    expect(fs.existsSync(documentPath)).toBe(true);
    
    // Check file content
    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    
    // Verify metadata
    expect(parsedContent.metadata).toBeDefined();
    expect(parsedContent.metadata.title).toBe('Global Document');
    expect(parsedContent.metadata.tags).toContain('global');
    expect(parsedContent.metadata.tags).toContain('test');
    
    // Verify content
    expect(parsedContent.content).toBeDefined();
    expect(parsedContent.content.message).toBe(testJsonContent.message);
  });
  
  // Test creating a JSON document from a file
  test('should create JSON document from an input file', async () => {
    const documentName = 'from-file.json';
    const contentFile = path.join(inputDir, 'input-content.json');
    
    // Create input file
    fs.writeFileSync(contentFile, JSON.stringify(testJsonContent), 'utf8');
    
    const result = await runCliSuccessful([
      'json',
      'create',
      documentName,
      '--branch',
      testBranchName,
      '--title',
      'File Input Document',
      '--file',
      contentFile,
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('created successfully');
    
    // Verify the file was created
    const documentPath = path.join(testBranchDir, documentName);
    expect(fs.existsSync(documentPath)).toBe(true);
    
    // Check file content
    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    
    // Verify content from file was used
    expect(parsedContent.content.message).toBe(testJsonContent.message);
    expect(parsedContent.content.items).toEqual(testJsonContent.items);
  });
  
  // Test document type option
  test('should create document with specified type', async () => {
    const documentName = 'typed-document.json';
    const documentType = 'activeContext';
    const content = JSON.stringify({ status: "active", priority: "high" });
    
    const result = await runCliSuccessful([
      'json',
      'create',
      documentName,
      '--branch',
      testBranchName,
      '--title',
      'Typed Document',
      '--type',
      documentType,
      '--content',
      content,
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    
    // Verify the file was created
    const documentPath = path.join(testBranchDir, documentName);
    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    
    // Verify document type
    expect(parsedContent.metadata.documentType).toBe(documentType);
  });
  
  // Test error handling for invalid JSON
  test('should fail with invalid JSON content', async () => {
    const documentName = 'invalid-json.json';
    const invalidContent = '{ this is not valid JSON }';
    
    const result = await runCli([
      'json',
      'create',
      documentName,
      '--branch',
      testBranchName,
      '--title',
      'Invalid Document',
      '--content',
      invalidContent,
      '--docs',
      docsDir
    ]);
    
    // Verify the command failed
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Invalid JSON');
    
    // Verify the file was not created
    const documentPath = path.join(testBranchDir, documentName);
    expect(fs.existsSync(documentPath)).toBe(false);
  });
  
  // Test error handling for missing title
  test('should fail when title is not provided', async () => {
    const documentName = 'no-title.json';
    const content = JSON.stringify(testJsonContent);
    
    const result = await runCli([
      'json',
      'create',
      documentName,
      '--branch',
      testBranchName,
      '--content',
      content,
      '--docs',
      docsDir
    ]);
    
    // Verify the command failed
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('title');
    
    // Verify the file was not created
    const documentPath = path.join(testBranchDir, documentName);
    expect(fs.existsSync(documentPath)).toBe(false);
  });
  
  // Test error handling for invalid path
  test('should fail with invalid document path', async () => {
    const result = await runCli([
      'json',
      'create',
      '../outside-docs.json',
      '--title',
      'Invalid Path',
      '--content',
      JSON.stringify(testJsonContent),
      '--docs',
      docsDir
    ]);
    
    // Verify the error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('invalid');
  });
  
  // Test creating a nested document path
  test('should create document in nested directory structure', async () => {
    const nestedPath = 'nested/directory/document.json';
    const content = JSON.stringify(testJsonContent);
    
    const result = await runCliSuccessful([
      'json',
      'create',
      nestedPath,
      '--branch',
      testBranchName,
      '--title',
      'Nested Document',
      '--content',
      content,
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    
    // Verify the nested directories and file were created
    const documentPath = path.join(testBranchDir, nestedPath);
    expect(fs.existsSync(documentPath)).toBe(true);
  });
});
