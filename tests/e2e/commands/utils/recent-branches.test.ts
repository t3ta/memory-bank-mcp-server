/**
 * E2E tests for the recent-branches command
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

// Setup before each test
beforeEach(() => {
  testDir = createTempTestDir('recent-branches');
  const dirs = createDocsStructure(testDir);
  docsDir = dirs.docsDir;
  branchesDir = dirs.branchDir;
  
  // Create multiple branch directories with different dates
  createBranchWithTimestamp('feature-recent-branch', Date.now());
  createBranchWithTimestamp('feature-older-branch', Date.now() - 86400000); // 1 day ago
  createBranchWithTimestamp('feature-oldest-branch', Date.now() - 172800000); // 2 days ago
  createBranchWithTimestamp('fix-recent-branch', Date.now() - 43200000); // 12 hours ago
  createBranchWithTimestamp('fix-older-branch', Date.now() - 129600000); // 1.5 days ago
});

// Cleanup after each test
afterEach(() => {
  deleteTempDir(testDir);
});

// Helper function to create a branch with specific timestamp
function createBranchWithTimestamp(branchName: string, timestamp: number): void {
  const branchDir = path.join(branchesDir, branchName);
  fs.mkdirSync(branchDir, { recursive: true });
  
  // Create basic branch documents
  createTestDocument(branchDir, 'branchContext.md', `# Branch Context\n\n## Purpose\nThis is the ${branchName} branch.`);
  createTestDocument(branchDir, 'activeContext.md', `# Active Context\n\n## Current Work\nWorking on ${branchName} features.`);
  createTestDocument(branchDir, 'progress.md', `# Progress\n\n## Current State\nIn progress for ${branchName}.`);
  
  // Set the last modified time for all files
  const files = fs.readdirSync(branchDir);
  files.forEach(file => {
    const filePath = path.join(branchDir, file);
    fs.utimesSync(filePath, new Date(timestamp), new Date(timestamp));
  });
}

describe('Memory Bank CLI - recent-branches command', () => {
  // Test recent branches with default limit
  test('should list recent branches with default limit', async () => {
    const result = await runCliSuccessful([
      'recent-branches',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Check output for expected branch names
    const output = result.stdout;
    expect(output).toContain('RECENT BRANCHES');
    
    // Check that all branches are included (since we have fewer than the default limit)
    expect(output).toContain('feature-recent-branch');
    expect(output).toContain('feature-older-branch');
    expect(output).toContain('feature-oldest-branch');
    expect(output).toContain('fix-recent-branch');
    expect(output).toContain('fix-older-branch');
    
    // Check that branches are ordered by recency (newest first)
    const lines = output.split('\n');
    const featureRecentIndex = lines.findIndex(line => line.includes('feature-recent-branch'));
    const fixRecentIndex = lines.findIndex(line => line.includes('fix-recent-branch'));
    const featureOlderIndex = lines.findIndex(line => line.includes('feature-older-branch'));
    const fixOlderIndex = lines.findIndex(line => line.includes('fix-older-branch'));
    const featureOldestIndex = lines.findIndex(line => line.includes('feature-oldest-branch'));
    
    // Most recent should appear first
    expect(featureRecentIndex).toBeLessThan(fixRecentIndex);
    expect(fixRecentIndex).toBeLessThan(featureOlderIndex);
    expect(featureOlderIndex).toBeLessThan(fixOlderIndex);
    expect(fixOlderIndex).toBeLessThan(featureOldestIndex);
  });
  
  // Test recent branches with custom limit
  test('should list recent branches with custom limit', async () => {
    const result = await runCliSuccessful([
      'recent-branches',
      '2', // Limit to 2 branches
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Check output for expected branch names
    const output = result.stdout;
    
    // Check that only the 2 most recent branches are included
    expect(output).toContain('feature-recent-branch');
    expect(output).toContain('fix-recent-branch');
    
    // Check that older branches are NOT included
    expect(output).not.toContain('feature-older-branch');
    expect(output).not.toContain('fix-older-branch');
    expect(output).not.toContain('feature-oldest-branch');
  });
  
  // Test recent branches with JSON format
  test('should list recent branches with JSON format', async () => {
    const result = await runCliSuccessful([
      'recent-branches',
      '--format',
      'json',
      '--docs',
      docsDir
    ]);
    
    // Verify the command executed successfully
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    
    // Parse output JSON
    let branches;
    try {
      branches = JSON.parse(result.stdout);
    } catch (error) {
      fail('Command output is not valid JSON');
    }
    
    // Check that all branches are included
    expect(Array.isArray(branches)).toBe(true);
    expect(branches.length).toBe(5); // All our test branches
    
    // Check branch properties
    branches.forEach((branch: any) => {
      expect(branch.name).toBeDefined();
      expect(branch.lastModified).toBeDefined();
      
      // One of our test branches
      expect(['feature-recent-branch', 'feature-older-branch', 'feature-oldest-branch', 
              'fix-recent-branch', 'fix-older-branch']).toContain(branch.name);
    });
    
    // Check order (newest first)
    const branchNames = branches.map((b: any) => b.name);
    const featureRecentIndex = branchNames.indexOf('feature-recent-branch');
    const fixRecentIndex = branchNames.indexOf('fix-recent-branch');
    const featureOlderIndex = branchNames.indexOf('feature-older-branch');
    
    expect(featureRecentIndex).toBeLessThan(fixRecentIndex);
    expect(fixRecentIndex).toBeLessThan(featureOlderIndex);
  });
  
  // Test with invalid directory
  test('should handle missing or invalid docs directory', async () => {
    const invalidDocsDir = path.join(testDir, 'non-existent-dir');
    
    const result = await runCli([
      'recent-branches',
      '--docs',
      invalidDocsDir
    ]);
    
    // Expect a non-zero exit code
    expect(result.exitCode).not.toBe(0);
    expect(result.stderr).toContain('Error');
  });
  
  // Test with language option
  test('should work with language option', async () => {
    // Test with English
    const resultEn = await runCliSuccessful([
      'recent-branches',
      '--docs',
      docsDir,
      '--language',
      'en'
    ]);
    expect(resultEn.exitCode).toBe(0);
    
    // Test with Japanese
    const resultJa = await runCliSuccessful([
      'recent-branches',
      '--docs',
      docsDir,
      '--language',
      'ja'
    ]);
    expect(resultJa.exitCode).toBe(0);
  });
  
  // Test with verbose option
  test('should work with verbose option', async () => {
    const result = await runCliSuccessful([
      'recent-branches',
      '--docs',
      docsDir,
      '--verbose'
    ]);
    
    expect(result.exitCode).toBe(0);
    // We can't test actual verbose logging here as it may go to stderr or be handled differently
    // Just verify the command still works with this option
  });
});
