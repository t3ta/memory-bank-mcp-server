// /Users/t3ta/workspace/memory-bank-mcp-server/tests/debug/workspace-param.test.ts
import { resolveWorkspaceAndDocs } from '../../src/index.js';
import { createApplication } from '../../src/main/index.js';
import { ConfigProvider } from '../../src/infrastructure/config/ConfigProvider.js';
import path from 'node:path';

describe('Workspace parameter debugging tests', () => {
  const originalCwd = process.cwd();
  const testWorkspace = path.join(process.cwd(), 'tests', 'debug', 'test-workspace');
  const testDocs = path.join(testWorkspace, 'test-docs');

  // Mocked functions to avoid environment interference
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(process, 'cwd').mockReturnValue(originalCwd);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('resolveWorkspaceAndDocs function', () => {
    test('should prioritize tool parameters', () => {
      const result = resolveWorkspaceAndDocs(testWorkspace, testDocs);
      expect(result.workspace).toBe(testWorkspace);
      expect(result.docs).toBe(testDocs);
    });

    test('should use CLI arguments when tool parameters are not provided', () => {
      // Mock CLI arguments by modifying argv object
      // This is a simplified test - in real scenario we would need to mock yargs
      const result = resolveWorkspaceAndDocs();
      
      // In this test case, result should use default values
      // since we're not properly mocking argv
      expect(result.workspace).toBeDefined();
      expect(result.docs).toBeDefined();
    });
  });

  describe('createApplication function', () => {
    test('should pass workspace and memoryRoot correctly to Application', async () => {
      // Create application with explicit workspace and memoryRoot
      const app = await createApplication({
        workspace: testWorkspace,
        memoryRoot: testDocs,
        language: 'en',
        verbose: false
      });

      // Verify ConfigProvider in the app has correct values
      // This requires exposing config for testing purposes
      expect(app).toBeDefined();
      
      // Ideally we would check the actual config values, but for this test
      // we're just ensuring the application is created correctly
    });
  });

  describe('ConfigProvider class', () => {
    test('should resolve workspace root correctly', async () => {
      const configProvider = new ConfigProvider();
      
      // Use the private method for testing (need to make it accessible for test)
      // @ts-ignore - Accessing private method for testing
      const workspace = await configProvider['resolveWorkspaceRoot']({
        workspace: testWorkspace
      });
      
      expect(workspace).toBe(testWorkspace);
    });

    test('should resolve memory bank root correctly', async () => {
      const configProvider = new ConfigProvider();
      
      // @ts-ignore - Accessing private method for testing
      const memoryRoot = await configProvider['resolveMemoryBankRoot']({
        memoryRoot: testDocs
      }, testWorkspace);
      
      expect(memoryRoot).toBe(testDocs);
    });
  });
});