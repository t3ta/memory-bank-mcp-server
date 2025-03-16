import { BranchInfo } from '../../../../domain/entities/BranchInfo';
import { DocumentPath } from '../../../../domain/entities/DocumentPath';
import { MemoryDocument } from '../../../../domain/entities/MemoryDocument';
import { Tag } from '../../../../domain/entities/Tag';
import { FileSystemService } from '../../../storage/FileSystemService';
import { FileSystemTagIndexRepository } from '../FileSystemTagIndexRepository';
import { PathUtils } from '../../../../shared/utils/PathUtils';

// Mock FileSystemService
const mockFileSystem = {
  exists: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  ensureDir: jest.fn(),
} as unknown as FileSystemService;

describe('FileSystemTagIndexRepository', () => {
  let repository: FileSystemTagIndexRepository;
  const branchMemoryBankRoot = '/test/branch';
  const globalMemoryBankPath = '/test/global';

  beforeEach(() => {
    jest.resetAllMocks();
    repository = new FileSystemTagIndexRepository(
      mockFileSystem,
      branchMemoryBankRoot,
      globalMemoryBankPath
    );
  });

  describe('getBranchTags', () => {
    it('should return empty array when no index exists', async () => {
      // Setup
      const branchInfo = BranchInfo.create('feature/test');
      mockFileSystem.exists.mockResolvedValue(false);

      // Execute
      const result = await repository.getBranchTags(branchInfo);

      // Assert
      expect(result).toEqual([]);
      expect(mockFileSystem.exists).toHaveBeenCalledWith(
        expect.stringContaining(PathUtils.join(branchMemoryBankRoot, branchInfo.getNormalizedName()))
      );
      expect(mockFileSystem.readFile).not.toHaveBeenCalled();
    });

    it('should return tags from the branch index', async () => {
      // Setup
      const branchInfo = BranchInfo.create('feature/test');
      const mockTags = ['tag1', 'tag2', 'tag3'];
      const mockIndex = {
        schema: 'tag_index_v1',
        metadata: {
          indexType: 'branch',
          branchName: branchInfo.name,
          lastUpdated: new Date().toISOString(),
          documentCount: 5,
          tagCount: mockTags.length,
        },
        index: mockTags.map(tag => ({
          tag,
          documents: [
            {
              id: '00000000-0000-0000-0000-000000000000',
              path: 'test-path',
              title: 'Test Document',
              lastModified: new Date().toISOString(),
            },
          ],
        })),
      };

      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify(mockIndex));

      // Execute
      const result = await repository.getBranchTags(branchInfo);

      // Assert
      expect(result).toHaveLength(mockTags.length);
      expect(result.map(tag => tag.value)).toEqual(mockTags);
    });
  });

  describe('getGlobalTags', () => {
    it('should return empty array when no index exists', async () => {
      // Setup
      mockFileSystem.exists.mockResolvedValue(false);

      // Execute
      const result = await repository.getGlobalTags();

      // Assert
      expect(result).toEqual([]);
      expect(mockFileSystem.exists).toHaveBeenCalledWith(
        expect.stringContaining(globalMemoryBankPath)
      );
      expect(mockFileSystem.readFile).not.toHaveBeenCalled();
    });

    it('should return tags from the global index', async () => {
      // Setup
      const mockTags = ['tag1', 'tag2', 'tag3', 'tag4'];
      const mockIndex = {
        schema: 'tag_index_v1',
        metadata: {
          indexType: 'global',
          lastUpdated: new Date().toISOString(),
          documentCount: 10,
          tagCount: mockTags.length,
        },
        index: mockTags.map(tag => ({
          tag,
          documents: [
            {
              id: '00000000-0000-0000-0000-000000000000',
              path: 'test-path',
              title: 'Test Document',
              lastModified: new Date().toISOString(),
            },
          ],
        })),
      };

      mockFileSystem.exists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify(mockIndex));

      // Execute
      const result = await repository.getGlobalTags();

      // Assert
      expect(result).toHaveLength(mockTags.length);
      expect(result.map(tag => tag.value)).toEqual(mockTags);
    });
  });

  // More tests should be added for other methods
});
