import path from 'path';
import fs from 'fs/promises';
import { BranchMemoryBank } from '../../src/managers/BranchMemoryBank.js';
import { MemoryBankError } from '../../src/errors/MemoryBankError.js';
import { setupTestFiles } from '../utils/fsUtils';
import { sampleBranchMemoryBank } from '../utils/testTemplates';

// Mock implementation
const mockFs = fs as jest.Mocked<typeof fs> & {
  __setMockFiles: (files: any) => void;
  __getMockFiles: () => any;
  __resetMockFiles: () => void;
};

// Helper function to read branch core files
async function readBranchCoreFiles(bank: BranchMemoryBank): Promise<Array<{ path: string; content: string; lastModified?: Date }>> {
  const coreFiles = ['branchContext.md', 'activeContext.md', 'systemPatterns.md', 'progress.md'];
  const result = [];
  
  for (const file of coreFiles) {
    try {
      const doc = await bank.readDocument(file);
      result.push({
        path: file,
        content: doc.content,
        lastModified: doc.lastModified
      });
    } catch (error) {
      // Skip if file doesn't exist
    }
  }
  
  return result;
}

describe('BranchMemoryBank', () => {
  const workspacePath = '/test-workspace';
  const branchName = 'feature/test';
  const basePath = path.join(workspacePath, 'docs', 'branch-memory-bank', 'feature-test');
  
  let branchMemoryBank: BranchMemoryBank;
  
  beforeEach(() => {
    mockFs.__resetMockFiles();
    branchMemoryBank = new BranchMemoryBank(workspacePath, branchName, { 
      workspaceRoot: workspacePath,
      memoryBankRoot: path.join(workspacePath, 'docs'),
      verbose: false,
      language: 'ja'
    });
  });
  
  describe('constructor', () => {
    test('should create instance with correct properties', () => {
      expect(branchMemoryBank['basePath']).toBe(basePath);
      expect(branchMemoryBank['branchName']).toBe(branchName);
      expect(branchMemoryBank['basePath']).toBe(basePath);
    });
    
    test('should throw error if branch name does not start with feature/ or fix/', () => {
      expect(() => {
        new BranchMemoryBank(workspacePath, 'invalid-branch', {
          workspaceRoot: workspacePath,
          memoryBankRoot: path.join(workspacePath, 'docs'),
          verbose: false,
          language: 'ja'
        });
      }).toThrow(MemoryBankError);
      
      expect(() => {
        new BranchMemoryBank(workspacePath, 'main', {
          workspaceRoot: workspacePath,
          memoryBankRoot: path.join(workspacePath, 'docs'),
          verbose: false,
          language: 'ja'
        });
      }).toThrow(MemoryBankError);
    });
  });
  
  describe('initialize', () => {
    test('should create directory structure and initialize files', async () => {
      await branchMemoryBank.initialize();
      
      // Check if mkdir was called with correct path
      expect(mockFs.mkdir).toHaveBeenCalledWith(basePath, { recursive: true });
      
      // Check if writeFile was called for core files
      expect(mockFs.writeFile).toHaveBeenCalledTimes(4); // For the 4 core files
      
      // Verify the calls for each core file
      const writeFileCalls = (mockFs.writeFile as jest.Mock).mock.calls;
      const fileNames = writeFileCalls.map(call => path.basename(call[0]));
      
      expect(fileNames).toContain('branchContext.md');
      expect(fileNames).toContain('activeContext.md');
      expect(fileNames).toContain('systemPatterns.md');
      expect(fileNames).toContain('progress.md');
    });
    
    test('should not throw if already initialized', async () => {
      // Initialize once
      await branchMemoryBank.initialize();
      
      // Reset mock counters
      jest.clearAllMocks();
      
      // Initialize again
      await branchMemoryBank.initialize();
      
      // Should still create the files (now overwriting)
      expect(mockFs.writeFile).toHaveBeenCalledTimes(4);
    });
  });
  
  describe('readDocument', () => {
    beforeEach(async () => {
      // Setup test files
      setupTestFiles({
        [`${basePath}/branchContext.md`]: sampleBranchMemoryBank.branchContext,
        [`${basePath}/activeContext.md`]: sampleBranchMemoryBank.activeContext,
        [`${basePath}/systemPatterns.md`]: sampleBranchMemoryBank.systemPatterns,
        [`${basePath}/progress.md`]: sampleBranchMemoryBank.progress
      });
      
      // Initialize the branch memory bank
      await branchMemoryBank.initialize();
    });
    
    test('should read document content', async () => {
      const doc = await branchMemoryBank.readDocument('branchContext.md');
      
      expect(doc.content).toBe(sampleBranchMemoryBank.branchContext);
      expect(doc.tags).toEqual([]);
    });
    
    test('should throw error if document does not exist', async () => {
      await expect(branchMemoryBank.readDocument('nonexistent.md')).rejects.toThrow(MemoryBankError);
    });
  });
  
  describe('writeDocument', () => {
    beforeEach(async () => {
      await branchMemoryBank.initialize();
    });
    
    test('should write document content', async () => {
      const content = '# Test Document\n\nThis is a test document.';
      const tags = ['test', 'document'];
      
      await branchMemoryBank.writeDocument('test.md', content, tags);
      
      // Check if writeFile was called with correct content
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('test.md'),
        expect.stringContaining(content)
      );
      
      // Read the document back
      const doc = await branchMemoryBank.readDocument('test.md');
      expect(doc.content).toContain(content);
      expect(doc.tags).toEqual(tags);
    });
  });
  
  describe('core files reading', () => {
    beforeEach(async () => {
      // Setup test files
      setupTestFiles({
        [`${basePath}/branchContext.md`]: sampleBranchMemoryBank.branchContext,
        [`${basePath}/activeContext.md`]: sampleBranchMemoryBank.activeContext,
        [`${basePath}/systemPatterns.md`]: sampleBranchMemoryBank.systemPatterns,
        [`${basePath}/progress.md`]: sampleBranchMemoryBank.progress
      });
      
      await branchMemoryBank.initialize();
    });
    
    test('should read all core files', async () => {
      const coreFiles = await readBranchCoreFiles(branchMemoryBank);
      
      expect(coreFiles).toHaveLength(4);
      expect(coreFiles.find(f => f.path === 'branchContext.md')?.content).toBe(sampleBranchMemoryBank.branchContext);
      expect(coreFiles.find(f => f.path === 'activeContext.md')?.content).toBe(sampleBranchMemoryBank.activeContext);
      expect(coreFiles.find(f => f.path === 'systemPatterns.md')?.content).toBe(sampleBranchMemoryBank.systemPatterns);
      expect(coreFiles.find(f => f.path === 'progress.md')?.content).toBe(sampleBranchMemoryBank.progress);
    });
  });

  describe('updateActiveContext', () => {
    beforeEach(async () => {
      await branchMemoryBank.initialize();
      jest.clearAllMocks();
    });

    test('should update current work', async () => {
      await branchMemoryBank.updateActiveContext({
        currentWork: 'テスト中のタスク'
      });

      // Check if writeFile was called with content containing the update
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('activeContext.md'),
        expect.stringContaining('テスト中のタスク')
      );

      // Read the document back to verify
      const doc = await branchMemoryBank.readDocument('activeContext.md');
      expect(doc.content).toContain('テスト中のタスク');
    });

    test('should update multiple sections', async () => {
      await branchMemoryBank.updateActiveContext({
        currentWork: '複数セクションの更新テスト',
        recentChanges: ['変更1', '変更2'],
        activeDecisions: ['決定1'],
        considerations: ['考慮点1', '考慮点2'],
        nextSteps: ['次のステップ1']
      });

      // Read the document back to verify
      const doc = await branchMemoryBank.readDocument('activeContext.md');
      expect(doc.content).toContain('複数セクションの更新テスト');
      expect(doc.content).toContain('- 変更1');
      expect(doc.content).toContain('- 変更2');
      expect(doc.content).toContain('- 決定1');
      expect(doc.content).toContain('- 考慮点1');
      expect(doc.content).toContain('- 考慮点2');
      expect(doc.content).toContain('- 次のステップ1');
    });

    test('should handle append mode', async () => {
      // First update
      await branchMemoryBank.updateActiveContext({
        currentWork: '初期状態',
        nextSteps: ['ステップA']
      });

      // Second update with append mode
      await branchMemoryBank.updateActiveContext({
        nextSteps: ['ステップB'],
        editOptions: { mode: 'append' }
      });

      // Read the document back to verify
      const doc = await branchMemoryBank.readDocument('activeContext.md');
      expect(doc.content).toContain('初期状態'); // Should preserve current work
      expect(doc.content).toContain('- ステップA'); // Should keep original step
      expect(doc.content).toContain('- ステップB'); // Should append new step
    });
  });

  describe('updateProgress', () => {
    beforeEach(async () => {
      await branchMemoryBank.initialize();
      jest.clearAllMocks();
    });

    test('should update status', async () => {
      await branchMemoryBank.updateProgress({
        status: '開発中'
      });

      // Read the document back to verify
      const doc = await branchMemoryBank.readDocument('progress.md');
      expect(doc.content).toContain('開発中');
    });

    test('should update features lists', async () => {
      await branchMemoryBank.updateProgress({
        workingFeatures: ['機能1', '機能2'],
        pendingImplementation: ['未実装1'],
        knownIssues: ['問題1', '問題2']
      });

      // Read the document back to verify
      const doc = await branchMemoryBank.readDocument('progress.md');
      expect(doc.content).toContain('- 機能1');
      expect(doc.content).toContain('- 機能2');
      expect(doc.content).toContain('- 未実装1');
      expect(doc.content).toContain('- 問題1');
      expect(doc.content).toContain('- 問題2');
    });
  });

  describe('addTechnicalDecision', () => {
    beforeEach(async () => {
      await branchMemoryBank.initialize();
      jest.clearAllMocks();
    });

    test('should add a technical decision', async () => {
      await branchMemoryBank.addTechnicalDecision({
        title: 'テスト決定',
        context: 'テストのコンテキスト',
        decision: 'テストの決定内容',
        consequences: ['影響1', '影響2']
      });

      // Read the document back to verify
      const doc = await branchMemoryBank.readDocument('systemPatterns.md');
      expect(doc.content).toContain('### テスト決定');
      expect(doc.content).toContain('テストのコンテキスト');
      expect(doc.content).toContain('テストの決定内容');
      expect(doc.content).toContain('- 影響1');
      expect(doc.content).toContain('- 影響2');
    });

    test('should append multiple technical decisions', async () => {
      // Add first decision
      await branchMemoryBank.addTechnicalDecision({
        title: '決定1',
        context: 'コンテキスト1',
        decision: '決定内容1',
        consequences: ['決定1の影響']
      });

      // Add second decision
      await branchMemoryBank.addTechnicalDecision({
        title: '決定2',
        context: 'コンテキスト2',
        decision: '決定内容2',
        consequences: ['決定2の影響']
      });

      // Read the document back to verify
      const doc = await branchMemoryBank.readDocument('systemPatterns.md');
      expect(doc.content).toContain('### 決定1');
      expect(doc.content).toContain('コンテキスト1');
      expect(doc.content).toContain('決定内容1');
      expect(doc.content).toContain('決定1の影響');
      expect(doc.content).toContain('### 決定2');
      expect(doc.content).toContain('コンテキスト2');
      expect(doc.content).toContain('決定内容2');
      expect(doc.content).toContain('決定2の影響');
    });
  });
  
  describe('writeCoreFiles', () => {
    beforeEach(async () => {
      await branchMemoryBank.initialize();
      
      // Clear mock calls after initialization
      jest.clearAllMocks();
    });
    
    test('should update activeContext', async () => {
      const activeContext = {
        currentWork: 'Testing BranchMemoryBank',
        recentChanges: ['Added new tests', 'Fixed bugs'],
        activeDecisions: ['Use Jest for testing'],
        considerations: ['How to improve test coverage'],
        nextSteps: ['Implement more tests', 'Add integration tests']
      };
      
      await branchMemoryBank.writeCoreFiles({
        branch: branchName,
        files: { activeContext }
      });
      
      // Check if writeFile was called with correct content
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('activeContext.md'),
        expect.stringContaining('Testing BranchMemoryBank')
      );
      
      const writeFileCall = (mockFs.writeFile as jest.Mock).mock.calls.find(
        call => call[0].includes('activeContext.md')
      );
      
      const content = writeFileCall ? writeFileCall[1] : '';
      expect(content).toContain('## 現在の作業内容\nTesting BranchMemoryBank');
      expect(content).toContain('- Added new tests');
      expect(content).toContain('- Fixed bugs');
      expect(content).toContain('- Use Jest for testing');
      expect(content).toContain('- How to improve test coverage');
      expect(content).toContain('- Implement more tests');
      expect(content).toContain('- Add integration tests');
    });
    
    test('should update progress', async () => {
      const progress = {
        status: '開発中',
        workingFeatures: ['Feature 1', 'Feature 2'],
        pendingImplementation: ['Feature 3', 'Feature 4'],
        knownIssues: ['Issue 1', 'Issue 2']
      };
      
      await branchMemoryBank.writeCoreFiles({
        branch: branchName,
        files: { progress }
      });
      
      // Check if writeFile was called with correct content
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('progress.md'),
        expect.stringContaining('開発中')
      );
      
      const writeFileCall = (mockFs.writeFile as jest.Mock).mock.calls.find(
        call => call[0].includes('progress.md')
      );
      
      const content = writeFileCall ? writeFileCall[1] : '';
      expect(content).toContain('## 現在の状態\n開発中');
      expect(content).toContain('- Feature 1');
      expect(content).toContain('- Feature 2');
      expect(content).toContain('- Feature 3');
      expect(content).toContain('- Feature 4');
      expect(content).toContain('- Issue 1');
      expect(content).toContain('- Issue 2');
    });
    
    test('should update systemPatterns with technical decisions', async () => {
      const technicalDecisions = [
        {
          title: 'Test Decision',
          context: 'Test context',
          decision: 'Made a test decision',
          consequences: ['Consequence 1', 'Consequence 2']
        }
      ];
      
      await branchMemoryBank.writeCoreFiles({
        branch: branchName,
        files: { 
          systemPatterns: { 
            technicalDecisions
          } 
        }
      });
      
      // Check if writeFile was called with correct content
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('systemPatterns.md'),
        expect.stringContaining('Test Decision')
      );
      
      const writeFileCall = (mockFs.writeFile as jest.Mock).mock.calls.find(
        call => call[0].includes('systemPatterns.md')
      );
      
      const content = writeFileCall ? writeFileCall[1] : '';
      expect(content).toContain('### Test Decision');
      expect(content).toContain('Test context');
      expect(content).toContain('Made a test decision');
      expect(content).toContain('- Consequence 1');
      expect(content).toContain('- Consequence 2');
    });
    
    test('should update branchContext', async () => {
      const branchContextContent = '# テスト用ブランチコンテキスト\n\nこれはテスト用のコンテンツです。';
      
      await branchMemoryBank.writeCoreFiles({
        branch: branchName,
        files: { 
          branchContext: { 
            content: branchContextContent
          } 
        }
      });
      
      // Check if writeFile was called with correct content
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('branchContext.md'),
        branchContextContent
      );
      
      // Read the document back to verify
      const doc = await branchMemoryBank.readDocument('branchContext.md');
      expect(doc.content).toBe(branchContextContent);
    });
    
    test('should update multiple core files at once', async () => {
      const updates = {
        branch: branchName,
        files: {
          branchContext: { 
            content: '# 更新されたブランチコンテキスト' 
          },
          activeContext: {
            currentWork: '複数ファイルのテスト',
            recentChanges: ['まとめて更新']
          },
          progress: {
            status: 'テスト中'
          }
        }
      };
      
      await branchMemoryBank.writeCoreFiles(updates);
      
      // Should call writeFile for each updated file
      expect(mockFs.writeFile).toHaveBeenCalledTimes(3);
      
      // Verify branchContext update
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('branchContext.md'),
        '# 更新されたブランチコンテキスト'
      );
      
      // Verify activeContext update
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('activeContext.md'),
        expect.stringContaining('複数ファイルのテスト')
      );
      
      // Verify progress update
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('progress.md'),
        expect.stringContaining('テスト中')
      );
    });
  });
});
