import { vi } from 'vitest'; // vi をインポート
// import { DomainErrors } from '../../../../../src/shared/errors/DomainError.js'; // .js 追加
// import { ApplicationErrors } from '../../../../../src/shared/errors/ApplicationError.js'; // .js 追加

// --- モックの準備 ---
// satisfies jest.Mocked を削除し、手動モックの型を指定

// satisfies jest.Mocked を削除し、手動モックの型を指定

// satisfies jest.Mocked を削除し、手動モックの型を指定

// satisfies jest.Mocked を削除し、手動モックの型を指定

// UpdateTagIndexUseCaseV2 のモック (execute のみモック)

// DocumentWriterService のモック (satisfies を一旦外す)
// --- モックの準備ここまで ---


describe('WriteGlobalDocumentUseCase', () => {

  beforeEach(() => {
    vi.clearAllMocks(); // jest -> vi
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
