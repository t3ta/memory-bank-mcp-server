import { vi, type Mock } from 'vitest'; // 重複した vi のインポートを削除し、Mock をインポート
import { JsonPatchUseCase } from '../../../../../src/application/usecases/json/JsonPatchUseCase.js'; // .js 追加
// import { IJsonSchemaValidator } from '../../../../../src/infrastructure/validation/interfaces/IJsonSchemaValidator';
import { JsonDocument, DocumentType } from '../../../../../src/domain/entities/JsonDocument.js';
import { DocumentVersionInfo } from '../../../../../src/domain/entities/DocumentVersionInfo.js';
import { JsonDocumentRepository } from '../../../../../src/domain/repositories/JsonDocumentRepository.js';
import { DocumentEventEmitter } from '../../../../../src/domain/events/DocumentEventEmitter.js';
import { EventType } from '../../../../../src/domain/events/EventType.js';
import { DocumentId } from '../../../../../src/domain/entities/DocumentId.js';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js';
import { JsonPatchOperation, JsonPatchOperationType } from '../../../../../src/domain/jsonpatch/JsonPatchOperation.js';
import { Tag } from '../../../../../src/domain/entities/Tag.js';
import { IDocumentValidator } from '../../../../../src/domain/validation/IDocumentValidator.js';
// import { jest } from '@jest/globals'; // jest インポート削除済み
// import { v4 as uuidv4, validate as uuidValidate } from 'uuid'; // 未使用なので削除

// --- Mocks ---

// jest.mock を vi.mock に変更
vi.mock('uuid', () => ({
  v4: vi.fn(() => '11111111-1111-1111-1111-111111111111'), // jest -> vi
  validate: vi.fn(() => true), // jest -> vi
}));


// jest.Mocked を削除し、手動モックの型を指定
const mockJsonDocumentRepository: JsonDocumentRepository = {
  findBranchDocument: vi.fn(), // jest -> vi
  findGlobalDocument: vi.fn(), // jest -> vi
  saveBranchDocument: vi.fn(), // jest -> vi
  saveGlobalDocument: vi.fn(), // jest -> vi
  deleteBranchDocument: vi.fn(), // jest -> vi
  deleteGlobalDocument: vi.fn(), // jest -> vi
  listBranchDocuments: vi.fn(), // jest -> vi
  listGlobalDocuments: vi.fn(), // jest -> vi
};

// jest.Mocked を削除し、手動モックの型を指定
const mockDocumentEventEmitter: DocumentEventEmitter = {
  emit: vi.fn(), // jest -> vi
  on: vi.fn(), // jest -> vi
  off: vi.fn(), // jest -> vi
};

// jest.Mocked を削除し、手動モックの型を指定
// jest.Mocked を削除し、手動モックの型を指定
// const mockIndexService: IIndexService = { // 未使用なので削除
//   initializeIndex: vi.fn(),
//   buildIndex: vi.fn(),
//   addToIndex: vi.fn(),
//   removeFromIndex: vi.fn(),
//   findById: vi.fn(),
//   findByPath: vi.fn(),
//   findByTags: vi.fn(),
//   findByType: vi.fn(),
//   listAll: vi.fn(),
//   saveIndex: vi.fn(),
//   loadIndex: vi.fn(),
// };

// jest.Mocked を削除し、手動モックの型を指定
const mockValidator: IDocumentValidator = {
  validateContent: vi.fn().mockReturnValue(true), // jest -> vi, 型引数削除
  validateDocument: vi.fn().mockReturnValue(true), // jest -> vi, 型引数削除
  validateMetadata: vi.fn().mockReturnValue(true), // jest -> vi, 型引数削除
};
// --- End Mocks ---

describe('JsonPatchUseCase', () => {
  beforeAll(() => {
    JsonDocument.setValidator(mockValidator);
  });

  let useCase: JsonPatchUseCase;

  beforeEach(() => {
    vi.clearAllMocks(); // jest -> vi
    useCase = new JsonPatchUseCase(mockJsonDocumentRepository, mockDocumentEventEmitter);
  });

  it('should apply a simple property change patch', async () => {
    // Arrange
    const branch = 'feature/test-patch';
    const docPath = 'test.json';
    const initialContent = { name: 'old name', value: 123 };
    const patches: { op: JsonPatchOperationType; path: string; value?: any; from?: string }[] = [
      { op: 'replace', path: '/name', value: 'new name' }
    ];
    const patchOperations = patches.map(p => JsonPatchOperation.create(p.op, p.path, p.value, p.from));
    const expectedContent = { name: 'new name', value: 123 };



    const mockInitialDocument = JsonDocument.create({
      path: DocumentPath.create(docPath),
      content: initialContent,
      branch: branch,
      id: DocumentId.generate(), // generate() を使用
      title: 'Test Document',
      documentType: 'test' as DocumentType,
      tags: [] as Tag[],
      versionInfo: new DocumentVersionInfo({ version: 1, lastModified: new Date(), modifiedBy: 'test' }),
    });
    (mockJsonDocumentRepository.findBranchDocument as Mock).mockResolvedValue(mockInitialDocument); // as Mock 追加


    const mockSavedDocument = JsonDocument.create({
      path: mockInitialDocument.path,
      id: mockInitialDocument.id, // generate() で生成された ID を使う
      title: mockInitialDocument.title,
      documentType: mockInitialDocument.documentType,
      tags: mockInitialDocument.tags,
      branch: mockInitialDocument.branch,
      content: expectedContent,
      versionInfo: new DocumentVersionInfo({ version: 2, lastModified: new Date(), modifiedBy: 'system', updateReason: 'Updated via JSON Patch' }),
    });
    (mockJsonDocumentRepository.saveBranchDocument as Mock).mockResolvedValue(mockSavedDocument); // as Mock 追加


    // Act
    const result = await useCase.execute(docPath, patchOperations, branch);

    // Assert
    expect(mockJsonDocumentRepository.findBranchDocument).toHaveBeenCalledWith(docPath, branch);
    expect(mockJsonDocumentRepository.saveBranchDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expectedContent,
        versionInfo: expect.objectContaining({ version: 2 })
      })
    );
    expect(mockDocumentEventEmitter.emit).toHaveBeenCalledWith(EventType.DOCUMENT_UPDATED, expect.objectContaining({
      path: mockSavedDocument.path,
      branch: branch,
      versionInfo: expect.objectContaining({ version: 2 })
    }));

    expect(result).toBeDefined();
    expect(result.content).toEqual(expectedContent);
    expect(result.versionInfo.version).toBe(2);
  });


});
