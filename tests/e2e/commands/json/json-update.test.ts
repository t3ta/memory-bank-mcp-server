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
  testDir = createTempTestDir('json-update');
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

describe.skip('Memory Bank CLI - json update command', () => {
  test('should update a JSON document title in global memory bank', async () => {
    const documentName = 'update-title-test.json';
    const initialTitle = 'Initial Title';
    const updatedTitle = 'Updated Title';
    
    // Create an initial document
    const initialDocument = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'update-test-id',
        title: initialTitle,
        documentType: 'test',
        path: documentName,
        tags: ['test', 'update'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        message: 'This document will be updated'
      }
    };
    
    // Write the initial document
    const documentPath = path.join(globalDir, documentName);
    fs.writeFileSync(documentPath, JSON.stringify(initialDocument, null, 2), 'utf8');
    
    // Run the update command to update the title
    const result = await runCliSuccessful([
      'json', 
      'update', 
      documentName,
      '--title', 
      updatedTitle,
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('updated successfully');
    
    // Verify the document was updated correctly
    assertJsonFileProperties(documentPath, {
      metadata: {
        title: updatedTitle,
        // These should remain unchanged
        id: 'update-test-id',
        documentType: 'test'
      },
      content: {
        message: 'This document will be updated'
      }
    });
  });

  test('should update JSON document content in global memory bank', async () => {
    const documentName = 'update-content-test.json';
    
    // Create an initial document
    const initialDocument = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'content-update-id',
        title: 'Content Update Test',
        documentType: 'test',
        path: documentName,
        tags: ['test', 'content'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        original: true,
        message: 'Original content',
        count: 1
      }
    };
    
    // Write the initial document
    const documentPath = path.join(globalDir, documentName);
    fs.writeFileSync(documentPath, JSON.stringify(initialDocument, null, 2), 'utf8');
    
    // New content to update
    const updatedContent = JSON.stringify({
      original: false,
      message: 'Updated content',
      count: 2,
      newField: 'Added in update'
    });
    
    // Run the update command to update the content
    const result = await runCliSuccessful([
      'json', 
      'update', 
      documentName,
      '--content', 
      updatedContent,
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the document content was updated
    assertJsonFileProperties(documentPath, {
      metadata: {
        // Metadata should remain unchanged
        id: 'content-update-id',
        title: 'Content Update Test',
        documentType: 'test'
      },
      content: {
        original: false,
        message: 'Updated content',
        count: 2,
        newField: 'Added in update'
      }
    });
  });

  test('should update JSON document in branch memory bank', async () => {
    const documentName = 'branch-update-test.json';
    const branchName = 'feature/test-branch';
    
    // Create an initial document in the branch
    const initialDocument = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'branch-update-id',
        title: 'Branch Update Test',
        documentType: 'test',
        path: documentName,
        tags: ['branch', 'update'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        branch: true,
        message: 'Branch document'
      }
    };
    
    // Write the initial document
    const documentPath = path.join(testBranchDir, documentName);
    fs.writeFileSync(documentPath, JSON.stringify(initialDocument, null, 2), 'utf8');
    
    // Updated values
    const updatedTitle = 'Updated Branch Document';
    const updatedTags = 'branch,update,modified';
    
    // Run the update command
    const result = await runCliSuccessful([
      'json', 
      'update', 
      documentName,
      '--branch', 
      branchName,
      '--title', 
      updatedTitle,
      '--tags', 
      updatedTags,
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('updated successfully');
    expect(result.stdout).toContain(`branch ${branchName}`);
    
    // Verify the document was updated correctly
    assertJsonFileProperties(documentPath, {
      metadata: {
        title: updatedTitle,
        tags: updatedTags.split(',')
      },
      content: {
        branch: true,
        message: 'Branch document'
      }
    });
  });

  test('should update document type', async () => {
    const documentName = 'type-update-test.json';
    const initialType = 'generic';
    const updatedType = 'activeContext';
    
    // Create an initial document
    const initialDocument = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'type-update-id',
        title: 'Type Update Test',
        documentType: initialType,
        path: documentName,
        tags: ['test', 'type'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        message: 'Document type will be updated'
      }
    };
    
    // Write the initial document
    const documentPath = path.join(globalDir, documentName);
    fs.writeFileSync(documentPath, JSON.stringify(initialDocument, null, 2), 'utf8');
    
    // Run the update command to change the document type
    const result = await runCliSuccessful([
      'json', 
      'update', 
      documentName,
      '--type', 
      updatedType,
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the document type was updated
    assertJsonFileProperties(documentPath, {
      metadata: {
        documentType: updatedType
      }
    });
  });

  test('should update multiple properties at once', async () => {
    const documentName = 'multi-update-test.json';
    
    // Create an initial document
    const initialDocument = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'multi-update-id',
        title: 'Multi Update Test',
        documentType: 'generic',
        path: documentName,
        tags: ['test', 'multi'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        message: 'Original content'
      }
    };
    
    // Write the initial document
    const documentPath = path.join(globalDir, documentName);
    fs.writeFileSync(documentPath, JSON.stringify(initialDocument, null, 2), 'utf8');
    
    // Updated values
    const updatedTitle = 'Multi Properties Updated';
    const updatedType = 'systemPatterns';
    const updatedTags = 'test,multi,updated';
    const updatedContent = JSON.stringify({
      message: 'Updated content',
      extra: 'New field'
    });
    
    // Run the update command with multiple properties
    const result = await runCliSuccessful([
      'json', 
      'update', 
      documentName,
      '--title', 
      updatedTitle,
      '--type', 
      updatedType,
      '--tags', 
      updatedTags,
      '--content', 
      updatedContent,
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify all properties were updated
    assertJsonFileProperties(documentPath, {
      metadata: {
        title: updatedTitle,
        documentType: updatedType,
        tags: updatedTags.split(',')
      },
      content: {
        message: 'Updated content',
        extra: 'New field'
      }
    });
  });

  test('should fail when document does not exist', async () => {
    // Run the update command for a non-existent document
    const result = await runCli([
      'json', 
      'update', 
      'non-existent.json',
      '--title', 
      'Will Fail',
      '--docs', 
      docsDir
    ]);
    
    // Verify the error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('not found');
  });

  test('should fail with invalid JSON content', async () => {
    const documentName = 'invalid-content-test.json';
    
    // Create an initial document
    const initialDocument = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'invalid-content-id',
        title: 'Invalid Content Test',
        documentType: 'test',
        path: documentName,
        tags: ['test', 'invalid'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        valid: true
      }
    };
    
    // Write the initial document
    const documentPath = path.join(globalDir, documentName);
    fs.writeFileSync(documentPath, JSON.stringify(initialDocument, null, 2), 'utf8');
    
    // Invalid JSON content
    const invalidContent = '{ "broken": "json, missing quote }';
    
    // Run the update command with invalid content
    const result = await runCli([
      'json', 
      'update', 
      documentName,
      '--content', 
      invalidContent,
      '--docs', 
      docsDir
    ]);
    
    // Verify the error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Invalid JSON');
    
    // Verify the document was not modified
    assertJsonFileProperties(documentPath, {
      content: {
        valid: true
      }
    });
  });

  test('should update from file input', async () => {
    const documentName = 'file-update-test.json';
    const inputFileName = 'updated-content.json';
    
    // Create an initial document
    const initialDocument = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'file-update-id',
        title: 'File Update Test',
        documentType: 'test',
        path: documentName,
        tags: ['test', 'file'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        fromFile: false,
        original: true
      }
    };
    
    // Write the initial document
    const documentPath = path.join(globalDir, documentName);
    fs.writeFileSync(documentPath, JSON.stringify(initialDocument, null, 2), 'utf8');
    
    // Create a file with updated content
    const updatedContent = {
      fromFile: true,
      original: false,
      importedFrom: 'file'
    };
    const inputFilePath = path.join(testDir, inputFileName);
    fs.writeFileSync(inputFilePath, JSON.stringify(updatedContent, null, 2), 'utf8');
    
    // Run the update command with file input
    const result = await runCliSuccessful([
      'json', 
      'update', 
      documentName,
      '--file', 
      inputFilePath,
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the document was updated from file
    assertJsonFileProperties(documentPath, {
      content: updatedContent
    });
  });

  // Additional test: Preserves unmodified properties
  test('should preserve unmodified properties', async () => {
    const documentName = 'preserve-props-test.json';
    const initialTitle = 'Initial Title';
    const initialType = 'test';
    const initialTags = ['preserve', 'test'];
    
    // Create an initial document with specific properties
    const initialDocument = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'preserve-props-id',
        title: initialTitle,
        documentType: initialType,
        path: documentName,
        tags: initialTags,
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        field1: 'Value 1',
        field2: 'Value 2',
        nested: {
          property: 'Nested value'
        }
      }
    };
    
    // Write the initial document
    const documentPath = path.join(globalDir, documentName);
    fs.writeFileSync(documentPath, JSON.stringify(initialDocument, null, 2), 'utf8');
    
    // Only update one field in content
    const partialContent = JSON.stringify({
      field1: 'Updated Value 1'
    });
    
    // Run the update command
    const result = await runCliSuccessful([
      'json', 
      'update', 
      documentName,
      '--content', 
      partialContent,
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    
    // Read the updated document
    const updatedContent = fs.readFileSync(documentPath, 'utf8');
    const updatedDocument = JSON.parse(updatedContent);
    
    // Verify that only the specified field was updated and others preserved
    expect(updatedDocument.metadata.title).toBe(initialTitle);
    expect(updatedDocument.metadata.documentType).toBe(initialType);
    expect(updatedDocument.metadata.tags).toEqual(initialTags);
    
    // For content, the entire object should be replaced
    expect(updatedDocument.content.field1).toBe('Updated Value 1');
    expect(updatedDocument.content.field2).toBeUndefined();
    expect(updatedDocument.content.nested).toBeUndefined();
  });
});
