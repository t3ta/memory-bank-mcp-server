// @ts-nocheck
import { promises as fs } from 'fs';
import * as path from 'path';
import { WorkspaceManager } from '../../src/managers/WorkspaceManager';

describe('WorkspaceManager Integration Test', () => {
  const testDir = path.join(process.cwd(), 'temp-test-workspace');
  const docsDir = path.join(testDir, 'docs');
  let workspaceManager: WorkspaceManager;

  // Set up tests
  beforeEach(async () => {
    // Clean up existing test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore error if directory doesn't exist
    }

    // Create test directories
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(docsDir, { recursive: true });

    workspaceManager = new WorkspaceManager();
  });

  // Clean up after tests
  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up test directory:', error);
    }
  });

  describe('Initialization', () => {
    test('should initialize with default values', async () => {
      // Save current directory to restore later
      const originalCwd = process.cwd();
      
      try {
        // Change to test directory
        process.chdir(testDir);
        
        // Initialize with defaults
        const config = await workspaceManager.initialize();
        
        // Verify config values
        expect(config.workspaceRoot).toBe(testDir);
        expect(config.memoryBankRoot).toBe(path.join(testDir, 'docs'));
        expect(config.verbose).toBe(false);
        expect(config.language).toBe('en');
        
        // Verify directories were created
        const globalMemoryPath = workspaceManager.getGlobalMemoryPath();
        const exists = await fs.access(globalMemoryPath)
          .then(() => true)
          .catch(() => false);
        expect(exists).toBe(true);
      } finally {
        // Restore original directory
        process.chdir(originalCwd);
      }
    });

    test('should initialize with provided options', async () => {
      // Initialize with custom options
      const options = {
        workspace: testDir,
        memoryRoot: path.join(testDir, 'custom-docs'),
        verbose: true,
        language: 'ja'
      };
      
      const config = await workspaceManager.initialize(options);
      
      // Verify config values
      expect(config.workspaceRoot).toBe(testDir);
      expect(config.memoryBankRoot).toBe(path.join(testDir, 'custom-docs'));
      expect(config.verbose).toBe(true);
      expect(config.language).toBe('ja');
      
      // Verify custom directory was created
      const globalMemoryPath = workspaceManager.getGlobalMemoryPath();
      const exists = await fs.access(globalMemoryPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });

    test('should use environment variables when options are not provided', async () => {
      // Save original environment variables
      const originalEnv = { ...process.env };
      
      try {
        // Set environment variables
        process.env.WORKSPACE_ROOT = testDir;
        process.env.MEMORY_BANK_ROOT = path.join(testDir, 'env-docs');
        process.env.MEMORY_BANK_LANGUAGE = 'ja';
        
        // Initialize without options
        const config = await workspaceManager.initialize();
        
        // Verify config values from environment
        expect(config.workspaceRoot).toBe(testDir);
        expect(config.memoryBankRoot).toBe(path.join(testDir, 'env-docs'));
        expect(config.language).toBe('ja');
      } finally {
        // Restore original environment
        process.env = originalEnv;
      }
    });
  });

  describe('Directory Management', () => {
    test('should create required directories', async () => {
      // Initialize workspace
      await workspaceManager.initialize({ workspace: testDir });
      
      // Check global memory bank directory
      const globalMemoryPath = workspaceManager.getGlobalMemoryPath();
      let exists = await fs.access(globalMemoryPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
      
      // Check branch memory bank directory
      const branchDirPath = path.join(workspaceManager.getConfig().memoryBankRoot, 'branch-memory-bank');
      exists = await fs.access(branchDirPath)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });
    
    test('should resolve branch memory bank path correctly', async () => {
      // Initialize workspace
      await workspaceManager.initialize({ workspace: testDir });
      
      // Test branch name sanitization
      const featureBranchPath = workspaceManager.getBranchMemoryPath('feature/test-branch');
      expect(featureBranchPath).toBe(
        path.join(workspaceManager.getConfig().memoryBankRoot, 'branch-memory-bank', 'feature-test-branch')
      );
      
      // Test different branch formats
      const fixBranchPath = workspaceManager.getBranchMemoryPath('fix/issue-123');
      expect(fixBranchPath).toBe(
        path.join(workspaceManager.getConfig().memoryBankRoot, 'branch-memory-bank', 'fix-issue-123')
      );
    });
    
    test('should handle non-existent directories gracefully', async () => {
      // Test with non-existent directory
      const nonExistentDir = path.join(testDir, 'non-existent');
      
      // Initialize with non-existent directory
      const config = await workspaceManager.initialize({ 
        workspace: nonExistentDir 
      });
      
      // Verify directories were created
      expect(config.workspaceRoot).toBe(nonExistentDir);
      
      const exists = await fs.access(nonExistentDir)
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
    });
  });

  describe('Configuration Management', () => {
    test('should throw error when trying to get config before initialization', async () => {
      // Try to get config before initializing
      try {
        workspaceManager.getConfig();
        fail('Expected error was not thrown');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('not initialized');
      }
    });
    
    test('should return consistent config after initialization', async () => {
      // Initialize
      const initialConfig = await workspaceManager.initialize({ 
        workspace: testDir,
        language: 'ja' 
      });
      
      // Get config multiple times
      const config1 = workspaceManager.getConfig();
      const config2 = workspaceManager.getConfig();
      
      // Verify configs are the same
      expect(config1).toEqual(initialConfig);
      expect(config2).toEqual(initialConfig);
      expect(config1).toEqual(config2);
    });
    
    test('should not re-initialize when called multiple times', async () => {
      // First initialization
      const config1 = await workspaceManager.initialize({ 
        workspace: testDir,
        language: 'en' 
      });
      
      // Second initialization with different options
      const config2 = await workspaceManager.initialize({ 
        workspace: path.join(testDir, 'other'),
        language: 'ja' 
      });
      
      // Verify second initialization returns same config as first
      expect(config2).toEqual(config1);
      expect(config2.language).toBe('en'); // Not changed to 'ja'
    });
  });

  describe('Branch Name Handling', () => {
    test('should validate branch names', async () => {
      // Initialize
      await workspaceManager.initialize({ workspace: testDir });
      
      // Valid branch names
      expect(() => workspaceManager.getBranchMemoryPath('feature/test')).not.toThrow();
      expect(() => workspaceManager.getBranchMemoryPath('fix/issue-123')).not.toThrow();
      expect(() => workspaceManager.getBranchMemoryPath('main')).not.toThrow();
      
      // Invalid branch names
      try {
        workspaceManager.getBranchMemoryPath('invalid_branch');
        fail('Expected error was not thrown');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('branch');
      }
      
      try {
        workspaceManager.getBranchMemoryPath('feature-no-slash');
        fail('Expected error was not thrown');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('branch');
      }
    });
    
    test('should sanitize branch names for paths', async () => {
      // Initialize
      await workspaceManager.initialize({ workspace: testDir });
      
      // Get paths for different branch names
      const path1 = workspaceManager.getBranchMemoryPath('feature/test/complex');
      const path2 = workspaceManager.getBranchMemoryPath('feature/test-123');
      
      // Verify paths
      expect(path1).toContain('feature-test-complex');
      expect(path1).not.toContain('feature/test/complex');
      
      expect(path2).toContain('feature-test-123');
      expect(path2).not.toContain('feature/test-123');
    });
  });

  describe('Language Resolution', () => {
    test('should fallback to default language if not specified', async () => {
      // Initialize with no language option
      const config = await workspaceManager.initialize({ 
        workspace: testDir 
      });
      
      // Verify default language
      expect(config.language).toBe('en');
    });
    
    test('should read language from package.json if available', async () => {
      // Create a package.json with language config
      const packageJsonPath = path.join(testDir, 'package.json');
      const packageJson = {
        name: 'test-package',
        version: '1.0.0',
        config: {
          language: 'ja'
        }
      };
      
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson));
      
      // Save current directory to restore later
      const originalCwd = process.cwd();
      
      try {
        // Change to test directory
        process.chdir(testDir);
        
        // Initialize with defaults (should read from package.json)
        const config = await workspaceManager.initialize();
        
        // Verify language from package.json
        expect(config.language).toBe('ja');
      } finally {
        // Restore original directory
        process.chdir(originalCwd);
      }
    });
    
    test('should validate language value', async () => {
      try {
        // Initialize with invalid language
        await workspaceManager.initialize({ 
          workspace: testDir,
          language: 'invalid-language' 
        });
        fail('Expected error was not thrown');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('language');
      }
    });
  });
});