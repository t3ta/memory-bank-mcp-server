import { vi } from 'vitest';
import type { Mock } from 'vitest';
import { SearchDocumentsByTagsUseCase } from '../../../../../src/application/usecases/common/SearchDocumentsByTagsUseCase.js';
import { IFileSystemService } from '../../../../../src/infrastructure/storage/interfaces/IFileSystemService.js';
import path from 'path';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js';

describe('SearchDocumentsByTagsUseCase', () => {
  let useCase: SearchDocumentsByTagsUseCase;
  let mockFileSystemService: IFileSystemService;

  const branchName = 'feature/search-test';
  const branchInfo = BranchInfo.create(branchName);
  const docsPath = '/path/to/docs'; // Required for input

  const mockBranchDocPath1 = DocumentPath.create('branch/doc1.json');
  const mockBranchDocPath2 = DocumentPath.create('branch/doc2.md');
  const mockGlobalDocPath1 = DocumentPath.create('global/doc3.json');



  beforeEach(() => {
    // Create manual mocks using vi.fn() instead of jest-mock-extended
    mockFileSystemService = {
      fileExists: vi.fn(),
      readFile: vi.fn(),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      createDirectory: vi.fn(),
      directoryExists: vi.fn(),
      listFiles: vi.fn(),
      getFileStats: vi.fn(),
      readFileChunk: vi.fn(),
    };
    useCase = new SearchDocumentsByTagsUseCase(mockFileSystemService);
    vi.clearAllMocks();
  });

  it('should search in all scopes (branch and global) by default using index files', async () => {
    // Arrange
    // Arrange: Mock FileSystemService to return index files
    const date1 = new Date(2024, 0, 1).toISOString();
    const date2 = new Date(2024, 0, 2).toISOString();
    const date3 = new Date(2024, 0, 3).toISOString();

    // Mock data for _index.json files
    const branchIndexData = {
      schema: 'tag_index_v1',
      metadata: { indexType: 'branch', branchName: branchName, lastUpdated: date2, documentCount: 2, tagCount: 2 },
      index: [
        { tag: "test", documents: [{ id: '', path: mockBranchDocPath1.value, title: 'Branch Doc 1', lastModified: date1 }, { id: '', path: mockBranchDocPath2.value, title: 'Branch Doc 2 Title', lastModified: date2 }] },
        { tag: "search", documents: [{ id: '', path: mockBranchDocPath1.value, title: 'Branch Doc 1', lastModified: date1 }] }
      ]
    };
    const mockGlobalDocPath2 = DocumentPath.create('global/doc4-search.json');
    const globalIndexData = {
      schema: 'tag_index_v1',
      metadata: { indexType: 'global', lastUpdated: date3, documentCount: 2, tagCount: 2 },
      index: [
        { tag: "test", documents: [{ id: '', path: mockGlobalDocPath1.value, title: 'Global Doc 1', lastModified: date1 }] },
        { tag: "search", documents: [{ id: '', path: mockGlobalDocPath2.value, title: 'Global Doc Search', lastModified: date3 }] }
      ]
    };


    (mockFileSystemService.readFile as Mock).mockImplementation(async (filePath) => { // Type assertion for mock
      const resolvedPath = path.resolve(filePath);
      // Check for _index.json paths
      if (resolvedPath.endsWith(path.join(branchInfo.safeName, '_index.json'))) return JSON.stringify(branchIndexData);
      if (resolvedPath.endsWith(path.join('global-memory-bank', '_index.json'))) return JSON.stringify(globalIndexData);
      // Remove checks for meta files
      throw new Error(`ENOENT: no such file or directory, open '${filePath}'`); // Throw error if file not found
    });


    // Act
    const result = await useCase.execute({ tags: ['test', 'search'], docs: docsPath, branchName: branchName });

    // Assert
    // Assert readFile calls
    // Check if readFile was called with the correct _index.json paths
    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(expect.stringContaining(path.join('global-memory-bank', '_index.json')));
    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(expect.stringContaining(path.join(branchInfo.safeName, '_index.json')));
    // Remove checks for meta files

    // Assert results (OR match: should contain docs with 'test' or 'search')
    expect(result.results).toHaveLength(4);
    // Check if all expected paths are present (order might vary due to fallback lastModified)
    const paths = result.results.map(r => r.path);
    expect(paths).toContain(mockBranchDocPath1.value);
    expect(paths).toContain(mockBranchDocPath2.value);
    expect(paths).toContain(mockGlobalDocPath1.value);
    expect(paths).toContain(mockGlobalDocPath2.value);
  });

  it('should search only in branch scope when specified', async () => {
    // Arrange
    // Mock data for _index.json
    const branchIndexData = {
      schema: 'tag_index_v1',
      metadata: { /* ... */ },
      index: [ { tag: "test", documents: [{ id: '', path: mockBranchDocPath1.value, title: 'Branch Doc 1', lastModified: new Date().toISOString() }] } ]
    };
    (mockFileSystemService.readFile as Mock).mockImplementation(async (filePath) => { // Type assertion for mock
      const resolvedPath = path.resolve(filePath);
      if (resolvedPath.endsWith(path.join(branchInfo.safeName, '_index.json'))) return JSON.stringify(branchIndexData);
      // Remove checks for meta files
       throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    });

    // Act
    const result = await useCase.execute({ tags: ['test'], scope: 'branch', docs: docsPath, branchName: branchName });

    // Assert
    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(expect.stringContaining(path.join(branchInfo.safeName, '_index.json')));
    // Remove checks for meta files
    expect(mockFileSystemService.readFile).not.toHaveBeenCalledWith(expect.stringContaining('global-memory-bank'));
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toEqual(expect.objectContaining({ path: mockBranchDocPath1.value, title: 'doc1.json', scope: 'branch', lastModified: new Date(0).toISOString() }));
  });

   it('should search only in global scope when specified', async () => {
    // Arrange
    // Mock data for _index.json
    const globalIndexData = {
      schema: 'tag_index_v1',
      metadata: { /* ... */ },
      index: [ { tag: "test", documents: [{ id: '', path: mockGlobalDocPath1.value, title: 'Global Doc 1', lastModified: new Date().toISOString() }] } ]
    };
     (mockFileSystemService.readFile as Mock).mockImplementation(async (filePath) => { // Type assertion for mock
      const resolvedPath = path.resolve(filePath);
      if (resolvedPath.endsWith(path.join('global-memory-bank', '_index.json'))) return JSON.stringify(globalIndexData);
      // Remove checks for meta files
       throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    });

    // Act
    const result = await useCase.execute({ tags: ['test'], scope: 'global', docs: docsPath }); // No branchName needed for global scope

    // Assert
    expect(mockFileSystemService.readFile).not.toHaveBeenCalledWith(expect.stringContaining(branchInfo.safeName));
    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(expect.stringContaining(path.join('global-memory-bank', '_index.json')));
    // Remove checks for meta files
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toEqual(expect.objectContaining({ path: mockGlobalDocPath1.value, title: 'doc3.json', scope: 'global', lastModified: new Date(0).toISOString() }));
  });

  it('should use AND match when match type is "and"', async () => {
    // Arrange
    // Mock data for _index.json files
    const branchIndexData = {
      schema: 'tag_index_v1', metadata: { /* ... */ }, index: [
        { tag: "test", documents: [{ id: '', path: mockBranchDocPath1.value, title: 'Branch Doc 1', lastModified: new Date().toISOString() }, { id: '', path: mockBranchDocPath2.value, title: 'Branch Doc 2', lastModified: new Date().toISOString() }] },
        { tag: "search", documents: [{ id: '', path: mockBranchDocPath1.value, title: 'Branch Doc 1', lastModified: new Date().toISOString() }] }
      ]
    };
    const globalIndexData = {
      schema: 'tag_index_v1', metadata: { /* ... */ }, index: [
        { tag: "test", documents: [{ id: '', path: mockGlobalDocPath1.value, title: 'Global Doc 1', lastModified: new Date().toISOString() }] },
        { tag: "search", documents: [] } // No global docs with "search" tag
      ]
    };
     (mockFileSystemService.readFile as Mock).mockImplementation(async (filePath) => { // Type assertion for mock
      const resolvedPath = path.resolve(filePath);
      if (resolvedPath.endsWith(path.join(branchInfo.safeName, '_index.json'))) return JSON.stringify(branchIndexData);
      if (resolvedPath.endsWith(path.join('global-memory-bank', '_index.json'))) return JSON.stringify(globalIndexData);
      // Remove checks for meta files
       throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    });

    // Act
    const result = await useCase.execute({ tags: ['test', 'search'], match: 'and', docs: docsPath, branchName: branchName });

    // Assert
    // AND match: only doc1 (branch) has both 'test' and 'search' tags
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toEqual(expect.objectContaining({ path: mockBranchDocPath1.value, title: 'doc1.json', scope: 'branch', lastModified: new Date(0).toISOString() }));
    expect(mockFileSystemService.readFile).toHaveBeenCalledTimes(2);
  });

  it('should return empty list if no documents match tags', async () => {
     // Arrange
     // Index files exist but contain no matching tags
    const branchIndexData = { schema: 'tag_index_v1', metadata: { /* ... */ }, index: [{ tag: "other", documents: [] }] };
    const globalIndexData = { schema: 'tag_index_v1', metadata: { /* ... */ }, index: [] };
     (mockFileSystemService.readFile as Mock).mockImplementation(async (filePath) => { // Type assertion for mock
      const resolvedPath = path.resolve(filePath);
      if (resolvedPath.endsWith(path.join(branchInfo.safeName, '_index.json'))) return JSON.stringify(branchIndexData);
      if (resolvedPath.endsWith(path.join('global-memory-bank', '_index.json'))) return JSON.stringify(globalIndexData);
      // Remove checks for meta files
       throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    });

    // Act
    const result = await useCase.execute({ tags: ['notfound'], docs: docsPath, branchName: branchName });

    // Assert
    expect(result.results).toHaveLength(0);
    expect(mockFileSystemService.readFile).toHaveBeenCalledTimes(2);
  });

  // TODO: Add tests for file system errors during readFile
});
