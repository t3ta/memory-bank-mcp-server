import { JsonPatchOperation, type JsonPatchOperationType } from '../../../../src/domain/jsonpatch/JsonPatchOperation'; // JsonPatchOperationType をインポート
// import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError'; // 必要に応じてコメント解除

describe('JsonPatchOperation', () => {
  describe('create', () => {
    it('should create an instance for a valid "add" operation', () => {
      const op: JsonPatchOperationType = 'add';
      const path = '/foo/bar';
      const value = 'baz';
      const operation = JsonPatchOperation.create(op, path, value); // 引数をバラバラに渡す
      expect(operation.op).toBe(op);
      expect(operation.path.toString()).toBe(path);
      expect(operation.value).toBe(value);
      expect(operation.from).toBeUndefined();
    });
    it('should create an instance for a valid "remove" operation', () => {
      const op: JsonPatchOperationType = 'remove';
      const path = '/foo/bar';
      const operation = JsonPatchOperation.create(op, path); // remove は value も from も不要
      expect(operation.op).toBe(op);
      expect(operation.path.toString()).toBe(path);
      expect(operation.value).toBeUndefined();
      expect(operation.from).toBeUndefined();
    });
    it('should create an instance for a valid "replace" operation', () => {
      const op: JsonPatchOperationType = 'replace';
      const path = '/foo/bar';
      const value = 'new_value';
      const operation = JsonPatchOperation.create(op, path, value);
      expect(operation.op).toBe(op);
      expect(operation.path.toString()).toBe(path);
      expect(operation.value).toBe(value);
      expect(operation.from).toBeUndefined();
    });
    it('should create an instance for a valid "move" operation', () => {
      const op: JsonPatchOperationType = 'move';
      const path = '/new/location';
      const from = '/old/location';
      const operation = JsonPatchOperation.create(op, path, undefined, from); // move は from が必要
      expect(operation.op).toBe(op);
      expect(operation.path.toString()).toBe(path);
      expect(operation.value).toBeUndefined();
      expect(operation.from?.toString()).toBe(from); // from をチェック
    });
    it('should create an instance for a valid "copy" operation', () => {
      const op: JsonPatchOperationType = 'copy';
      const path = '/new/copy/location';
      const from = '/source/location';
      const operation = JsonPatchOperation.create(op, path, undefined, from); // copy は from が必要
      expect(operation.op).toBe(op);
      expect(operation.path.toString()).toBe(path);
      expect(operation.value).toBeUndefined();
      expect(operation.from?.toString()).toBe(from); // from をチェック
    });
    it('should create an instance for a valid "test" operation', () => {
      const op: JsonPatchOperationType = 'test';
      const path = '/foo/bar';
      const value = 'expected_value';
      const operation = JsonPatchOperation.create(op, path, value); // test は value が必要
      expect(operation.op).toBe(op);
      expect(operation.path.toString()).toBe(path);
      expect(operation.value).toBe(value);
      expect(operation.from).toBeUndefined();
    });

    it('should throw an error for an invalid operation type', () => {
      const invalidOp = 'invalid_op' as any; // 無効な型を強制的に渡す
      const path = '/foo';
      expect(() => JsonPatchOperation.create(invalidOp, path)).toThrow(
        `Invalid operation type: '${invalidOp}'`
      );
    });
    it('should throw an error if the required property "path" is missing', () => {
      const op: JsonPatchOperationType = 'add';
      // path を undefined として渡す（TypeScript エラーを回避するために as any を使用）
      expect(() => JsonPatchOperation.create(op, undefined as any)).toThrow(
        // 実際に JsonPatchOperation.create が投げるエラーメッセージに修正
        `Operation of type '${op}' requires 'path'`
      );
    });
    it.each(['add', 'replace', 'test'])(
      'should throw an error if "value" is missing for "%s" operation',
      (op) => {
        const path = '/foo';
        expect(() => JsonPatchOperation.create(op as JsonPatchOperationType, path, undefined)).toThrow(
          `Operation of type '${op}' requires 'value'`
        );
      }
    );
    it.each(['move', 'copy'])(
      'should throw an error if "from" is missing for "%s" operation',
      (op) => {
        const path = '/target';
        expect(() => JsonPatchOperation.create(op as JsonPatchOperationType, path, undefined, undefined)).toThrow(
          `Operation of type '${op}' requires 'from'`
        );
      }
    );
    it('should throw an error for invalid "path" format', () => {
      const op: JsonPatchOperationType = 'add';
      const invalidPath = 'invalid-path'; // スラッシュで始まらない
      const value = 'test';
      // JsonPath.parse が投げるエラーを期待
      expect(() => JsonPatchOperation.create(op, invalidPath, value)).toThrow(
        'JSON Pointer must start with "/" or be an empty string'
      );
    });
    it('should throw an error for invalid "from" format', () => {
      const op: JsonPatchOperationType = 'move';
      const path = '/target';
      const invalidFrom = 'invalid-from'; // スラッシュで始まらない
      // JsonPath.parse が投げるエラーを期待
      expect(() => JsonPatchOperation.create(op, path, undefined, invalidFrom)).toThrow(
        'JSON Pointer must start with "/" or be an empty string'
      );
    });
  });

  describe('fromJSON', () => {
    it('should create an instance from a valid JSON object', () => {
      const jsonObject = { op: 'add', path: '/test', value: 123 };
      const operation = JsonPatchOperation.fromJSON(jsonObject);
      expect(operation.op).toBe('add');
      expect(operation.path.toString()).toBe('/test');
      expect(operation.value).toBe(123);
    });
    it('should throw an error for an invalid JSON object', () => {
      const invalidJsonObject = { path: '/test', value: 123 }; // op がない
      expect(() => JsonPatchOperation.fromJSON(invalidJsonObject)).toThrow(
        `Invalid operation type: 'undefined'` // create メソッドが投げるエラー
      );
    });
    it('should create an instance from a valid JSON string', () => {
      const jsonString = '{"op":"replace","path":"/name","value":"New Name"}';
      const operation = JsonPatchOperation.fromJSON(jsonString);
      expect(operation.op).toBe('replace');
      expect(operation.path.toString()).toBe('/name');
      expect(operation.value).toBe('New Name');
    });
    it('should throw an error for an invalid JSON string', () => {
      const invalidJsonString = '{"op":"add", "path":'; // 不正なJSON
      // JSON.parse が投げるエラーを期待
      expect(() => JsonPatchOperation.fromJSON(invalidJsonString)).toThrow();
    });
  });

  describe('validate', () => {
    // create でバリデーションされるので、ここでは複雑なケースのみ？
    it('should validate "move" operation correctly (cannot move to a descendant path)', () => {
      const op: JsonPatchOperationType = 'move';
      const from = '/a';
      const invalidPath = '/a/b'; // from の子パス
      const validPath = '/c';

      const invalidOperation = JsonPatchOperation.create(op, invalidPath, undefined, from);
      expect(() => invalidOperation.validate()).toThrow(
        'Cannot move to a path that is a child of the source path'
      );

      const validOperation = JsonPatchOperation.create(op, validPath, undefined, from);
      expect(() => validOperation.validate()).not.toThrow(); // 有効な場合はエラーにならない
    });
  });

  describe('toJSON', () => {
    it('should return the correct JSON object representation', () => {
      const addOp = JsonPatchOperation.create('add', '/a', 1);
      expect(addOp.toJSON()).toEqual({ op: 'add', path: '/a', value: 1 });

      const removeOp = JsonPatchOperation.create('remove', '/b');
      expect(removeOp.toJSON()).toEqual({ op: 'remove', path: '/b' });

      const moveOp = JsonPatchOperation.create('move', '/c', undefined, '/d');
      expect(moveOp.toJSON()).toEqual({ op: 'move', path: '/c', from: '/d' });
    });
  });
});
