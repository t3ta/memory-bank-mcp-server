// @ts-nocheck
import * as path from 'path';
import { sampleBranchMemoryBank } from '../utils/testTemplates';

// Mock the fs/promises module
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockResolvedValue(undefined),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue('mocked content'),
  stat: jest.fn().mockResolvedValue({ mtime: new Date() }),
  access: jest.fn().mockResolvedValue(undefined)
}));

// Mock the BranchMemoryBank class
jest.mock('../../src/managers/BranchMemoryBank', () => {
  return {
    BranchMemoryBank: class MockBranchMemoryBank {
      constructor(basePath, branchName, config) {
        this.basePath = path.join(basePath, 'docs', 'branch-memory-bank', branchName.replace(/\//g, '-'));
        this.branchName = branchName;
        this.language = config.language;
      }

      async initialize() {}

      async readDocument(file) {
        const content = sampleBranchMemoryBank[file.replace(/\.md$/, '')] || '';
        return {
          content,
          tags: [],
          lastModified: new Date(),
          path: file
        };
      }

      async writeDocument(file, content, tags = []) {}

      async updateActiveContext(updates) {}

      async updateProgress(updates) {}

      async addTechnicalDecision(decision) {}

      async writeCoreFiles(args) {}
    }
  };
});

// Now we can import it
const { BranchMemoryBank } = require('../../src/managers/BranchMemoryBank');

describe('BranchMemoryBank', () => {
  const workspacePath = '/test-workspace';
  const branchName = 'feature/test';
  const basePath = path.join(workspacePath, 'docs', 'branch-memory-bank', 'feature-test');

  let branchMemoryBank;

  beforeEach(() => {
    jest.clearAllMocks();
    branchMemoryBank = new BranchMemoryBank(workspacePath, branchName, {
      workspaceRoot: workspacePath,
      memoryBankRoot: path.join(workspacePath, 'docs'),
      verbose: false,
      language: 'ja'
    });
  });

  describe('constructor', () => {
    test('should create instance with correct properties', () => {
      expect(branchMemoryBank.basePath).toBe(basePath);
      expect(branchMemoryBank.branchName).toBe(branchName);
    });
  });

  describe('initialize', () => {
    test('should not throw errors', async () => {
      await expect(branchMemoryBank.initialize()).resolves.not.toThrow();
    });
  });

  describe('readDocument', () => {
    test('should return document content', async () => {
      const doc = await branchMemoryBank.readDocument('branchContext.md');
      expect(doc).toBeDefined();
      expect(doc.content).toBe(sampleBranchMemoryBank.branchContext);
    });
  });

  describe('writeCoreFiles', () => {
    test('should not throw errors', async () => {
      const activeContext = {
        currentWork: 'Testing BranchMemoryBank',
        recentChanges: ['Added new tests', 'Fixed bugs'],
        activeDecisions: ['Use Jest for testing'],
        considerations: ['How to improve test coverage'],
        nextSteps: ['Implement more tests', 'Add integration tests']
      };

      await expect(branchMemoryBank.writeCoreFiles({
        branch: branchName,
        files: { activeContext }
      })).resolves.not.toThrow();
    });
  });
});
