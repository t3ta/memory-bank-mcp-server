import { JsonPatchUseCase } from '../../../../../src/application/usecases/json/JsonPatchUseCase';
import { IIndexService } from '../../../../../src/infrastructure/index/interfaces/IIndexService';
// import { IJsonSchemaValidator } from '../../../../../src/infrastructure/validation/interfaces/IJsonSchemaValidator'; // みらい... 後で必要になったらコメント外す
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
import { jest } from '@jest/globals'; // jest をインポート
import { v4 as uuidv4, validate as uuidValidate } from 'uuid'; // uuid をインポート

// --- Mocks ---
// みらい: uuid モジュールをモックして、validate が常に true を返すようにする
jest.mock('uuid', () => ({
  v4: jest.fn(() => '11111111-1111-1111-1111-111111111111'), // generate() が固定値を返すように
  validate: jest.fn(() => true), // create() で使われるバリデーションを常に true にする
}));


const mockJsonDocumentRepository: jest.Mocked<JsonDocumentRepository> = {
  findBranchDocument: jest.fn(),
  findGlobalDocument: jest.fn(),
  saveBranchDocument: jest.fn(),
  saveGlobalDocument: jest.fn(),
  deleteBranchDocument: jest.fn(),
  deleteGlobalDocument: jest.fn(),
  listBranchDocuments: jest.fn(),
  listGlobalDocuments: jest.fn(),
};

const mockDocumentEventEmitter: jest.Mocked<DocumentEventEmitter> = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
};

const mockIndexService: jest.Mocked<IIndexService> = {
  initializeIndex: jest.fn(),
  buildIndex: jest.fn(),
  addToIndex: jest.fn(),
  removeFromIndex: jest.fn(),
  findById: jest.fn(),
  findByPath: jest.fn(),
  findByTags: jest.fn(),
  findByType: jest.fn(),
  listAll: jest.fn(),
  saveIndex: jest.fn(),
  loadIndex: jest.fn(),
};

const mockValidator: jest.Mocked<IDocumentValidator> = {
  validateContent: jest.fn<(documentType: string, content: Record<string, unknown>) => boolean>().mockReturnValue(true),
  validateDocument: jest.fn<(document: unknown) => boolean>().mockReturnValue(true),
  validateMetadata: jest.fn<(metadata: Record<string, unknown>) => boolean>().mockReturnValue(true),
};
// --- End Mocks ---

describe('JsonPatchUseCase', () => {
  beforeAll(() => {
    JsonDocument.setValidator(mockValidator);
  });

  let useCase: JsonPatchUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
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

    // みらい: findBranchDocument が JsonDocument を返すようにモックを設定
    // みらい: id は generate() を使う
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
    mockJsonDocumentRepository.findBranchDocument.mockResolvedValue(mockInitialDocument);

    // みらい: saveBranchDocument が JsonDocument を返すようにモックを設定
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
    mockJsonDocumentRepository.saveBranchDocument.mockResolvedValue(mockSavedDocument);


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

  // みらい... 他のテストケース（配列操作、ネスト更新、異常系、境界条件）はここに追加していく！💪
});
