/**
 * Utility functions for E2E tests
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Asserts that a file exists
 * 
 * @param filePath Path to the file
 * @param message Optional error message
 */
export function assertFileExists(filePath: string, message?: string): void {
  expect(fs.existsSync(filePath)).toBe(true);

}

/**
 * Asserts that a file does not exist
 * 
 * @param filePath Path to the file
 * @param message Optional error message
 */
export function assertFileNotExists(filePath: string, message?: string): void {
  expect(fs.existsSync(filePath)).toBe(false);

}

/**
 * Asserts that a directory exists
 * 
 * @param dirPath Path to the directory
 * @param message Optional error message
 */
export function assertDirExists(dirPath: string, message?: string): void {
  expect(fs.existsSync(dirPath)).toBe(true);
  
  const stats = fs.statSync(dirPath);
  expect(stats.isDirectory()).toBe(true);

}

/**
 * Asserts that a file contains the expected content
 * 
 * @param filePath Path to the file
 * @param expectedContent Expected file content
 * @param message Optional error message
 */
export function assertFileContent(
  filePath: string,
  expectedContent: string,
  message?: string
): void {
  assertFileExists(filePath);
  
  const actualContent = fs.readFileSync(filePath, 'utf8');
  expect(actualContent).toBe(expectedContent);

}

/**
 * Asserts that a file contains content matching a regex pattern
 * 
 * @param filePath Path to the file
 * @param pattern Regex pattern to match
 * @param message Optional error message
 */
export function assertFileContentMatches(
  filePath: string,
  pattern: RegExp,
  message?: string
): void {
  assertFileExists(filePath);
  
  const content = fs.readFileSync(filePath, 'utf8');
  expect(content).toMatch(pattern);

}

/**
 * Asserts that a JSON file contains the expected data
 * 
 * @param filePath Path to the JSON file
 * @param expectedData Expected JSON data
 * @param message Optional error message
 */
export function assertJsonFileContent(
  filePath: string,
  expectedData: any,
  message?: string
): void {
  assertFileExists(filePath);
  
  const content = fs.readFileSync(filePath, 'utf8');
  let actualData;
  
  try {
    actualData = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse JSON file ${filePath}: ${(error as Error).message}`);
  }
  
  expect(actualData).toEqual(expectedData);

}

/**
 * Asserts that a JSON file contains properties matching the expected data
 * This is useful when you only want to check specific properties
 * 
 * @param filePath Path to the JSON file
 * @param expectedProps Expected properties in the JSON data
 * @param message Optional error message
 */
export function assertJsonFileProperties(
  filePath: string,
  expectedProps: any,
  message?: string
): void {
  assertFileExists(filePath);
  
  const content = fs.readFileSync(filePath, 'utf8');
  let actualData;
  
  try {
    actualData = JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse JSON file ${filePath}: ${(error as Error).message}`);
  }
  
  // Check that each expected property exists and matches
  for (const [key, value] of Object.entries(expectedProps)) {
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively check nested objects
      expect(actualData[key]).toBeDefined();

      expect(typeof actualData[key]).toBe('object');

      
      for (const [nestedKey, nestedValue] of Object.entries(value)) {
        expect(actualData[key][nestedKey]).toEqual(nestedValue);

      }
    } else {
      // Check simple property
      expect(actualData[key]).toEqual(value);

    }
  }
}

/**
 * Waits for a specified amount of time
 * Useful for tests that need to wait for file operations to complete
 * 
 * @param ms Time to wait in milliseconds
 * @returns Promise that resolves after the specified time
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Gets a list of files in a directory
 * 
 * @param dirPath Path to the directory
 * @param options Options for listing files
 * @returns Array of file names
 */
export function listFiles(
  dirPath: string,
  options: { recursive?: boolean; includeDirectories?: boolean } = {}
): string[] {
  const { recursive = false, includeDirectories = false } = options;
  
  if (!fs.existsSync(dirPath)) {
    return [];
  }
  
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  let result: string[] = [];
  
  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);
    
    if (entry.isDirectory()) {
      if (includeDirectories) {
        result.push(entryPath);
      }
      
      if (recursive) {
        result = result.concat(
          listFiles(entryPath, options).map((p) => p)
        );
      }
    } else {
      result.push(entryPath);
    }
  }
  
  return result;
}

/**
 * Creates a standard test document for memory bank tests
 * 
 * @param dirPath Directory where to create the document
 * @param name Document name (without extension)
 * @param content Document content
 * @returns Path to the created document
 */
export function createMemoryDocument(
  dirPath: string,
  name: string,
  content: string
): string {
  const filePath = path.join(dirPath, `${name}.md`);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

/**
 * Creates a JSON memory document with the standard schema
 * 
 * @param dirPath Directory where to create the document
 * @param name Document name (without extension)
 * @param metadata Document metadata
 * @param content Document content
 * @returns Path to the created document
 */
export function createJsonMemoryDocument(
  dirPath: string,
  name: string,
  metadata: {
    id?: string;
    title?: string;
    documentType?: string;
    tags?: string[];
  },
  content: any
): string {
  const now = new Date().toISOString();
  const filePath = path.join(dirPath, `${name}.json`);
  
  const document = {
    schema: 'memory_document_v2',
    metadata: {
      id: metadata.id || `test-${name}`,
      title: metadata.title || `Test Document: ${name}`,
      documentType: metadata.documentType || 'document',
      path: `${name}.json`,
      tags: metadata.tags || ['test'],
      lastModified: now,
      createdAt: now,
      version: 1,
    },
    content,
  };
  
  fs.writeFileSync(filePath, JSON.stringify(document, null, 2), 'utf8');
  return filePath;
}

/**
 * Generates a random string of a specified length
 * 
 * @param length Length of the string to generate
 * @returns Random string
 */
export function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return result;
}
