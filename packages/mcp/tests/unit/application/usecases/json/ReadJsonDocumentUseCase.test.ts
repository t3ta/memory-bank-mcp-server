import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
import { ReadJsonDocumentUseCase, ReadJsonDocumentInput } from '../../../../../src/application/usecases/json/ReadJsonDocumentUseCase.js'; // 未使用の ReadJsonDocumentOutput を削除
import { IJsonDocumentRepository } from '../../../../../src/domain/repositories/IJsonDocumentRepository.js'; // .js 追加済み
import { JsonDocument, DocumentType } from '../../../../../src/domain/entities/JsonDocument.js'; // .js 追加済み
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js'; // .js 追加済み
import { DocumentId } from '../../../../../src/domain/entities/DocumentId.js'; // .js 追加済み
import { Tag } from '../../../../../src/domain/entities/Tag.js'; // .js 追加済み
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js'; // .js 追加
import { DocumentVersionInfo } from '../../../../../src/domain/entities/DocumentVersionInfo.js'; // .js 追加
import { IDocumentValidator } from '../../../../../src/domain/validation/IDocumentValidator.js';
import { DomainError } from '../../../../../src/shared/errors/DomainError.js'; // ← これを追加！
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

// Global repo mock (distinct instance)
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


// Mock validator
// jest.Mocked を削除し、手動モックの型を指定
const mockValidator: IDocumentValidator = {
  validateContent: vi.fn().mockReturnValue(true), // jest -> vi, 型引数削除
  validateDocument: vi.fn().mockReturnValue(true), // jest -> vi, 型引数削除
  validateMetadata: vi.fn().mockReturnValue(true), // jest -> vi, 型引数削除
};


describe('ReadJsonDocumentUseCase', () => {
  let useCase: ReadJsonDocumentUseCase;
  let useCaseWithGlobal: ReadJsonDocumentUseCase;

  beforeEach(() => {
    vi.clearAllMocks(); // jest -> vi
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
    (mockJsonDocumentRepository.findByPath as Mock).mockResolvedValue(existingDocument); // as Mock 追加

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
    (mockJsonDocumentRepository.findByPath as Mock).mockResolvedValue(null); // as Mock 追加

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
    (mockGlobalRepository.findByPath as Mock).mockResolvedValue(existingDocument); // as Mock 追加

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
