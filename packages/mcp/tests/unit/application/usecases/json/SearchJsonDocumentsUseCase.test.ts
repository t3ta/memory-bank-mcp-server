import { SearchJsonDocumentsUseCase, SearchJsonDocumentsInput, SearchJsonDocumentsOutput } from '../../../../../src/application/usecases/json/SearchJsonDocumentsUseCase';
import { IJsonDocumentRepository } from '../../../../../src/domain/repositories/IJsonDocumentRepository';
import { JsonDocument, DocumentType } from '../../../../../src/domain/entities/JsonDocument';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath';
import { DocumentId } from '../../../../../src/domain/entities/DocumentId';
import { Tag } from '../../../../../src/domain/entities/Tag';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo';
import { DocumentVersionInfo } from '../../../../../src/domain/entities/DocumentVersionInfo';
import { IDocumentValidator } from '../../../../../src/domain/validation/IDocumentValidator';
import { jest } from '@jest/globals';

// Mocks
const mockJsonDocumentRepository: jest.Mocked<IJsonDocumentRepository> = {
  findById: jest.fn<() => Promise<JsonDocument | null>>(),
  findByPath: jest.fn<() => Promise<JsonDocument | null>>(),
  findByTags: jest.fn<() => Promise<JsonDocument[]>>(), // This will be used
  findByType: jest.fn<() => Promise<JsonDocument[]>>(),
  save: jest.fn<() => Promise<JsonDocument>>(),
  delete: jest.fn<() => Promise<boolean>>(),
  listAll: jest.fn<() => Promise<JsonDocument[]>>(),
  exists: jest.fn<() => Promise<boolean>>(),
};

const mockGlobalRepository: jest.Mocked<IJsonDocumentRepository> = {
  findById: jest.fn<() => Promise<JsonDocument | null>>(),
  findByPath: jest.fn<() => Promise<JsonDocument | null>>(),
  findByTags: jest.fn<() => Promise<JsonDocument[]>>(), // This will be used
  findByType: jest.fn<() => Promise<JsonDocument[]>>(),
  save: jest.fn<() => Promise<JsonDocument>>(),
  delete: jest.fn<() => Promise<boolean>>(),
  listAll: jest.fn<() => Promise<JsonDocument[]>>(),
  exists: jest.fn<() => Promise<boolean>>(),
};

// Mock validator (needed for JsonDocument creation in mocks)
const mockValidator: jest.Mocked<IDocumentValidator> = {
  validateContent: jest.fn<(documentType: string, content: Record<string, unknown>) => boolean>().mockReturnValue(true),
  validateDocument: jest.fn<(document: unknown) => boolean>().mockReturnValue(true),
  validateMetadata: jest.fn<(metadata: Record<string, unknown>) => boolean>().mockReturnValue(true),
};

// Helper to create a mock JsonDocument
const createMockJsonDocument = (pathVal: string, tagsVal: string[], titleVal = 'Mock Doc', typeVal: DocumentType = 'generic', contentVal = {}): JsonDocument => { // Removed idVal parameter
    const id = DocumentId.generate(); // Generate UUID automatically
    const path = DocumentPath.create(pathVal);
    const tags = tagsVal.map(t => Tag.create(t)); // Ensure tagsVal are valid format (lowercase)
    return JsonDocument.create({
        id,
        path,
        title: titleVal,
        documentType: typeVal,
        tags,
        content: contentVal,
        versionInfo: new DocumentVersionInfo({ version: 1, lastModified: new Date(), modifiedBy: 'mock' })
        // createdAt removed - JsonDocument.create doesn't accept it
    });
};


describe('SearchJsonDocumentsUseCase', () => {
  let useCase: SearchJsonDocumentsUseCase;
  let useCaseWithGlobal: SearchJsonDocumentsUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    JsonDocument.setValidator(mockValidator); // Set validator for JsonDocument creation
    useCase = new SearchJsonDocumentsUseCase(mockJsonDocumentRepository);
    useCaseWithGlobal = new SearchJsonDocumentsUseCase(mockJsonDocumentRepository, mockGlobalRepository);
  });

  it('should search documents in a branch by a single tag (OR match)', async () => {
    const branchName = 'feature/search-test';
    const searchTags = ['search-tag'];
    const input: SearchJsonDocumentsInput = {
      branchName: branchName,
      tags: searchTags,
      matchAllTags: false, // Explicitly OR (matchAll -> matchAllTags)
    };

    const expectedBranchInfo = BranchInfo.create(branchName);
    const expectedSearchTags = searchTags.map(t => Tag.create(t));

    // Mock branch existence check
    mockJsonDocumentRepository.exists.mockResolvedValue(true);
    // Mock repository findByTags to return matching documents (use valid tags)
    const mockDoc1 = createMockJsonDocument('path/doc1.json', ['search-tag', 'other']);
    const mockDoc2 = createMockJsonDocument('path/doc2.json', ['search-tag']);
    // Add createdAt manually for the mapping step
    (mockDoc1 as any).createdAt = new Date();
    (mockDoc2 as any).createdAt = new Date();
    mockJsonDocumentRepository.findByTags.mockResolvedValue([mockDoc1, mockDoc2]);

    const result = await useCase.execute(input);

    // Verify repository findByTags was called correctly
    expect(mockJsonDocumentRepository.findByTags).toHaveBeenCalledWith(
      expectedBranchInfo,
      expectedSearchTags,
      false // matchAll should be false
    );
    expect(mockGlobalRepository.findByTags).not.toHaveBeenCalled();

    // Verify the output contains the correct documents
    expect(result.documents).toHaveLength(2);
    expect(result.documents[0].path).toBe('path/doc1.json'); // Check path instead of ID
    expect(result.documents[1].path).toBe('path/doc2.json'); // Check path instead of ID
    expect(result.documents[0].tags).toContain('search-tag');
  });

  it('should search documents in a branch by multiple tags (AND match - lowercase tags)', async () => {
    const branchName = 'feature/search-and';
    const searchTags = ['taga', 'tagb']; // Use lowercase tags
    const input: SearchJsonDocumentsInput = {
      branchName: branchName,
      tags: searchTags,
      matchAllTags: true, // AND match (matchAll -> matchAllTags)
    };

    const expectedBranchInfo = BranchInfo.create(branchName);
    const expectedSearchTags = searchTags.map(t => Tag.create(t));

    // Mock branch existence check
    mockJsonDocumentRepository.exists.mockResolvedValue(true);
    // Mock repository findByTags (use valid tags)
    const mockDoc1 = createMockJsonDocument('path/and.json', ['taga', 'tagb', 'tagc']);
    // Add createdAt manually for the mapping step
    (mockDoc1 as any).createdAt = new Date();
    // This one shouldn't match (no need for createdAt as it won't be returned/mapped)
    // const mockDoc2 = createMockJsonDocument('path/or.json', ['taga']);
    mockJsonDocumentRepository.findByTags.mockResolvedValue([mockDoc1]); // Assume repo handles filtering

    const result = await useCase.execute(input);

    // Verify repository findByTags was called correctly
    expect(mockJsonDocumentRepository.findByTags).toHaveBeenCalledWith(
      expectedBranchInfo,
      expectedSearchTags,
      true // matchAll should be true
    );

    // Verify the output
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].path).toBe('path/and.json'); // Check path instead of generated ID
    expect(result.documents[0].tags).toContain('taga');
    expect(result.documents[0].tags).toContain('tagb');
  });

   it('should search documents globally by tag', async () => {
    const searchTags = ['global-tag'];
    const input: SearchJsonDocumentsInput = {
      // No branchName indicates global search
      tags: searchTags,
    };

    // Global operations still use a BranchInfo internally for now
    const expectedBranchInfo = BranchInfo.create('feature/global');
    const expectedSearchTags = searchTags.map(t => Tag.create(t));

    // Mock GLOBAL repository findByTags (use valid tags)
    const mockDocGlobal = createMockJsonDocument('core/global.json', ['global-tag']);
    // Add createdAt manually to the mock object for the mapping step in the use case
    (mockDocGlobal as any).createdAt = new Date();
    mockGlobalRepository.findByTags.mockResolvedValue([mockDocGlobal]);

    // Use the useCase instance configured with the global repository
    const result = await useCaseWithGlobal.execute(input);

    // Verify findByTags was called on the GLOBAL repository
    expect(mockGlobalRepository.findByTags).toHaveBeenCalledWith(
      expectedBranchInfo, // Still uses BranchInfo internally
      expectedSearchTags,
      false // Default matchAll is false
    );
    expect(mockJsonDocumentRepository.findByTags).not.toHaveBeenCalled(); // Default repo shouldn't be called

    // Verify output
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].path).toBe('core/global.json'); // Check path instead of generated ID
  });

  it('should return an empty array when no documents match', async () => {
    const branchName = 'feature/search-none';
    const searchTags = ['non-existent-tag'];
    const input: SearchJsonDocumentsInput = {
      branchName: branchName,
      tags: searchTags,
    };

    const expectedBranchInfo = BranchInfo.create(branchName);
    const expectedSearchTags = searchTags.map(t => Tag.create(t));

    // Mock branch existence check to return true
    mockJsonDocumentRepository.exists.mockResolvedValue(true);
    // Mock repository findByTags to return an empty array
    mockJsonDocumentRepository.findByTags.mockResolvedValue([]);

    const result = await useCase.execute(input);

    // Verify branch existence check was called
    expect(mockJsonDocumentRepository.exists).toHaveBeenCalledWith(
       expectedBranchInfo,
       expect.any(DocumentPath) // Check if exists was called with some path
    );
    // Verify repository findByTags was called
    expect(mockJsonDocumentRepository.findByTags).toHaveBeenCalledWith(
      expectedBranchInfo,
      expectedSearchTags,
      false
    );

    // Verify the output is an empty array
    expect(result.documents).toHaveLength(0);
    expect(result.documents).toEqual([]);
  });


  // TODO: Add test cases for:
  // - Handling repository errors (mock findByTags to reject)
  // - Input validation errors (missing tags)
  // - Global search when globalRepository is NOT provided
});
