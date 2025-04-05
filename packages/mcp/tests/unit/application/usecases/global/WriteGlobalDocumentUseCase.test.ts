import { WriteGlobalDocumentUseCase } from '../../../../../src/application/usecases/global/WriteGlobalDocumentUseCase';
import { IGlobalMemoryBankRepository } from '../../../../../src/domain/repositories/IGlobalMemoryBankRepository';
import { IBranchMemoryBankRepository } from '../../../../../src/domain/repositories/IBranchMemoryBankRepository'; // TagIndex更新で使うかも
import { IDocumentRepository } from '../../../../../src/domain/repositories/IDocumentRepository'; // TagIndex更新で使うかも
import { JsonPatchService } from '../../../../../src/domain/jsonpatch/JsonPatchService';
import { DocumentPath } from '../../../../../src/domain/entities/DocumentPath';
import { MemoryDocument } from '../../../../../src/domain/entities/MemoryDocument';
import { Tag } from '../../../../../src/domain/entities/Tag';
import { UpdateTagIndexUseCaseV2 } from '../../../../../src/application/usecases/common/UpdateTagIndexUseCaseV2';
import { DocumentWriterService } from '../../../../../src/application/services/DocumentWriterService';
// import { DomainErrors } from '../../../../../src/shared/errors/DomainError'; // 必要に応じてコメント解除
// import { ApplicationErrors } from '../../../../../src/shared/errors/ApplicationError'; // 必要に応じてコメント解除

// --- モックの準備 ---
const mockGlobalRepository = {
  initialize: jest.fn(),
  getDocument: jest.fn(),
  saveDocument: jest.fn(),
  deleteDocument: jest.fn(),
  listDocuments: jest.fn(),
  findDocumentsByTags: jest.fn(),
  updateTagsIndex: jest.fn(),
  saveTagIndex: jest.fn(),
  getTagIndex: jest.fn(),
  findDocumentPathsByTagsUsingIndex: jest.fn(),
  validateStructure: jest.fn(),
} satisfies jest.Mocked<IGlobalMemoryBankRepository>;

const mockBranchRepository = { // TagIndex更新で使う可能性あり
  // 必要なメソッドをモック化
} satisfies Partial<jest.Mocked<IBranchMemoryBankRepository>>;

const mockDocumentRepository = { // DocumentWriterService が使う可能性あり
  getDocument: jest.fn(),
  saveDocument: jest.fn(),
} satisfies Partial<jest.Mocked<IDocumentRepository>>;

const mockJsonPatchService = {
  apply: jest.fn(),
  validate: jest.fn(),
  generatePatch: jest.fn(),
} satisfies jest.Mocked<JsonPatchService>;

// UpdateTagIndexUseCaseV2 のモック (execute のみモック)
const mockUpdateTagIndexUseCase = {
  execute: jest.fn(),
};

// DocumentWriterService のモック (satisfies を一旦外す)
const mockDocumentWriterService = {
  write: jest.fn(),
  patchService: mockJsonPatchService,
};
// --- モックの準備ここまで ---


describe('WriteGlobalDocumentUseCase', () => {
  let useCase: WriteGlobalDocumentUseCase;

  beforeEach(() => {
    jest.clearAllMocks();
    // TODO: WriteGlobalDocumentUseCase のコンストラクタ引数を確認して正しくインスタンス化する
    // useCase = new WriteGlobalDocumentUseCase(
    //   mockGlobalRepository,
    //   mockBranchRepository, // 仮
    //   mockDocumentRepository, // 仮
    //   mockJsonPatchService, // 仮
    //   mockUpdateTagIndexUseCase, // 仮
    //   mockDocumentWriterService // 仮
    // );
  });

  describe('execute', () => {
    it.todo('新しいグローバルドキュメントを content で作成できること');
    it.todo('既存のグローバルドキュメントを content で上書きできること');
    it.todo('既存のグローバルドキュメントを patches で更新できること');
    it.todo('content と tags を指定してドキュメントを作成/上書きできること');
    it.todo('patches と tags を指定してドキュメントを更新できること');

    it.todo('必須パラメータ (path) が不足している場合にエラーが発生すること');
    it.todo('content と patches が同時に指定された場合にエラーが発生すること');
    it.todo('patches が指定されたが、対象ドキュメントがJSONでない場合にエラーが発生すること');
    it.todo('patches が指定されたが、対象ドキュメントが存在しない場合にエラーが発生すること');

    it.todo('リポジトリ (saveDocument) でエラーが発生した場合にエラーが伝播すること');
    it.todo('タグ更新 (UpdateTagIndexUseCase) でエラーが発生した場合にエラーが伝播すること');
    it.todo('JSON Patch適用 (JsonPatchService) でエラーが発生した場合にエラーが伝播すること');
  });
});
