import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { ReadContextUseCase } from '../../../../../src/application/usecases/common/ReadContextUseCase.js';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../../../../src/domain/repositories/IGlobalMemoryBankRepository.js';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js';
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument.js';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js';
import { Tag } from '../../../../../src/domain/entities/Tag.js';

describe('ReadContextUseCase Unit Tests', () => {
  let useCase: ReadContextUseCase;
  let mockBranchRepo: IBranchMemoryBankRepository;
  let mockGlobalRepo: IGlobalMemoryBankRepository;

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
    useCase = new ReadContextUseCase(mockBranchRepo, mockGlobalRepo);

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

  it('should return branch and global memory information', async () => {
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

    expect(mockBranchRepo.getDocument).toHaveBeenCalledTimes(4);
    expect(mockGlobalRepo.listDocuments).toHaveBeenCalled();
    expect(mockGlobalRepo.getDocument).toHaveBeenCalledWith(mockGlobalDocPath);
  });

  it('should return empty global memory if no global documents found', async () => {
    (mockGlobalRepo.listDocuments as Mock).mockResolvedValue([]);

    const result = await useCase.execute({ branch: branchName, language });

    expect(result.globalMemory).toEqual({
      coreFiles: {},
      availableFiles: []
    });
    expect(mockGlobalRepo.listDocuments).toHaveBeenCalled();
    expect(mockGlobalRepo.getDocument).not.toHaveBeenCalled();
  });
});
