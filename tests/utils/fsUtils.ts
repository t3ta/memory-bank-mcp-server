/**
 * Mock implementation of the fs/promises module
 * 
 * This utility provides a virtualized file system for testing
 * without requiring actual file operations.
 */

import path from 'path';

interface MockFileSystem {
  [path: string]: string | { [dir: string]: string };
}

// Mocked file system storage
let mockFs: MockFileSystem = {};

// Basic directory structure for tests
const setupDefaultFileSystem = () => {
  mockFs = {
    '/test-workspace': {
      'docs': {
        'branch-memory-bank': {},
        'global-memory-bank': {}
      }
    }
  };
};

export const mockFsImplementation = () => {
  // Initialize default file system
  setupDefaultFileSystem();

  return {
    // Mock readFile implementation
    readFile: jest.fn(async (filePath: string, options?: { encoding?: string }) => {
      const normalizedPath = filePath.toString();
      
      // Navigate the mock file system structure to find the file
      const pathParts = normalizedPath.split(path.sep).filter(Boolean);
      let currentLevel: any = mockFs;
      
      for (const part of pathParts) {
        if (!currentLevel[part]) {
          throw new Error(`ENOENT: no such file or directory, open '${normalizedPath}'`);
        }
        currentLevel = currentLevel[part];
      }
      
      if (typeof currentLevel !== 'string') {
        throw new Error(`EISDIR: illegal operation on a directory, read '${normalizedPath}'`);
      }
      
      // Return the file content
      return options?.encoding === 'utf8' ? currentLevel : Buffer.from(currentLevel);
    }),
    
    // Mock writeFile implementation
    writeFile: jest.fn(async (filePath: string, data: string | Buffer) => {
      const normalizedPath = filePath.toString();
      const content = data.toString();
      
      // Get directory path and file name
      const dirPath = path.dirname(normalizedPath);
      const fileName = path.basename(normalizedPath);
      
      // Ensure directory exists
      let currentLevel: any = mockFs;
      const dirParts = dirPath.split(path.sep).filter(Boolean);
      
      for (const part of dirParts) {
        if (!currentLevel[part]) {
          currentLevel[part] = {};
        }
        
        if (typeof currentLevel[part] === 'string') {
          throw new Error(`ENOTDIR: not a directory, mkdir '${dirPath}'`);
        }
        
        currentLevel = currentLevel[part];
      }
      
      // Write the file
      currentLevel[fileName] = content;
      return;
    }),
    
    // Mock mkdir implementation (creates directories recursively)
    mkdir: jest.fn(async (dirPath: string, options?: { recursive?: boolean }) => {
      const normalizedPath = dirPath.toString();
      
      // Get directory parts
      const dirParts = normalizedPath.split(path.sep).filter(Boolean);
      let currentLevel: any = mockFs;
      
      for (const part of dirParts) {
        if (!currentLevel[part]) {
          currentLevel[part] = {};
        }
        
        if (typeof currentLevel[part] === 'string') {
          throw new Error(`ENOTDIR: not a directory, mkdir '${normalizedPath}'`);
        }
        
        currentLevel = currentLevel[part];
      }
      
      return normalizedPath;
    }),
    
    // Mock access implementation (checks if file exists)
    access: jest.fn(async (filePath: string) => {
      const normalizedPath = filePath.toString();
      
      // Navigate the mock file system structure to find the file
      const pathParts = normalizedPath.split(path.sep).filter(Boolean);
      let currentLevel: any = mockFs;
      
      for (const part of pathParts) {
        if (!currentLevel[part]) {
          throw new Error(`ENOENT: no such file or directory, access '${normalizedPath}'`);
        }
        currentLevel = currentLevel[part];
      }
      
      return;
    }),
    
    // Mock readdir implementation
    readdir: jest.fn(async (dirPath: string) => {
      const normalizedPath = dirPath.toString();
      
      // Navigate the mock file system structure to find the directory
      const pathParts = normalizedPath.split(path.sep).filter(Boolean);
      let currentLevel: any = mockFs;
      
      for (const part of pathParts) {
        if (!currentLevel[part]) {
          throw new Error(`ENOENT: no such file or directory, readdir '${normalizedPath}'`);
        }
        currentLevel = currentLevel[part];
      }
      
      if (typeof currentLevel === 'string') {
        throw new Error(`ENOTDIR: not a directory, readdir '${normalizedPath}'`);
      }
      
      // Return directory entries
      return Object.keys(currentLevel);
    }),
    
    // Mock stat implementation
    stat: jest.fn(async (filePath: string) => {
      const normalizedPath = filePath.toString();
      
      // Navigate the mock file system structure to find the file/directory
      const pathParts = normalizedPath.split(path.sep).filter(Boolean);
      let currentLevel: any = mockFs;
      
      for (const part of pathParts) {
        if (!currentLevel[part]) {
          throw new Error(`ENOENT: no such file or directory, stat '${normalizedPath}'`);
        }
        currentLevel = currentLevel[part];
      }
      
      const isDirectory = typeof currentLevel !== 'string';
      
      return {
        isDirectory: () => isDirectory,
        isFile: () => !isDirectory,
        size: isDirectory ? 0 : currentLevel.length,
        mtime: new Date(),
        ctime: new Date(),
        birthtime: new Date()
      };
    }),
    
    // Helper methods for testing
    __setMockFiles: (newMockFs: MockFileSystem) => {
      mockFs = { ...newMockFs };
    },
    
    __getMockFiles: () => {
      return { ...mockFs };
    },
    
    __resetMockFiles: () => {
      setupDefaultFileSystem();
    }
  };
};

// Helper function to setup test files for a specific test
export const setupTestFiles = (files: { [path: string]: string }) => {
  for (const [filePath, content] of Object.entries(files)) {
    // Split path into directory and file components
    const dirPath = path.dirname(filePath);
    const fileName = path.basename(filePath);
    
    // Create directory structure if it doesn't exist
    let currentLevel: any = mockFs;
    const dirParts = dirPath.split(path.sep).filter(Boolean);
    
    for (const part of dirParts) {
      if (!currentLevel[part]) {
        currentLevel[part] = {};
      }
      currentLevel = currentLevel[part];
    }
    
    // Add file with content
    currentLevel[fileName] = content;
  }
};
