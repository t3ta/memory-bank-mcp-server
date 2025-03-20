/**
 * Setup utilities for E2E tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Root directory for temporary test files
 */
const TEST_TEMP_DIR = path.resolve(process.cwd(), 'tests/.temp');

/**
 * Creates a unique temporary directory for a test
 * 
 * @param testName Name of the test (used as part of the directory name)
 * @returns The path to the created directory
 */
export function createTempTestDir(testName: string): string {
  // Ensure the root temp directory exists
  if (!fs.existsSync(TEST_TEMP_DIR)) {
    fs.mkdirSync(TEST_TEMP_DIR, { recursive: true });
  }
  
  // Create a unique directory name
  const uniqueId = uuidv4().slice(0, 8);
  const sanitizedTestName = testName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  const dirName = `${sanitizedTestName}-${uniqueId}`;
  const dirPath = path.join(TEST_TEMP_DIR, dirName);
  
  // Create the directory
  fs.mkdirSync(dirPath, { recursive: true });
  
  return dirPath;
}

/**
 * Creates a basic docs directory structure for tests
 * 
 * @param basePath Root directory where to create the docs structure
 * @returns Object with paths to the created directories
 */
export function createDocsStructure(basePath: string): {
  docsDir: string;
  globalDir: string;
  branchDir: string;
} {
  const docsDir = path.join(basePath, 'docs');
  const globalDir = path.join(docsDir, 'global-memory-bank');
  const branchDir = path.join(docsDir, 'branch-memory-bank');
  
  // Create directories
  fs.mkdirSync(docsDir, { recursive: true });
  fs.mkdirSync(globalDir, { recursive: true });
  fs.mkdirSync(branchDir, { recursive: true });
  
  return {
    docsDir,
    globalDir,
    branchDir,
  };
}

/**
 * Creates a test branch directory
 * 
 * @param branchesDir Root directory of branches
 * @param branchName Name of the branch (without feature/ or fix/ prefix)
 * @returns Path to the created branch directory
 */
export function createTestBranch(
  branchesDir: string,
  branchName: string
): string {
  // Normalize branch name
  const normalizedName = branchName.replace(/\//g, '-');
  
  // Create branch directory
  const branchDir = path.join(branchesDir, normalizedName);
  fs.mkdirSync(branchDir, { recursive: true });
  
  return branchDir;
}

/**
 * Creates a test document file
 * 
 * @param dirPath Directory where to create the file
 * @param fileName Name of the file
 * @param content Content of the file
 * @returns Path to the created file
 */
export function createTestDocument(
  dirPath: string,
  fileName: string,
  content: string
): string {
  const filePath = path.join(dirPath, fileName);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

/**
 * Creates a test JSON document file
 * 
 * @param dirPath Directory where to create the file
 * @param fileName Name of the file (without .json extension)
 * @param data JSON data to write
 * @returns Path to the created file
 */
export function createTestJsonDocument(
  dirPath: string,
  fileName: string,
  data: any
): string {
  const fileNameWithExt = fileName.endsWith('.json') ? fileName : `${fileName}.json`;
  const content = JSON.stringify(data, null, 2);
  return createTestDocument(dirPath, fileNameWithExt, content);
}

/**
 * Recursively deletes a directory
 * 
 * @param dirPath Path to the directory to delete
 */
export function deleteTempDir(dirPath: string): void {
  // Only delete directories under the test temp directory for safety
  if (!dirPath.startsWith(TEST_TEMP_DIR)) {
    throw new Error(`Cannot delete directory outside of test temp directory: ${dirPath}`);
  }
  
  // Skip if directory doesn't exist
  if (!fs.existsSync(dirPath)) {
    return;
  }
  
  // Delete recursively
  fs.rmSync(dirPath, { recursive: true, force: true });
}

/**
 * Cleans up all temporary test directories
 */
export function cleanupAllTempDirs(): void {
  if (fs.existsSync(TEST_TEMP_DIR)) {
    fs.rmSync(TEST_TEMP_DIR, { recursive: true, force: true });
    fs.mkdirSync(TEST_TEMP_DIR, { recursive: true });
  }
}
