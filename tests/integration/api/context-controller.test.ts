// @ts-nocheck
// This file was automatically converted from ts-mockito to jest.fn()
import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import { ContextController } from '../../../src/interface/controllers/ContextController.js';
import { ReadContextUseCase } from '../../../src/application/usecases/common/ReadContextUseCase.js';
import { ReadRulesUseCase } from '../../../src/application/usecases/common/ReadRulesUseCase.js';
import { DocumentPath } from '../../../src/domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../src/domain/entities/MemoryDocument.js';
import { BranchInfo } from '../../../src/domain/entities/BranchInfo.js';
import { DomainError, DomainErrorCodes } from '../../../src/shared/errors/DomainError.js';

// Import mocks
import { createMockBranchMemoryBankRepository } from '../../mocks/repositories/branch-memory-bank-repository.mock.js';
import { createMockGlobalMemoryBankRepository } from '../../mocks/repositories/global-memory-bank-repository.mock.js';
// ts-mockito import removed;

/**
 * Integration Test: ContextController with Mocks
 *
 * Testing controller with mocked repositories
 */
describe('ContextController Integration Tests with Mocks', () => {
  // Test variables
  const testBranch = 'feature/test-branch';
  const nonExistentBranch = 'non-existent-branch';

  // Mocked English rules content
  const mockEnRulesContent = '# Rules\n\nThese are the English rules.';
  const mockJaRulesContent = '# ルール\n\nこれは日本語のルールです。';

  // Test documents
  const branchDocuments = {
    'branchContext.md': '# Branch Context\n\nThis is a test branch.',
    'activeContext.md': '# Active Context\n\nThis is the current context.',
    'config.json': '{"name": "test", "value": 123}'
  };

  const globalDocuments = {
    'architecture.md': '# Architecture\n\nThis is a description of the system architecture.',
    'glossary.md': '# Glossary\n\nThis is a description of important terms.'
  };

  // Mock instances
  let branchRepositoryMock: ReturnType<typeof createMockBranchMemoryBankRepository>;
  let globalRepositoryMock: ReturnType<typeof createMockGlobalMemoryBankRepository>;
  let readRulesUseCase: ReadRulesUseCase;
  let readContextUseCase: ReadContextUseCase;
  let controller: ContextController;

  // Setup mock for rules directory
  let mockRulesDir: string;

  // Setup common test context
  beforeEach(() => {
    // Set up mocks for each test
    mockRulesDir = '/path/to/rules';

    // Create repository mocks
    branchRepositoryMock = createMockBranchMemoryBankRepository();
    
    // Mock exists method
    branchRepositoryMock.mock.exists = jest.fn().mockImplementation((branchInfo) => {
      return Promise.resolve(branchInfo.equals(BranchInfo.create(testBranch)));
    });
    
    // Mock listDocuments method for test branch
    branchRepositoryMock.mock.listDocuments = jest.fn().mockImplementation((branchInfo) => {
      if (branchInfo.equals(BranchInfo.create(testBranch))) {
        return Promise.resolve(Object.keys(branchDocuments).map(key => DocumentPath.create(key)));
      }
      return Promise.resolve([]);
    });
    
    // Mock getDocument method for test branch
    branchRepositoryMock.mock.getDocument = jest.fn().mockImplementation((branchInfo, documentPath) => {
      if (branchInfo.equals(BranchInfo.create(testBranch))) {
        const pathStr = documentPath.toString();
        if (branchDocuments[pathStr]) {
          return Promise.resolve(
            MemoryDocument.create({
              path: documentPath,
              content: branchDocuments[pathStr],
              tags: [],
              lastModified: new Date()
            })
          );
        }
      }
      return Promise.resolve(null);
    });

    globalRepositoryMock = createMockGlobalMemoryBankRepository();
    
    // Mock listDocuments method
    globalRepositoryMock.mock.listDocuments = jest.fn().mockImplementation(() => {
      return Promise.resolve(Object.keys(globalDocuments).map(key => DocumentPath.create(key)));
    });
    
    // Mock getDocument method
    globalRepositoryMock.mock.getDocument = jest.fn().mockImplementation((documentPath) => {
      const pathStr = documentPath.toString();
      if (globalDocuments[pathStr]) {
        return Promise.resolve(
          MemoryDocument.create({
            path: documentPath,
            content: globalDocuments[pathStr],
            tags: [],
            lastModified: new Date()
          })
        );
      }
      return Promise.resolve(null);
    });

    // Create ReadRulesUseCase mock
    readRulesUseCase = {
      execute: jest.fn().mockImplementation((language) => {
        if (language === 'en') {
          return Promise.resolve({
            content: mockEnRulesContent,
            language: 'en'
          });
        } else if (language === 'ja') {
          return Promise.resolve({
            content: mockJaRulesContent,
            language: 'ja'
          });
        } else if (language === 'fr') {
          throw new DomainError(DomainErrorCodes.VALIDATION_ERROR, 'Unsupported language code: fr');
        }
        return Promise.resolve({
          content: '',
          language: language
        });
      })
    } as unknown as ReadRulesUseCase;

    // Mock ReadContextUseCase instead of creating a real one
    readContextUseCase = {
      execute: jest.fn().mockImplementation((request) => {
        if (request.branch === testBranch) {
          return Promise.resolve({
            branchMemory: branchDocuments,
            globalMemory: globalDocuments
          });
        } else if (request.branch === nonExistentBranch) {
          throw new DomainError(
            DomainErrorCodes.BRANCH_INITIALIZATION_FAILED,
            `Failed to auto-initialize branch: ${nonExistentBranch}`
          );
        }
        return Promise.resolve({});
      })
    } as unknown as ReadContextUseCase;

    // Initialize controller with mocked use cases
    controller = new ContextController(
      readContextUseCase,
      readRulesUseCase
    );
  });
  
  describe('Rules Operations', () => {

    it('Should be able to read rules', async () => {
      // Read English rules
      const enResult = await controller.readRules('en');

      // Verify read result
      expect(enResult.success).toBe(true);
      expect(enResult.error).toBeUndefined();
      expect(enResult.data).toBeDefined();
      expect(enResult.data?.content).toContain('English rules');

      // Read Japanese rules
      const jaResult = await controller.readRules('ja');

      // Verify read result
      expect(jaResult.success).toBe(true);
      expect(jaResult.data?.content).toContain('日本語のルール');
    });

    it('Should return an error for unsupported language code', async () => {
      // Unsupported language code
      const unsupportedResult = await controller.readRules('fr');

      // Verify failure result
      expect(unsupportedResult.success).toBe(false);
      expect(unsupportedResult.error).toBeDefined();
      expect(unsupportedResult.error).toContain('Unsupported language');
    });

    it.skip('Should handle empty rules content', async () => {
      // このテストは空のルールコンテンツの処理を検証
      // 実装が必要
    });
  });

  describe('Context Operations', () => {

    it('Should be able to read complete context', async () => {
    // Read complete context
    const contextResult = await controller.readContext({
      branch: testBranch,
      language: 'ja',
      includeRules: true,
      includeBranchMemory: true,
      includeGlobalMemory: true
    });

    // Verify read result
    expect(contextResult.success).toBe(true);
    expect(contextResult.error).toBeUndefined();
    expect(contextResult.data).toBeDefined();

    // Verify context data structure
    const context = contextResult.data;
    expect(context?.rules).toBeDefined();
    expect(context?.branchMemory).toBeDefined();
    expect(context?.globalMemory).toBeDefined();

    // Verify content of each file
    expect(context?.rules?.content).toContain('日本語のルール');
    expect(context?.branchMemory?.['branchContext.md']).toBeDefined();
    expect(context?.branchMemory?.['activeContext.md']).toBeDefined();
    expect(context?.globalMemory?.['architecture.md']).toBeDefined();
    expect(context?.globalMemory?.['glossary.md']).toBeDefined();
  });

    it('Should be able to read branch memory only context (includeRules=false is ignored)', async () => {
    // Read branch memory only context, but note that includeRules=false is now ignored
    const branchOnlyResult = await controller.readContext({
      branch: testBranch,
      language: 'en',
      includeRules: false,  // This is now ignored, rules will always be included
      includeBranchMemory: true,
      includeGlobalMemory: false  // This is now ignored, global memory will always be included
    });

    // Verify read result
    expect(branchOnlyResult.success).toBe(true);
    expect(branchOnlyResult.data).toBeDefined();
    expect(branchOnlyResult.data?.rules).toBeDefined();  // Rules are now always included
    expect(branchOnlyResult.data?.branchMemory).toBeDefined();
    expect(branchOnlyResult.data?.branchMemory?.['branchContext.md']).toBeDefined();
    expect(branchOnlyResult.data?.branchMemory?.['activeContext.md']).toBeDefined();
    expect(branchOnlyResult.data?.globalMemory).toBeDefined();  // Global memory is now always included
  });

    it('Should be able to read global memory only context (includeRules=false is ignored)', async () => {
    // Read global memory only context, but note that includeRules=false and includeBranchMemory=false are now ignored
    const globalOnlyResult = await controller.readContext({
      branch: testBranch,
      language: 'en',
      includeRules: false,  // This is now ignored, rules will always be included
      includeBranchMemory: false,  // This is now ignored, branch memory will always be included
      includeGlobalMemory: true
    });

    // Verify read result
    expect(globalOnlyResult.success).toBe(true);
    expect(globalOnlyResult.data).toBeDefined();
    expect(globalOnlyResult.data?.rules).toBeDefined();  // Rules are now always included
    expect(globalOnlyResult.data?.branchMemory).toBeDefined();  // Branch memory is now always included
    expect(globalOnlyResult.data?.globalMemory).toBeDefined();
    expect(globalOnlyResult.data?.globalMemory?.['architecture.md']).toBeDefined();
    expect(globalOnlyResult.data?.globalMemory?.['glossary.md']).toBeDefined();
  });

    it('Should be able to read rules only context (includeBranchMemory=false is ignored)', async () => {
    // Read rules only context, but note that includeBranchMemory=false and includeGlobalMemory=false are now ignored
    const rulesOnlyResult = await controller.readContext({
      branch: testBranch,
      language: 'en',
      includeRules: true,
      includeBranchMemory: false,  // This is now ignored, branch memory will always be included
      includeGlobalMemory: false  // This is now ignored, global memory will always be included
    });

    // Verify read result
    expect(rulesOnlyResult.success).toBe(true);
    expect(rulesOnlyResult.data).toBeDefined();
    expect(rulesOnlyResult.data?.rules).toBeDefined();
    expect(rulesOnlyResult.data?.rules?.content).toContain('English rules');
    expect(rulesOnlyResult.data?.branchMemory).toBeDefined();  // Branch memory is now always included
    expect(rulesOnlyResult.data?.globalMemory).toBeDefined();  // Global memory is now always included
  });

    it('Should support both JSON and MD file formats', async () => {
    // Read context with JSON file
    const contextResult = await controller.readContext({
      branch: testBranch,
      language: 'en',
      includeBranchMemory: true
    });

    // Verify read result
    expect(contextResult.success).toBe(true);
    expect(contextResult.data?.branchMemory?.['config.json']).toBeDefined();
    expect(contextResult.data?.branchMemory?.['config.json']).toContain('"value": 123');
  });

    it('Should return an error when branch auto-initialization fails', async () => {
      // このテストでは、存在しないブランチを自動初期化する過程でエラーが発生するケースをテストします
      // (例: 権限不足、ディスク容量不足、ネットワークエラーなど様々な理由で初期化が失敗する可能性がある)
      console.log('Testing auto-initialization failure for branch:', nonExistentBranch);

      try {
        const contextResult = await controller.readContext({
          branch: nonExistentBranch,
          language: 'en',
          includeRules: false,
          includeBranchMemory: true, // ブランチメモリを要求 → 自動初期化が試みられる
          includeGlobalMemory: false
        });

        console.log('TEST RESULT:', {
          success: contextResult.success,
          error: contextResult.error,
          data: contextResult.data
        });

        // 自動初期化が失敗した場合はエラーが返されるべき
        expect(contextResult.success).toBe(false);
        expect(contextResult.error).toBeDefined();
        expect(contextResult.error).toContain('branch');
      } catch (error) {
        console.error('Unexpected error in test:', error);
        throw error;
      }
    });
  });

  describe('Error Handling', () => {
    it.skip('Should handle repository connection errors', async () => {
      // リポジトリ接続エラーの処理を検証
      // 実装が必要
    });

    it.skip('Should handle concurrent requests gracefully', async () => {
      // 同時リクエストの処理を検証
      // 実装が必要
    });
  });

  describe('Performance', () => {
    it.skip('Should handle large number of documents', async () => {
      // 大量のドキュメント処理のパフォーマンスを検証
      // 実装が必要
    });

    it.skip('Should handle large file sizes', async () => {
      // 大きなファイルサイズの処理を検証
      // 実装が必要
    });
  });
});
