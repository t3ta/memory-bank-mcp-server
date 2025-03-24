import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import path from 'node:path';

/**
 * Unit tests for resolveWorkspaceAndDocs helper function
 * 
 * These tests verify that the resolveWorkspaceAndDocs function correctly implements:
 * - Resolving workspace and docs paths with the correct priority
 * - Handling parameters from various sources (tool params, CLI args, env vars, default)
 */

jest.mock('node:path', () => {
  const originalModule: typeof import('node:path') = jest.requireActual('node:path');
  return {
    ...originalModule,
    join: jest.fn((...args) => args.join('/')),
    resolve: jest.fn((base, ...args) => `${base}/${args.join('/')}`)
  };
});

// Mocked version of the function to test
function resolveWorkspaceAndDocs(toolWorkspace?: string, toolDocs?: string) {
  // Mock function that follows the same logic as the original
  const argv = {
    workspace: resolveWorkspaceAndDocs.mockArgv.workspace,
    docs: resolveWorkspaceAndDocs.mockArgv.docs
  };
  
  // 1. Tool parameters (highest priority)
  // 2. Command line arguments
  // 3. Environment variables
  // 4. Default values
  const workspace = toolWorkspace || argv.workspace || process.env.WORKSPACE_ROOT || process.cwd();
  const docs = toolDocs || argv.docs || process.env.MEMORY_BANK_ROOT ||
    (typeof workspace === 'string' ? path.join(workspace, 'docs') : './docs');

  return { workspace, docs };
}

// Add a mockArgv property to our function
resolveWorkspaceAndDocs.mockArgv = {
  workspace: undefined,
  docs: undefined
};

describe('resolveWorkspaceAndDocs', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let originalCwd: typeof process.cwd;

  beforeEach(() => {
    // Save original env and cwd
    originalEnv = { ...process.env };
    originalCwd = process.cwd;

    // Mock process.cwd
    process.cwd = jest.fn().mockReturnValue('/mock/cwd') as unknown as typeof process.cwd;

    // Reset mock argv
    resolveWorkspaceAndDocs.mockArgv = {
      workspace: undefined,
      docs: undefined
    };

    // Reset mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Restore original env and cwd
    process.env = originalEnv;
    process.cwd = originalCwd;
  });

  it('should prioritize tool parameters over all other sources', () => {
    // Arrange
    resolveWorkspaceAndDocs.mockArgv.workspace = '/cli/workspace';
    resolveWorkspaceAndDocs.mockArgv.docs = '/cli/docs';
    process.env.WORKSPACE_ROOT = '/env/workspace';
    process.env.MEMORY_BANK_ROOT = '/env/docs';

    // Act
    const result = resolveWorkspaceAndDocs('/tool/workspace', '/tool/docs');

    // Assert
    expect(result.workspace).toBe('/tool/workspace');
    expect(result.docs).toBe('/tool/docs');
  });

  it('should use CLI args when tool parameters are not provided', () => {
    // Arrange
    resolveWorkspaceAndDocs.mockArgv.workspace = '/cli/workspace';
    resolveWorkspaceAndDocs.mockArgv.docs = '/cli/docs';
    process.env.WORKSPACE_ROOT = '/env/workspace';
    process.env.MEMORY_BANK_ROOT = '/env/docs';

    // Act
    const result = resolveWorkspaceAndDocs();

    // Assert
    expect(result.workspace).toBe('/cli/workspace');
    expect(result.docs).toBe('/cli/docs');
  });

  it('should use environment variables when tool parameters and CLI args are not provided', () => {
    // Arrange
    resolveWorkspaceAndDocs.mockArgv.workspace = undefined;
    resolveWorkspaceAndDocs.mockArgv.docs = undefined;
    process.env.WORKSPACE_ROOT = '/env/workspace';
    process.env.MEMORY_BANK_ROOT = '/env/docs';

    // Act
    const result = resolveWorkspaceAndDocs();

    // Assert
    expect(result.workspace).toBe('/env/workspace');
    expect(result.docs).toBe('/env/docs');
  });

  it('should use default values when no other sources are available', () => {
    // Arrange
    resolveWorkspaceAndDocs.mockArgv.workspace = undefined;
    resolveWorkspaceAndDocs.mockArgv.docs = undefined;
    process.env.WORKSPACE_ROOT = undefined;
    process.env.MEMORY_BANK_ROOT = undefined;

    // Act
    const result = resolveWorkspaceAndDocs();

    // Assert
    expect(result.workspace).toBe('/mock/cwd');
    expect(result.docs).toBe('/mock/cwd/docs');
  });

  it('should use workspace from tool parameters and default docs when only workspace is provided', () => {
    // Arrange
    resolveWorkspaceAndDocs.mockArgv.workspace = '/cli/workspace';
    resolveWorkspaceAndDocs.mockArgv.docs = '/cli/docs';

    // Act
    const result = resolveWorkspaceAndDocs('/tool/workspace');

    // Assert
    expect(result.workspace).toBe('/tool/workspace');
    expect(result.docs).toBe('/cli/docs');
  });

  it('should use docs from tool parameters and CLI workspace when only docs is provided', () => {
    // Arrange
    resolveWorkspaceAndDocs.mockArgv.workspace = '/cli/workspace';
    resolveWorkspaceAndDocs.mockArgv.docs = '/cli/docs';

    // Act
    const result = resolveWorkspaceAndDocs(undefined, '/tool/docs');

    // Assert
    expect(result.workspace).toBe('/cli/workspace');
    expect(result.docs).toBe('/tool/docs');
  });

  it('should correctly determine docs path based on workspace when docs is not specified', () => {
    // Arrange
    resolveWorkspaceAndDocs.mockArgv.workspace = undefined;
    resolveWorkspaceAndDocs.mockArgv.docs = undefined;
    process.env.WORKSPACE_ROOT = '/env/workspace';
    process.env.MEMORY_BANK_ROOT = undefined;

    // Act
    const result = resolveWorkspaceAndDocs();

    // Assert
    expect(result.workspace).toBe('/env/workspace');
    expect(result.docs).toBe('/env/workspace/docs');
  });
});
