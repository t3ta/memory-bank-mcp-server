import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { ConfigProvider } from '../../../../src/infrastructure/config/ConfigProvider';
import { CliOptions } from '../../../../src/infrastructure/config/WorkspaceConfig';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { InfrastructureError } from '../../../../src/shared/errors/InfrastructureError';

/**
 * Unit tests for ConfigProvider
 * 
 * These tests verify that the ConfigProvider correctly implements:
 * - Resolving workspace root and memory bank root paths with the correct priority
 * - Handling workspace and memory bank root paths from various sources (CLI, env, default)
 * - Validating and normalizing paths
 * - Creating directories when they don't exist
 */

// Mock fs module
jest.mock('node:fs', () => ({
  promises: {
    access: jest.fn().mockImplementation(() => Promise.resolve()),
    mkdir: jest.fn().mockImplementation(() => Promise.resolve()),
    readFile: jest.fn().mockImplementation(() => Promise.resolve('{}')),
  },
}));

describe('ConfigProvider', () => {
  let configProvider: ConfigProvider;
  let originalEnv: NodeJS.ProcessEnv;
  let originalCwd: typeof process.cwd;

  beforeEach(() => {
    // Save original env and cwd
    originalEnv = { ...process.env };
    originalCwd = process.cwd;

    // Mock process.cwd
    process.cwd = jest.fn().mockReturnValue('/mock/cwd') as unknown as typeof process.cwd;

    // Create new ConfigProvider
    configProvider = new ConfigProvider();

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original env and cwd
    process.env = originalEnv;
    process.cwd = originalCwd;
  });

  describe('initialize', () => {
    it('should use workspace option from CLI args when provided', async () => {
      // Arrange
      const options: CliOptions = {
        workspace: '/test/workspace'
      };
      
      // Mock fs.access to make file/directory exist
      (fs.access as jest.Mock).mockImplementation(() => Promise.resolve());

      // Act
      const config = await configProvider.initialize(options);

      // Assert
      expect(config.workspaceRoot).toBe('/test/workspace');
      expect(fs.access).toHaveBeenCalledWith('/test/workspace');
    });

    it('should use workspace from environment variable when CLI arg is not provided', async () => {
      // Arrange
      process.env.WORKSPACE_ROOT = '/env/workspace';
      
      // Mock fs.access to make file/directory exist
      (fs.access as jest.Mock).mockImplementation(() => Promise.resolve());

      // Act
      const config = await configProvider.initialize();

      // Assert
      expect(config.workspaceRoot).toBe('/env/workspace');
      expect(fs.access).toHaveBeenCalledWith('/env/workspace');
    });

    it('should use current working directory as workspace when no other source is available', async () => {
      // Arrange
      // Mock fs.access to make file/directory exist
      (fs.access as jest.Mock).mockImplementation(() => Promise.resolve());

      // Act
      const config = await configProvider.initialize();

      // Assert
      expect(config.workspaceRoot).toBe('/mock/cwd');
    });

    it('should use memoryRoot option from CLI args when provided', async () => {
      // Arrange
      const options: CliOptions = {
        memoryRoot: '/test/docs'
      };
      
      // Mock fs.access to make file/directory exist
      (fs.access as jest.Mock).mockImplementation(() => Promise.resolve());

      // Act
      const config = await configProvider.initialize(options);

      // Assert
      expect(config.memoryBankRoot).toBe('/test/docs');
      expect(fs.access).toHaveBeenCalledWith('/test/docs');
    });

    it('should use memory bank root from environment variable when CLI arg is not provided', async () => {
      // Arrange
      process.env.MEMORY_BANK_ROOT = '/env/docs';
      
      // Mock fs.access to make file/directory exist
      (fs.access as jest.Mock).mockImplementation(() => Promise.resolve());

      // Act
      const config = await configProvider.initialize();

      // Assert
      expect(config.memoryBankRoot).toBe('/env/docs');
      expect(fs.access).toHaveBeenCalledWith('/env/docs');
    });

    it('should use default memory bank root (workspace/docs) when no other source is available', async () => {
      // Arrange
      // Mock fs.access to make file/directory exist
      (fs.access as jest.Mock).mockImplementation(() => Promise.resolve());

      // Act
      const config = await configProvider.initialize();

      // Assert
      expect(config.memoryBankRoot).toBe(path.resolve('/mock/cwd', 'docs'));
    });

    it('should create directories if they do not exist', async () => {
      // Arrange
      const options: CliOptions = {
        workspace: '/test/workspace',
        memoryRoot: '/test/docs'
      };
      
      // Mock fs.access to throw error (directory doesn't exist)
      (fs.access as jest.Mock).mockImplementation(() => Promise.reject(new Error('Directory not found')));

      // Act
      await configProvider.initialize(options);

      // Assert
      expect(fs.mkdir).toHaveBeenCalledWith('/test/workspace', { recursive: true });
      expect(fs.mkdir).toHaveBeenCalledWith('/test/docs', { recursive: true });
      expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('global-memory-bank'), { recursive: true });
      expect(fs.mkdir).toHaveBeenCalledWith(expect.stringContaining('branch-memory-bank'), { recursive: true });
    });

    it('should resolve relative paths to absolute paths', async () => {
      // Arrange
      const options: CliOptions = {
        workspace: './relative/workspace',
        memoryRoot: './relative/docs'
      };
      
      // Mock fs.access to make file/directory exist
      (fs.access as jest.Mock).mockImplementation(() => Promise.resolve());

      // Act
      const config = await configProvider.initialize(options);

      // Assert
      expect(config.workspaceRoot).toBe(path.resolve('./relative/workspace'));
      expect(config.memoryBankRoot).toBe(path.resolve('./relative/docs'));
    });

    it('should throw InfrastructureError when path is empty', async () => {
      // Arrange
      const options: CliOptions = {
        workspace: ''
      };
      
      // Act & Assert
      await expect(configProvider.initialize(options)).rejects.toThrow(InfrastructureError);
      await expect(configProvider.initialize(options)).rejects.toThrow('Invalid workspace root');
    });

    it('should throw InfrastructureError when path is invalid', async () => {
      // Arrange
      const options: CliOptions = {
        workspace: '\0invalid:path' // Invalid character in path
      };
      
      // Mock fs.access to throw specific error for invalid path
      (fs.access as jest.Mock).mockImplementation(() => Promise.reject(new Error('Invalid path')));
      (fs.mkdir as jest.Mock).mockImplementation(() => Promise.reject(new Error('Cannot create directory with invalid path')));

      // Act & Assert
      await expect(configProvider.initialize(options)).rejects.toThrow(InfrastructureError);
    });

    it('should handle when both workspace and memoryRoot are provided', async () => {
      // Arrange
      const options: CliOptions = {
        workspace: '/test/workspace',
        memoryRoot: '/test/custom/docs'
      };
      
      // Mock fs.access to make file/directory exist
      (fs.access as jest.Mock).mockImplementation(() => Promise.resolve());

      // Act
      const config = await configProvider.initialize(options);

      // Assert
      expect(config.workspaceRoot).toBe('/test/workspace');
      expect(config.memoryBankRoot).toBe('/test/custom/docs');
    });

    it('should prioritize CLI args over environment variables', async () => {
      // Arrange
      const options: CliOptions = {
        workspace: '/test/workspace',
        memoryRoot: '/test/docs'
      };
      
      process.env.WORKSPACE_ROOT = '/env/workspace';
      process.env.MEMORY_BANK_ROOT = '/env/docs';
      
      // Mock fs.access to make file/directory exist
      (fs.access as jest.Mock).mockImplementation(() => Promise.resolve());

      // Act
      const config = await configProvider.initialize(options);

      // Assert
      expect(config.workspaceRoot).toBe('/test/workspace');
      expect(config.memoryBankRoot).toBe('/test/docs');
    });
  });

  describe('getters', () => {
    beforeEach(async () => {
      // Initialize config provider with default settings
      (fs.access as jest.Mock).mockImplementation(() => Promise.resolve());
      await configProvider.initialize();
    });

    it('getConfig should return the current configuration', () => {
      // Act
      const config = configProvider.getConfig();

      // Assert
      expect(config).toBeDefined();
      expect(config.workspaceRoot).toBe('/mock/cwd');
      expect(config.memoryBankRoot).toBe(path.resolve('/mock/cwd', 'docs'));
    });

    it('getGlobalMemoryPath should return the correct global memory bank path', () => {
      // Act
      const globalMemoryPath = configProvider.getGlobalMemoryPath();

      // Assert
      expect(globalMemoryPath).toBe(path.join(path.resolve('/mock/cwd', 'docs'), 'global-memory-bank'));
    });

    it('getBranchMemoryPath should return the correct branch memory bank path', () => {
      // Act
      const branchMemoryPath = configProvider.getBranchMemoryPath('feature/test');

      // Assert
      expect(branchMemoryPath).toBe(
        path.join(path.resolve('/mock/cwd', 'docs'), 'branch-memory-bank', 'feature-test')
      );
    });

    it('getLanguage should return the current language setting', () => {
      // Act
      const language = configProvider.getLanguage();

      // Assert
      expect(language).toBe('en'); // Default is 'en'
    });
  });
});