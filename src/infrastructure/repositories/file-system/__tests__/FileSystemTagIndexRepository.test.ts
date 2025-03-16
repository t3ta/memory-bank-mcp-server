import path from 'path';
import { BranchInfo } from '../../../../domain/entities/BranchInfo';
import { DocumentPath } from '../../../../domain/entities/DocumentPath';
import { MemoryDocument } from '../../../../domain/entities/MemoryDocument';
import { Tag } from '../../../../domain/entities/Tag';
import { FileSystemService } from '../../../storage/FileSystemService';
import { FileSystemTagIndexRepository } from '../FileSystemTagIndexRepository';
import { IBranchMemoryBankRepository } from '../../../../domain/repositories/IBranchMemoryBankRepository';
import { IGlobalMemoryBankRepository } from '../../../../domain/repositories/IGlobalMemoryBankRepository';

// Mock FileSystemService
const mockFileSystem = {
  fileExists: jest.fn(),
  readFile: jest.fn(),
  writeFile: jest.fn(),
  createDirectory: jest.fn(),
} as jest.Mocked<Partial<FileSystemService>> as jest.Mocked<FileSystemService>;

// Mock BranchMemoryBankRepository
const mockBranchRepo = {
  listDocuments: jest.fn(),
  getDocument: jest.fn(),
} as jest.Mocked<Partial<IBranchMemoryBankRepository>> as jest.Mocked<IBranchMemoryBankRepository>;

// Mock GlobalMemoryBankRepository
const mockGlobalRepo = {
  listDocuments: jest.fn(),
  getDocument: jest.fn(),
} as jest.Mocked<Partial<IGlobalMemoryBankRepository>> as jest.Mocked<IGlobalMemoryBankRepository>;

// Helper to create mock documents for testing
function createMockDocument(path: string, tags: string[]): MemoryDocument {
  const docPath = DocumentPath.create(path);
  const tagObjects = tags.map(tag => Tag.create(tag));
  
  return MemoryDocument.create({
    path: docPath,
    content: `Mock content for ${path}`,
    tags: tagObjects,
    lastModified: new Date()
  });
}

describe('FileSystemTagIndexRepository', () => {
  let repository: FileSystemTagIndexRepository;
  const branchMemoryBankRoot = '/test/branch';
  const globalMemoryBankPath = '/test/global';

  beforeEach(() => {
    jest.resetAllMocks();
    repository = new FileSystemTagIndexRepository(
      mockFileSystem,
      branchMemoryBankRoot,
      globalMemoryBankPath,
      mockBranchRepo,
      mockGlobalRepo
    );
  });

  describe('getBranchTags', () => {
    it('should return empty array when no index exists', async () => {
      // Setup
      const branchInfo = BranchInfo.create('feature/test');
      mockFileSystem.fileExists.mockResolvedValue(false);

      // Execute
      const result = await repository.getBranchTags(branchInfo);

      // Assert
      expect(result).toEqual([]);
      expect(mockFileSystem.fileExists).toHaveBeenCalledWith(
        expect.stringContaining(path.join(branchMemoryBankRoot, branchInfo.safeName))
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

      mockFileSystem.fileExists.mockResolvedValue(true);
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
      mockFileSystem.fileExists.mockResolvedValue(false);

      // Execute
      const result = await repository.getGlobalTags();

      // Assert
      expect(result).toEqual([]);
      expect(mockFileSystem.fileExists).toHaveBeenCalledWith(
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

      mockFileSystem.fileExists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify(mockIndex));

      // Execute
      const result = await repository.getGlobalTags();

      // Assert
      expect(result).toHaveLength(mockTags.length);
      expect(result.map(tag => tag.value)).toEqual(mockTags);
    });
  });

  describe('updateBranchTagIndex', () => {
    it('should create a new index when none exists', async () => {
      // Setup
      const branchInfo = BranchInfo.create('feature/test');
      const mockDocs = [
        createMockDocument('doc1.md', ['tag1', 'tag2']),
        createMockDocument('doc2.md', ['tag2', 'tag3']),
      ];
      const docPaths = mockDocs.map(doc => doc.path);

      mockFileSystem.fileExists.mockResolvedValue(false);
      mockBranchRepo.listDocuments.mockResolvedValue(docPaths);
      mockDocs.forEach(doc => {
        mockBranchRepo.getDocument.mockResolvedValueOnce(doc);
      });

      // Execute
      const result = await repository.updateBranchTagIndex(branchInfo);

      // Assert
      expect(mockFileSystem.fileExists).toHaveBeenCalledWith(expect.any(String));
      expect(mockBranchRepo.listDocuments).toHaveBeenCalledWith(branchInfo);
      expect(mockBranchRepo.getDocument).toHaveBeenCalledTimes(2);
      expect(mockFileSystem.createDirectory).toHaveBeenCalled();
      expect(mockFileSystem.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"schema":"tag_index_v1"')
      );
      
      // Check the result
      expect(result.tags).toContain('tag1');
      expect(result.tags).toContain('tag2');
      expect(result.tags).toContain('tag3');
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.fullRebuild).toBe(false);
    });

    it('should perform a full rebuild when requested', async () => {
      // Setup
      const branchInfo = BranchInfo.create('feature/test');
      const mockDocs = [
        createMockDocument('doc1.md', ['tag1', 'tag2']),
        createMockDocument('doc2.md', ['tag2', 'tag3']),
      ];
      const docPaths = mockDocs.map(doc => doc.path);

      // Even if an index exists, it should be ignored for full rebuild
      mockFileSystem.fileExists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify({
        schema: 'tag_index_v1',
        metadata: {
          indexType: 'branch',
          branchName: branchInfo.name,
          lastUpdated: new Date().toISOString(),
          documentCount: 10, // Different count to verify it's rebuilt
          tagCount: 5,
        },
        index: [], // Empty to verify it's replaced
      }));
      
      mockBranchRepo.listDocuments.mockResolvedValue(docPaths);
      mockDocs.forEach(doc => {
        mockBranchRepo.getDocument.mockResolvedValueOnce(doc);
      });

      // Execute with fullRebuild option
      const result = await repository.updateBranchTagIndex(branchInfo, { fullRebuild: true });

      // Assert
      expect(mockBranchRepo.listDocuments).toHaveBeenCalledWith(branchInfo);
      expect(mockBranchRepo.getDocument).toHaveBeenCalledTimes(2);
      expect(mockFileSystem.writeFile).toHaveBeenCalled();
      
      // Check the result reflects new data, not existing index
      expect(result.documentCount).toBe(2); // Should be the new count
      expect(result.updateInfo.fullRebuild).toBe(true);
    });
  });

  describe('updateGlobalTagIndex', () => {
    it('should create a new index when none exists', async () => {
      // Setup
      const mockDocs = [
        createMockDocument('global-doc1.md', ['global', 'tag1']),
        createMockDocument('global-doc2.md', ['global', 'tag2']),
      ];
      const docPaths = mockDocs.map(doc => doc.path);

      mockFileSystem.fileExists.mockResolvedValue(false);
      mockGlobalRepo.listDocuments.mockResolvedValue(docPaths);
      mockDocs.forEach(doc => {
        mockGlobalRepo.getDocument.mockResolvedValueOnce(doc);
      });

      // Execute
      const result = await repository.updateGlobalTagIndex();

      // Assert
      expect(mockFileSystem.fileExists).toHaveBeenCalledWith(expect.any(String));
      expect(mockGlobalRepo.listDocuments).toHaveBeenCalled();
      expect(mockGlobalRepo.getDocument).toHaveBeenCalledTimes(2);
      expect(mockFileSystem.createDirectory).toHaveBeenCalled();
      expect(mockFileSystem.writeFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('"schema":"tag_index_v1"')
      );
      
      // Check the result
      expect(result.tags).toContain('global');
      expect(result.tags).toContain('tag1');
      expect(result.tags).toContain('tag2');
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.fullRebuild).toBe(false);
    });

    it('should update existing index when not doing full rebuild', async () => {
      // Setup
      const mockDocs = [
        createMockDocument('global-doc1.md', ['global', 'tag1']),
        createMockDocument('global-doc2.md', ['global', 'tag2']),
      ];
      const docPaths = mockDocs.map(doc => doc.path);

      // Existing index
      mockFileSystem.fileExists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify({
        schema: 'tag_index_v1',
        metadata: {
          indexType: 'global',
          lastUpdated: new Date().toISOString(),
          documentCount: 5, // Different count to verify it's updated
          tagCount: 3,
        },
        index: [
          {
            tag: 'old-tag',
            documents: [
              {
                id: '00000000-0000-0000-0000-000000000000',
                path: 'old-doc.md',
                title: 'Old Document',
                lastModified: new Date().toISOString(),
              }
            ]
          }
        ], 
      }));
      
      mockGlobalRepo.listDocuments.mockResolvedValue(docPaths);
      mockDocs.forEach(doc => {
        mockGlobalRepo.getDocument.mockResolvedValueOnce(doc);
      });

      // Execute
      const result = await repository.updateGlobalTagIndex({ fullRebuild: false });

      // Assert
      expect(mockGlobalRepo.listDocuments).toHaveBeenCalled();
      expect(mockGlobalRepo.getDocument).toHaveBeenCalledTimes(2);
      expect(mockFileSystem.writeFile).toHaveBeenCalled();
      
      // Check the result reflects new data
      expect(result.documentCount).toBe(2);
      expect(result.updateInfo.fullRebuild).toBe(false);
    });
  });

  describe('findBranchDocumentsByTags', () => {
    it('should return empty array when no index exists', async () => {
      // Setup
      const branchInfo = BranchInfo.create('feature/test');
      const tags = [Tag.create('tag1'), Tag.create('tag2')];
      
      mockFileSystem.fileExists.mockResolvedValue(false);

      // Execute
      const result = await repository.findBranchDocumentsByTags(branchInfo, tags);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return documents with ANY of the specified tags', async () => {
      // Setup
      const branchInfo = BranchInfo.create('feature/test');
      const tags = [Tag.create('tag1'), Tag.create('tag3')];
      
      const mockIndex = {
        schema: 'tag_index_v1',
        metadata: {
          indexType: 'branch',
          branchName: branchInfo.name,
          lastUpdated: new Date().toISOString(),
          documentCount: 3,
          tagCount: 3,
        },
        index: [
          {
            tag: 'tag1',
            documents: [
              { id: 'id1', path: 'doc1.md', title: 'Doc 1', lastModified: new Date().toISOString() },
              { id: 'id2', path: 'doc2.md', title: 'Doc 2', lastModified: new Date().toISOString() },
            ]
          },
          {
            tag: 'tag2',
            documents: [
              { id: 'id2', path: 'doc2.md', title: 'Doc 2', lastModified: new Date().toISOString() },
              { id: 'id3', path: 'doc3.md', title: 'Doc 3', lastModified: new Date().toISOString() },
            ]
          },
          {
            tag: 'tag3',
            documents: [
              { id: 'id3', path: 'doc3.md', title: 'Doc 3', lastModified: new Date().toISOString() },
            ]
          }
        ]
      };
      
      mockFileSystem.fileExists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify(mockIndex));

      // Execute with matchAll = false (default)
      const result = await repository.findBranchDocumentsByTags(branchInfo, tags);

      // Assert - should return docs with tag1 OR tag3
      expect(result).toHaveLength(3);
      const paths = result.map(path => path.value);
      expect(paths).toContain('doc1.md');
      expect(paths).toContain('doc2.md');
      expect(paths).toContain('doc3.md');
    });

    it('should return documents with ALL of the specified tags when matchAll is true', async () => {
      // Setup
      const branchInfo = BranchInfo.create('feature/test');
      const tags = [Tag.create('tag1'), Tag.create('tag2')];
      
      const mockIndex = {
        schema: 'tag_index_v1',
        metadata: {
          indexType: 'branch',
          branchName: branchInfo.name,
          lastUpdated: new Date().toISOString(),
          documentCount: 3,
          tagCount: 3,
        },
        index: [
          {
            tag: 'tag1',
            documents: [
              { id: 'id1', path: 'doc1.md', title: 'Doc 1', lastModified: new Date().toISOString() },
              { id: 'id2', path: 'doc2.md', title: 'Doc 2', lastModified: new Date().toISOString() },
            ]
          },
          {
            tag: 'tag2',
            documents: [
              { id: 'id2', path: 'doc2.md', title: 'Doc 2', lastModified: new Date().toISOString() },
              { id: 'id3', path: 'doc3.md', title: 'Doc 3', lastModified: new Date().toISOString() },
            ]
          },
          {
            tag: 'tag3',
            documents: [
              { id: 'id3', path: 'doc3.md', title: 'Doc 3', lastModified: new Date().toISOString() },
            ]
          }
        ]
      };
      
      mockFileSystem.fileExists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify(mockIndex));

      // Execute with matchAll = true
      const result = await repository.findBranchDocumentsByTags(branchInfo, tags, true);

      // Assert - should only return doc2.md which has both tag1 AND tag2
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe('doc2.md');
    });
  });

  describe('findGlobalDocumentsByTags', () => {
    it('should return empty array when no index exists', async () => {
      // Setup
      const tags = [Tag.create('tag1'), Tag.create('tag2')];
      
      mockFileSystem.fileExists.mockResolvedValue(false);

      // Execute
      const result = await repository.findGlobalDocumentsByTags(tags);

      // Assert
      expect(result).toEqual([]);
    });

    it('should return documents with ANY of the specified tags', async () => {
      // Setup
      const tags = [Tag.create('tag1'), Tag.create('tag3')];
      
      const mockIndex = {
        schema: 'tag_index_v1',
        metadata: {
          indexType: 'global',
          lastUpdated: new Date().toISOString(),
          documentCount: 3,
          tagCount: 3,
        },
        index: [
          {
            tag: 'tag1',
            documents: [
              { id: 'id1', path: 'doc1.md', title: 'Doc 1', lastModified: new Date().toISOString() },
              { id: 'id2', path: 'doc2.md', title: 'Doc 2', lastModified: new Date().toISOString() },
            ]
          },
          {
            tag: 'tag2',
            documents: [
              { id: 'id2', path: 'doc2.md', title: 'Doc 2', lastModified: new Date().toISOString() },
              { id: 'id3', path: 'doc3.md', title: 'Doc 3', lastModified: new Date().toISOString() },
            ]
          },
          {
            tag: 'tag3',
            documents: [
              { id: 'id3', path: 'doc3.md', title: 'Doc 3', lastModified: new Date().toISOString() },
            ]
          }
        ]
      };
      
      mockFileSystem.fileExists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify(mockIndex));

      // Execute with matchAll = false (default)
      const result = await repository.findGlobalDocumentsByTags(tags);

      // Assert - should return docs with tag1 OR tag3
      expect(result).toHaveLength(3);
      const paths = result.map(path => path.value);
      expect(paths).toContain('doc1.md');
      expect(paths).toContain('doc2.md');
      expect(paths).toContain('doc3.md');
    });
  });

  // Tests for document operations (add/remove)
  describe('addDocumentToBranchIndex', () => {
    it('should add a document to the branch index', async () => {
      // Setup
      const branchInfo = BranchInfo.create('feature/test');
      const document = createMockDocument('new-doc.md', ['tag1', 'tag4']);
      
      // Existing index
      const mockIndex = {
        schema: 'tag_index_v1',
        metadata: {
          indexType: 'branch',
          branchName: branchInfo.name,
          lastUpdated: new Date().toISOString(),
          documentCount: 2,
          tagCount: 3,
        },
        index: [
          {
            tag: 'tag1',
            documents: [
              { id: 'id1', path: 'doc1.md', title: 'Doc 1', lastModified: new Date().toISOString() },
            ]
          },
          {
            tag: 'tag2',
            documents: [
              { id: 'id2', path: 'doc2.md', title: 'Doc 2', lastModified: new Date().toISOString() },
            ]
          },
          {
            tag: 'tag3',
            documents: [
              { id: 'id2', path: 'doc2.md', title: 'Doc 2', lastModified: new Date().toISOString() },
            ]
          }
        ]
      };
      
      mockFileSystem.fileExists.mockResolvedValue(true);
      mockFileSystem.readFile.mockResolvedValue(JSON.stringify(mockIndex));

      // Execute
      await repository.addDocumentToBranchIndex(branchInfo, document);

      // Assert
      expect(mockFileSystem.writeFile).toHaveBeenCalled();
      
      // Extract the written JSON to verify the document was added properly
      const callArgs = mockFileSystem.writeFile.mock.calls[0];
      const writtenContent = callArgs[1];
      const parsedContent = JSON.parse(writtenContent);
      
      // Verify tag1 now has 2 documents
      const tag1Entry = parsedContent.index.find((e: any) => e.tag === 'tag1');
      expect(tag1Entry.documents.length).toBe(2);
      expect(tag1Entry.documents.some((d: any) => d.path === 'new-doc.md')).toBe(true);
      
      // Verify tag4 was added
      const tag4Entry = parsedContent.index.find((e: any) => e.tag === 'tag4');
      expect(tag4Entry).toBeDefined();
      expect(tag4Entry.documents.length).toBe(1);
      expect(tag4Entry.documents[0].path).toBe('new-doc.md');
      
      // Verify metadata was updated
      expect(parsedContent.metadata.documentCount).toBe(3); // One more document
      expect(parsedContent.metadata.tagCount).toBe(4); // One more tag
    });
  });
});
