import path from 'path';
import fs from 'fs/promises';
import { BranchMemoryBank } from '../../src/managers/BranchMemoryBank';
import { MemoryBankError } from '../../src/errors/MemoryBankError';
import { setupTestFiles } from '../utils/fsUtils';
import { sampleBranchMemoryBank } from '../utils/testTemplates';

// Mock implementation
const mockFs = fs as jest.Mocked<typeof fs> & {
  __setMockFiles: (files: any) => void;
  __getMockFiles: () => any;
  __resetMockFiles: () => void;
};

describe('BranchMemoryBank', () => {
  const workspacePath = '/test-workspace';
  const branchName = 'feature/test';
  const basePath = path.join(workspacePath, 'docs', 'branch-memory-bank', 'feature-test');
  
  let branchMemoryBank: BranchMemoryBank;
  
  beforeEach(() => {
    mockFs.__resetMockFiles();
    branchMemoryBank = new BranchMemoryBank(workspacePath, branchName);
  });
  
  describe('constructor', () => {
    test('should create instance with correct properties', () => {
      expect(branchMemoryBank['workspacePath']).toBe(workspacePath);
      expect(branchMemoryBank['branchName']).toBe(branchName);
      expect(branchMemoryBank['basePath']).toBe(basePath);
    });
    
    test('should throw error if branch name does not start with feature/ or fix/', () => {
      expect(() => {
        new BranchMemoryBank(workspacePath, 'invalid-branch');
      }).toThrow(MemoryBankError);
      
      expect(() => {
        new BranchMemoryBank(workspacePath, 'main');
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
  
  describe('readBranchCoreFiles', () => {
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
      const coreFiles = await branchMemoryBank.readBranchCoreFiles();
      
      expect(coreFiles).toHaveLength(4);
      expect(coreFiles.find(f => f.path === 'branchContext.md')?.content).toBe(sampleBranchMemoryBank.branchContext);
      expect(coreFiles.find(f => f.path === 'activeContext.md')?.content).toBe(sampleBranchMemoryBank.activeContext);
      expect(coreFiles.find(f => f.path === 'systemPatterns.md')?.content).toBe(sampleBranchMemoryBank.systemPatterns);
      expect(coreFiles.find(f => f.path === 'progress.md')?.content).toBe(sampleBranchMemoryBank.progress);
    });
  });
  
  describe('writeBranchCoreFiles', () => {
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
      
      await branchMemoryBank.writeBranchCoreFiles({
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
      expect(content).toContain('Added new tests');
      expect(content).toContain('Fixed bugs');
      expect(content).toContain('Use Jest for testing');
      expect(content).toContain('How to improve test coverage');
      expect(content).toContain('Implement more tests');
      expect(content).toContain('Add integration tests');
    });
    
    test('should update progress', async () => {
      const progress = {
        status: '開発中',
        workingFeatures: ['Feature 1', 'Feature 2'],
        pendingImplementation: ['Feature 3', 'Feature 4'],
        knownIssues: ['Issue 1', 'Issue 2']
      };
      
      await branchMemoryBank.writeBranchCoreFiles({
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
      
      await branchMemoryBank.writeBranchCoreFiles({
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
      
      await branchMemoryBank.writeBranchCoreFiles({
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
      
      await branchMemoryBank.writeBranchCoreFiles(updates);
      
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
  
  describe('updateDocumentSections', () => {
    beforeEach(async () => {
      // Setup a test document
      const testDoc = `# テストドキュメント

## セクション1

これはセクション1の内容です。

## セクション2

これはセクション2の内容です。

## セクション3

これはセクション3の内容です。
`;
      
      await branchMemoryBank.initialize();
      await branchMemoryBank.writeDocument('test-sections.md', testDoc);
      
      // Clear mock calls after setup
      jest.clearAllMocks();
    });
    
    test('should replace section content', async () => {
      await branchMemoryBank.updateDocumentSections('test-sections.md', {
        'セクション2': {
          header: '## セクション2',
          content: '新しいセクション2の内容です。',
          mode: 'replace'
        }
      });
      
      // Check if writeFile was called
      expect(mockFs.writeFile).toHaveBeenCalled();
      
      // Read the updated document
      const updatedDoc = await branchMemoryBank.readDocument('test-sections.md');
      expect(updatedDoc.content).toContain('## セクション1');
      expect(updatedDoc.content).toContain('これはセクション1の内容です。');
      expect(updatedDoc.content).toContain('## セクション2');
      expect(updatedDoc.content).toContain('新しいセクション2の内容です。');
      expect(updatedDoc.content).toContain('## セクション3');
      expect(updatedDoc.content).toContain('これはセクション3の内容です。');
      expect(updatedDoc.content).not.toContain('これはセクション2の内容です。');
    });
    
    test('should append to section content', async () => {
      await branchMemoryBank.updateDocumentSections('test-sections.md', {
        'セクション1': {
          header: '## セクション1',
          content: '追加された内容です。',
          mode: 'append'
        }
      });
      
      // Read the updated document
      const updatedDoc = await branchMemoryBank.readDocument('test-sections.md');
      expect(updatedDoc.content).toContain('## セクション1');
      expect(updatedDoc.content).toContain('これはセクション1の内容です。');
      expect(updatedDoc.content).toContain('追加された内容です。');
    });
    
    test('should prepend to section content', async () => {
      await branchMemoryBank.updateDocumentSections('test-sections.md', {
        'セクション3': {
          header: '## セクション3',
          content: '先頭に追加された内容です。',
          mode: 'prepend'
        }
      });
      
      // Read the updated document
      const updatedDoc = await branchMemoryBank.readDocument('test-sections.md');
      expect(updatedDoc.content).toContain('## セクション3');
      expect(updatedDoc.content).toContain('先頭に追加された内容です。');
      expect(updatedDoc.content).toContain('これはセクション3の内容です。');
    });
    
    test('should handle array content for sections', async () => {
      await branchMemoryBank.updateDocumentSections('test-sections.md', {
        'セクション2': {
          header: '## セクション2',
          content: ['項目1', '項目2', '項目3'],
          mode: 'replace'
        }
      });
      
      // Read the updated document
      const updatedDoc = await branchMemoryBank.readDocument('test-sections.md');
      expect(updatedDoc.content).toContain('## セクション2');
      expect(updatedDoc.content).toContain('- 項目1');
      expect(updatedDoc.content).toContain('- 項目2');
      expect(updatedDoc.content).toContain('- 項目3');
    });
    
    test('should add new section if not found', async () => {
      await branchMemoryBank.updateDocumentSections('test-sections.md', {
        '新しいセクション': {
          header: '## 新しいセクション',
          content: 'これは新しいセクションの内容です。',
          mode: 'replace'
        }
      });
      
      // Read the updated document
      const updatedDoc = await branchMemoryBank.readDocument('test-sections.md');
      expect(updatedDoc.content).toContain('## 新しいセクション');
      expect(updatedDoc.content).toContain('これは新しいセクションの内容です。');
    });
    
    test('should normalize multiple consecutive empty lines', async () => {
      // Create a document with excessive newlines
      const docWithExcessiveNewlines = `# ドキュメント


## セクション1



内容1




## セクション2


内容2

`;
      
      await branchMemoryBank.writeDocument('newlines-test.md', docWithExcessiveNewlines);
      jest.clearAllMocks();
      
      // Update a section
      await branchMemoryBank.updateDocumentSections('newlines-test.md', {
        'セクション1': {
          header: '## セクション1',
          content: '新しい内容1',
          mode: 'replace'
        }
      });
      
      // Read the updated document
      const updatedDoc = await branchMemoryBank.readDocument('newlines-test.md');
      
      // No more than 2 consecutive newlines should exist
      expect(updatedDoc.content).not.toMatch(/\n{3,}/);
      
      // Correct content should be preserved
      expect(updatedDoc.content).toContain('# ドキュメント');
      expect(updatedDoc.content).toContain('## セクション1');
      expect(updatedDoc.content).toContain('新しい内容1');
      expect(updatedDoc.content).toContain('## セクション2');
      expect(updatedDoc.content).toContain('内容2');
    });
    
    test('should handle multiple sections with the same header', async () => {
      // Create a document with duplicate section headers
      const docWithDuplicateSections = `# ドキュメント

## 重複セクション
内容1

## 別のセクション
別の内容

## 重複セクション
内容2
`;
      
      await branchMemoryBank.writeDocument('duplicate-sections.md', docWithDuplicateSections);
      jest.clearAllMocks();
      
      // Update the duplicate section
      await branchMemoryBank.updateDocumentSections('duplicate-sections.md', {
        '重複セクション': {
          header: '## 重複セクション',
          content: '更新された内容',
          mode: 'replace'
        }
      });
      
      // Read the updated document
      const updatedDoc = await branchMemoryBank.readDocument('duplicate-sections.md');
      
      // Should remove duplicate sections and keep only one
      const matches = updatedDoc.content.match(/## 重複セクション/g);
      expect(matches?.length).toBe(1);
      
      // Updated content should be present
      expect(updatedDoc.content).toContain('更新された内容');
      
      // Other section should be preserved
      expect(updatedDoc.content).toContain('## 別のセクション');
      expect(updatedDoc.content).toContain('別の内容');
    });
  });
});
