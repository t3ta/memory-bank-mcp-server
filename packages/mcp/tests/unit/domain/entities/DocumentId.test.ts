import { DocumentId } from '../../../../src/domain/entities/DocumentId';
import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError';
import { validate as uuidValidate } from 'uuid';

describe('DocumentId', () => {
  describe('create', () => {
    it('有効なUUID文字列でインスタンスを作成できること', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      const docId = DocumentId.create(validUuid);
      expect(docId).toBeInstanceOf(DocumentId);
      expect(docId.value).toBe(validUuid);
    });

    it('空の文字列でエラーが発生すること', () => {
      expect(() => DocumentId.create('')).toThrow(
        new DomainError(DomainErrorCodes.INVALID_DOCUMENT_ID, 'Document ID cannot be empty')
      );
    });

    it('無効なUUID文字列でエラーが発生すること', () => {
      const invalidUuid = 'not-a-uuid';
      expect(() => DocumentId.create(invalidUuid)).toThrow(
        new DomainError(DomainErrorCodes.INVALID_DOCUMENT_ID, 'Document ID must be a valid UUID')
      );
    });
  });

  describe('generate', () => {
    it('新しい有効なDocumentIdインスタンスを生成できること', () => {
      const docId = DocumentId.generate();
      expect(docId).toBeInstanceOf(DocumentId);
      // 生成された値がUUID v4形式であることを確認
      expect(uuidValidate(docId.value)).toBe(true);
    });

    it('複数回生成しても異なるIDが生成されること', () => {
      const id1 = DocumentId.generate();
      const id2 = DocumentId.generate();
      expect(id1.value).not.toBe(id2.value);
      expect(id1.equals(id2)).toBe(false);
    });
  });

  describe('value getter', () => {
    it('value プロパティが正しいUUID文字列を返すこと', () => {
      const validUuid = '789e4567-e89b-12d3-a456-426614174888';
      const docId = DocumentId.create(validUuid);
      expect(docId.value).toBe(validUuid);
    });
  });

  describe('equals', () => {
    // v4形式のサンプルUUIDに変更
    const uuid1 = '123e4567-e89b-42d3-a456-426614174000';
    const uuid2 = '987e6543-e21b-42d3-b456-426614174999';
    const docId1a = DocumentId.create(uuid1);
    const docId1b = DocumentId.create(uuid1);
    const docId2 = DocumentId.create(uuid2);

    it('同じUUIDを持つインスタンスは等しいと判断されること', () => {
      expect(docId1a.equals(docId1b)).toBe(true);
    });

    it('異なるUUIDを持つインスタンスは等しくないと判断されること', () => {
      expect(docId1a.equals(docId2)).toBe(false);
    });
  });

  describe('toString', () => {
    it('toString メソッドが正しいUUID文字列を返すこと', () => {
      // v4形式のサンプルUUIDに変更
      const validUuid = '222e4567-e89b-42d3-a456-426614174002';
      const docId = DocumentId.create(validUuid);
      expect(docId.toString()).toBe(validUuid);
    });
  });
});
