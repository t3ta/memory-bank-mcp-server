import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
import { SearchJsonDocumentsUseCase, SearchJsonDocumentsInput } from '../../../../../src/application/usecases/json/SearchJsonDocumentsUseCase.js'; // 未使用の SearchJsonDocumentsOutput を削除
import { IJsonDocumentRepository } from '../../../../../src/domain/repositories/IJsonDocumentRepository.js'; // .js 追加
import { JsonDocument, DocumentType } from '../../../../../src/domain/entities/JsonDocument.js'; // .js 追加
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js'; // .js 追加
import { DocumentId } from '../../../../../src/domain/entities/DocumentId.js'; // .js 追加
import { Tag } from '../../../../../src/domain/entities/Tag.js'; // .js 追加
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js'; // .js 追加
import { DocumentVersionInfo } from '../../../../../src/domain/entities/DocumentVersionInfo.js'; // .js 追加
import { IDocumentValidator } from '../../../../../src/domain/validation/IDocumentValidator.js'; // .js 追加
// import { jest } from '@jest/globals'; // jest インポート削除

// Mocks
// jest.Mocked を削除し、手動モックの型を指定
const mockJsonDocumentRepository: IJsonDocumentRepository = {
  findById: vi.fn(), // jest -> vi, 型引数削除
  findByPath: vi.fn(), // jest -> vi, 型引数削除
  findByTags: vi.fn(), // jest -> vi, 型引数削除
  findByType: vi.fn(), // jest -> vi, 型引数削除
  save: vi.fn(), // jest -> vi, 型引数削除
  delete: vi.fn(), // jest -> vi, 型引数削除
  listAll: vi.fn(), // jest -> vi, 型引数削除
  exists: vi.fn(), // jest -> vi, 型引数削除
};

// jest.Mocked を削除し、手動モックの型を指定
const mockGlobalRepository: IJsonDocumentRepository = {
  findById: vi.fn(), // jest -> vi, 型引数削除
  findByPath: vi.fn(), // jest -> vi, 型引数削除
  findByTags: vi.fn(), // jest -> vi, 型引数削除
  findByType: vi.fn(), // jest -> vi, 型引数削除
  save: vi.fn(), // jest -> vi, 型引数削除
  delete: vi.fn(), // jest -> vi, 型引数削除
  listAll: vi.fn(), // jest -> vi, 型引数削除
  exists: vi.fn(), // jest -> vi, 型引数削除
};

// Mock validator (needed for JsonDocument creation in mocks)
// jest.Mocked を削除し、手動モックの型を指定
const mockValidator: IDocumentValidator = {
  validateContent: vi.fn().mockReturnValue(true), // jest -> vi, 型引数削除
  validateDocument: vi.fn().mockReturnValue(true), // jest -> vi, 型引数削除
  validateMetadata: vi.fn().mockReturnValue(true), // jest -> vi, 型引数削除
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
    vi.clearAllMocks(); // jest -> vi
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
    (mockJsonDocumentRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
    // Mock repository findByTags to return matching documents (use valid tags)
    const mockDoc1 = createMockJsonDocument('path/doc1.json', ['search-tag', 'other']);
    const mockDoc2 = createMockJsonDocument('path/doc2.json', ['search-tag']);
    // Add createdAt manually for the mapping step
    (mockDoc1 as any).createdAt = new Date();
    (mockDoc2 as any).createdAt = new Date();
    (mockJsonDocumentRepository.findByTags as Mock).mockResolvedValue([mockDoc1, mockDoc2]); // as Mock 追加

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
    (mockJsonDocumentRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
    // Mock repository findByTags (use valid tags)
    const mockDoc1 = createMockJsonDocument('path/and.json', ['taga', 'tagb', 'tagc']);
    // Add createdAt manually for the mapping step
    (mockDoc1 as any).createdAt = new Date();
    // This one shouldn't match (no need for createdAt as it won't be returned/mapped)
    // const mockDoc2 = createMockJsonDocument('path/or.json', ['taga']);
    (mockJsonDocumentRepository.findByTags as Mock).mockResolvedValue([mockDoc1]); // as Mock 追加

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
    (mockGlobalRepository.findByTags as Mock).mockResolvedValue([mockDocGlobal]); // as Mock 追加

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
    (mockJsonDocumentRepository.exists as Mock).mockResolvedValue(true); // as Mock 追加
    // Mock repository findByTags to return an empty array
    (mockJsonDocumentRepository.findByTags as Mock).mockResolvedValue([]); // as Mock 追加

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
