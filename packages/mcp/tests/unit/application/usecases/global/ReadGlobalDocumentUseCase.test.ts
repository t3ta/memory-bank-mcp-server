import { ReadGlobalDocumentUseCase } from '../../../../../src/application/usecases/global/ReadGlobalDocumentUseCase';
import { IGlobalMemoryBankRepository } from '../../../../../src/domain/repositories/IGlobalMemoryBankRepository';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath';
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument';
// import { DomainErrors } from '../../../../../src/shared/errors/DomainError'; // 必要に応じてコメント解除

// --- モックの準備 ---
const mockGlobalRepository = {
  initialize: jest.fn(), // 追加
  getDocument: jest.fn(),
  saveDocument: jest.fn(), // 追加
  deleteDocument: jest.fn(), // 追加
  listDocuments: jest.fn(), // 追加
  findDocumentsByTags: jest.fn(), // 追加
  updateTagsIndex: jest.fn(), // 追加 (deprecatedだけどインターフェースにはある)
  saveTagIndex: jest.fn(), // 追加
  getTagIndex: jest.fn(), // 追加
  findDocumentPathsByTagsUsingIndex: jest.fn(), // 追加
  validateStructure: jest.fn(), // 追加
} satisfies jest.Mocked<IGlobalMemoryBankRepository>;
// --- モックの準備ここまで ---

describe('ReadGlobalDocumentUseCase', () => {
  let useCase: ReadGlobalDocumentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new ReadGlobalDocumentUseCase(mockGlobalRepository);
  });

  it.todo('存在するグローバルドキュメントを正しく読み込めること');
  it.todo('ドキュメントが存在しない場合にエラー (DocumentNotFound) が発生すること');
  it.todo('リポジトリで予期せぬエラーが発生した場合にエラーが伝播すること');

  // --- 具体的なテストケースの例 ---
  // it('存在するグローバルドキュメントを正しく読み込めること', async () => {
  //   const docPath = DocumentPath.create('core/config.json');
  //   const mockDocument = MemoryDocument.create({ path: docPath, content: '{"setting":"value"}', tags: [] });
  //
  //   mockGlobalRepository.getDocument.mockResolvedValue(mockDocument);
  //
  //   const result = await useCase.execute({ path: docPath.value });
  //
  //   expect(result).toBeDefined();
  //   expect(result.document.content).toBe('{"setting":"value"}');
  //   expect(mockGlobalRepository.getDocument).toHaveBeenCalledWith(docPath);
  // });
});
