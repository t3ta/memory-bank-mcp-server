/**
 * E2E tests for the read-global command
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

// Test suite configuration
let testDir: string;
let docsDir: string;
let globalDir: string;

// Setup before each test
beforeEach(() => {
  testDir = createTempTestDir('read-global');
  const dirs = createDocsStructure(testDir);
  docsDir = dirs.docsDir;
  globalDir = dirs.globalDir;
});

// Cleanup after each test
afterEach(() => {
  deleteTempDir(testDir);
});

describe('Memory Bank CLI - read-global command', () => {
  // Test reading a markdown document
  test('should read a markdown document from global memory bank', async () => {
    // Create a test document
    const documentContent = '# Test Document\n\nThis is a test document.';
    const documentPath = createTestDocument(globalDir, 'test-document.md', documentContent);
    
    // Run the command
    const result = await runCliSuccessful([
      'read-global', 
      'test-document.md', 
      '--docs', 
      docsDir
    ]);
    
    // Verify the output
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain(documentContent);
    expect(result.stderr).toBe('');
  });

  // Test reading a JSON document
  test('should read a JSON document from global memory bank', async () => {
    // Create a test JSON document
    const documentData = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'test-json',
        title: 'Test JSON Document',
        documentType: 'document',
        path: 'test-document.json',
        tags: ['test'],
        lastModified: '2025-03-21T12:00:00Z',
        createdAt: '2025-03-21T12:00:00Z',
        version: 1
      },
      content: {
        key: 'value',
        nested: {
          key: 'nested-value'
        }
      }
    };
    const documentPath = createTestJsonDocument(
      globalDir, 
      'test-document.json', 
      documentData
    );
    
    // Run the command
    const result = await runCliSuccessful([
      'read-global', 
      'test-document.json', 
      '--docs', 
      docsDir
    ]);
    
    // Verify the output
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('test-json');
    expect(result.stdout).toContain('Test JSON Document');
    expect(result.stderr).toBe('');
  });

  // Test reading a non-existent document
  test('should fail when document does not exist', async () => {
    // Run the command
    const result = await runCli([
      'read-global', 
      'non-existent-document.md', 
      '--docs', 
      docsDir
    ]);
    
    // Verify the error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('not found');
  });

  // Test reading with invalid path
  test('should fail with invalid document path', async () => {
    // Run the command with an invalid path (contains directory traversal)
    const result = await runCli([
      'read-global', 
      '../outside-docs.md', 
      '--docs', 
      docsDir
    ]);
    
    // Verify the error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('invalid');
  });

  // Test reading a document with pretty formatting
  test('should format JSON output with pretty flag', async () => {
    // Create a test JSON document
    const documentData = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'test-pretty-json',
        title: 'Test Pretty JSON',
        documentType: 'document',
        path: 'pretty-test.json',
        tags: ['test', 'pretty'],
        lastModified: '2025-03-21T12:30:00Z',
        createdAt: '2025-03-21T12:30:00Z',
        version: 1
      },
      content: {
        message: 'This should be pretty-printed'
      }
    };
    const documentPath = createTestJsonDocument(
      globalDir, 
      'pretty-test.json', 
      documentData
    );
    
    // Run the command with pretty flag
    const result = await runCliSuccessful([
      'read-global', 
      'pretty-test.json', 
      '--docs', 
      docsDir,
      '--pretty'
    ]);
    
    // Verify the pretty-formatted output
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('  "message"');
    expect(result.stdout).toContain('This should be pretty-printed');
    expect(result.stderr).toBe('');
  });
});
