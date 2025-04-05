import type { IFileSystemService } from '../../../../../src/infrastructure/storage/interfaces/IFileSystemService';

// モックデータの準備
const mockFilePath = '/path/to/file.txt';
const mockDirPath = '/path/to/directory';
const mockFileContent = 'Hello, Mirai!';
const mockFileList = ['file1.txt', 'file2.json'];
const mockFileStats = {
  size: 123,
  isDirectory: false,
  isFile: true,
  lastModified: new Date(),
  createdAt: new Date(),
};
const mockConfig = { memoryBankRoot: '/path/to/docs' };

// IFileSystemService のモック実装を作成
const mockFileSystemService: jest.Mocked<IFileSystemService> = {
  readFile: jest.fn(),
  readFileChunk: jest.fn(), // オプションでもモックは用意
  writeFile: jest.fn(),
  fileExists: jest.fn(),
  deleteFile: jest.fn(),
  createDirectory: jest.fn(),
  directoryExists: jest.fn(),
  listFiles: jest.fn(),
  getFileStats: jest.fn(),
  getBranchMemoryPath: jest.fn(), // オプションでもモックは用意
  getConfig: jest.fn(), // オプションでもモックは用意
};

describe('IFileSystemService Interface', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();
  });

  // --- readFile ---
  it('should define the readFile method (success)', async () => {
    mockFileSystemService.readFile.mockResolvedValue(mockFileContent);
    const content = await mockFileSystemService.readFile(mockFilePath);
    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(mockFilePath);
    expect(content).toBe(mockFileContent);
  });

  it('should define the readFile method (failure)', async () => {
    const error = new Error('File not found');
    mockFileSystemService.readFile.mockRejectedValue(error);
    await expect(mockFileSystemService.readFile(mockFilePath)).rejects.toThrow(error);
    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(mockFilePath);
  });

  // --- readFileChunk (optional) ---
  it('should define the readFileChunk method (success)', async () => {
    const params = { filePath: mockFilePath, start: 0, length: 5 };
    const chunkContent = 'Hello';
    // オプショナルなので、モックが存在する場合のみテスト
    if (mockFileSystemService.readFileChunk) {
        // jest.Mock として型アサーションを追加
        (mockFileSystemService.readFileChunk as jest.Mock).mockResolvedValue(chunkContent);
        const content = await mockFileSystemService.readFileChunk(params);
        expect(mockFileSystemService.readFileChunk).toHaveBeenCalledWith(params);
        expect(content).toBe(chunkContent);
    } else {
        // モックがない場合は何もしないか、スキップする
        console.warn('readFileChunk is optional and not mocked, skipping test.');
    }
  });

   it('should define the readFileChunk method (failure)', async () => {
    const params = { filePath: mockFilePath, start: 0, length: 5 };
    const error = new Error('Read error');
     if (mockFileSystemService.readFileChunk) {
        // jest.Mock として型アサーションを追加
        (mockFileSystemService.readFileChunk as jest.Mock).mockRejectedValue(error);
        await expect(mockFileSystemService.readFileChunk(params)).rejects.toThrow(error);
        expect(mockFileSystemService.readFileChunk).toHaveBeenCalledWith(params);
     } else {
        console.warn('readFileChunk is optional and not mocked, skipping test.');
     }
  });


  // --- writeFile ---
  it('should define the writeFile method (success)', async () => {
    mockFileSystemService.writeFile.mockResolvedValue(undefined);
    await mockFileSystemService.writeFile(mockFilePath, mockFileContent);
    expect(mockFileSystemService.writeFile).toHaveBeenCalledWith(mockFilePath, mockFileContent);
  });

   it('should define the writeFile method (failure)', async () => {
    const error = new Error('Write permission denied');
    mockFileSystemService.writeFile.mockRejectedValue(error);
    await expect(mockFileSystemService.writeFile(mockFilePath, mockFileContent)).rejects.toThrow(error);
    expect(mockFileSystemService.writeFile).toHaveBeenCalledWith(mockFilePath, mockFileContent);
  });

  // --- fileExists ---
  it('should define the fileExists method (true)', async () => {
    mockFileSystemService.fileExists.mockResolvedValue(true);
    const exists = await mockFileSystemService.fileExists(mockFilePath);
    expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(mockFilePath);
    expect(exists).toBe(true);
  });

  it('should define the fileExists method (false)', async () => {
    mockFileSystemService.fileExists.mockResolvedValue(false);
    const exists = await mockFileSystemService.fileExists(mockFilePath);
    expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(mockFilePath);
    expect(exists).toBe(false);
  });

  // --- deleteFile ---
  it('should define the deleteFile method (success)', async () => {
    mockFileSystemService.deleteFile.mockResolvedValue(true);
    const success = await mockFileSystemService.deleteFile(mockFilePath);
    expect(mockFileSystemService.deleteFile).toHaveBeenCalledWith(mockFilePath);
    expect(success).toBe(true);
  });

   it('should define the deleteFile method (failure)', async () => {
    mockFileSystemService.deleteFile.mockResolvedValue(false); // or mockRejectedValue
    const success = await mockFileSystemService.deleteFile(mockFilePath);
    expect(mockFileSystemService.deleteFile).toHaveBeenCalledWith(mockFilePath);
    expect(success).toBe(false);
  });

  // --- createDirectory ---
  it('should define the createDirectory method (success)', async () => {
    mockFileSystemService.createDirectory.mockResolvedValue(undefined);
    await mockFileSystemService.createDirectory(mockDirPath);
    expect(mockFileSystemService.createDirectory).toHaveBeenCalledWith(mockDirPath);
  });

   it('should define the createDirectory method (failure)', async () => {
    const error = new Error('Cannot create directory');
    mockFileSystemService.createDirectory.mockRejectedValue(error);
    await expect(mockFileSystemService.createDirectory(mockDirPath)).rejects.toThrow(error);
    expect(mockFileSystemService.createDirectory).toHaveBeenCalledWith(mockDirPath);
  });

  // --- directoryExists ---
  it('should define the directoryExists method (true)', async () => {
    mockFileSystemService.directoryExists.mockResolvedValue(true);
    const exists = await mockFileSystemService.directoryExists(mockDirPath);
    expect(mockFileSystemService.directoryExists).toHaveBeenCalledWith(mockDirPath);
    expect(exists).toBe(true);
  });

  it('should define the directoryExists method (false)', async () => {
    mockFileSystemService.directoryExists.mockResolvedValue(false);
    const exists = await mockFileSystemService.directoryExists(mockDirPath);
    expect(mockFileSystemService.directoryExists).toHaveBeenCalledWith(mockDirPath);
    expect(exists).toBe(false);
  });

  // --- listFiles ---
  it('should define the listFiles method (success)', async () => {
    mockFileSystemService.listFiles.mockResolvedValue(mockFileList);
    const files = await mockFileSystemService.listFiles(mockDirPath);
    expect(mockFileSystemService.listFiles).toHaveBeenCalledWith(mockDirPath);
    expect(files).toEqual(mockFileList);
  });

   it('should define the listFiles method (empty)', async () => {
    mockFileSystemService.listFiles.mockResolvedValue([]);
    const files = await mockFileSystemService.listFiles(mockDirPath);
    expect(mockFileSystemService.listFiles).toHaveBeenCalledWith(mockDirPath);
    expect(files).toEqual([]);
  });

   it('should define the listFiles method (failure)', async () => {
    const error = new Error('Directory not found');
    mockFileSystemService.listFiles.mockRejectedValue(error);
    await expect(mockFileSystemService.listFiles(mockDirPath)).rejects.toThrow(error);
    expect(mockFileSystemService.listFiles).toHaveBeenCalledWith(mockDirPath);
  });

  // --- getFileStats ---
  it('should define the getFileStats method (success)', async () => {
    mockFileSystemService.getFileStats.mockResolvedValue(mockFileStats);
    const stats = await mockFileSystemService.getFileStats(mockFilePath);
    expect(mockFileSystemService.getFileStats).toHaveBeenCalledWith(mockFilePath);
    expect(stats).toEqual(mockFileStats);
  });

   it('should define the getFileStats method (failure)', async () => {
    const error = new Error('File not found');
    mockFileSystemService.getFileStats.mockRejectedValue(error);
    await expect(mockFileSystemService.getFileStats(mockFilePath)).rejects.toThrow(error);
    expect(mockFileSystemService.getFileStats).toHaveBeenCalledWith(mockFilePath);
  });

  // --- getBranchMemoryPath (optional) ---
  it('should define the getBranchMemoryPath method', () => {
     if (mockFileSystemService.getBranchMemoryPath) {
        const branchName = 'feature/test';
        const expectedPath = `/path/to/docs/branch-memory-bank/${branchName}`;
        // jest.Mock として型アサーションを追加
        (mockFileSystemService.getBranchMemoryPath as jest.Mock).mockReturnValue(expectedPath);
        const path = mockFileSystemService.getBranchMemoryPath(branchName);
        expect(mockFileSystemService.getBranchMemoryPath).toHaveBeenCalledWith(branchName);
        expect(path).toBe(expectedPath);
     } else {
        console.warn('getBranchMemoryPath is optional and not mocked, skipping test.');
     }
  });

  // --- getConfig (optional) ---
  it('should define the getConfig method', () => {
    if (mockFileSystemService.getConfig) {
       // jest.Mock として型アサーションを追加
       (mockFileSystemService.getConfig as jest.Mock).mockReturnValue(mockConfig);
        const config = mockFileSystemService.getConfig();
        expect(mockFileSystemService.getConfig).toHaveBeenCalled();
        expect(config).toEqual(mockConfig);
     } else {
        console.warn('getConfig is optional and not mocked, skipping test.');
     }
  });
});
