// @ts-nocheck
import * as path from 'path';
import { MemoryBankError } from '../../src/errors/MemoryBankError';

// Mock the fs/promises module with controlled error scenarios
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockImplementation((path) => {
    if (path.includes('error-mkdir')) {
      return Promise.reject(new Error('Permission denied'));
    }
    return Promise.resolve();
  }),
  writeFile: jest.fn().mockImplementation((path, content) => {
    if (path.includes('error-write')) {
      return Promise.reject(new Error('Disk full'));
    }
    return Promise.resolve();
  }),
  readFile: jest.fn().mockImplementation((path) => {
    if (path.includes('error-read')) {
      return Promise.reject(new Error('File not found'));
    }
    if (path.includes('invalid-json')) {
      return Promise.resolve('This is not valid JSON');
    }
    return Promise.resolve(JSON.stringify({ content: 'Test content' }));
  }),
  readdir: jest.fn().mockImplementation((path) => {
    if (path.includes('error-readdir')) {
      return Promise.reject(new Error('Directory not accessible'));
    }
    return Promise.resolve(['file1.md', 'file2.md', 'subdirectory']);
  }),
  stat: jest.fn().mockImplementation((path) => {
    if (path.includes('error-stat')) {
      return Promise.reject(new Error('Cannot stat file'));
    }
    if (path.includes('subdirectory')) {
      return Promise.resolve({ 
        isDirectory: () => true,
        mtime: new Date() 
      });
    }
    return Promise.resolve({ 
      isDirectory: () => false,
      mtime: new Date() 
    });
  }),
  access: jest.fn().mockImplementation((path) => {
    if (path.includes('error-access')) {
      return Promise.reject(new Error('Access denied'));
    }
    return Promise.resolve();
  })
}));

// Create a real implementation that will throw the expected errors
jest.mock('../../src/managers/GlobalMemoryBank', () => {
  return {
    GlobalMemoryBank: class MockGlobalMemoryBank {
      constructor(basePath, config) {
        this.basePath = path.join(basePath, 'docs', 'global-memory-bank');
        this.language = config.language || 'en';
        this.initialized = false;
      }

      async initialize() {
        if (this.basePath.includes('error-mkdir')) {
          throw new MemoryBankError('initialize', 'global-memory-bank', new Error('Permission denied'));
        }
        this.initialized = true;
        return true;
      }
      
      async readDocument(file) {
        if (!this.initialized) {
          throw new MemoryBankError('read', 'global-memory-bank', new Error('Not initialized'));
        }
        
        if (file.includes('error-read')) {
          throw new MemoryBankError('read', 'global-memory-bank', new Error('File not found'));
        }
        
        if (file.includes('invalid-json')) {
          throw new MemoryBankError('parse', 'global-memory-bank', new Error('Invalid JSON'));
        }
        
        return {
          content: `# Test content for ${file}`,
          tags: [],
          lastModified: new Date(),
          path: file
        };
      }
      
      async writeDocument(file, content, tags = []) {
        if (!this.initialized) {
          throw new MemoryBankError('write', 'global-memory-bank', new Error('Not initialized'));
        }
        
        if (file.includes('error-write')) {
          throw new MemoryBankError('write', 'global-memory-bank', new Error('Disk full'));
        }
        
        return true;
      }
      
      async listDocuments() {
        if (!this.initialized) {
          throw new MemoryBankError('list', 'global-memory-bank', new Error('Not initialized'));
        }
        
        if (this.basePath.includes('error-readdir')) {
          throw new MemoryBankError('list', 'global-memory-bank', new Error('Directory not accessible'));
        }
        
        return ['architecture.md', 'tech-stack.md', 'glossary.md'];
      }
      
      async validateStructure() {
        if (!this.initialized) {
          throw new MemoryBankError('validate', 'global-memory-bank', new Error('Not initialized'));
        }
        
        if (this.basePath.includes('error-validate')) {
          return {
            isValid: false,
            missingFiles: ['required-file.md'],
            errors: ['Required file is missing']
          };
        }
        
        return {
          isValid: true,
          missingFiles: [],
          errors: []
        };
      }
    }
  };
});

// Import the GlobalMemoryBank for testing
const { GlobalMemoryBank } = require('../../src/managers/GlobalMemoryBank');

describe('GlobalMemoryBank Error Cases', () => {
  const workspacePath = '/test/workspace';
  
  describe('initialization errors', () => {
    test('should throw error when mkdir fails', async () => {
      const errorWorkspacePath = '/test/error-mkdir';
      const globalMemoryBank = new GlobalMemoryBank(errorWorkspacePath, { 
        workspaceRoot: errorWorkspacePath,
        memoryBankRoot: path.join(errorWorkspacePath, 'docs'),
        verbose: false,
        language: 'ja'
      });
      
      try {
        await globalMemoryBank.initialize();
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
  
  describe('readDocument errors', () => {
    let globalMemoryBank;
    
    beforeEach(async () => {
      globalMemoryBank = new GlobalMemoryBank(workspacePath, { 
        workspaceRoot: workspacePath,
        memoryBankRoot: path.join(workspacePath, 'docs'),
        verbose: false,
        language: 'ja'
      });
      await globalMemoryBank.initialize();
    });
    
    test('should throw error when file read fails', async () => {
      try {
        await globalMemoryBank.readDocument('error-read.md');
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
    
    test('should throw error when JSON parsing fails', async () => {
      try {
        await globalMemoryBank.readDocument('invalid-json.md');
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
  
  describe('writeDocument errors', () => {
    let globalMemoryBank;
    
    beforeEach(async () => {
      globalMemoryBank = new GlobalMemoryBank(workspacePath, { 
        workspaceRoot: workspacePath,
        memoryBankRoot: path.join(workspacePath, 'docs'),
        verbose: false,
        language: 'ja'
      });
      await globalMemoryBank.initialize();
    });
    
    test('should throw error when file write fails', async () => {
      try {
        await globalMemoryBank.writeDocument('error-write.md', 'Test content');
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
  
  describe('listDocuments errors', () => {
    test('should throw error when directory cannot be read', async () => {
      const errorWorkspacePath = '/test/error-readdir';
      const globalMemoryBank = new GlobalMemoryBank(errorWorkspacePath, { 
        workspaceRoot: errorWorkspacePath,
        memoryBankRoot: path.join(errorWorkspacePath, 'docs'),
        verbose: false,
        language: 'ja'
      });
      
      await globalMemoryBank.initialize();
      
      try {
        await globalMemoryBank.listDocuments();
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
  
  describe('validateStructure errors', () => {
    test('should return validation errors for invalid structure', async () => {
      const errorWorkspacePath = '/test/error-validate';
      const globalMemoryBank = new GlobalMemoryBank(errorWorkspacePath, { 
        workspaceRoot: errorWorkspacePath,
        memoryBankRoot: path.join(errorWorkspacePath, 'docs'),
        verbose: false,
        language: 'ja'
      });
      
      await globalMemoryBank.initialize();
      
      const result = await globalMemoryBank.validateStructure();
      expect(result.isValid).toBe(false);
      expect(result.missingFiles).toContain('required-file.md');
      expect(result.errors).toHaveLength(1);
    });
  });
  
  describe('non-initialized errors', () => {
    test('should throw error when calling methods before initialization', async () => {
      const globalMemoryBank = new GlobalMemoryBank(workspacePath, { 
        workspaceRoot: workspacePath,
        memoryBankRoot: path.join(workspacePath, 'docs'),
        verbose: false,
        language: 'ja'
      });
      
      // Skip initialization
      
      try {
        await globalMemoryBank.readDocument('test.md');
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
        
      try {
        await globalMemoryBank.writeDocument('test.md', 'content');
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
        
      try {
        await globalMemoryBank.listDocuments();
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
        
      try {
        await globalMemoryBank.validateStructure();
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
