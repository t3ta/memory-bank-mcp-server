import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError.js';
import { JsonPatchOperation } from '../../../../src/domain/jsonpatch/JsonPatchOperation.js';
import { JsonPath } from '../../../../src/domain/jsonpatch/JsonPath.js';

describe('JsonPatchOperation', () => {
  describe('操作の生成と基本検証', () => {
    it('静的create()メソッドでadd操作が正しく生成される', () => {
      // Arrange & Act
      const operation = JsonPatchOperation.create('add', '/a', 1);

      // Assert
      expect(operation.op).toBe('add');
      expect(operation.path.toString()).toBe('/a');
      expect(operation.value).toBe(1);
    });

    it('静的create()メソッドでremove操作が正しく生成される', () => {
      // Arrange & Act
      const operation = JsonPatchOperation.create('remove', '/a');

      // Assert
      expect(operation.op).toBe('remove');
      expect(operation.path.toString()).toBe('/a');
    });

    it('静的create()メソッドでreplace操作が正しく生成される', () => {
      // Arrange & Act
      const operation = JsonPatchOperation.create('replace', '/a', 1);

      // Assert
      expect(operation.op).toBe('replace');
      expect(operation.path.toString()).toBe('/a');
      expect(operation.value).toBe(1);
    });

    it('静的create()メソッドでmove操作が正しく生成される', () => {
      // Arrange & Act
      const operation = JsonPatchOperation.create('move', '/b', undefined, '/a');

      // Assert
      expect(operation.op).toBe('move');
      expect(operation.path.toString()).toBe('/b');
      expect(operation.from?.toString()).toBe('/a');
    });

    it('静的create()メソッドでcopy操作が正しく生成される', () => {
      // Arrange & Act
      const operation = JsonPatchOperation.create('copy', '/b', undefined, '/a');

      // Assert
      expect(operation.op).toBe('copy');
      expect(operation.path.toString()).toBe('/b');
      expect(operation.from?.toString()).toBe('/a');
    });

    it('静的create()メソッドでtest操作が正しく生成される', () => {
      // Arrange & Act
      const operation = JsonPatchOperation.create('test', '/a', 1);

      // Assert
      expect(operation.op).toBe('test');
      expect(operation.path.toString()).toBe('/a');
      expect(operation.value).toBe(1);
    });
  });

  describe('操作バリデーション', () => {
    it('add操作でvalue無しの場合エラーが発生する', () => {
      // Assert
      expect(() => JsonPatchOperation.create('add', '/a')).toThrow(
        "Operation of type 'add' requires 'value'"
      );
    });

    it('replace操作でvalue無しの場合エラーが発生する', () => {
      // Assert
      expect(() => JsonPatchOperation.create('replace', '/a')).toThrow(
        "Operation of type 'replace' requires 'value'"
      );
    });

    it('test操作でvalue無しの場合エラーが発生する', () => {
      // Assert
      expect(() => JsonPatchOperation.create('test', '/a')).toThrow(
        "Operation of type 'test' requires 'value'"
      );
    });

    it('move操作でfrom無しの場合エラーが発生する', () => {
      // Assert
      expect(() => JsonPatchOperation.create('move', '/a')).toThrow(
        "Operation of type 'move' requires 'from'"
      );
    });

    it('copy操作でfrom無しの場合エラーが発生する', () => {
      // Assert
      expect(() => JsonPatchOperation.create('copy', '/a')).toThrow(
        "Operation of type 'copy' requires 'from'"
      );
    });

    it('無効な操作タイプの場合エラーが発生する', () => {
      // Assert
      expect(() => JsonPatchOperation.create('invalid' as any, '/a')).toThrow(
        "Invalid operation type: 'invalid'"
      );
    });

    it('move操作で自分自身への移動の場合は警告される', () => {
      // Arrange
      const operation = JsonPatchOperation.create('move', '/a', undefined, '/a');
      
      // Act & Assert
      // 警告されるが例外は投げられない
      expect(() => operation.validate()).not.toThrow();
    });

    it('move操作で子孫への移動の場合エラーが発生する', () => {
      // Arrange
      const operation = JsonPatchOperation.create('move', '/a/b', undefined, '/a');
      
      // Assert
      expect(() => operation.validate()).toThrow(
        "Cannot move to a path that is a child of the source path"
      );
    });
  });

  describe('シリアライズとデシリアライズ', () => {
    it('add操作が正しくJSONシリアライズされる', () => {
      // Arrange
      const op = JsonPatchOperation.create('add', '/a', 1);
      
      // Act
      const json = op.toJSON();
      
      // Assert
      expect(json).toEqual({ op: 'add', path: '/a', value: 1 });
    });

    it('remove操作が正しくJSONシリアライズされる', () => {
      // Arrange
      const op = JsonPatchOperation.create('remove', '/a');
      
      // Act
      const json = op.toJSON();
      
      // Assert
      expect(json).toEqual({ op: 'remove', path: '/a' });
    });

    it('move操作が正しくJSONシリアライズされる', () => {
      // Arrange
      const op = JsonPatchOperation.create('move', '/b', undefined, '/a');
      
      // Act
      const json = op.toJSON();
      
      // Assert
      expect(json).toEqual({ op: 'move', path: '/b', from: '/a' });
    });

    it('複雑な値を持つ操作が正しくシリアライズされる', () => {
      // Arrange
      const complexValue = { b: [1, 2, { c: 3 }] };
      const op = JsonPatchOperation.create('add', '/a', complexValue);
      
      // Act
      const json = op.toJSON();
      
      // Assert
      expect(json).toEqual({ op: 'add', path: '/a', value: complexValue });
    });

    it('JSON文字列からパッチ操作が正しく復元される', () => {
      // Arrange
      const jsonStr = '{"op":"add","path":"/a","value":1}';
      
      // Act
      const operation = JsonPatchOperation.fromJSON(jsonStr);
      
      // Assert
      expect(operation.op).toBe('add');
      expect(operation.path.toString()).toBe('/a');
      expect(operation.value).toBe(1);
    });

    it('複数のパッチ操作が正しく配列形式でシリアライズされる', () => {
      // Arrange
      const op1 = JsonPatchOperation.create('add', '/a', 1);
      const op2 = JsonPatchOperation.create('remove', '/b');
      
      // Act
      const jsonArray = [op1, op2].map(op => op.toJSON());
      
      // Assert
      expect(jsonArray).toEqual([
        { op: 'add', path: '/a', value: 1 },
        { op: 'remove', path: '/b' }
      ]);
    });
  });

  describe('toFastJsonPatchOperation', () => {
    it('fast-json-patch形式に変換できる（add操作）', () => {
      // Arrange
      const operation = JsonPatchOperation.create('add', '/a', 1);
      
      // Act
      const result = operation.toFastJsonPatchOperation();
      
      // Assert
      expect(result).toEqual({ op: 'add', path: '/a', value: 1 });
    });

    it('fast-json-patch形式に変換できる（move操作）', () => {
      // Arrange
      const operation = JsonPatchOperation.create('move', '/b', undefined, '/a');
      
      // Act
      const result = operation.toFastJsonPatchOperation();
      
      // Assert
      expect(result).toEqual({ op: 'move', path: '/b', from: '/a' });
    });

    it('fast-json-patch形式に変換できる（複雑な値）', () => {
      // Arrange
      const complexValue = { b: [1, 2, { c: 3 }] };
      const operation = JsonPatchOperation.create('add', '/a', complexValue);
      
      // Act
      const result = operation.toFastJsonPatchOperation();
      
      // Assert
      expect(result).toEqual({ op: 'add', path: '/a', value: complexValue });
    });
  });
});