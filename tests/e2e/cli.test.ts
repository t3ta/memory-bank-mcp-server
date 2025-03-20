/**
 * Basic E2E tests for CLI functionality
 */

import * as path from 'path';
import { runCli, runCliSuccessful } from './helpers/cli-runner';
import { createTempTestDir, createDocsStructure, deleteTempDir } from './helpers/setup';

// Test suite configuration
let testDir: string;

// Setup before each test
beforeEach(() => {
  testDir = createTempTestDir('cli-basic');
});

// Cleanup after each test
afterEach(() => {
  deleteTempDir(testDir);
});

describe('Memory Bank CLI - Basic Functionality', () => {
  // Test CLI help output
  test('should display help information', async () => {
    const result = await runCliSuccessful(['--help']);
    
    // Verify help output contains expected information
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('memory-bank');
    expect(result.stdout).toContain('コマンド:');
    expect(result.stdout).toContain('オプション:');
    expect(result.stderr).toBe('');
  });

  // Test CLI version output
  test('should display version information', async () => {
    const result = await runCliSuccessful(['--version']);
    
    // Verify version output
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toMatch(/\d+\.\d+\.\d+/); // Should match semver format
    expect(result.stderr).toBe('');
  });

  // Test CLI validation
  test('should fail with invalid command', async () => {
    const result = await runCli(['non-existent-command']);
    
    // Verify error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('不明な引数');
  });

  // Test CLI with custom docs directory
  test('should accept custom docs directory', async () => {
    // Create a custom docs structure
    const customDocsDir = path.join(testDir, 'custom-docs');
    createDocsStructure(testDir);
    
    // Run CLI with custom docs directory
    const result = await runCliSuccessful(['--docs', customDocsDir, '--help']);
    
    // Verify command executed successfully
    expect(result.exitCode).toBe(0);
  });

  // Test CLI with verbose flag
  test('should accept verbose flag', async () => {
    const result = await runCliSuccessful(['--verbose', '--help']);
    
    // Verify command executed successfully
    expect(result.exitCode).toBe(0);
  });

  // Test CLI with language option
  test('should accept language option', async () => {
    // Test with English
    const resultEn = await runCliSuccessful(['--language', 'en', '--help']);
    expect(resultEn.exitCode).toBe(0);
    
    // Test with Japanese
    const resultJa = await runCliSuccessful(['--language', 'ja', '--help']);
    expect(resultJa.exitCode).toBe(0);
  });

  // Test CLI command validation
  test('should require a command', async () => {
    const result = await runCli([]);
    
    // Verify error output
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('You need to specify a command');
  });
});
