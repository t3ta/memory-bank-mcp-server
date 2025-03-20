/**
 * E2E tests for the json delete command
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
  assertFileNotExists
} from '../../helpers/test-utils';

// Test suite configuration
let testDir: string;
let docsDir: string;
let globalDir: string;
let branchDir: string;
let testBranchDir: string;

// Setup before each test
beforeEach(() => {
  testDir = createTempTestDir('json-delete');
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

describe('Memory Bank CLI - json delete command', () => {
  test('should delete a JSON document from global memory bank with force flag', async () => {
    const documentName = 'delete-test.json';
    
    // Create a test document
    const documentContent = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'delete-test-id',
        title: 'Delete Test Document',
        documentType: 'test',
        path: documentName,
        tags: ['test', 'delete'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        message: 'This document will be deleted'
      }
    };
    
    // Write the document to delete
    const documentPath = path.join(globalDir, documentName);
    fs.writeFileSync(documentPath, JSON.stringify(documentContent, null, 2), 'utf8');
    
    // Verify the file exists before deletion
    assertFileExists(documentPath);
    
    // Run the delete command with force flag to skip confirmation
    const result = await runCliSuccessful([
      'json', 
      'delete', 
      documentName,
      '--force',
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('deleted successfully');
    
    // Verify the file no longer exists
    assertFileNotExists(documentPath);
  });

  test('should delete a JSON document from branch memory bank with force flag', async () => {
    const documentName = 'branch-delete-test.json';
    const branchName = 'feature/test-branch';
    
    // Create a test document in the branch
    const documentContent = {
      schema: 'memory_document_v2',
      metadata: {
        id: 'branch-delete-id',
        title: 'Branch Delete Test',
        documentType: 'test',
        path: documentName,
        tags: ['branch', 'delete'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        branch: true,
        message: 'This branch document will be deleted'
      }
    };
    
    // Write the document to the branch
    const documentPath = path.join(testBranchDir, documentName);
    fs.writeFileSync(documentPath, JSON.stringify(documentContent, null, 2), 'utf8');
    
    // Verify the file exists before deletion
    assertFileExists(documentPath);
    
    // Run the delete command with branch option and force flag
    const result = await runCliSuccessful([
      'json', 
      'delete', 
      documentName,
      '--branch', 
      branchName,
      '--force',
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain(`branch ${branchName}`);
    expect(result.stdout).toContain('deleted successfully');
    
    // Verify the file no longer exists
    assertFileNotExists(documentPath);
  });

  test('should fail when trying to delete a non-existent document', async () => {
    const nonExistentDocumentName = 'non-existent.json';
    
    // Run the delete command for a non-existent document
    const result = await runCli([
      'json', 
      'delete', 
      nonExistentDocumentName,
      '--force',
      '--docs', 
      docsDir
    ]);
    
    // Verify the error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('not found');
  });

  test('should fail with invalid document path', async () => {
    // Run the delete command with an invalid path
    const result = await runCli([
      'json', 
      'delete', 
      '../outside-docs.json',
      '--force',
      '--docs', 
      docsDir
    ]);
    
    // Verify the error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('invalid');
  });

  test('should delete document by ID', async () => {
    const documentName = 'id-delete-test.json';
    const documentId = 'unique-test-id-for-deletion';
    
    // Create a test document with a specific ID
    const documentContent = {
      schema: 'memory_document_v2',
      metadata: {
        id: documentId,
        title: 'ID Delete Test',
        documentType: 'test',
        path: documentName,
        tags: ['id', 'delete'],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1
      },
      content: {
        message: 'This document will be deleted by ID'
      }
    };
    
    // Write the document
    const documentPath = path.join(globalDir, documentName);
    fs.writeFileSync(documentPath, JSON.stringify(documentContent, null, 2), 'utf8');
    
    // Verify the file exists before deletion
    assertFileExists(documentPath);
    
    // Run the delete command with ID instead of path
    const result = await runCliSuccessful([
      'json', 
      'delete', 
      '--id', 
      documentId,
      '--force',
      '--docs', 
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Verify the file no longer exists
    assertFileNotExists(documentPath);
  });

  // Note: We can't easily test the interactive confirmation in an E2E test,
  // as it would require simulating user input. This is typically handled by
  // mocking the readline interface, but for E2E tests we use the --force flag
  // to bypass the confirmation prompt.
});
