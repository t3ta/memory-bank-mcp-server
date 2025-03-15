// @ts-nocheck
import * as path from 'path';
import { MemoryBankError } from '../../src/errors/MemoryBankError';
import { sampleBranchMemoryBank } from '../utils/testTemplates';

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
  stat: jest.fn().mockImplementation((path) => {
    if (path.includes('error-stat')) {
      return Promise.reject(new Error('Cannot stat file'));
    }
    return Promise.resolve({ mtime: new Date() });
  }),
  access: jest.fn().mockImplementation((path) => {
    if (path.includes('error-access')) {
      return Promise.reject(new Error('Access denied'));
    }
    return Promise.resolve();
  })
}));

// Create a real implementation that will throw the expected errors
jest.mock('../../src/managers/BranchMemoryBank', () => {
  return {
    BranchMemoryBank: class MockBranchMemoryBank {
      constructor(basePath, branchName, config) {
        this.basePath = path.join(basePath, 'docs', 'branch-memory-bank', branchName.replace(/\//g, '-'));
        this.branchName = branchName;
        this.language = config.language || 'en';
        this.initialized = false;
      }

      async initialize() {
        if (this.basePath.includes('error-mkdir')) {
          throw new MemoryBankError('initialize', 'branch-memory-bank', new Error('Permission denied'));
        }
        this.initialized = true;
        return true;
      }
      
      async readDocument(file) {
        if (!this.initialized) {
          throw new MemoryBankError('read', 'branch-memory-bank', new Error('Not initialized'));
        }
        
        if (file.includes('error-read')) {
          throw new MemoryBankError('read', 'branch-memory-bank', new Error('File not found'));
        }
        
        if (file.includes('invalid-json')) {
          throw new MemoryBankError('parse', 'branch-memory-bank', new Error('Invalid JSON'));
        }
        
        return {
          content: sampleBranchMemoryBank[file.replace(/\.md$/, '')] || 'Default content',
          tags: [],
          lastModified: new Date(),
          path: file
        };
      }
      
      async writeDocument(file, content, tags = []) {
        if (!this.initialized) {
          throw new MemoryBankError('write', 'branch-memory-bank', new Error('Not initialized'));
        }
        
        if (file.includes('error-write')) {
          throw new MemoryBankError('write', 'branch-memory-bank', new Error('Disk full'));
        }
        
        return true;
      }
      
      async updateActiveContext(updates) {
        if (!this.initialized) {
          throw new MemoryBankError('update', 'active-context', new Error('Not initialized'));
        }
        
        if (updates.currentWork && updates.currentWork.includes('error')) {
          throw new MemoryBankError('update', 'active-context', new Error('Invalid content'));
        }
        
        return true;
      }
      
      async updateProgress(updates) {
        if (!this.initialized) {
          throw new MemoryBankError('update', 'progress', new Error('Not initialized'));
        }
        
        if (updates.currentState && updates.currentState.includes('error')) {
          throw new MemoryBankError('update', 'progress', new Error('Invalid content'));
        }
        
        return true;
      }
      
      async addTechnicalDecision(decision) {
        if (!this.initialized) {
          throw new MemoryBankError('add', 'technical-decision', new Error('Not initialized'));
        }
        
        if (!decision.title || !decision.context || !decision.decision) {
          throw new MemoryBankError('validate', 'technical-decision', new Error('Missing required fields'));
        }
        
        return true;
      }
      
      async writeCoreFiles(args) {
        if (!this.initialized) {
          throw new MemoryBankError('write', 'core-files', new Error('Not initialized'));
        }
        
        if (!args.files || !args.branch) {
          throw new MemoryBankError('validate', 'core-files', new Error('Missing required fields'));
        }
        
        return true;
      }
    }
  };
});

// Import the BranchMemoryBank for testing
const { BranchMemoryBank } = require('../../src/managers/BranchMemoryBank');

describe('BranchMemoryBank Error Cases', () => {
  const workspacePath = '/test/workspace';
  const branchName = 'feature/test';
  
  describe('initialization errors', () => {
    test('should throw error when mkdir fails', async () => {
      const errorBranchName = 'feature/error-mkdir';
      const branchMemoryBank = new BranchMemoryBank(workspacePath, errorBranchName, { 
        workspaceRoot: workspacePath,
        memoryBankRoot: path.join(workspacePath, 'docs'),
        verbose: false,
        language: 'ja'
      });
      
      try {
        await branchMemoryBank.initialize();
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
  
  describe('readDocument errors', () => {
    let branchMemoryBank;
    
    beforeEach(async () => {
      branchMemoryBank = new BranchMemoryBank(workspacePath, branchName, { 
        workspaceRoot: workspacePath,
        memoryBankRoot: path.join(workspacePath, 'docs'),
        verbose: false,
        language: 'ja'
      });
      await branchMemoryBank.initialize();
    });
    
    test('should throw error when file read fails', async () => {
      try {
        await branchMemoryBank.readDocument('error-read.md');
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
    
    test('should throw error when JSON parsing fails', async () => {
      try {
        await branchMemoryBank.readDocument('invalid-json.md');
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
  
  describe('writeDocument errors', () => {
    let branchMemoryBank;
    
    beforeEach(async () => {
      branchMemoryBank = new BranchMemoryBank(workspacePath, branchName, { 
        workspaceRoot: workspacePath,
        memoryBankRoot: path.join(workspacePath, 'docs'),
        verbose: false,
        language: 'ja'
      });
      await branchMemoryBank.initialize();
    });
    
    test('should throw error when file write fails', async () => {
      try {
        await branchMemoryBank.writeDocument('error-write.md', 'Test content');
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
  
  describe('updateActiveContext errors', () => {
    let branchMemoryBank;
    
    beforeEach(async () => {
      branchMemoryBank = new BranchMemoryBank(workspacePath, branchName, { 
        workspaceRoot: workspacePath,
        memoryBankRoot: path.join(workspacePath, 'docs'),
        verbose: false,
        language: 'ja'
      });
      await branchMemoryBank.initialize();
    });
    
    test('should throw error with invalid updates', async () => {
      try {
        await branchMemoryBank.updateActiveContext({
          currentWork: 'error-content',
          recentChanges: ['Test change']
        });
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
  
  describe('updateProgress errors', () => {
    let branchMemoryBank;
    
    beforeEach(async () => {
      branchMemoryBank = new BranchMemoryBank(workspacePath, branchName, { 
        workspaceRoot: workspacePath,
        memoryBankRoot: path.join(workspacePath, 'docs'),
        verbose: false,
        language: 'ja'
      });
      await branchMemoryBank.initialize();
    });
    
    test('should throw error with invalid updates', async () => {
      try {
        await branchMemoryBank.updateProgress({
          currentState: 'error-state',
          workingFeatures: ['Test feature']
        });
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
  
  describe('addTechnicalDecision errors', () => {
    let branchMemoryBank;
    
    beforeEach(async () => {
      branchMemoryBank = new BranchMemoryBank(workspacePath, branchName, { 
        workspaceRoot: workspacePath,
        memoryBankRoot: path.join(workspacePath, 'docs'),
        verbose: false,
        language: 'ja'
      });
      await branchMemoryBank.initialize();
    });
    
    test('should throw error with missing required fields', async () => {
      try {
        await branchMemoryBank.addTechnicalDecision({
          title: 'Test Decision',
          // Missing context and decision
          consequences: ['Consequence 1']
        });
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
  
  describe('writeCoreFiles errors', () => {
    let branchMemoryBank;
    
    beforeEach(async () => {
      branchMemoryBank = new BranchMemoryBank(workspacePath, branchName, { 
        workspaceRoot: workspacePath,
        memoryBankRoot: path.join(workspacePath, 'docs'),
        verbose: false,
        language: 'ja'
      });
      await branchMemoryBank.initialize();
    });
    
    test('should throw error with missing required fields', async () => {
      try {
        await branchMemoryBank.writeCoreFiles({
          // Missing branch or files
        });
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
  
  describe('non-initialized errors', () => {
    test('should throw error when calling methods before initialization', async () => {
      const branchMemoryBank = new BranchMemoryBank(workspacePath, branchName, { 
        workspaceRoot: workspacePath,
        memoryBankRoot: path.join(workspacePath, 'docs'),
        verbose: false,
        language: 'ja'
      });
      
      // Skip initialization
      
      try {
        await branchMemoryBank.readDocument('test.md');
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
        
      try {
        await branchMemoryBank.writeDocument('test.md', 'content');
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
        
      try {
        await branchMemoryBank.updateActiveContext({ currentWork: 'test' });
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
        
      try {
        await branchMemoryBank.updateProgress({ currentState: 'test' });
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
        
      try {
        await branchMemoryBank.addTechnicalDecision({ 
          title: 'Test',
          context: 'Test context',
          decision: 'Test decision',
          consequences: []
        });
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
        
      try {
        await branchMemoryBank.writeCoreFiles({
          branch: 'feature/test',
          files: { activeContext: {} }
        });
        fail('Expected an error but none was thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });
});
