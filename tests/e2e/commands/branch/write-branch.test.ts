/**
 * E2E tests for the write-branch command
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
  assertFileExists,
  assertFileContent,
  assertJsonFileProperties
} from '../../helpers/test-utils';

// Test suite configuration
let testDir: string;
let docsDir: string;
let branchesDir: string;
let testBranchDir: string;
let inputDir: string;

// Branch name for testing
const testBranchName = 'feature/test-branch';
const normalizedBranchName = 'feature-test-branch';

// Setup before each test
beforeEach(() => {
  testDir = createTempTestDir('write-branch');
  const dirs = createDocsStructure(testDir);
  docsDir = dirs.docsDir;
  branchesDir = dirs.branchDir;
  
  // Create test branch directory
  testBranchDir = path.join(branchesDir, normalizedBranchName);
  fs.mkdirSync(testBranchDir, { recursive: true });
  
  // Create a directory for input files
  inputDir = path.join(testDir, 'input');
  fs.mkdirSync(inputDir, { recursive: true });
});

// Cleanup after each test
afterEach(() => {
  deleteTempDir(testDir);
});

describe('Memory Bank CLI - write-branch command', () => {
  // Test writing content directly
  test('should write content to a JSON document in branch memory bank', async () => {
    const content = '{"key": "value", "nested": {"key": "nested-value"}}';
    const documentName = 'test-direct-content.json';
    
    // Run the command with content
    const result = await runCliSuccessful([
      'write-branch', 
      testBranchName,
      documentName, 
      '--content', 
      content,
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the file was created with the correct content
    const documentPath = path.join(testBranchDir, documentName);
    assertFileExists(documentPath);
    
    // For JSON files, verify proper structure
    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    
    // Check that it's a proper memory document
    expect(parsedContent.schema).toBeDefined();
    expect(parsedContent.metadata).toBeDefined();
    expect(parsedContent.content).toBeDefined();
    
    // Check the actual content
    expect(parsedContent.content.key).toBe('value');
    expect(parsedContent.content.nested.key).toBe('nested-value');
  });

  // Test writing from a file
  test('should write content from an input file to branch memory bank', async () => {
    const content = '{"message": "This content comes from an input file", "array": [1, 2, 3]}';
    const inputPath = path.join(inputDir, 'input-file.json');
    const documentName = 'from-file.json';
    
    // Create the input file
    fs.writeFileSync(inputPath, content, 'utf8');
    
    // Run the command with file input
    const result = await runCliSuccessful([
      'write-branch', 
      testBranchName,
      documentName, 
      '--file', 
      inputPath,
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the file was created with the correct content
    const documentPath = path.join(testBranchDir, documentName);
    assertFileExists(documentPath);
    
    // For JSON files, verify content
    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    
    expect(parsedContent.content.message).toBe('This content comes from an input file');
    expect(parsedContent.content.array).toEqual([1, 2, 3]);
  });

  // Test writing to Markdown is not allowed
  test('should fail when trying to write to a Markdown file', async () => {
    const content = '# Test Document\n\nThis is a test document content.';
    const documentName = 'test-markdown.md';
    
    // Run the command with content to a markdown file
    const result = await runCli([
      'write-branch', 
      testBranchName,
      documentName, 
      '--content', 
      content,
      '--docs', 
      docsDir
    ]);
    
    // Verify the command failed
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Writing to Markdown files is disabled');
    expect(result.stderr).toContain('.json');
    
    // Verify the file was not created
    const documentPath = path.join(testBranchDir, documentName);
    expect(fs.existsSync(documentPath)).toBe(false);
  });

  // Test error handling with invalid path
  test('should fail with invalid document path', async () => {
    // Run the command with an invalid path (contains directory traversal)
    const result = await runCli([
      'write-branch', 
      testBranchName,
      '../outside-docs.json', 
      '--content',
      '{"invalid": "path"}',
      '--docs', 
      docsDir
    ]);
    
    // Verify the error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('invalid');
  });

  // Test error handling with missing content and file
  test('should fail when neither content nor file is provided', async () => {
    // Run the command without content or file
    const result = await runCli([
      'write-branch', 
      testBranchName,
      'missing-content.json', 
      '--docs', 
      docsDir
    ]);
    
    // Verify the error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('content');
  });

  // Test creating directories automatically
  test('should create directories as needed', async () => {
    const content = '{"nested": true, "directory": "test"}';
    const documentName = 'nested/directory/document.json';
    
    // Run the command with a nested path
    const result = await runCliSuccessful([
      'write-branch', 
      testBranchName,
      documentName, 
      '--content', 
      content,
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the directory and file were created
    const documentPath = path.join(testBranchDir, documentName);
    assertFileExists(documentPath);
    
    // Check content
    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    expect(parsedContent.content.nested).toBe(true);
  });
});
