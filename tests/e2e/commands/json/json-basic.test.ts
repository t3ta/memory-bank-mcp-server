/**
 * E2E tests for basic JSON commands (create and read)
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
  testDir = createTempTestDir('json-commands');
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

describe('Memory Bank CLI - JSON Basic Commands', () => {
  // Test json create command
  describe('json create command', () => {
    test('should create a new JSON document in global memory bank', async () => {
      const documentName = 'test-create.json';
      const title = 'Test Create Document';
      const documentType = 'test_document';
      const tags = 'test,create,json';
      
      // Run the json create command
      const result = await runCliSuccessful([
        'json', 
        'create', 
        documentName,
        '--title', 
        title,
        '--type', 
        documentType,
        '--tags', 
        tags,
        '--docs', 
        docsDir
      ]);
      
      // Verify the command executed successfully
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      
      // Verify the file was created
      const documentPath = path.join(globalDir, documentName);
      assertFileExists(documentPath);
      
      // Verify the document properties
      assertJsonFileProperties(documentPath, {
        schema: 'memory_document_v2',
        metadata: {
          title: title,
          documentType: documentType,
          tags: tags.split(',')
        },
        content: {} // Default empty content
      });
    });

    test('should create a JSON document in a branch memory bank', async () => {
      const documentName = 'branch-test.json';
      const branchName = 'feature/test-branch';
      const title = 'Branch Test Document';
      
      // Run the json create command for a branch
      const result = await runCliSuccessful([
        'json', 
        'create', 
        documentName,
        '--branch', 
        branchName,
        '--title', 
        title,
        '--docs', 
        docsDir
      ]);
      
      // Verify the command executed successfully
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      
      // Verify the file was created in the branch directory
      const documentPath = path.join(testBranchDir, documentName);
      assertFileExists(documentPath);
      
      // Verify the document properties
      assertJsonFileProperties(documentPath, {
        schema: 'memory_document_v2',
        metadata: {
          title: title
        }
      });
    });

    test('should create a JSON document with initial content', async () => {
      const documentName = 'with-content.json';
      const title = 'Content Test';
      const initialContent = JSON.stringify({
        message: 'Initial content',
        value: 42
      });
      
      // Run the json create command with content
      const result = await runCliSuccessful([
        'json', 
        'create', 
        documentName,
        '--title', 
        title,
        '--content', 
        initialContent,
        '--docs', 
        docsDir
      ]);
      
      // Verify the command executed successfully
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      
      // Verify the file was created
      const documentPath = path.join(globalDir, documentName);
      assertFileExists(documentPath);
      
      // Verify the document content
      const fileContent = fs.readFileSync(documentPath, 'utf8');
      const parsedContent = JSON.parse(fileContent);
      
      expect(parsedContent.content.message).toBe('Initial content');
      expect(parsedContent.content.value).toBe(42);
    });

    test('should fail with invalid document name', async () => {
      // Run the command with an invalid path
      const result = await runCli([
        'json', 
        'create', 
        '../invalid-path.json',
        '--docs', 
        docsDir
      ]);
      
      // Verify the error output
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('invalid');
    });

    test('should fail when document already exists and no force flag', async () => {
      const documentName = 'existing-doc.json';
      const documentPath = path.join(globalDir, documentName);
      
      // Create an existing document
      const existingDoc = {
        schema: 'memory_document_v2',
        metadata: {
          id: 'existing-id',
          title: 'Existing Document',
          documentType: 'test',
          path: documentName,
          tags: ['existing'],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: {
          existing: true
        }
      };
      fs.writeFileSync(documentPath, JSON.stringify(existingDoc, null, 2), 'utf8');
      
      // Run the command without force flag
      const result = await runCli([
        'json', 
        'create', 
        documentName,
        '--title', 
        'New Title',
        '--docs', 
        docsDir
      ]);
      
      // Verify the error output
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('already exists');
      
      // Verify the document was not changed
      const fileContent = fs.readFileSync(documentPath, 'utf8');
      const parsedContent = JSON.parse(fileContent);
      expect(parsedContent.metadata.title).toBe('Existing Document');
    });

    test('should overwrite document when force flag is used', async () => {
      const documentName = 'force-overwrite.json';
      const documentPath = path.join(globalDir, documentName);
      
      // Create an existing document
      const existingDoc = {
        schema: 'memory_document_v2',
        metadata: {
          id: 'existing-id',
          title: 'Existing Document',
          documentType: 'test',
          path: documentName,
          tags: ['existing'],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: {
          existing: true
        }
      };
      fs.writeFileSync(documentPath, JSON.stringify(existingDoc, null, 2), 'utf8');
      
      // Run the command with force flag
      const newTitle = 'Forced New Title';
      const result = await runCliSuccessful([
        'json', 
        'create', 
        documentName,
        '--title', 
        newTitle,
        '--force',
        '--docs', 
        docsDir
      ]);
      
      // Verify the command executed successfully
      expect(result.exitCode).toBe(0);
      
      // Verify the document was overwritten
      assertJsonFileProperties(documentPath, {
        metadata: {
          title: newTitle
        }
      });
    });
  });

  // Test json read command
  describe('json read command', () => {
    test('should read a JSON document from global memory bank', async () => {
      const documentName = 'test-read.json';
      const documentContent = {
        schema: 'memory_document_v2',
        metadata: {
          id: 'test-read-id',
          title: 'Test Read Document',
          documentType: 'test',
          path: documentName,
          tags: ['test', 'read'],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: {
          message: 'This is a test document for reading',
          value: 123
        }
      };
      
      // Create the test document
      const documentPath = path.join(globalDir, documentName);
      fs.writeFileSync(documentPath, JSON.stringify(documentContent, null, 2), 'utf8');
      
      // Run the json read command
      const result = await runCliSuccessful([
        'json', 
        'read', 
        documentName,
        '--docs', 
        docsDir
      ]);
      
      // Verify the command executed successfully
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      
      // Verify the output contains the document content
      expect(result.stdout).toContain('Test Read Document');
      expect(result.stdout).toContain('This is a test document for reading');
      expect(result.stdout).toContain('123');
    });

    test('should read a JSON document from a branch memory bank', async () => {
      const documentName = 'branch-read.json';
      const branchName = 'feature/test-branch';
      const documentContent = {
        schema: 'memory_document_v2',
        metadata: {
          id: 'branch-read-id',
          title: 'Branch Read Test',
          documentType: 'test',
          path: documentName,
          tags: ['branch', 'read'],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: {
          branch: 'feature/test-branch',
          purpose: 'Testing branch document reading'
        }
      };
      
      // Create the test document in the branch directory
      const documentPath = path.join(testBranchDir, documentName);
      fs.writeFileSync(documentPath, JSON.stringify(documentContent, null, 2), 'utf8');
      
      // Run the json read command for a branch
      const result = await runCliSuccessful([
        'json', 
        'read', 
        documentName,
        '--branch', 
        branchName,
        '--docs', 
        docsDir
      ]);
      
      // Verify the command executed successfully
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      
      // Verify the output contains the branch document content
      expect(result.stdout).toContain('Branch Read Test');
      expect(result.stdout).toContain('Testing branch document reading');
    });

    test('should read only specific fields when using --fields option', async () => {
      const documentName = 'fields-test.json';
      const documentContent = {
        schema: 'memory_document_v2',
        metadata: {
          id: 'fields-test-id',
          title: 'Fields Test Document',
          documentType: 'test',
          path: documentName,
          tags: ['fields', 'test'],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: {
          field1: 'Value 1',
          field2: 'Value 2',
          field3: 'Value 3',
          nested: {
            nestedField1: 'Nested Value 1',
            nestedField2: 'Nested Value 2'
          }
        }
      };
      
      // Create the test document
      const documentPath = path.join(globalDir, documentName);
      fs.writeFileSync(documentPath, JSON.stringify(documentContent, null, 2), 'utf8');
      
      // Run the json read command with fields option
      const result = await runCliSuccessful([
        'json', 
        'read', 
        documentName,
        '--fields', 
        'content.field1,content.nested.nestedField1',
        '--docs', 
        docsDir
      ]);
      
      // Verify the command executed successfully
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      
      // Verify the output contains only the specified fields
      expect(result.stdout).toContain('Value 1');
      expect(result.stdout).toContain('Nested Value 1');
      expect(result.stdout).not.toContain('Value 2');
      expect(result.stdout).not.toContain('Value 3');
      expect(result.stdout).not.toContain('Nested Value 2');
    });

    test('should fail when document does not exist', async () => {
      // Run the command with a non-existent document
      const result = await runCli([
        'json', 
        'read', 
        'non-existent.json',
        '--docs', 
        docsDir
      ]);
      
      // Verify the error output
      expect(result.exitCode).not.toBe(0);
      expect(result.stderr).toContain('not found');
    });

    test('should format output with pretty flag', async () => {
      const documentName = 'pretty-format.json';
      const documentContent = {
        schema: 'memory_document_v2',
        metadata: {
          id: 'pretty-format-id',
          title: 'Pretty Format Test',
          documentType: 'test',
          path: documentName,
          tags: ['pretty', 'format'],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: {
          nested: {
            deeply: {
              nested: {
                value: 'This should be pretty-printed'
              }
            }
          }
        }
      };
      
      // Create the test document
      const documentPath = path.join(globalDir, documentName);
      fs.writeFileSync(documentPath, JSON.stringify(documentContent, null, 2), 'utf8');
      
      // Run the json read command with pretty flag
      const result = await runCliSuccessful([
        'json', 
        'read', 
        documentName,
        '--pretty',
        '--docs', 
        docsDir
      ]);
      
      // Verify the command executed successfully
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      
      // Verify the formatting in the output (indentation, line breaks)
      expect(result.stdout).toContain('  "nested": {');
      expect(result.stdout).toContain('    "deeply": {');
      expect(result.stdout).toContain('      "nested": {');
    });

    test('should read only content when using --content-only flag', async () => {
      const documentName = 'content-only.json';
      const documentContent = {
        schema: 'memory_document_v2',
        metadata: {
          id: 'content-only-id',
          title: 'Content Only Test',
          documentType: 'test',
          path: documentName,
          tags: ['content', 'only'],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: {
          message: 'Only this content should be shown',
          data: [1, 2, 3]
        }
      };
      
      // Create the test document
      const documentPath = path.join(globalDir, documentName);
      fs.writeFileSync(documentPath, JSON.stringify(documentContent, null, 2), 'utf8');
      
      // Run the json read command with content-only flag
      const result = await runCliSuccessful([
        'json', 
        'read', 
        documentName,
        '--content-only',
        '--docs', 
        docsDir
      ]);
      
      // Verify the command executed successfully
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      
      // Verify only the content is in the output
      expect(result.stdout).toContain('Only this content should be shown');
      expect(result.stdout).toContain('[1,2,3]');
      expect(result.stdout).not.toContain('metadata');
      expect(result.stdout).not.toContain('schema');
    });
  });
});
