import { JsonDocument } from '../../../../src/domain/entities/JsonDocument';
import { DocumentPath } from '../../../../src/domain/entities/DocumentPath';
import { Tag } from '../../../../src/domain/entities/Tag';
// import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError'; // 必要に応じてコメント解除

describe('JsonDocument', () => {
  const validPath = DocumentPath.create('test/document.json');

  describe('fromString', () => {
    it.todo('有効なJSON文字列からインスタンスを作成できること');
    it.todo('無効なJSON文字列でエラーが発生すること');
    it.todo('スキーマバージョンが不正な場合にエラーが発生すること'); // v2のみサポート想定
  });

  describe('fromObject', () => {
    it.todo('有効なオブジェクトからインスタンスを作成できること');
    it.todo('無効なオブジェクト構造でエラーが発生すること');
  });

  describe('create', () => {
    it.todo('指定されたプロパティで新しいインスタンスを作成できること');
    it.todo('必須プロパティが不足している場合にエラーが発生すること');
  });

  describe('updatePath', () => {
    it.todo('パスを正しく更新できること');
  });

  describe('updateTitle', () => {
    it.todo('タイトルを正しく更新できること');
  });

  describe('updateContent', () => {
    it.todo('コンテントを正しく更新できること');
    it.todo('コンテントの型が変わる場合も正しく処理できること');
  });

  describe('addTag', () => {
    it.todo('タグを正しく追加できること');
    it.todo('既に存在するタグを追加しても重複しないこと');
  });

  describe('removeTag', () => {
    it.todo('存在するタグを正しく削除できること');
    it.todo('存在しないタグを削除しようとしてもエラーにならないこと');
  });

  describe('updateTags', () => {
    it.todo('タグリストを正しく更新できること');
  });

  describe('toObject', () => {
    it.todo('正しいオブジェクト構造を返すこと');
  });

  // 他にもテストが必要なメソッドがあれば追加
});
