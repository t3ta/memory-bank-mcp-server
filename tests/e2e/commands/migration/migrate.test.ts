/**
 * E2E tests for the migrate command
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
let branchesDir: string;
let testBranchDir: string;
let globalDir: string;

// Branch name for testing
const testBranchName = 'feature-migrate-test';

// Test document content
const branchContextMd = `# Branch Context

## Purpose
This is a test branch context document.

## Background
This document is for testing the migrate command.
`;

const activeContextMd = `# Active Context

## Current Work
This is a test active context document.

## Recent Changes
- Added migration test files
- Updated documentation
`;

const progressMd = `# Progress

## Current State
This is a test progress document.

## Known Issues
- None at the moment
`;

const systemPatternsMd = `# System Patterns

## Technical Decisions
This is a test system patterns document.

## Directory Structure
- Standard structure is used
`;

const genericMd = `# Generic Document

tags: #test #migration #e2e

This is a generic test document.
`;

// Setup before each test
beforeEach(() => {
  testDir = createTempTestDir('migrate');
  const dirs = createDocsStructure(testDir);
  docsDir = dirs.docsDir;
  globalDir = dirs.globalDir;
  branchesDir = dirs.branchDir;
  
  // Create test branch directory
  testBranchDir = path.join(branchesDir, testBranchName);
  fs.mkdirSync(testBranchDir, { recursive: true });
  
  // Create markdown test files in branch
  createTestDocument(testBranchDir, 'branchContext.md', branchContextMd);
  createTestDocument(testBranchDir, 'activeContext.md', activeContextMd);
  createTestDocument(testBranchDir, 'progress.md', progressMd);
  createTestDocument(testBranchDir, 'systemPatterns.md', systemPatternsMd);
  
  // Create a nested document
  const nestedDir = path.join(testBranchDir, 'nested');
  fs.mkdirSync(nestedDir, { recursive: true });
  createTestDocument(nestedDir, 'nested-document.md', genericMd);
  
  // Create markdown test files in global
  createTestDocument(globalDir, 'global-document.md', genericMd);
});

// Cleanup after each test
afterEach(() => {
  deleteTempDir(testDir);
});

describe('Memory Bank CLI - migrate command', () => {
  // Test migrating all files in a directory
  test('should migrate all Markdown files in a directory', async () => {
    const result = await runCliSuccessful([
      'migrate',
      '--directory',
      testBranchDir,
      '--backup',
      'false', // Disable backup for tests
      '--verbose',
      'true'
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Check output for migration success message
    const output = result.stdout;
    expect(output).toContain('Migration completed successfully');
    
    // Check that JSON files were created for each Markdown file
    expect(fs.existsSync(path.join(testBranchDir, 'branchContext.json'))).toBe(true);
    expect(fs.existsSync(path.join(testBranchDir, 'activeContext.json'))).toBe(true);
    expect(fs.existsSync(path.join(testBranchDir, 'progress.json'))).toBe(true);
    expect(fs.existsSync(path.join(testBranchDir, 'systemPatterns.json'))).toBe(true);
    expect(fs.existsSync(path.join(testBranchDir, 'nested', 'nested-document.json'))).toBe(true);
    
    // Check the content of a migrated file
    const branchContextJson = JSON.parse(fs.readFileSync(
      path.join(testBranchDir, 'branchContext.json'), 
      'utf8'
    ));
    
    // Check schema and metadata
    expect(branchContextJson.schema).toBeDefined();
    expect(branchContextJson.metadata).toBeDefined();
    expect(branchContextJson.metadata.documentType).toBe('branch_context');
    
    // Check content from the original markdown
    expect(branchContextJson.content).toBeDefined();
    expect(branchContextJson.content.purpose).toContain('test branch context');
    expect(branchContextJson.content.background).toContain('testing the migrate command');
  });
  
  // Test migrating a specific file
  test('should migrate a specific Markdown file', async () => {
    const specificFile = path.join(testBranchDir, 'progress.md');
    
    const result = await runCliSuccessful([
      'migrate',
      '--directory',
      testBranchDir,
      '--file',
      specificFile,
      '--backup',
      'false'
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    
    // Check that only the specified file was migrated
    expect(fs.existsSync(path.join(testBranchDir, 'progress.json'))).toBe(true);
    
    // Check that other files were not migrated
    expect(fs.existsSync(path.join(testBranchDir, 'branchContext.json'))).toBe(false);
    expect(fs.existsSync(path.join(testBranchDir, 'activeContext.json'))).toBe(false);
    
    // Check the content of the migrated file
    const progressJson = JSON.parse(fs.readFileSync(
      path.join(testBranchDir, 'progress.json'), 
      'utf8'
    ));
    
    expect(progressJson.metadata.documentType).toBe('progress');
    expect(progressJson.content.currentState).toContain('test progress document');
  });
  
  // Test overwriting existing JSON files
  test('should overwrite existing JSON files when enabled', async () => {
    // First, create an existing JSON file with different content
    const existingJsonContent = {
      schema: "memory_document_v1",
      metadata: {
        title: "Existing JSON",
        documentType: "generic",
        path: "activeContext.json",
        tags: ["existing"],
        lastModified: new Date().toISOString()
      },
      content: {
        message: "This is an existing JSON document that should be overwritten"
      }
    };
    
    fs.writeFileSync(
      path.join(testBranchDir, 'activeContext.json'),
      JSON.stringify(existingJsonContent, null, 2),
      'utf8'
    );
    
    // Run migration with overwrite
    const result = await runCliSuccessful([
      'migrate',
      '--directory',
      testBranchDir,
      '--backup',
      'false',
      '--overwrite',
      'true'
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    
    // Check that the file was overwritten with new content
    const overwrittenJson = JSON.parse(fs.readFileSync(
      path.join(testBranchDir, 'activeContext.json'), 
      'utf8'
    ));
    
    // Should match the new content, not the existing content
    expect(overwrittenJson.metadata.documentType).toBe('active_context');
    expect(overwrittenJson.content).not.toEqual(existingJsonContent.content);
    expect(overwrittenJson.content.currentWork).toContain('test active context document');
  });
  
  // Test skipping existing JSON files
  test('should skip existing JSON files by default', async () => {
    // First, create an existing JSON file with different content
    const existingJsonContent = {
      schema: "memory_document_v1",
      metadata: {
        title: "Existing JSON",
        documentType: "generic",
        path: "progress.json",
        tags: ["existing"],
        lastModified: new Date().toISOString()
      },
      content: {
        message: "This is an existing JSON document that should NOT be overwritten"
      }
    };
    
    fs.writeFileSync(
      path.join(testBranchDir, 'progress.json'),
      JSON.stringify(existingJsonContent, null, 2),
      'utf8'
    );
    
    // Run migration without overwrite flag
    const result = await runCliSuccessful([
      'migrate',
      '--directory',
      testBranchDir,
      '--backup',
      'false'
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    
    // Check that the file was not overwritten
    const preservedJson = JSON.parse(fs.readFileSync(
      path.join(testBranchDir, 'progress.json'), 
      'utf8'
    ));
    
    // Should match the existing content, not be overwritten
    expect(preservedJson.metadata.documentType).toBe('generic');
    expect(preservedJson.content.message).toContain('should NOT be overwritten');
    expect(preservedJson.content.currentState).toBeUndefined();
  });
  
  // Test deleting original files
  test('should delete original markdown files when deleteOriginals is enabled', async () => {
    const result = await runCliSuccessful([
      'migrate',
      '--directory',
      testBranchDir,
      '--backup',
      'false',
      '--deleteOriginals',
      'true'
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    
    // Check that JSON files were created
    expect(fs.existsSync(path.join(testBranchDir, 'branchContext.json'))).toBe(true);
    expect(fs.existsSync(path.join(testBranchDir, 'activeContext.json'))).toBe(true);
    
    // Check that original markdown files were deleted
    expect(fs.existsSync(path.join(testBranchDir, 'branchContext.md'))).toBe(false);
    expect(fs.existsSync(path.join(testBranchDir, 'activeContext.md'))).toBe(false);
    expect(fs.existsSync(path.join(testBranchDir, 'progress.md'))).toBe(false);
    expect(fs.existsSync(path.join(testBranchDir, 'systemPatterns.md'))).toBe(false);
  });
  
  // Test backup creation (more difficult to test in E2E)
  test('should work with backup enabled', async () => {
    const result = await runCliSuccessful([
      'migrate',
      '--directory',
      testBranchDir,
      '--backup',
      'true'
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    
    // We can't easily check for the backup location in E2E tests
    // but we can verify the operation completed successfully
    expect(result.stdout).toContain('Migration completed successfully');
    expect(result.stdout).toContain('Backup created');
  });
});
