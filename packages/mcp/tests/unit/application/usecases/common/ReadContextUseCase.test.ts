import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { ReadContextUseCase } from '../../../../../src/application/usecases/common/ReadContextUseCase.js';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../../../../src/domain/repositories/IGlobalMemoryBankRepository.js';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js';
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument.js';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js';
import { Tag } from '../../../../../src/domain/entities/Tag.js';
// --- Add missing imports ---
import { IGitService } from '../../../../../src/infrastructure/git/IGitService.js';
import { IConfigProvider } from '../../../../../src/infrastructure/config/interfaces/IConfigProvider.js';
import { WorkspaceConfig } from '../../../../../src/infrastructure/config/WorkspaceConfig.js';
import { ApplicationErrors } from '../../../../../src/shared/errors/ApplicationError.js';
import type { ContextRequest } from '../../../../../src/application/usecases/types.js'; // Import ContextRequest
// --- End of added imports ---

describe('ReadContextUseCase Unit Tests', () => {
  let useCase: ReadContextUseCase;
  // --- Use interface types for mocks ---
  let mockBranchRepo: IBranchMemoryBankRepository;
  let mockGlobalRepo: IGlobalMemoryBankRepository;
  let mockGitService: IGitService; // Keep these for tests needing them, even if not passed to constructor
  let mockConfigProvider: IConfigProvider; // Keep these for tests needing them, even if not passed to constructor
  // --- End of type correction ---

  const branchName = 'feature/test-context';
  const branchInfo = BranchInfo.create(branchName);
  const language = 'ja';

  const mockDocument = (path: string, content: object) =>
    MemoryDocument.create({
      path: DocumentPath.create(path),
      content: JSON.stringify(content),
      tags: [Tag.create('core')],
      lastModified: new Date(),
    });

  const mockProgress = mockDocument('progress.json', { summary: 'Test Progress' });
  const mockActiveContext = mockDocument('activeContext.json', { current_task: 'Test Task' });
  const mockBranchContext = mockDocument('branchContext.json', { description: 'Test Context' });
  const mockSystemPatterns = mockDocument('systemPatterns.json', { patterns: [] });
  const mockGlobalDocPath = DocumentPath.create('core/config.json');
  const mockGlobalDoc = mockDocument(mockGlobalDocPath.value, { setting: 'global_value' });

  beforeEach(() => {
    // Initialize mocks using vi.fn() for each method
    mockBranchRepo = {
      initialize: vi.fn(),
      exists: vi.fn(),
      getDocument: vi.fn(),
      saveDocument: vi.fn(),
      deleteDocument: vi.fn(),
      getRecentBranches: vi.fn(),
      listDocuments: vi.fn(),
      findDocumentsByTags: vi.fn(),
      validateStructure: vi.fn(),
      saveTagIndex: vi.fn(),
      getTagIndex: vi.fn(),
      findDocumentPathsByTagsUsingIndex: vi.fn(),
    };

    mockGlobalRepo = {
      initialize: vi.fn(),
      getDocument: vi.fn(),
      saveDocument: vi.fn(),
      deleteDocument: vi.fn(),
      listDocuments: vi.fn(),
      findDocumentsByTags: vi.fn(),
      validateStructure: vi.fn(),
      saveTagIndex: vi.fn(),
      getTagIndex: vi.fn(),
      findDocumentPathsByTagsUsingIndex: vi.fn(),
      updateTagsIndex: vi.fn(),
    };

    mockGitService = { // Initialize GitService mock
      getCurrentBranchName: vi.fn(),
    };

    mockConfigProvider = { // Initialize ConfigProvider mock
      initialize: vi.fn(),
      getConfig: vi.fn(),
      getBranchMemoryPath: vi.fn(),
      getGlobalMemoryPath: vi.fn(),
      getLanguage: vi.fn(),
    };

    // Pass only the required mocks to the constructor
    // Pass all required mocks to the constructor
    useCase = new ReadContextUseCase(mockBranchRepo, mockGlobalRepo, mockGitService, mockConfigProvider);

    // Setup default mock implementations
    (mockBranchRepo.getDocument as Mock).mockImplementation(async (argBranchInfo, argPath) => {
      if (!argBranchInfo.equals(branchInfo)) return null;
      if (argPath.equals(DocumentPath.create('progress.json'))) return mockProgress;
      if (argPath.equals(DocumentPath.create('activeContext.json'))) return mockActiveContext;
      if (argPath.equals(DocumentPath.create('branchContext.json'))) return mockBranchContext;
      if (argPath.equals(DocumentPath.create('systemPatterns.json'))) return mockSystemPatterns;
      return null;
    });
    (mockBranchRepo.listDocuments as Mock).mockResolvedValue([
      DocumentPath.create('progress.json'),
      DocumentPath.create('activeContext.json'),
      DocumentPath.create('branchContext.json'),
      DocumentPath.create('systemPatterns.json'),
    ]);
    (mockGlobalRepo.listDocuments as Mock).mockResolvedValue([mockGlobalDocPath]);
    (mockGlobalRepo.getDocument as Mock).mockResolvedValue(mockGlobalDoc);
  });

  it('should return branch and global memory information when branch is specified', async () => {
    // Mock branch existence check
    (mockBranchRepo.exists as Mock).mockResolvedValue(true);
    const result = await useCase.execute({ branch: branchName, language });

    expect(result.rules).toBeUndefined();
    expect(result.branchMemory).toEqual({
      coreFiles: {
        'progress.json': JSON.parse(mockProgress.content),
        'activeContext.json': JSON.parse(mockActiveContext.content),
        'branchContext.json': JSON.parse(mockBranchContext.content),
        'systemPatterns.json': JSON.parse(mockSystemPatterns.content)
      },
      availableFiles: [
        'progress.json',
        'activeContext.json',
        'branchContext.json',
        'systemPatterns.json'
      ]
    });
    expect(result.globalMemory).toEqual({
      coreFiles: {
        [mockGlobalDocPath.value]: JSON.parse(mockGlobalDoc.content)
      },
      availableFiles: [mockGlobalDocPath.value]
    });

    expect(mockBranchRepo.exists).toHaveBeenCalledWith(branchName); // Check existence call
    expect(mockBranchRepo.getDocument).toHaveBeenCalledTimes(4);
    expect(mockGlobalRepo.listDocuments).toHaveBeenCalled();
    expect(mockGlobalRepo.getDocument).toHaveBeenCalledWith(mockGlobalDocPath);
  });

  it('should return empty global memory if no global documents found', async () => {
    // Mock branch existence check
    (mockBranchRepo.exists as Mock).mockResolvedValue(true);
    (mockGlobalRepo.listDocuments as Mock).mockResolvedValue([]);

    const result = await useCase.execute({ branch: branchName, language });

    expect(result.globalMemory).toEqual({
      coreFiles: {},
      availableFiles: []
    });
    expect(mockBranchRepo.exists).toHaveBeenCalledWith(branchName); // Check existence call
    expect(mockGlobalRepo.listDocuments).toHaveBeenCalled();
    expect(mockGlobalRepo.getDocument).not.toHaveBeenCalled();
  }); // End of 'should return empty global memory...' test case

  // --- New Test Cases for Branch Auto-Detection ---
  it('should auto-detect branch name when in project mode and branch is not provided', async () => {
    // Setup mocks for project mode and Git service
    (mockConfigProvider.getConfig as Mock).mockReturnValue({
      isProjectMode: true,
      // Other config values if needed
    });

    // Mock Git service to return a branch name
    (mockGitService.getCurrentBranchName as Mock).mockResolvedValue('feature/auto-detected-branch');

    // Set branch repo to return true for exists check
    (mockBranchRepo.exists as Mock).mockResolvedValue(true);

    // Execute with undefined branch - this should trigger auto-detection
    const result = await useCase.execute({ language });

    // Verify Git service was called to get branch name
    expect(mockGitService.getCurrentBranchName).toHaveBeenCalled();

    // Verify branch repo was checked with the auto-detected name
    expect(mockBranchRepo.exists).toHaveBeenCalledWith('feature/auto-detected-branch');

    // Usual result checks
    expect(result.branchMemory).toBeDefined();
    expect(result.globalMemory).toBeDefined();
  });

  it('should throw error if branch is not provided and not in project mode', async () => {
    // Setup mock for non-project mode
    (mockConfigProvider.getConfig as Mock).mockReturnValue({
      isProjectMode: false,
    });

    // Execute with undefined branch - this should throw an error
    await expect(useCase.execute({ language }))
      .rejects.toThrow(/Branch name is required/);

    // Verify Git service was not called
    expect(mockGitService.getCurrentBranchName).not.toHaveBeenCalled();
  });

  it('should throw error if branch auto-detection fails', async () => {
    // Setup mocks for project mode and Git service failure
    (mockConfigProvider.getConfig as Mock).mockReturnValue({
      isProjectMode: true,
    });

    // Mock Git service to throw an error
    const gitError = new Error('Git command failed');
    (mockGitService.getCurrentBranchName as Mock).mockRejectedValue(gitError);

    // Execute with undefined branch - this should throw an error
    await expect(useCase.execute({ language }))
      .rejects.toThrow(/Branch name is required but could not be automatically determined/);

    // Verify Git service was called
    expect(mockGitService.getCurrentBranchName).toHaveBeenCalled();
  });

}); // End of describe block
