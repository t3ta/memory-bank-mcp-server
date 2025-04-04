import { DocumentId } from '../../../../src/domain/entities/DocumentId';
// import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError'; // 必要に応じてコメント解除

describe('DocumentId', () => {
  describe('create', () => {
    it.todo('有効なID文字列でインスタンスを作成できること');
    it.todo('空の文字列でエラーが発生すること');
    it.todo('長すぎる文字列でエラーが発生すること'); // 制限があるか確認
    it.todo('無効な文字を含む場合にエラーが発生すること'); // 許可される文字種を確認
  });

  describe('generate', () => {
    it.todo('新しい一意なIDを持つインスタンスを生成できること');
    it.todo('生成されるIDが指定されたフォーマット（例: UUID）に従っていること');
  });

  describe('equals', () => {
    it.todo('同じ値を持つインスタンスに対して true を返すこと');
    it.todo('異なる値を持つインスタンスに対して false を返すこと');
  });

  describe('toString', () => {
    it.todo('ID文字列を正しく返すこと');
  });
});
