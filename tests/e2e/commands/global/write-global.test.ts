/**
 * E2E tests for the write-global command
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
let globalDir: string;
let inputDir: string;

// Setup before each test
beforeEach(() => {
  testDir = createTempTestDir('write-global');
  const dirs = createDocsStructure(testDir);
  docsDir = dirs.docsDir;
  globalDir = dirs.globalDir;

  // Create a directory for input files
  inputDir = path.join(testDir, 'input');
  fs.mkdirSync(inputDir, { recursive: true });
});

// Cleanup after each test
afterEach(() => {
  deleteTempDir(testDir);
});

describe('Memory Bank CLI - write-global command', () => {
  // Test writing content directly
  test('should write content to a JSON document in global memory bank', async () => {
    const content = '{"schema": "value", "metadata": "value", "content": {"key": "value", "nested": {"key": "nested-value"}}}';
    const documentName = 'test-direct-content.json';

    // Run the command with content
    const result = await runCliSuccessful([
      'write-global',
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
    const documentPath = path.join(globalDir, documentName);
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
  test('should write content from an input file to global memory bank', async () => {
    const content = '{"content": {"message": "This content comes from an input file", "array": [1, 2, 3]}}';
    const inputPath = path.join(inputDir, 'input-file.json');
    const documentName = 'from-file.json';

    // Create the input file
    fs.writeFileSync(inputPath, content, 'utf8');

    // Run the command with file input
    const result = await runCliSuccessful([
      'write-global',
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
    const documentPath = path.join(globalDir, documentName);
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
      'write-global',
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
    const documentPath = path.join(globalDir, documentName);
    expect(fs.existsSync(documentPath)).toBe(false);
  });

  // Test writing JSON content
  test('should write JSON content to global memory bank', async () => {
    const content = JSON.stringify({
      schema: 'memory_document_v2',
      metadata: {
        id: 'test-json',
      },
      content: {
        message: 'This is JSON content',
        nested: {
          value: 42
        }
      }
    });
    const documentName = 'test-json.json';

    // Run the command with JSON content
    const result = await runCliSuccessful([
      'write-global',
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
    const documentPath = path.join(globalDir, documentName);
    assertFileExists(documentPath);

    // Parse the JSON content to verify structure
    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);

    // Verify it follows the memory document schema
    expect(parsedContent.schema).toBeDefined();
    expect(parsedContent.metadata).toBeDefined();
    expect(parsedContent.content).toBeDefined();

    // Verify the actual content
    expect(parsedContent.content.message).toBe('This is JSON content');
    expect(parsedContent.content.nested.value).toBe(42);
  });

  // Test writing with metadata
  test('should write document with specified metadata', async () => {
    const content = '{"metadata": {"title": "Custom Title", "tags": ["test", "metadata", "custom]}}';
    const documentName = 'with-metadata.json';
    const title = 'Custom Title';
    const tags = 'test,metadata,custom';

    // Run the command with metadata
    const result = await runCliSuccessful([
      'write-global',
      documentName,
      '--content',
      content,
      '--title',
      title,
      '--tags',
      tags,
      '--docs',
      docsDir
    ]);

    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');

    const documentPath = path.join(globalDir, documentName);
    assertFileExists(documentPath);

    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);

    expect(parsedContent.metadata.title).toBe(title);
    expect(parsedContent.metadata.tags).toEqual(tags.split(','));
  });

  // Test error handling with invalid path
  test('should fail with invalid document path', async () => {
    // Run the command with an invalid path (contains directory traversal)
    const result = await runCli([
      'write-global',
      '../outside-docs.json',
      '--content',
      '{"invalid": "path"}',
      '--docs',
      docsDir
    ]);

    // Verify the error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('[ERROR]');
  });

  // Test error handling with missing content and file
  test('should fail when neither content nor file is provided', async () => {
    // Run the command without content or file
    const result = await runCli([
      'write-global',
      'missing-content.json',
      '--docs',
      docsDir
    ]);

    // Verify the error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('content or file');
  }); // Error: CLI command timed out after 10000msJest

  // Test overwriting existing document
  test('should overwrite existing document when forced', async () => {
    const originalContent = '{"original": true}';
    const newContent = '{"content": {"new": true}}';
    const documentName = 'overwrite-test.json';

    // Create the original document
    const documentPath = path.join(globalDir, documentName);

    // Create a valid JSON document
    const originalDoc = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'original-id',
        title: 'Original Document',
        documentType: 'test',
        path: documentName,
        tags: ['original'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: JSON.parse(originalContent)
    };
    fs.writeFileSync(documentPath, JSON.stringify(originalDoc, null, 2), 'utf8');

    // Run the command with force flag
    const result = await runCliSuccessful([
      'write-global',
      documentName,
      '--content',
      newContent,
      '--force',
      '--docs',
      docsDir
    ]);

    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');

    // Verify the file was overwritten with the new content
    assertFileExists(documentPath);

    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    expect(parsedContent.content.new).toBe(true);
    expect(parsedContent.content.original).toBeUndefined();
  });

  // Test creating directories automatically
  test('should create directories as needed', async () => {
    const content = '{"content": {"nested": true, "directory": "test"}}';
    const documentName = 'nested/directory/document.json';

    // Run the command with a nested path
    const result = await runCliSuccessful([
      'write-global',
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
    const documentPath = path.join(globalDir, documentName);
    assertFileExists(documentPath);

    // Check content
    const fileContent = fs.readFileSync(documentPath, 'utf8');
    const parsedContent = JSON.parse(fileContent);
    expect(parsedContent.content.nested).toBe(true);
  });
});
