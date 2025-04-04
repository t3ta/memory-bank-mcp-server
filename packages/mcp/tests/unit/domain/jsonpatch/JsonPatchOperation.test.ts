import { JsonPatchOperation } from '../../../../src/domain/jsonpatch/JsonPatchOperation';
// import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError'; // 必要に応じてコメント解除

describe('JsonPatchOperation', () => {
  describe('create', () => {
    it.todo('有効な "add" 操作でインスタンスを作成できること');
    it.todo('有効な "remove" 操作でインスタンスを作成できること');
    it.todo('有効な "replace" 操作でインスタンスを作成できること');
    it.todo('有効な "move" 操作でインスタンスを作成できること');
    it.todo('有効な "copy" 操作でインスタンスを作成できること');
    it.todo('有効な "test" 操作でインスタンスを作成できること');

    it.todo('無効な操作タイプでエラーが発生すること');
    it.todo('必須プロパティ（path）が不足している場合にエラーが発生すること');
    it.todo('"add", "replace", "test" 操作で "value" が不足している場合にエラーが発生すること');
    it.todo('"move", "copy" 操作で "from" が不足している場合にエラーが発生すること');
    it.todo('不正な "path" 形式の場合にエラーが発生すること'); // JsonPath のテストと連携
    it.todo('不正な "from" 形式の場合にエラーが発生すること'); // JsonPath のテストと連携
  });

  describe('fromJSON', () => {
    it.todo('有効なJSONオブジェクトからインスタンスを作成できること');
    it.todo('無効なJSONオブジェクトでエラーが発生すること');
    it.todo('JSON文字列からもインスタンスを作成できること');
    it.todo('無効なJSON文字列でエラーが発生すること');
  });

  describe('validate', () => {
    // create でバリデーションされるので、ここでは複雑なケースのみ？
    it.todo('特定の操作タイプで追加のバリデーションが正しく機能すること');
  });

  describe('toJSON', () => {
    it.todo('正しいJSONオブジェクト形式を返すこと');
  });
});
