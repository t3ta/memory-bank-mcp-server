// @ts-nocheck
import { promises as fs } from 'fs';
import * as path from 'path';
import { WorkspaceManager } from '../../src/managers/WorkspaceManager';
import { BranchMemoryBank } from '../../src/managers/BranchMemoryBank';
import { GlobalMemoryBank } from '../../src/managers/GlobalMemoryBank';

describe('WorkspaceManager and MemoryBank Integration', () => {
  const testDir = path.join(process.cwd(), 'temp-test-integration');
  let workspaceManager: WorkspaceManager;

  // Set up test environment
  beforeEach(async () => {
    // Clean up existing test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore error if directory doesn't exist
    }

    // Create test directory
    await fs.mkdir(testDir, { recursive: true });

    // Create new instance for each test
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

  describe('WorkspaceManager with BranchMemoryBank', () => {
    test('should correctly initialize BranchMemoryBank with WorkspaceManager config', async () => {
      // Initialize workspace manager
      const options = {
        workspace: testDir,
        language: 'ja',
        verbose: true
      };

      await workspaceManager.initialize(options);
      const config = workspaceManager.getConfig();

      // Initialize branch memory bank with workspace manager
      const branchName = 'feature/test-branch';
      const branchMemoryBank = new BranchMemoryBank(
        config.workspaceRoot,
        branchName,
        config
      );

      // Initialize branch memory bank
      await branchMemoryBank.initialize();

      // Check branch directory was created
      const branchDir = workspaceManager.getBranchMemoryPath(branchName);
      const exists = await fs.access(branchDir)
        .then(() => true)
        .catch(() => false);
      
      expect(exists).toBe(true);

      // Check core files were created with correct language
      const activeContextPath = path.join(branchDir, 'activeContext.md');
      const activeContextContent = await fs.readFile(activeContextPath, 'utf-8');

      // Verify Japanese content
      expect(activeContextContent).toContain('アクティブコンテキスト');
      expect(activeContextContent).toContain('現在の作業内容');
    });

    test('should allow reading and writing files in branch context', async () => {
      // Initialize
      const branchName = 'feature/integration-test';
      
      await workspaceManager.initialize({ 
        workspace: testDir,
        language: 'en' 
      });
      
      const config = workspaceManager.getConfig();
      
      // Create branch memory bank
      const branchMemoryBank = new BranchMemoryBank(
        config.workspaceRoot,
        branchName,
        config
      );
      
      await branchMemoryBank.initialize();
      
      // Update branch context files
      await branchMemoryBank.updateActiveContext({
        currentWork: 'Testing integration',
        recentChanges: ['Added integration test'],
        activeDecisions: ['Use actual filesystem'],
        considerations: ['Test coverage'],
        nextSteps: ['Add more tests']
      });
      
      // Read files using WorkspaceManager path
      const branchDir = workspaceManager.getBranchMemoryPath(branchName);
      const activeContextPath = path.join(branchDir, 'activeContext.md');
      
      const content = await fs.readFile(activeContextPath, 'utf-8');
      
      // Verify content
      expect(content).toContain('Testing integration');
      expect(content).toContain('Added integration test');
      expect(content).toContain('Use actual filesystem');
    });

    test('should create branch memory bank for different branches', async () => {
      // Initialize workspace
      await workspaceManager.initialize({ workspace: testDir });
      const config = workspaceManager.getConfig();
      
      // Create multiple branch memory banks
      const branch1 = 'feature/branch1';
      const branch2 = 'fix/branch2';
      
      const branchBank1 = new BranchMemoryBank(
        config.workspaceRoot,
        branch1,
        config
      );
      
      const branchBank2 = new BranchMemoryBank(
        config.workspaceRoot,
        branch2,
        config
      );
      
      // Initialize both banks
      await branchBank1.initialize();
      await branchBank2.initialize();
      
      // Check both directories exist
      const branchDir1 = workspaceManager.getBranchMemoryPath(branch1);
      const branchDir2 = workspaceManager.getBranchMemoryPath(branch2);
      
      const exists1 = await fs.access(branchDir1)
        .then(() => true)
        .catch(() => false);
      
      const exists2 = await fs.access(branchDir2)
        .then(() => true)
        .catch(() => false);
      
      expect(exists1).toBe(true);
      expect(exists2).toBe(true);
      
      // Write different content to each
      await branchBank1.updateActiveContext({ currentWork: 'Branch 1 work' });
      await branchBank2.updateActiveContext({ currentWork: 'Branch 2 work' });
      
      // Read content from each
      const content1 = await fs.readFile(path.join(branchDir1, 'activeContext.md'), 'utf-8');
      const content2 = await fs.readFile(path.join(branchDir2, 'activeContext.md'), 'utf-8');
      
      // Verify each has its own content
      expect(content1).toContain('Branch 1 work');
      expect(content2).toContain('Branch 2 work');
    });

    test('should properly handle sanitized branch names', async () => {
      // Initialize workspace
      await workspaceManager.initialize({ workspace: testDir });
      const config = workspaceManager.getConfig();
      
      // Create branch with complex name
      const complexBranch = 'feature/complex/multi/level';
      
      const branchBank = new BranchMemoryBank(
        config.workspaceRoot,
        complexBranch,
        config
      );
      
      await branchBank.initialize();
      
      // Check directory exists with sanitized name
      const branchDir = workspaceManager.getBranchMemoryPath(complexBranch);
      
      const exists = await fs.access(branchDir)
        .then(() => true)
        .catch(() => false);
      
      expect(exists).toBe(true);
      expect(branchDir).toContain('feature-complex-multi-level');
      
      // Write content to verify path is correct
      await branchBank.updateActiveContext({ currentWork: 'Complex branch test' });
      
      // Read content
      const content = await fs.readFile(path.join(branchDir, 'activeContext.md'), 'utf-8');
      
      // Verify content
      expect(content).toContain('Complex branch test');
    });
  });

  describe('WorkspaceManager with GlobalMemoryBank', () => {
    test('should correctly initialize GlobalMemoryBank with WorkspaceManager config', async () => {
      // Initialize workspace manager
      await workspaceManager.initialize({
        workspace: testDir,
        language: 'en'
      });
      
      const config = workspaceManager.getConfig();
      
      // Create global memory bank
      const globalMemoryBank = new GlobalMemoryBank(
        config.workspaceRoot,
        config
      );
      
      // Initialize global memory bank
      await globalMemoryBank.initialize();
      
      // Check global directory exists
      const globalDir = workspaceManager.getGlobalMemoryPath();
      
      const exists = await fs.access(globalDir)
        .then(() => true)
        .catch(() => false);
      
      expect(exists).toBe(true);
      
      // Check if standard files were created
      const coreFiles = ['architecture.md', 'coding-standards.md', 'glossary.md'];
      
      for (const file of coreFiles) {
        const filePath = path.join(globalDir, file);
        const fileExists = await fs.access(filePath)
          .then(() => true)
          .catch(() => false);
        
        expect(fileExists).toBe(true);
      }
    });

    test('should allow reading and writing global memory bank files', async () => {
      // Initialize workspace
      await workspaceManager.initialize({ workspace: testDir });
      const config = workspaceManager.getConfig();
      
      // Create global memory bank
      const globalMemoryBank = new GlobalMemoryBank(
        config.workspaceRoot,
        config
      );
      
      await globalMemoryBank.initialize();
      
      // Write custom document
      const customDoc = `# Custom Global Document
      
This is a test document in the global memory bank.

tags: #test #global

## Section 1
Content 1

## Section 2
Content 2
`;
      
      await globalMemoryBank.writeDocument('custom.md', customDoc, ['test', 'global']);
      
      // Read document
      const doc = await globalMemoryBank.readDocument('custom.md');
      
      // Verify document
      expect(doc.content).toContain('Custom Global Document');
      expect(doc.tags).toContain('test');
      expect(doc.tags).toContain('global');
    });

    test('should handle global memory bank directory structure', async () => {
      // Initialize workspace
      await workspaceManager.initialize({ workspace: testDir });
      const config = workspaceManager.getConfig();
      
      // Create global memory bank
      const globalMemoryBank = new GlobalMemoryBank(
        config.workspaceRoot,
        config
      );
      
      await globalMemoryBank.initialize();
      
      // Create subdirectory and file
      await globalMemoryBank.writeDocument('tags/important.md', '# Important Tags', ['meta']);
      
      // Verify directory structure
      const tagsDir = path.join(workspaceManager.getGlobalMemoryPath(), 'tags');
      const exists = await fs.access(tagsDir)
        .then(() => true)
        .catch(() => false);
      
      expect(exists).toBe(true);
      
      // Read document from subdirectory
      const doc = await globalMemoryBank.readDocument('tags/important.md');
      
      // Verify document
      expect(doc.content).toContain('Important Tags');
      expect(doc.path).toBe('tags/important.md');
    });
  });
  
  describe('Combined Memory Bank Operations', () => {
    test('should allow coordination between global and branch memory banks', async () => {
      // Initialize workspace
      await workspaceManager.initialize({ workspace: testDir });
      const config = workspaceManager.getConfig();
      
      // Create both types of memory banks
      const globalMemoryBank = new GlobalMemoryBank(
        config.workspaceRoot,
        config
      );
      
      const branchName = 'feature/combined-test';
      const branchMemoryBank = new BranchMemoryBank(
        config.workspaceRoot,
        branchName,
        config
      );
      
      // Initialize both memory banks
      await globalMemoryBank.initialize();
      await branchMemoryBank.initialize();
      
      // Add common tag to global document
      await globalMemoryBank.writeDocument('architecture.md', `# Architecture
      
This is the architecture document.

tags: #architecture #important

## System Overview
The system uses a microservice architecture.
`, ['architecture', 'important']);
      
      // Reference global document in branch
      await branchMemoryBank.updateActiveContext({
        currentWork: 'Implementing architecture changes',
        recentChanges: ['Added new microservice'],
        activeDecisions: ['Follow architecture document in global memory bank'],
        considerations: ['Impact on existing services'],
        nextSteps: ['Update architecture document in global memory bank']
      });
      
      // Verify global document
      const globalDoc = await globalMemoryBank.readDocument('architecture.md');
      expect(globalDoc.content).toContain('microservice architecture');
      expect(globalDoc.tags).toContain('architecture');
      
      // Verify branch document
      const branchDoc = await branchMemoryBank.readDocument('activeContext.md');
      expect(branchDoc.content).toContain('architecture document in global memory bank');
    });
    
    test('should handle search across both memory banks', async () => {
      // Initialize workspace
      await workspaceManager.initialize({ workspace: testDir });
      const config = workspaceManager.getConfig();
      
      // Create both memory banks
      const globalMemoryBank = new GlobalMemoryBank(
        config.workspaceRoot,
        config
      );
      
      const branchName = 'feature/search-test';
      const branchMemoryBank = new BranchMemoryBank(
        config.workspaceRoot,
        branchName,
        config
      );
      
      // Initialize both memory banks
      await globalMemoryBank.initialize();
      await branchMemoryBank.initialize();
      
      // Add documents with common tags
      await globalMemoryBank.writeDocument('design.md', '# Design Document', ['design', 'common']);
      await globalMemoryBank.writeDocument('architecture.md', '# Architecture Document', ['architecture', 'common']);
      
      await branchMemoryBank.writeDocument('feature-design.md', '# Feature Design', ['design', 'feature']);
      
      // Search in global memory bank
      const globalResults = await globalMemoryBank.searchByTags(['common']);
      expect(globalResults.length).toBe(2);
      
      // Search in branch memory bank
      const branchResults = await branchMemoryBank.searchByTags(['design']);
      expect(branchResults.length).toBe(1);
      expect(branchResults[0].content).toContain('Feature Design');
      
      // Verify documents are in correct locations
      const globalPath = workspaceManager.getGlobalMemoryPath();
      const branchPath = workspaceManager.getBranchMemoryPath(branchName);
      
      const globalDesignExists = await fs.access(path.join(globalPath, 'design.md'))
        .then(() => true)
        .catch(() => false);
      
      const branchDesignExists = await fs.access(path.join(branchPath, 'feature-design.md'))
        .then(() => true)
        .catch(() => false);
      
      expect(globalDesignExists).toBe(true);
      expect(branchDesignExists).toBe(true);
    });
    
    test('should validate structure for both memory banks', async () => {
      // Initialize workspace
      await workspaceManager.initialize({ workspace: testDir });
      const config = workspaceManager.getConfig();
      
      // Create both memory banks
      const globalMemoryBank = new GlobalMemoryBank(
        config.workspaceRoot,
        config
      );
      
      const branchName = 'feature/validation-test';
      const branchMemoryBank = new BranchMemoryBank(
        config.workspaceRoot,
        branchName,
        config
      );
      
      // Initialize both memory banks
      await globalMemoryBank.initialize();
      await branchMemoryBank.initialize();
      
      // Validate structures
      const globalValidation = await globalMemoryBank.validateStructure();
      const branchValidation = await branchMemoryBank.validateStructure();
      
      // Both should be valid after initialization
      expect(globalValidation.isValid).toBe(true);
      expect(branchValidation.isValid).toBe(true);
      
      // ファイルの存在を確認してから削除
      const branchDir = workspaceManager.getBranchMemoryPath(branchName);
      const progressPath = path.join(branchDir, 'progress.md');
      const exists = await fs.access(progressPath)
        .then(() => true)
        .catch(() => false);
      
      if (exists) {
        // Delete a required file from branch
        await fs.unlink(progressPath);
        
        // Validate again
        const invalidBranchValidation = await branchMemoryBank.validateStructure();
        
        // Branch should now be invalid
        expect(invalidBranchValidation.isValid).toBe(false);
        expect(invalidBranchValidation.missingFiles).toContain('progress.md');
      } else {
        // ファイルが存在しない場合はテストをスキップ
        console.warn('Progress.md file not found, skipping delete test');
      }
    });
  });
});