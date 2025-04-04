import { MemoryDocument } from '../../../../src/domain/entities/MemoryDocument';
import { JsonDocument } from '../../../../src/domain/entities/JsonDocument';
import { DocumentPath } from '../../../../src/domain/entities/DocumentPath';
import { Tag } from '../../../../src/domain/entities/Tag';
// import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError'; // 必要に応じてコメント解除

describe('MemoryDocument', () => {
  const validPath = DocumentPath.create('test/document.json');
  const validTag = Tag.create('test-tag');
  const validContent = 'Test content';

  // Helper to create a basic valid JsonDocumentV2 object for testing fromJSON
  const createValidJsonDocV2 = (overrideProps: Partial<{ metadata: any, content: any }> = {}) => ({
    schema: 'memory_document_v2',
    metadata: {
      id: 'test-id',
      title: 'Test Title',
      documentType: 'generic',
      path: validPath.value,
      tags: [validTag.value],
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      ...overrideProps.metadata,
    },
    content: {
      data: validContent,
      ...overrideProps.content,
    },
  });

  describe('create', () => {
    it.todo('有効なプロパティでインスタンスを作成できること');
    it.todo('必須プロパティが不足している場合にエラーが発生すること');
  });

  describe('hasTag', () => {
    it.todo('指定されたタグを持っている場合に true を返すこと');
    it.todo('指定されたタグを持っていない場合に false を返すこと');
  });

  describe('updateContent', () => {
    it.todo('コンテントを正しく更新できること');
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

  describe('title getter', () => {
    it.todo('JSONドキュメントからタイトルを正しく取得できること');
    it.todo('タイトルが存在しない場合に undefined を返すこと');
  });

  describe('toObject', () => {
    it.todo('正しいオブジェクト構造を返すこと');
  });

  describe('toJSON', () => {
    it.todo('正しい JsonDocumentV2 形式に変換できること');
    it.todo('異なるドキュメントタイプを正しく処理できること');
  });

  describe('fromJSON', () => {
    it.todo('有効な JsonDocumentV2 からインスタンスを作成できること');
    it.todo('無効な JsonDocumentV2 でエラーが発生すること');
    it.todo('タグがない場合も正しく処理できること');
  });

  describe('determineDocumentType', () => {
    // これは private メソッドなので、直接テストは難しいかも？
    // toJSON や fromJSON のテストを通じて間接的に検証する
    it.todo('パスに基づいて正しいドキュメントタイプを推論できること (間接テスト)');
  });
});
