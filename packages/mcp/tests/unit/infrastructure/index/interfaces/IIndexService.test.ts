// import type を import に変更してクラスを値として使えるようにする
import type { IIndexService } from '../../../../../src/infrastructure/index/interfaces/IIndexService';
import { BranchInfo } from '../../../../../src/domain/entities/BranchInfo';
import { DocumentId } from '../../../../../src/domain/entities/DocumentId';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath';
import { Tag } from '../../../../../src/domain/entities/Tag';
import { JsonDocument, DocumentType } from '../../../../../src/domain/entities/JsonDocument';
import { DocumentVersionInfo } from '../../../../../src/domain/entities/DocumentVersionInfo'; // VersionInfo import追加
import type { DocumentReference } from '@memory-bank/schemas';
import { IDocumentValidator } from '../../../../../src/domain/validation/IDocumentValidator'; // Validator import追加

// --- モックデータの準備 (正しい型で生成) ---

// Validator のモック (JsonDocument.create などで使用)
const mockValidator: jest.Mocked<IDocumentValidator> = {
  validateDocument: jest.fn(),
  validateContent: jest.fn(),
  validateMetadata: jest.fn(), // validateMetadata を追加
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
describe('IIndexService Interface', () => {
  beforeEach(() => {
    // 各テストの前にモックをリセット
    jest.clearAllMocks();
    // Validator のモックもリセット
    mockValidator.validateDocument.mockClear();
    mockValidator.validateContent.mockClear();
  // }); // この余計な閉じカッコを削除
  });

  it('should define the initializeIndex method', async () => {
    mockIndexService.initializeIndex.mockResolvedValue(undefined);
    await mockIndexService.initializeIndex(mockBranchInfo);
    expect(mockIndexService.initializeIndex).toHaveBeenCalledWith(mockBranchInfo);
  });

  it('should define the buildIndex method', async () => {
    const documents = [mockJsonDocument];
    mockIndexService.buildIndex.mockResolvedValue(undefined);
    await mockIndexService.buildIndex(mockBranchInfo, documents);
    expect(mockIndexService.buildIndex).toHaveBeenCalledWith(mockBranchInfo, documents);
  });

  it('should define the addToIndex method', async () => {
    mockIndexService.addToIndex.mockResolvedValue(undefined);
    await mockIndexService.addToIndex(mockBranchInfo, mockJsonDocument);
    expect(mockIndexService.addToIndex).toHaveBeenCalledWith(mockBranchInfo, mockJsonDocument);
  });

  it('should define the removeFromIndex method with JsonDocument', async () => {
    mockIndexService.removeFromIndex.mockResolvedValue(undefined);
    await mockIndexService.removeFromIndex(mockBranchInfo, mockJsonDocument);
    expect(mockIndexService.removeFromIndex).toHaveBeenCalledWith(mockBranchInfo, mockJsonDocument);
  });

  it('should define the removeFromIndex method with DocumentId', async () => {
    mockIndexService.removeFromIndex.mockResolvedValue(undefined);
    await mockIndexService.removeFromIndex(mockBranchInfo, mockDocumentId);
    expect(mockIndexService.removeFromIndex).toHaveBeenCalledWith(mockBranchInfo, mockDocumentId);
  });

    it('should define the removeFromIndex method with DocumentPath', async () => {
    mockIndexService.removeFromIndex.mockResolvedValue(undefined);
    await mockIndexService.removeFromIndex(mockBranchInfo, mockDocumentPath);
    expect(mockIndexService.removeFromIndex).toHaveBeenCalledWith(mockBranchInfo, mockDocumentPath);
  });


  it('should define the findById method (found)', async () => {
    mockIndexService.findById.mockResolvedValue(mockDocumentReference);
    const result = await mockIndexService.findById(mockBranchInfo, mockDocumentId);
    expect(mockIndexService.findById).toHaveBeenCalledWith(mockBranchInfo, mockDocumentId);
    expect(result).toEqual(mockDocumentReference);
  });

  it('should define the findById method (not found)', async () => {
    // DocumentId.create で生成する (UUID形式である必要あり)
    // テスト用に適当なUUIDを使うか、generate()を使う
    const nonExistentId = DocumentId.generate(); // generate() を使うのが簡単 (import修正済み)
    mockIndexService.findById.mockResolvedValue(null);
    const result = await mockIndexService.findById(mockBranchInfo, nonExistentId);
    expect(mockIndexService.findById).toHaveBeenCalledWith(mockBranchInfo, nonExistentId);
    expect(result).toBeNull();
  });

  it('should define the findByPath method (found)', async () => {
    mockIndexService.findByPath.mockResolvedValue(mockDocumentReference);
    const result = await mockIndexService.findByPath(mockBranchInfo, mockDocumentPath);
    expect(mockIndexService.findByPath).toHaveBeenCalledWith(mockBranchInfo, mockDocumentPath);
    expect(result).toEqual(mockDocumentReference);
  });

    it('should define the findByPath method (not found)', async () => {
    // DocumentPath.create で生成する
    const nonExistentPath = DocumentPath.create('non/existent/path.json'); // create() を使う (import修正済み)
    mockIndexService.findByPath.mockResolvedValue(null);
    const result = await mockIndexService.findByPath(mockBranchInfo, nonExistentPath);
    expect(mockIndexService.findByPath).toHaveBeenCalledWith(mockBranchInfo, nonExistentPath);
    expect(result).toBeNull();
  });

  it('should define the findByTags method (matchAll: true)', async () => {
    const params = { branchInfo: mockBranchInfo, tags: [mockTag1, mockTag2], matchAll: true };
    mockIndexService.findByTags.mockResolvedValue([mockDocumentReference]);
    const result = await mockIndexService.findByTags(params);
    expect(mockIndexService.findByTags).toHaveBeenCalledWith(params);
    expect(result).toEqual([mockDocumentReference]);
  });

  it('should define the findByTags method (matchAll: false)', async () => {
     const params = { branchInfo: mockBranchInfo, tags: [mockTag1], matchAll: false };
    mockIndexService.findByTags.mockResolvedValue([mockDocumentReference]);
    const result = await mockIndexService.findByTags(params);
    expect(mockIndexService.findByTags).toHaveBeenCalledWith(params);
    expect(result).toEqual([mockDocumentReference]);
  });

   it('should define the findByTags method (not found)', async () => {
     // Tag.create で生成する
     const nonExistentTag = Tag.create('non-existent-tag'); // create() を使う (import修正済み)
     const params = { branchInfo: mockBranchInfo, tags: [nonExistentTag] };
    mockIndexService.findByTags.mockResolvedValue([]);
    const result = await mockIndexService.findByTags(params);
    expect(mockIndexService.findByTags).toHaveBeenCalledWith(params);
    expect(result).toEqual([]);
  });

  it('should define the findByType method', async () => {
    mockIndexService.findByType.mockResolvedValue([mockDocumentReference]);
    const result = await mockIndexService.findByType(mockBranchInfo, mockDocumentType);
    expect(mockIndexService.findByType).toHaveBeenCalledWith(mockBranchInfo, mockDocumentType);
    expect(result).toEqual([mockDocumentReference]);
  });

  it('should define the listAll method', async () => {
    mockIndexService.listAll.mockResolvedValue([mockDocumentReference]);
    const result = await mockIndexService.listAll(mockBranchInfo);
    expect(mockIndexService.listAll).toHaveBeenCalledWith(mockBranchInfo);
    expect(result).toEqual([mockDocumentReference]);
  });

  it('should define the saveIndex method', async () => {
    mockIndexService.saveIndex.mockResolvedValue(undefined);
    await mockIndexService.saveIndex(mockBranchInfo);
    expect(mockIndexService.saveIndex).toHaveBeenCalledWith(mockBranchInfo);
  });

  it('should define the loadIndex method', async () => {
    mockIndexService.loadIndex.mockResolvedValue(undefined);
    await mockIndexService.loadIndex(mockBranchInfo);
    expect(mockIndexService.loadIndex).toHaveBeenCalledWith(mockBranchInfo);
  });
});
