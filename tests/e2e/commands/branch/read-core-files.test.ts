/**
 * E2E tests for the read-core-files command
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
let branchesDir: string;
let testBranchDir: string;

// Branch name for testing
const testBranchName = 'feature/test-branch';
const normalizedBranchName = 'feature-test-branch';

// Define core file content
const activeContextContent = '# Active Context\n\n## Current Work\n\nThis is the active context file for e2e testing.\n\n## Recent Changes\n\n- Added test files\n- Updated documentation';
const branchContextContent = '# Branch Context\n\n## Purpose\n\nThis branch is created for e2e testing.\n\n## Background\n\nE2E testing is important for verifying CLI functionality.';
const progressContent = '# Progress\n\n## Current State\n\nThis is a test progress file.\n\n## Known Issues\n\n- None at the moment';
const systemPatternsContent = '# System Patterns\n\n## Technical Decisions\n\nThis is a test system patterns file.\n\n## Directory Structure\n\n- Standard structure is used';

// Setup before each test
beforeEach(() => {
  testDir = createTempTestDir('read-core-files');
  const dirs = createDocsStructure(testDir);
  docsDir = dirs.docsDir;
  branchesDir = dirs.branchDir;
  
  // Create test branch directory
  testBranchDir = path.join(branchesDir, normalizedBranchName);
  fs.mkdirSync(testBranchDir, { recursive: true });
  
  // Create core files
  createTestDocument(testBranchDir, 'activeContext.md', activeContextContent);
  createTestDocument(testBranchDir, 'branchContext.md', branchContextContent);
  createTestDocument(testBranchDir, 'progress.md', progressContent);
  createTestDocument(testBranchDir, 'systemPatterns.md', systemPatternsContent);
  
  // Create a non-core file for comparison
  createTestDocument(testBranchDir, 'non-core-file.md', '# Non-core file\n\nThis should not be included in core files.');
});

// Cleanup after each test
afterEach(() => {
  deleteTempDir(testDir);
});

describe('Memory Bank CLI - read-core-files command', () => {
  // Test reading core files with default (pretty) format
  test('should read all core files with pretty format', async () => {
    const result = await runCliSuccessful([
      'read-core-files',
      testBranchName,
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Check that all core files are included in output
    const output = result.stdout;
    
    expect(output).toContain('=== BRANCH CORE FILES ===');
    expect(output).toContain('activeContext.md');
    expect(output).toContain('branchContext.md');
    expect(output).toContain('progress.md');
    expect(output).toContain('systemPatterns.md');
    
    // Check that core file content is included
    expect(output).toContain('active context file for e2e testing');
    expect(output).toContain('branch is created for e2e testing');
    expect(output).toContain('test progress file');
    expect(output).toContain('test system patterns file');
    
    // Check that non-core file content is not included
    expect(output).not.toContain('Non-core file');
    expect(output).not.toContain('should not be included in core files');
  });

  // Test reading core files with JSON format
  test('should read all core files with JSON format', async () => {
    const result = await runCliSuccessful([
      'read-core-files',
      testBranchName,
      '--format',
      'json',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Parse JSON output
    let jsonOutput;
    try {
      jsonOutput = JSON.parse(result.stdout);
    } catch (error) {
      fail('Command output is not valid JSON');
    }
    
    // Check that all core files are included in output
    expect(jsonOutput).toBeDefined();
    expect(jsonOutput['activeContext.md']).toBeDefined();
    expect(jsonOutput['branchContext.md']).toBeDefined();
    expect(jsonOutput['progress.md']).toBeDefined();
    expect(jsonOutput['systemPatterns.md']).toBeDefined();
    
    // Check that non-core files are not included
    expect(jsonOutput['non-core-file.md']).toBeUndefined();
    
    // Check file content
    expect(jsonOutput['activeContext.md'].content).toContain('active context file for e2e testing');
    expect(jsonOutput['branchContext.md'].content).toContain('branch is created for e2e testing');
    expect(jsonOutput['progress.md'].content).toContain('test progress file');
    expect(jsonOutput['systemPatterns.md'].content).toContain('test system patterns file');
  });

  // Test error when branch doesn't exist
  test('should fail when branch does not exist', async () => {
    const result = await runCli([
      'read-core-files',
      'non-existent-branch',
      '--docs',
      docsDir
    ]);
    
    // Verify the command failed
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Error reading core files');
    expect(result.stderr).toContain('non-existent-branch');
  });

  // Test partial core files
  test('should handle partial core files', async () => {
    // Remove some core files
    fs.unlinkSync(path.join(testBranchDir, 'activeContext.md'));
    fs.unlinkSync(path.join(testBranchDir, 'progress.md'));
    
    const result = await runCliSuccessful([
      'read-core-files',
      testBranchName,
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    
    // Check that only existing core files are included
    const output = result.stdout;
    expect(output).toContain('branchContext.md');
    expect(output).toContain('systemPatterns.md');
    
    // Check that removed core files are not in output
    expect(output).not.toContain('active context file for e2e testing');
    expect(output).not.toContain('test progress file');
  });

  // Test language option
  test('should work with language option', async () => {
    // Test with English
    const resultEn = await runCliSuccessful([
      'read-core-files',
      testBranchName,
      '--docs',
      docsDir,
      '--language',
      'en'
    ]);
    expect(resultEn.exitCode).toBe(0);
    
    // Test with Japanese
    const resultJa = await runCliSuccessful([
      'read-core-files',
      testBranchName,
      '--docs',
      docsDir,
      '--language',
      'ja'
    ]);
    expect(resultJa.exitCode).toBe(0);
  });

  // Test verbose option
  test('should work with verbose option', async () => {
    const result = await runCliSuccessful([
      'read-core-files',
      testBranchName,
      '--docs',
      docsDir,
      '--verbose'
    ]);
    
    expect(result.exitCode).toBe(0);
    // We cannot test actual verbose logging here as it may go to stderr or be handled differently
    // Just verify the command still works with this option
  });
});
