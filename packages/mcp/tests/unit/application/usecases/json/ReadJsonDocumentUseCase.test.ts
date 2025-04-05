import { ReadJsonDocumentUseCase, ReadJsonDocumentInput, ReadJsonDocumentOutput } from '../../../../../src/application/usecases/json/ReadJsonDocumentUseCase';
import { IJsonDocumentRepository } from '../../../../../src/domain/repositories/IJsonDocumentRepository';
import { JsonDocument, DocumentType } from '../../../../../src/domain/entities/JsonDocument';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath';
import { DocumentId } from '../../../../../src/domain/entities/DocumentId';
import { Tag } from '../../../../../src/domain/entities/Tag';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo';
import { DocumentVersionInfo } from '../../../../../src/domain/entities/DocumentVersionInfo';
import { IDocumentValidator } from '../../../../../src/domain/validation/IDocumentValidator.js';
import { DomainError } from '../../../../../src/shared/errors/DomainError.js'; // ← これを追加！
import { jest } from '@jest/globals';

// Mocks
const mockJsonDocumentRepository: jest.Mocked<IJsonDocumentRepository> = {
  findById: jest.fn<() => Promise<JsonDocument | null>>(),
  findByPath: jest.fn<() => Promise<JsonDocument | null>>(),
  findByTags: jest.fn<() => Promise<JsonDocument[]>>(),
  findByType: jest.fn<() => Promise<JsonDocument[]>>(),
  save: jest.fn<() => Promise<JsonDocument>>(),
  delete: jest.fn<() => Promise<boolean>>(),
  listAll: jest.fn<() => Promise<JsonDocument[]>>(),
  exists: jest.fn<() => Promise<boolean>>(),
};

// Global repo mock (distinct instance)
const mockGlobalRepository: jest.Mocked<IJsonDocumentRepository> = {
  findById: jest.fn<() => Promise<JsonDocument | null>>(),
  findByPath: jest.fn<() => Promise<JsonDocument | null>>(),
  findByTags: jest.fn<() => Promise<JsonDocument[]>>(),
  findByType: jest.fn<() => Promise<JsonDocument[]>>(),
  save: jest.fn<() => Promise<JsonDocument>>(),
  delete: jest.fn<() => Promise<boolean>>(),
  listAll: jest.fn<() => Promise<JsonDocument[]>>(),
  exists: jest.fn<() => Promise<boolean>>(),
};


// Mock validator
const mockValidator: jest.Mocked<IDocumentValidator> = {
  validateContent: jest.fn<(documentType: string, content: Record<string, unknown>) => boolean>().mockReturnValue(true),
  validateDocument: jest.fn<(document: unknown) => boolean>().mockReturnValue(true),
  validateMetadata: jest.fn<(metadata: Record<string, unknown>) => boolean>().mockReturnValue(true),
};


describe('ReadJsonDocumentUseCase', () => {
  let useCase: ReadJsonDocumentUseCase;
  let useCaseWithGlobal: ReadJsonDocumentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    // Set validator for JsonDocument creation/validation within the use case if needed
    JsonDocument.setValidator(mockValidator);
    useCase = new ReadJsonDocumentUseCase(mockJsonDocumentRepository);
    useCaseWithGlobal = new ReadJsonDocumentUseCase(mockJsonDocumentRepository, mockGlobalRepository);
  });

  it('should read an existing document from a branch successfully', async () => {
    const branchName = 'feature/read-test';
    const docPathStr = 'data/config.json';
    const docId = DocumentId.generate();
    const docTitle = 'Branch Config';
    const docType: DocumentType = 'generic';
    const docTags = [Tag.create('config'), Tag.create('branch')];
    const docContent = { settingA: true };
    const versionInfo = new DocumentVersionInfo({ version: 2, lastModified: new Date(), modifiedBy: 'test' });

    const input: ReadJsonDocumentInput = {
      branchName: branchName,
      path: docPathStr,
    };

    const expectedBranchInfo = BranchInfo.create(branchName);
    const expectedDocPath = DocumentPath.create(docPathStr);

    // Mock findByPath to return the document
    const existingDocument = JsonDocument.create({
      id: docId,
      path: expectedDocPath,
      title: docTitle,
      documentType: docType,
      tags: docTags,
      content: docContent,
      versionInfo: versionInfo,
    });
    mockJsonDocumentRepository.findByPath.mockResolvedValue(existingDocument);

    const result = await useCase.execute(input);

    // Verify findByPath was called correctly
    expect(mockJsonDocumentRepository.findByPath).toHaveBeenCalledWith(
      expectedBranchInfo,
      expectedDocPath
    );
    expect(mockGlobalRepository.findByPath).not.toHaveBeenCalled(); // Global repo shouldn't be called

    // Verify the output matches the document data
    expect(result).not.toBeNull();
    expect(result?.document).toBeDefined();
    expect(result?.document?.id).toBe(docId.value);
    expect(result?.document?.path).toBe(docPathStr);
    expect(result?.document?.title).toBe(docTitle);
    expect(result?.document?.documentType).toBe(docType);
    expect(result?.document?.tags).toEqual(docTags.map(t => t.value));
    expect(result?.document?.content).toEqual(docContent);
    expect(result?.document?.version).toBe(versionInfo.version);
    expect(result?.document?.lastModified).toBe(versionInfo.lastModified.toISOString());
  });

  it('should throw DomainError when document is not found in branch', async () => {
    const branchName = 'feature/read-test';
    const docPathStr = 'non/existent.json';

    const input: ReadJsonDocumentInput = {
      branchName: branchName,
      path: docPathStr,
    };

    const expectedBranchInfo = BranchInfo.create(branchName);
    const expectedDocPath = DocumentPath.create(docPathStr);

    // Mock findByPath to return null
    mockJsonDocumentRepository.findByPath.mockResolvedValue(null);

    // Expect the use case to reject with a DomainError
    await expect(useCase.execute(input)).rejects.toThrow(DomainError);
    // Optionally, check the error code or message
    await expect(useCase.execute(input)).rejects.toThrow(
       expect.objectContaining({ code: 'DOMAIN_ERROR.DOCUMENT_NOT_FOUND' })
    );


    // Verify findByPath was still called
    expect(mockJsonDocumentRepository.findByPath).toHaveBeenCalledWith(
      expectedBranchInfo,
      expectedDocPath
    );
  });

  it('should read an existing global document successfully', async () => {
    const docPathStr = 'core/global-settings.json';
    const docId = DocumentId.generate();
    const docTitle = 'Global Settings';
    const docType: DocumentType = 'generic';
    const docTags = [Tag.create('global'), Tag.create('settings')];
    const docContent = { theme: 'dark' };
    const versionInfo = new DocumentVersionInfo({ version: 1, lastModified: new Date(), modifiedBy: 'init' });

    const input: ReadJsonDocumentInput = {
      // No branchName indicates global read
      path: docPathStr,
    };

    // Global operations still use a BranchInfo internally for now
    const expectedBranchInfo = BranchInfo.create('feature/global');
    const expectedDocPath = DocumentPath.create(docPathStr);

     // Mock findByPath on the GLOBAL repository
    const existingDocument = JsonDocument.create({
      id: docId,
      path: expectedDocPath,
      title: docTitle,
      documentType: docType,
      tags: docTags,
      content: docContent,
      versionInfo: versionInfo,
    });
    mockGlobalRepository.findByPath.mockResolvedValue(existingDocument);

    // Use the useCase instance configured with the global repository
    const result = await useCaseWithGlobal.execute(input);

     // Verify findByPath was called on the GLOBAL repository
    expect(mockGlobalRepository.findByPath).toHaveBeenCalledWith(
      expectedBranchInfo, // Still uses BranchInfo internally
      expectedDocPath
    );
    expect(mockJsonDocumentRepository.findByPath).not.toHaveBeenCalled(); // Default repo shouldn't be called

    // Verify the output
    expect(result).not.toBeNull();
    expect(result?.document).toBeDefined();
    expect(result?.document?.id).toBe(docId.value);
    expect(result?.document?.path).toBe(docPathStr);
    // ... other assertions similar to the branch test ...
  });


  // TODO: Add test cases for:
  // - Reading global document when globalRepository is NOT provided (should use default repo)
  // - Handling repository errors (mock findByPath to reject)
  // - Input validation errors (missing path)
});
