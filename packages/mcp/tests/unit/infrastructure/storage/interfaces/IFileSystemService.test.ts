import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
import type { IFileSystemService } from '../../../../../src/infrastructure/storage/interfaces/IFileSystemService.js'; // .js 追加

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
// jest.Mocked を削除し、手動モックの型を指定
const mockFileSystemService: IFileSystemService = {
  readFile: vi.fn(), // jest -> vi
  readFileChunk: vi.fn(), // jest -> vi
  writeFile: vi.fn(), // jest -> vi
  fileExists: vi.fn(), // jest -> vi
  deleteFile: vi.fn(), // jest -> vi
  createDirectory: vi.fn(), // jest -> vi
  directoryExists: vi.fn(), // jest -> vi
  listFiles: vi.fn(), // jest -> vi
  getFileStats: vi.fn(), // jest -> vi
  getBranchMemoryPath: vi.fn(), // jest -> vi
  getConfig: vi.fn(), // jest -> vi
};

describe('IFileSystemService Interface Unit Tests', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  // --- readFile ---
  it('should define the readFile method (success)', async () => {
    (mockFileSystemService.readFile as Mock).mockResolvedValue(mockFileContent);
    const content = await mockFileSystemService.readFile(mockFilePath);
    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(mockFilePath);
    expect(content).toBe(mockFileContent);
  });

  it('should define the readFile method (failure)', async () => {
    const error = new Error('File not found');
    (mockFileSystemService.readFile as Mock).mockRejectedValue(error);
    await expect(mockFileSystemService.readFile(mockFilePath)).rejects.toThrow(error);
    expect(mockFileSystemService.readFile).toHaveBeenCalledWith(mockFilePath);
  });

  // --- readFileChunk (optional) ---
  it('should define the readFileChunk method (success)', async () => {
    const params = { filePath: mockFilePath, start: 0, length: 5 };
    const chunkContent = 'Hello';
    // Optional, so only test if the mock exists
    if (mockFileSystemService.readFileChunk) {
        (mockFileSystemService.readFileChunk as Mock).mockResolvedValue(chunkContent);
        const content = await mockFileSystemService.readFileChunk(params);
        expect(mockFileSystemService.readFileChunk).toHaveBeenCalledWith(params);
        expect(content).toBe(chunkContent);
    } else {
        // Do nothing or skip if the mock doesn't exist
        console.warn('readFileChunk is optional and not mocked, skipping test.');
    }
  });

   it('should define the readFileChunk method (failure)', async () => {
    const params = { filePath: mockFilePath, start: 0, length: 5 };
    const error = new Error('Read error');
     if (mockFileSystemService.readFileChunk) {
        (mockFileSystemService.readFileChunk as Mock).mockRejectedValue(error);
        await expect(mockFileSystemService.readFileChunk(params)).rejects.toThrow(error);
        expect(mockFileSystemService.readFileChunk).toHaveBeenCalledWith(params);
     } else {
        console.warn('readFileChunk is optional and not mocked, skipping test.');
     }
  });


  // --- writeFile ---
  it('should define the writeFile method (success)', async () => {
    (mockFileSystemService.writeFile as Mock).mockResolvedValue(undefined);
    await mockFileSystemService.writeFile(mockFilePath, mockFileContent);
    expect(mockFileSystemService.writeFile).toHaveBeenCalledWith(mockFilePath, mockFileContent);
  });

   it('should define the writeFile method (failure)', async () => {
    const error = new Error('Write permission denied');
    (mockFileSystemService.writeFile as Mock).mockRejectedValue(error);
    await expect(mockFileSystemService.writeFile(mockFilePath, mockFileContent)).rejects.toThrow(error);
    expect(mockFileSystemService.writeFile).toHaveBeenCalledWith(mockFilePath, mockFileContent);
  });

  // --- fileExists ---
  it('should define the fileExists method (true)', async () => {
    (mockFileSystemService.fileExists as Mock).mockResolvedValue(true);
    const exists = await mockFileSystemService.fileExists(mockFilePath);
    expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(mockFilePath);
    expect(exists).toBe(true);
  });

  it('should define the fileExists method (false)', async () => {
    (mockFileSystemService.fileExists as Mock).mockResolvedValue(false);
    const exists = await mockFileSystemService.fileExists(mockFilePath);
    expect(mockFileSystemService.fileExists).toHaveBeenCalledWith(mockFilePath);
    expect(exists).toBe(false);
  });

  // --- deleteFile ---
  it('should define the deleteFile method (success)', async () => {
    (mockFileSystemService.deleteFile as Mock).mockResolvedValue(true);
    const success = await mockFileSystemService.deleteFile(mockFilePath);
    expect(mockFileSystemService.deleteFile).toHaveBeenCalledWith(mockFilePath);
    expect(success).toBe(true);
  });

   it('should define the deleteFile method (failure)', async () => {
    (mockFileSystemService.deleteFile as Mock).mockResolvedValue(false);
    const success = await mockFileSystemService.deleteFile(mockFilePath);
    expect(mockFileSystemService.deleteFile).toHaveBeenCalledWith(mockFilePath);
    expect(success).toBe(false);
  });

  // --- createDirectory ---
  it('should define the createDirectory method (success)', async () => {
    (mockFileSystemService.createDirectory as Mock).mockResolvedValue(undefined);
    await mockFileSystemService.createDirectory(mockDirPath);
    expect(mockFileSystemService.createDirectory).toHaveBeenCalledWith(mockDirPath);
  });

   it('should define the createDirectory method (failure)', async () => {
    const error = new Error('Cannot create directory');
    (mockFileSystemService.createDirectory as Mock).mockRejectedValue(error);
    await expect(mockFileSystemService.createDirectory(mockDirPath)).rejects.toThrow(error);
    expect(mockFileSystemService.createDirectory).toHaveBeenCalledWith(mockDirPath);
  });

  // --- directoryExists ---
  it('should define the directoryExists method (true)', async () => {
    (mockFileSystemService.directoryExists as Mock).mockResolvedValue(true);
    const exists = await mockFileSystemService.directoryExists(mockDirPath);
    expect(mockFileSystemService.directoryExists).toHaveBeenCalledWith(mockDirPath);
    expect(exists).toBe(true);
  });

  it('should define the directoryExists method (false)', async () => {
    (mockFileSystemService.directoryExists as Mock).mockResolvedValue(false);
    const exists = await mockFileSystemService.directoryExists(mockDirPath);
    expect(mockFileSystemService.directoryExists).toHaveBeenCalledWith(mockDirPath);
    expect(exists).toBe(false);
  });

  // --- listFiles ---
  it('should define the listFiles method (success)', async () => {
    (mockFileSystemService.listFiles as Mock).mockResolvedValue(mockFileList);
    const files = await mockFileSystemService.listFiles(mockDirPath);
    expect(mockFileSystemService.listFiles).toHaveBeenCalledWith(mockDirPath);
    expect(files).toEqual(mockFileList);
  });

   it('should define the listFiles method (empty)', async () => {
    (mockFileSystemService.listFiles as Mock).mockResolvedValue([]);
    const files = await mockFileSystemService.listFiles(mockDirPath);
    expect(mockFileSystemService.listFiles).toHaveBeenCalledWith(mockDirPath);
    expect(files).toEqual([]);
  });

   it('should define the listFiles method (failure)', async () => {
    const error = new Error('Directory not found');
    (mockFileSystemService.listFiles as Mock).mockRejectedValue(error);
    await expect(mockFileSystemService.listFiles(mockDirPath)).rejects.toThrow(error);
    expect(mockFileSystemService.listFiles).toHaveBeenCalledWith(mockDirPath);
  });

  // --- getFileStats ---
  it('should define the getFileStats method (success)', async () => {
    (mockFileSystemService.getFileStats as Mock).mockResolvedValue(mockFileStats);
    const stats = await mockFileSystemService.getFileStats(mockFilePath);
    expect(mockFileSystemService.getFileStats).toHaveBeenCalledWith(mockFilePath);
    expect(stats).toEqual(mockFileStats);
  });

   it('should define the getFileStats method (failure)', async () => {
    const error = new Error('File not found');
    (mockFileSystemService.getFileStats as Mock).mockRejectedValue(error);
    await expect(mockFileSystemService.getFileStats(mockFilePath)).rejects.toThrow(error);
    expect(mockFileSystemService.getFileStats).toHaveBeenCalledWith(mockFilePath);
  });

  // --- getBranchMemoryPath (optional) ---
  it('should define the getBranchMemoryPath method', () => {
     if (mockFileSystemService.getBranchMemoryPath) {
        const branchName = 'feature/test';
        const expectedPath = `/path/to/docs/branch-memory-bank/${branchName}`;
        (mockFileSystemService.getBranchMemoryPath as Mock).mockReturnValue(expectedPath);
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
       (mockFileSystemService.getConfig as Mock).mockReturnValue(mockConfig);
        const config = mockFileSystemService.getConfig();
        expect(mockFileSystemService.getConfig).toHaveBeenCalled();
        expect(config).toEqual(mockConfig);
     } else {
        console.warn('getConfig is optional and not mocked, skipping test.');
     }
  });
});
