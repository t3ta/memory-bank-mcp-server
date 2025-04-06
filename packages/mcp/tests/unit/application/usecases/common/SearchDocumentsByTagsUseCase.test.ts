import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
import { SearchDocumentsByTagsUseCase } from '../../../../../src/application/usecases/common/SearchDocumentsByTagsUseCase.js';
import { IFileSystemService } from '../../../../../src/infrastructure/storage/interfaces/IFileSystemService.js';
import path from 'path';
// import { mock } from 'jest-mock-extended'; // jest-mock-extended を削除
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js';

describe('SearchDocumentsByTagsUseCase', () => {
  let useCase: SearchDocumentsByTagsUseCase;
  // jest.Mocked を削除し、手動モックの型を指定
  let mockFileSystemService: IFileSystemService;

  const branchName = 'feature/search-test';
  const branchInfo = BranchInfo.create(branchName);
  const docsPath = '/path/to/docs'; // Input に必要

  const mockBranchDocPath1 = DocumentPath.create('branch/doc1.json');
  const mockBranchDocPath2 = DocumentPath.create('branch/doc2.md');
  const mockGlobalDocPath1 = DocumentPath.create('global/doc3.json');



  beforeEach(() => {
    // jest-mock-extended の代わりに vi.fn() で手動モックを作成する
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
    vi.clearAllMocks(); // jest -> vi
  });

  it('should search in all scopes (branch and global) by default using index files', async () => {
    // Arrange
    // モック: FileSystemService がインデックスファイルを返すように設定
    const date1 = new Date(2024, 0, 1).toISOString();
    const date2 = new Date(2024, 0, 2).toISOString();
    const date3 = new Date(2024, 0, 3).toISOString();

    const branchTagsIndex = { 'test': [mockBranchDocPath1.value, mockBranchDocPath2.value], 'search': [mockBranchDocPath1.value] };
    const branchMetaIndex = {
        [mockBranchDocPath1.value]: { title: 'Branch Doc 1', lastModified: date1, scope: 'branch' },
        [mockBranchDocPath2.value]: { title: 'Branch Doc 2 Title', lastModified: date2, scope: 'branch' }
    };
    const mockGlobalDocPath2 = DocumentPath.create('global/doc4-search.json');
    const globalTagsIndex = { 'test': [mockGlobalDocPath1.value], 'search': [mockGlobalDocPath2.value] };
    const globalMetaIndex = {
        [mockGlobalDocPath1.value]: { title: 'Global Doc 1', lastModified: date1, scope: 'global' },
        [mockGlobalDocPath2.value]: { title: 'Global Doc Search', lastModified: date3, scope: 'global' }
    };


    (mockFileSystemService.readFile as Mock).mockImplementation(async (filePath) => { // as Mock 追加
      const resolvedPath = path.resolve(filePath);
      if (resolvedPath.endsWith(path.join(branchInfo.safeName, '.index', 'tags_index.json'))) return JSON.stringify(branchTagsIndex);
      if (resolvedPath.endsWith(path.join(branchInfo.safeName, '.index', 'documents_meta.json'))) return JSON.stringify(branchMetaIndex);
      if (resolvedPath.endsWith(path.join('global-memory-bank', '.index', 'tags_index.json'))) return JSON.stringify(globalTagsIndex);
      if (resolvedPath.endsWith(path.join('global-memory-bank', '.index', 'documents_meta.json'))) return JSON.stringify(globalMetaIndex);
      throw new Error(`ENOENT: no such file or directory, open '${filePath}'`); // ファイルが見つからない場合のエラー
    });


    // Act
    const result = await useCase.execute({ tags: ['test', 'search'], docs: docsPath, branchName: branchName }); // branch -> branchName

    // Assert
    // Assert
    // readFile が適切なパスで呼び出されたか確認
    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(expect.stringContaining(path.join('global-memory-bank', '.index', 'tags_index.json')));
    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(expect.stringContaining(path.join('global-memory-bank', '.index', 'documents_meta.json')));
    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(expect.stringContaining(path.join(branchInfo.safeName, '.index', 'tags_index.json')));
    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(expect.stringContaining(path.join(branchInfo.safeName, '.index', 'documents_meta.json')));

    // 結果の確認 (OR検索なので test または search を持つもの)
    // doc1(b,t,s), doc2(b,t), globalDoc1(g,t), globalDoc2(g,s) がヒット候補
    expect(result.results).toHaveLength(2);
    // 結果は lastModified で降順ソートされるはず
    expect(result.results[0]).toEqual(expect.objectContaining({ path: mockBranchDocPath2.value, title: 'Branch Doc 2 Title', scope: 'branch', lastModified: date2 }));
    expect(result.results[1]).toEqual(expect.objectContaining({ path: mockBranchDocPath1.value, title: 'Branch Doc 1', scope: 'branch', lastModified: date1 }));
  });

  it('should search only in branch scope when specified', async () => {
    // Arrange
    const branchTagsIndex = { 'test': [mockBranchDocPath1.value] };
    const branchMetaIndex = { [mockBranchDocPath1.value]: { title: 'Branch Doc 1', lastModified: new Date().toISOString(), scope: 'branch' } };
    (mockFileSystemService.readFile as Mock).mockImplementation(async (filePath) => { // as Mock 追加
      const resolvedPath = path.resolve(filePath);
      if (resolvedPath.endsWith(path.join(branchInfo.safeName, '.index', 'tags_index.json'))) return JSON.stringify(branchTagsIndex);
      if (resolvedPath.endsWith(path.join(branchInfo.safeName, '.index', 'documents_meta.json'))) return JSON.stringify(branchMetaIndex);
       throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    });

    // Act
    const result = await useCase.execute({ tags: ['test'], scope: 'branch', docs: docsPath, branchName: branchName }); // branch -> branchName

    // Assert
    // Assert
    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(expect.stringContaining(path.join(branchInfo.safeName, '.index', 'tags_index.json')));
    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(expect.stringContaining(path.join(branchInfo.safeName, '.index', 'documents_meta.json')));
    expect(mockFileSystemService.readFile).not.toHaveBeenCalledWith(expect.stringContaining('global-memory-bank')); // グローバルは呼ばれない
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toEqual(expect.objectContaining({ path: mockBranchDocPath1.value, title: 'Branch Doc 1', scope: 'branch' }));
  });

   it('should search only in global scope when specified', async () => {
    // Arrange
    const globalTagsIndex = { 'test': [mockGlobalDocPath1.value] };
    const globalMetaIndex = { [mockGlobalDocPath1.value]: { title: 'Global Doc 1', lastModified: new Date().toISOString(), scope: 'global' } };
     (mockFileSystemService.readFile as Mock).mockImplementation(async (filePath) => { // as Mock 追加
      const resolvedPath = path.resolve(filePath);
      if (resolvedPath.endsWith(path.join('global-memory-bank', '.index', 'tags_index.json'))) return JSON.stringify(globalTagsIndex);
      if (resolvedPath.endsWith(path.join('global-memory-bank', '.index', 'documents_meta.json'))) return JSON.stringify(globalMetaIndex);
       throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    });

    // Act
    const result = await useCase.execute({ tags: ['test'], scope: 'global', docs: docsPath }); // branchName不要

    // Assert
    // Assert
    expect(mockFileSystemService.readFile).not.toHaveBeenCalledWith(expect.stringContaining(branchInfo.safeName)); // ブランチは呼ばれない
    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(expect.stringContaining(path.join('global-memory-bank', '.index', 'tags_index.json')));
    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(expect.stringContaining(path.join('global-memory-bank', '.index', 'documents_meta.json')));
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toEqual(expect.objectContaining({ path: mockGlobalDocPath1.value, title: 'Global Doc 1', scope: 'global' }));
  });

  it('should use AND match when match type is "and"', async () => {
    // Arrange
    const branchTagsIndex = { 'test': [mockBranchDocPath1.value, mockBranchDocPath2.value], 'search': [mockBranchDocPath1.value] }; // doc1は両方、doc2はtestのみ
    const branchMetaIndex = { [mockBranchDocPath1.value]: { title: 'Branch Doc 1', lastModified: new Date().toISOString(), scope: 'branch' } };
    const globalTagsIndex = { 'test': [mockGlobalDocPath1.value], 'search': [] }; // globalはtestのみ
    const globalMetaIndex = { [mockGlobalDocPath1.value]: { title: 'Global Doc 1', lastModified: new Date().toISOString(), scope: 'global' } };
     (mockFileSystemService.readFile as Mock).mockImplementation(async (filePath) => { // as Mock 追加
      const resolvedPath = path.resolve(filePath);
      if (resolvedPath.endsWith(path.join(branchInfo.safeName, '.index', 'tags_index.json'))) return JSON.stringify(branchTagsIndex);
      if (resolvedPath.endsWith(path.join(branchInfo.safeName, '.index', 'documents_meta.json'))) return JSON.stringify(branchMetaIndex);
      if (resolvedPath.endsWith(path.join('global-memory-bank', '.index', 'tags_index.json'))) return JSON.stringify(globalTagsIndex);
      if (resolvedPath.endsWith(path.join('global-memory-bank', '.index', 'documents_meta.json'))) return JSON.stringify(globalMetaIndex);
       throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    });

    // Act
    const result = await useCase.execute({ tags: ['test', 'search'], match: 'and', docs: docsPath, branchName: branchName }); // branch -> branchName

    // Assert
    // Assert
    // AND検索なので 'test' と 'search' の両方を持つ doc1 のみがヒットするはず
    expect(result.results).toHaveLength(1);
    expect(result.results[0]).toEqual(expect.objectContaining({ path: mockBranchDocPath1.value, title: 'Branch Doc 1', scope: 'branch' }));
    expect(mockFileSystemService.readFile).toHaveBeenCalledTimes(4); // 両方のインデックスを読む
  });

  it('should return empty list if no documents match tags', async () => {
     // Arrange
     // インデックスファイルはあるが、指定タグにマッチするパスがないケース
    const branchTagsIndex = { 'other': ['some/path'] };
    const branchMetaIndex = {};
    const globalTagsIndex = {};
    const globalMetaIndex = {};
     (mockFileSystemService.readFile as Mock).mockImplementation(async (filePath) => { // as Mock 追加
      const resolvedPath = path.resolve(filePath);
      if (resolvedPath.endsWith(path.join(branchInfo.safeName, '.index', 'tags_index.json'))) return JSON.stringify(branchTagsIndex);
      if (resolvedPath.endsWith(path.join(branchInfo.safeName, '.index', 'documents_meta.json'))) return JSON.stringify(branchMetaIndex);
      if (resolvedPath.endsWith(path.join('global-memory-bank', '.index', 'tags_index.json'))) return JSON.stringify(globalTagsIndex);
      if (resolvedPath.endsWith(path.join('global-memory-bank', '.index', 'documents_meta.json'))) return JSON.stringify(globalMetaIndex);
       throw new Error(`ENOENT: no such file or directory, open '${filePath}'`);
    });

    // Act
    const result = await useCase.execute({ tags: ['notfound'], docs: docsPath, branchName: branchName }); // branch -> branchName

    // Assert
    // Assert
    expect(result.results).toHaveLength(0);
    expect(mockFileSystemService.readFile).toHaveBeenCalledTimes(4); // インデックスは読む
  });

  // TODO: Add tests for file system errors during readFile
});
