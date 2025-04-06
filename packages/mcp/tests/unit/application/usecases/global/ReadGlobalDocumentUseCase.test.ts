import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
import { ReadGlobalDocumentUseCase, ReadGlobalDocumentInput } from '../../../../../src/application/usecases/global/ReadGlobalDocumentUseCase.js'; // .js 追加
import { IGlobalMemoryBankRepository } from '../../../../../src/domain/repositories/IGlobalMemoryBankRepository.js'; // .js 追加
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument.js'; // .js 追加
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js'; // .js 追加
// import { DocumentId } from '../../../../../src/domain/entities/DocumentId'; // Not directly used in output DTO
import { Tag } from '../../../../../src/domain/entities/Tag.js'; // .js 追加
// import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo'; // Not directly used by this use case input/output
// import { DocumentVersionInfo } from '../../../../../src/domain/entities/DocumentVersionInfo'; // Not directly used in output DTO
// import { IDocumentValidator } from '../../../../../src/domain/validation/IDocumentValidator'; // Not needed for this test setup
import { DomainError, DomainErrorCodes } from '../../../../../src/shared/errors/DomainError.js'; // .js 追加
import { ApplicationError, ApplicationErrorCodes } from '../../../../../src/shared/errors/ApplicationError.js'; // .js 追加
// import { jest } from '@jest/globals'; // jest インポート削除

// Mocks
// Mock for IGlobalMemoryBankRepository
// jest.Mocked を削除し、手動モックの型を指定
const mockGlobalMemoryBankRepository: IGlobalMemoryBankRepository = {
  initialize: vi.fn(), // 型引数を削除
  getDocument: vi.fn(), // 型引数を削除
  saveDocument: vi.fn(), // 型引数を削除
  deleteDocument: vi.fn(), // 型引数を削除
  listDocuments: vi.fn(), // 型引数を削除
  findDocumentsByTags: vi.fn(), // 型引数を削除
  updateTagsIndex: vi.fn(), // 型引数を削除
  saveTagIndex: vi.fn(), // 型引数を削除
  getTagIndex: vi.fn(), // 型引数を削除
  findDocumentPathsByTagsUsingIndex: vi.fn(), // 型引数を削除
  validateStructure: vi.fn(), // 型引数を削除
};

// Mock validator is not needed anymore as we use MemoryDocument directly
/* const mockValidator: jest.Mocked<IDocumentValidator> = {
  validateContent: jest.fn<(documentType: string, content: Record<string, unknown>) => boolean>().mockReturnValue(true),
  validateDocument: jest.fn<(document: unknown) => boolean>().mockReturnValue(true),
  validateMetadata: jest.fn<(metadata: Record<string, unknown>) => boolean>().mockReturnValue(true),
}; */

// Helper to create a mock MemoryDocument
const createMockMemoryDocument = (pathVal: string, tagsVal: string[], contentStr: string): MemoryDocument => {
    const path = DocumentPath.create(pathVal);
    const tags = tagsVal.map(t => Tag.create(t));
    // MemoryDocument constructor is private, use static create method
    // MemoryDocument.create requires MemoryDocumentProps
    const props = {
        path: path,
        content: contentStr,
        tags: tags,
        lastModified: new Date() // Provide a lastModified date
    };
    // Need to bypass private constructor for mocking if MemoryDocument.create has side effects or complex logic
    // Alternative: Mock MemoryDocument.create if necessary
    // For simplicity, let's assume we can construct a basic object that looks like MemoryDocument for the test
    // This might need adjustment based on how ReadGlobalDocumentUseCase uses the MemoryDocument object
    const mockDoc = {
        props: props,
        path: props.path,
        content: props.content,
        tags: props.tags,
        lastModified: props.lastModified,
        // Add other methods/properties if the use case calls them
        toJSON: vi.fn(() => ({ // jest -> vi
             schema: 'memory_document_v2',
             metadata: {
                 id: 'mock-id-' + Math.random(), // Generate mock ID
                 title: 'Mock Title from Content', // Extract or set mock title
                 documentType: 'generic',
                 path: props.path.value,
                 tags: props.tags.map(t => t.value),
                 lastModified: props.lastModified.toISOString(),
                 createdAt: new Date().toISOString(), // Mock createdAt
                 version: 1
             },
             content: JSON.parse(props.content) // Assume content is valid JSON string
         }))
    } as unknown as MemoryDocument; // Cast to MemoryDocument, use with caution

    return mockDoc;
};


describe('ReadGlobalDocumentUseCase', () => {
  let useCase: ReadGlobalDocumentUseCase;

  beforeEach(() => {
    vi.clearAllMocks(); // jest -> vi
    // JsonDocument.setValidator(mockValidator); // Validator not needed directly here
    useCase = new ReadGlobalDocumentUseCase(mockGlobalMemoryBankRepository); // Use the correct repository mock
  });

  it('should read an existing global document successfully', async () => {
    const docPathStr = 'core/config.json';
    const input: ReadGlobalDocumentInput = {
      path: docPathStr,
    };

    const expectedDocPath = DocumentPath.create(docPathStr);

    // Mock getDocument to return the MemoryDocument
    const mockContent = JSON.stringify({ setting: true });
    const mockDoc = createMockMemoryDocument(docPathStr, ['global', 'config'], mockContent);
    (mockGlobalMemoryBankRepository.getDocument as Mock).mockResolvedValue(mockDoc); // as Mock 追加

    const result = await useCase.execute(input);

    // Verify getDocument was called correctly
    expect(mockGlobalMemoryBankRepository.getDocument).toHaveBeenCalledWith(expectedDocPath);

    // Verify the output matches the document data
    // Verify the output DTO structure
    // Verify the output DTO structure based on ReadGlobalDocumentOutput
    expect(result).not.toBeNull();
    expect(result?.document).toBeDefined();
    expect(result?.document?.path).toBe(mockDoc.path.value); // Check path from mock MemoryDocument
    expect(result?.document?.content).toBe(mockDoc.content); // Check content from mock MemoryDocument
    expect(result?.document?.tags).toEqual(mockDoc.tags.map(t => t.value)); // Check tags from mock MemoryDocument
    expect(result?.document?.lastModified).toBe(mockDoc.lastModified.toISOString()); // Check lastModified from mock MemoryDocument
    // Verify properties NOT included in DocumentDTO are undefined
    expect((result?.document as any)?.id).toBeUndefined();
    expect((result?.document as any)?.title).toBeUndefined();
    expect((result?.document as any)?.documentType).toBeUndefined();
    expect((result?.document as any)?.version).toBeUndefined();
    expect((result?.document as any)?.createdAt).toBeUndefined();
  }); // Add missing closing bracket for the first 'it' block

  it('should throw DomainError when the global document is not found', async () => {
    const docPathStr = 'core/non-existent.json';
    const input: ReadGlobalDocumentInput = {
      path: docPathStr,
    };

    const expectedDocPath = DocumentPath.create(docPathStr);

    // Mock getDocument to return null
    (mockGlobalMemoryBankRepository.getDocument as Mock).mockResolvedValue(null); // as Mock 追加
    // Expect the use case to reject with a DomainError and check the code
    expect.assertions(3); // Expect three assertions in this test (instanceof, code, and getDocument call)
    try {
      await useCase.execute(input);
    } catch (error) {
      expect(error).toBeInstanceOf(DomainError);
      expect((error as DomainError).code).toBe(`DOMAIN_ERROR.${DomainErrorCodes.DOCUMENT_NOT_FOUND}`); // Compare with prefixed code
    }
    // Verify getDocument was still called
    expect(mockGlobalMemoryBankRepository.getDocument).toHaveBeenCalledWith(expectedDocPath);
  });

  it('should throw ApplicationError when repository throws an error', async () => {
     const docPathStr = 'core/error.json';
    const input: ReadGlobalDocumentInput = {
      path: docPathStr,
    };

    const expectedDocPath = DocumentPath.create(docPathStr);
    const repositoryError = new Error('Database connection failed');

    // Mock getDocument to reject with an error
    (mockGlobalMemoryBankRepository.getDocument as Mock).mockRejectedValue(repositoryError); // as Mock 追加
    // Expect the use case to reject with an ApplicationError and check the code and cause
    expect.assertions(4); // Expect four assertions in this test (instanceof, code, cause, and getDocument call)
    try {
      await useCase.execute(input);
    } catch (error) {
       expect(error).toBeInstanceOf(ApplicationError);
       expect((error as ApplicationError).code).toBe(`APP_ERROR.${ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED}`); // Compare with prefixed code
       expect((error as ApplicationError).cause).toBe(repositoryError); // Use cause instead of originalError
    }
    // Verify getDocument was still called
    expect(mockGlobalMemoryBankRepository.getDocument).toHaveBeenCalledWith(expectedDocPath);
  });

  // TODO: Add test cases for:
  // - Input validation (missing path)
}); // Correct closing bracket for describe block
