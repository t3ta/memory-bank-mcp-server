import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
import type { IIndexService } from '../../../../../src/infrastructure/index/interfaces/IIndexService.js'; // .js 追加
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo.js'; // .js 追加
import { DocumentId } from '../../../../../src/domain/entities/DocumentId.js'; // .js 追加
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath.js'; // .js 追加
import { Tag } from '../../../../../src/domain/entities/Tag.js'; // .js 追加
import { JsonDocument, DocumentType } from '../../../../../src/domain/entities/JsonDocument.js'; // .js 追加
import { DocumentVersionInfo } from '../../../../../src/domain/entities/DocumentVersionInfo.js'; // .js 追加
import type { DocumentReference } from '@memory-bank/schemas';
import { IDocumentValidator } from '../../../../../src/domain/validation/IDocumentValidator.js'; // .js 追加

// --- モックデータの準備 (正しい型で生成) ---

// Validator のモック (JsonDocument.create などで使用)
// jest.Mocked を削除し、手動モックの型を指定
const mockValidator: IDocumentValidator = {
  validateDocument: vi.fn(), // jest -> vi
  validateContent: vi.fn(), // jest -> vi
  validateMetadata: vi.fn(), // jest -> vi
};
// テスト実行前に Validator を設定
JsonDocument.setValidator(mockValidator);


// BranchInfo のモック
const mockBranchInfo = BranchInfo.create('feature/indexing');

// DocumentId, DocumentPath, Tag のモック
const mockDocumentId = DocumentId.generate(); // generate() で UUID を生成
const mockDocumentPath = DocumentPath.create('folder/document.json'); // create() で生成
const mockTag1 = Tag.create('typescript'); // create() で生成
const mockTag2 = Tag.create('testing'); // create() で生成
const mockDocumentType: DocumentType = 'progress'; // これは string literal type なのでそのまま

// JsonDocument のモック
const mockJsonDocument = JsonDocument.create({
  id: mockDocumentId,
  path: mockDocumentPath,
  title: 'Test Document',
  documentType: mockDocumentType,
  tags: [mockTag1, mockTag2],
  content: { summary: 'Test content' },
  versionInfo: new DocumentVersionInfo({ version: 1, lastModified: new Date() }),
});


// DocumentReference のモック (エラーメッセージに合わせて修正)
const mockDocumentReference: DocumentReference = {
  id: mockDocumentId.value, // string 型
  path: mockDocumentPath.value, // string 型
  title: 'Test Document', // string 型
  lastModified: new Date(), // Date 型
  // documentType, tags, version はエラーメッセージによると存在しないようなので削除
};

// IIndexService のモック実装を作成
// jest.Mocked を削除し、手動モックの型を指定
const mockIndexService: IIndexService = {
  initializeIndex: vi.fn(), // jest -> vi
  buildIndex: vi.fn(), // jest -> vi
  addToIndex: vi.fn(), // jest -> vi
  removeFromIndex: vi.fn(), // jest -> vi
  findById: vi.fn(), // jest -> vi
  findByPath: vi.fn(), // jest -> vi
  findByTags: vi.fn(), // jest -> vi
  findByType: vi.fn(), // jest -> vi
  listAll: vi.fn(), // jest -> vi
  saveIndex: vi.fn(), // jest -> vi
  loadIndex: vi.fn(), // jest -> vi
};
describe('IIndexService Interface', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    vi.clearAllMocks(); // jest -> vi
    // Validator のモックも vi.clearAllMocks() でリセットされるはずなので削除
  // });
  });

  it('should define the initializeIndex method', async () => {
    (mockIndexService.initializeIndex as Mock).mockResolvedValue(undefined); // as Mock 追加
    await mockIndexService.initializeIndex(mockBranchInfo);
    expect(mockIndexService.initializeIndex).toHaveBeenCalledWith(mockBranchInfo);
  });

  it('should define the buildIndex method', async () => {
    const documents = [mockJsonDocument];
    (mockIndexService.buildIndex as Mock).mockResolvedValue(undefined); // as Mock 追加
    await mockIndexService.buildIndex(mockBranchInfo, documents);
    expect(mockIndexService.buildIndex).toHaveBeenCalledWith(mockBranchInfo, documents);
  });

  it('should define the addToIndex method', async () => {
    (mockIndexService.addToIndex as Mock).mockResolvedValue(undefined); // as Mock 追加
    await mockIndexService.addToIndex(mockBranchInfo, mockJsonDocument);
    expect(mockIndexService.addToIndex).toHaveBeenCalledWith(mockBranchInfo, mockJsonDocument);
  });

  it('should define the removeFromIndex method with JsonDocument', async () => {
    (mockIndexService.removeFromIndex as Mock).mockResolvedValue(undefined); // as Mock 追加
    await mockIndexService.removeFromIndex(mockBranchInfo, mockJsonDocument);
    expect(mockIndexService.removeFromIndex).toHaveBeenCalledWith(mockBranchInfo, mockJsonDocument);
  });

  it('should define the removeFromIndex method with DocumentId', async () => {
    (mockIndexService.removeFromIndex as Mock).mockResolvedValue(undefined); // as Mock 追加
    await mockIndexService.removeFromIndex(mockBranchInfo, mockDocumentId);
    expect(mockIndexService.removeFromIndex).toHaveBeenCalledWith(mockBranchInfo, mockDocumentId);
  });

    it('should define the removeFromIndex method with DocumentPath', async () => {
    (mockIndexService.removeFromIndex as Mock).mockResolvedValue(undefined); // as Mock 追加
    await mockIndexService.removeFromIndex(mockBranchInfo, mockDocumentPath);
    expect(mockIndexService.removeFromIndex).toHaveBeenCalledWith(mockBranchInfo, mockDocumentPath);
  });


  it('should define the findById method (found)', async () => {
    (mockIndexService.findById as Mock).mockResolvedValue(mockDocumentReference); // as Mock 追加
    const result = await mockIndexService.findById(mockBranchInfo, mockDocumentId);
    expect(mockIndexService.findById).toHaveBeenCalledWith(mockBranchInfo, mockDocumentId);
    expect(result).toEqual(mockDocumentReference);
  });

  it('should define the findById method (not found)', async () => {
    // DocumentId.create で生成する (UUID形式である必要あり)
    // テスト用に適当なUUIDを使うか、generate()を使う
    const nonExistentId = DocumentId.generate(); // generate() を使うのが簡単 (import修正済み)
    (mockIndexService.findById as Mock).mockResolvedValue(null); // as Mock 追加
    const result = await mockIndexService.findById(mockBranchInfo, nonExistentId);
    expect(mockIndexService.findById).toHaveBeenCalledWith(mockBranchInfo, nonExistentId);
    expect(result).toBeNull();
  });

  it('should define the findByPath method (found)', async () => {
    (mockIndexService.findByPath as Mock).mockResolvedValue(mockDocumentReference); // as Mock 追加
    const result = await mockIndexService.findByPath(mockBranchInfo, mockDocumentPath);
    expect(mockIndexService.findByPath).toHaveBeenCalledWith(mockBranchInfo, mockDocumentPath);
    expect(result).toEqual(mockDocumentReference);
  });

    it('should define the findByPath method (not found)', async () => {
    // DocumentPath.create で生成する
    const nonExistentPath = DocumentPath.create('non/existent/path.json'); // create() を使う (import修正済み)
    (mockIndexService.findByPath as Mock).mockResolvedValue(null); // as Mock 追加
    const result = await mockIndexService.findByPath(mockBranchInfo, nonExistentPath);
    expect(mockIndexService.findByPath).toHaveBeenCalledWith(mockBranchInfo, nonExistentPath);
    expect(result).toBeNull();
  });

  it('should define the findByTags method (matchAll: true)', async () => {
    const params = { branchInfo: mockBranchInfo, tags: [mockTag1, mockTag2], matchAll: true };
    (mockIndexService.findByTags as Mock).mockResolvedValue([mockDocumentReference]); // as Mock 追加
    const result = await mockIndexService.findByTags(params);
    expect(mockIndexService.findByTags).toHaveBeenCalledWith(params);
    expect(result).toEqual([mockDocumentReference]);
  });

  it('should define the findByTags method (matchAll: false)', async () => {
     const params = { branchInfo: mockBranchInfo, tags: [mockTag1], matchAll: false };
    (mockIndexService.findByTags as Mock).mockResolvedValue([mockDocumentReference]); // as Mock 追加
    const result = await mockIndexService.findByTags(params);
    expect(mockIndexService.findByTags).toHaveBeenCalledWith(params);
    expect(result).toEqual([mockDocumentReference]);
  });

   it('should define the findByTags method (not found)', async () => {
     // Tag.create で生成する
     const nonExistentTag = Tag.create('non-existent-tag'); // create() を使う (import修正済み)
     const params = { branchInfo: mockBranchInfo, tags: [nonExistentTag] };
    (mockIndexService.findByTags as Mock).mockResolvedValue([]); // as Mock 追加
    const result = await mockIndexService.findByTags(params);
    expect(mockIndexService.findByTags).toHaveBeenCalledWith(params);
    expect(result).toEqual([]);
  });

  it('should define the findByType method', async () => {
    (mockIndexService.findByType as Mock).mockResolvedValue([mockDocumentReference]); // as Mock 追加
    const result = await mockIndexService.findByType(mockBranchInfo, mockDocumentType);
    expect(mockIndexService.findByType).toHaveBeenCalledWith(mockBranchInfo, mockDocumentType);
    expect(result).toEqual([mockDocumentReference]);
  });

  it('should define the listAll method', async () => {
    (mockIndexService.listAll as Mock).mockResolvedValue([mockDocumentReference]); // as Mock 追加
    const result = await mockIndexService.listAll(mockBranchInfo);
    expect(mockIndexService.listAll).toHaveBeenCalledWith(mockBranchInfo);
    expect(result).toEqual([mockDocumentReference]);
  });

  it('should define the saveIndex method', async () => {
    (mockIndexService.saveIndex as Mock).mockResolvedValue(undefined); // as Mock 追加
    await mockIndexService.saveIndex(mockBranchInfo);
    expect(mockIndexService.saveIndex).toHaveBeenCalledWith(mockBranchInfo);
  });

  it('should define the loadIndex method', async () => {
    (mockIndexService.loadIndex as Mock).mockResolvedValue(undefined); // as Mock 追加
    await mockIndexService.loadIndex(mockBranchInfo);
    expect(mockIndexService.loadIndex).toHaveBeenCalledWith(mockBranchInfo);
  });
});
