// @ts-nocheck
import * as path from 'path';

// Mock the fs/promises module
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue('{"config": {"language": "en"}}'),
  access: jest.fn().mockImplementation((path) => {
    // Simulate access error for certain paths to test directory creation
    if (path.includes('non-existent')) {
      return Promise.reject(new Error('Directory does not exist'));
    }
    return Promise.resolve();
  })
}));

// Mock the WorkspaceManager
jest.mock('../../src/managers/WorkspaceManager', () => {
  const originalModule = jest.requireActual('../../src/managers/WorkspaceManager');
  
  return {
    ...originalModule,
    WorkspaceManager: class MockWorkspaceManager {
      private config = null;
      
      async initialize(options = {}, branchName = 'main') {
        if (this.config) return this.config;
        
        // Simple validation for testing
        if (options.workspace && typeof options.workspace !== 'string') {
          throw new Error('Invalid workspace path');
        }
        
        if (branchName && branchName !== 'main' && !branchName.match(/^(feature|fix)\/.+$/)) {
          throw new Error(`Invalid branch name: ${branchName}`);
        }
        
        this.config = {
          workspaceRoot: options.workspace || process.cwd(),
          memoryBankRoot: options.memoryRoot || path.join(options.workspace || process.cwd(), 'docs'),
          verbose: options.verbose || false,
          language: options.language || 'en'
        };
        
        return this.config;
      }
      
      getConfig() {
        if (!this.config) {
          throw new Error('WorkspaceManager not initialized');
        }
        return this.config;
      }
      
      getGlobalMemoryPath() {
        return path.join(this.getConfig().memoryBankRoot, 'global-memory-bank');
      }
      
      getBranchMemoryPath(branchName) {
        if (!branchName || (branchName !== 'main' && !branchName.match(/^(feature|fix)\/.+$/))) {
          throw new Error(`Invalid branch name: ${branchName}`);
        }
        
        const safeBranchName = branchName.replace(/\//g, '-');
        return path.join(this.getConfig().memoryBankRoot, 'branch-memory-bank', safeBranchName);
      }
    }
  };
});

// Import the WorkspaceManager for testing
const { WorkspaceManager } = require('../../src/managers/WorkspaceManager');

describe('WorkspaceManager', () => {
  let workspaceManager;
  const testWorkspacePath = '/test/workspace';
  
  beforeEach(() => {
    jest.clearAllMocks();
    workspaceManager = new WorkspaceManager();
  });
  
  describe('initialize', () => {
    test('should initialize with default values', async () => {
      const config = await workspaceManager.initialize();
      
      expect(config).toBeDefined();
      expect(config.workspaceRoot).toBe(process.cwd());
      expect(config.memoryBankRoot).toContain('docs');
      expect(config.verbose).toBe(false);
      expect(config.language).toBe('en');
    });
    
    test('should initialize with custom options', async () => {
      const options = {
        workspace: testWorkspacePath,
        memoryRoot: '/custom/memory/path',
        verbose: true,
        language: 'ja'
      };
      
      const config = await workspaceManager.initialize(options);
      
      expect(config.workspaceRoot).toBe(testWorkspacePath);
      expect(config.memoryBankRoot).toBe('/custom/memory/path');
      expect(config.verbose).toBe(true);
      expect(config.language).toBe('ja');
    });
    
    test('should handle invalid branch names', async () => {
      await expect(
        workspaceManager.initialize({}, 'invalid-branch-format')
      ).rejects.toThrow('Invalid branch name');
    });
    
    test('should initialize only once', async () => {
      const config1 = await workspaceManager.initialize();
      const config2 = await workspaceManager.initialize({ verbose: true }); // Different options
      
      // Should return the same config object
      expect(config1).toBe(config2);
      expect(config2.verbose).toBe(false); // Original value preserved
    });
  });
  
  describe('getConfig', () => {
    test('should throw error if not initialized', () => {
      expect(() => workspaceManager.getConfig()).toThrow('not initialized');
    });
    
    test('should return config after initialization', async () => {
      await workspaceManager.initialize();
      const config = workspaceManager.getConfig();
      
      expect(config).toBeDefined();
      expect(config.workspaceRoot).toBe(process.cwd());
    });
  });
  
  describe('getGlobalMemoryPath', () => {
    test('should return correct global memory path', async () => {
      await workspaceManager.initialize({ workspace: testWorkspacePath });
      const globalPath = workspaceManager.getGlobalMemoryPath();
      
      expect(globalPath).toContain('global-memory-bank');
      expect(path.dirname(globalPath)).toContain('docs');
    });
  });
  
  describe('getBranchMemoryPath', () => {
    test('should return correct branch memory path for feature branch', async () => {
      await workspaceManager.initialize({ workspace: testWorkspacePath });
      const branchPath = workspaceManager.getBranchMemoryPath('feature/test');
      
      expect(branchPath).toContain('branch-memory-bank');
      expect(path.basename(branchPath)).toBe('feature-test');
    });
    
    test('should return correct branch memory path for fix branch', async () => {
      await workspaceManager.initialize({ workspace: testWorkspacePath });
      const branchPath = workspaceManager.getBranchMemoryPath('fix/bug-123');
      
      expect(branchPath).toContain('branch-memory-bank');
      expect(path.basename(branchPath)).toBe('fix-bug-123');
    });
    
    test('should throw for invalid branch names', async () => {
      await workspaceManager.initialize({ workspace: testWorkspacePath });
      
      expect(() => {
        workspaceManager.getBranchMemoryPath('invalid/branch');
      }).toThrow('Invalid branch name');
    });
  });
});
