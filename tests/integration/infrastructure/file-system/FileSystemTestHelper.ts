/**
 * Helper utilities for file system integration tests
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

export interface TestEnvironment {
  rootDir: string;
  branchRoot: string;
  globalRoot: string;
  cleanup: () => Promise<void>;
}

/**
 * Create a temporary test environment
 * @returns Object containing paths and cleanup function
 */
export async function createTestEnvironment(): Promise<TestEnvironment> {
  // Create unique test directory
  const testId = crypto.randomUUID();
  const rootDir = path.join(process.cwd(), 'tests', '.temp', `filesystem-test-${testId}`);
  
  // Create subdirectories
  const branchRoot = path.join(rootDir, 'branches');
  const globalRoot = path.join(rootDir, 'global');
  
  await fs.mkdir(branchRoot, { recursive: true });
  await fs.mkdir(globalRoot, { recursive: true });
  
  // Return environment info with cleanup function
  return {
    rootDir,
    branchRoot,
    globalRoot,
    cleanup: async () => {
      try {
        await fs.rm(rootDir, { recursive: true, force: true });
        console.log(`Test environment deleted: ${rootDir}`);
      } catch (error) {
        console.error(`Error cleaning up test environment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };
}

/**
 * Create test files in a directory
 * @param dirPath Directory path
 * @param files Map of file names to content
 */
export async function createTestFiles(dirPath: string, files: Record<string, string>): Promise<void> {
  // Ensure directory exists
  await fs.mkdir(dirPath, { recursive: true });
  
  // Create files
  for (const [filename, content] of Object.entries(files)) {
    const filePath = path.join(dirPath, filename);
    await fs.writeFile(filePath, content, 'utf-8');
  }
}

/**
 * Create test branch structure
 * @param branchRoot Branch root directory
 * @param branchName Branch name
 * @param files Map of file names to content
 * @returns Path to branch directory
 */
export async function createTestBranch(
  branchRoot: string,
  branchName: string,
  files: Record<string, string>
): Promise<string> {
  // Normalize branch name for directory
  const safeBranchName = branchName.replace(/\//g, '-');
  const branchDir = path.join(branchRoot, safeBranchName);
  
  // Create branch directory and files
  await createTestFiles(branchDir, files);
  
  return branchDir;
}

/**
 * Read all files in a directory recursively
 * @param dirPath Directory path
 * @returns Map of relative file paths to content
 */
export async function readAllFiles(dirPath: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  
  // Read directory entries
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    
    if (entry.isFile()) {
      // Read file content
      const relativePath = path.relative(dirPath, entryPath);
      const content = await fs.readFile(entryPath, 'utf-8');
      result[relativePath] = content;
    } else if (entry.isDirectory()) {
      // Read subdirectory recursively
      const subResult = await readAllFiles(entryPath);
      for (const [subPath, content] of Object.entries(subResult)) {
        const relativePath = path.join(entry.name, subPath);
        result[relativePath] = content;
      }
    }
  }
  
  return result;
}

/**
 * Get list of files in a directory
 * @param dirPath Directory path 
 * @returns Array of file paths
 */
export async function listAllFiles(dirPath: string): Promise<string[]> {
  const result: string[] = [];
  
  try {
    // Read directory entries
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry.name);
      
      if (entry.isFile()) {
        result.push(entryPath);
      } else if (entry.isDirectory()) {
        // Read subdirectory recursively
        const subFiles = await listAllFiles(entryPath);
        result.push(...subFiles);
      }
    }
  } catch (error) {
    // If directory doesn't exist, return empty array
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
  
  return result;
}

/**
 * Wait for a specified time
 * @param ms Milliseconds to wait
 * @returns Promise that resolves after the specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
