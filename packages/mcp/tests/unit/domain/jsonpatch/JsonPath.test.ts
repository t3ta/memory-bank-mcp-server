import { JsonPath } from '../../../../src/domain/jsonpatch/JsonPath';
// import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError'; // 必要に応じてコメント解除

describe('JsonPath', () => {
  describe('parse', () => {
    it('should parse a valid JSON pointer string correctly (e.g., /foo/bar)', () => {
      const path = '/foo/bar';
      const jsonPath = JsonPath.parse(path);
      expect(jsonPath.segments).toEqual(['foo', 'bar']);
      expect(jsonPath.toString()).toBe(path);
    });
    it('should parse the root path ("") correctly', () => {
      const path = '';
      const jsonPath = JsonPath.parse(path);
      expect(jsonPath.segments).toEqual([]);
      expect(jsonPath.toString()).toBe(path);
    });
    it('should correctly decode tilde escapes (~0, ~1) (e.g., /a~0b/c~1d)', () => {
      const path = '/a~0b/c~1d';
      const jsonPath = JsonPath.parse(path);
      expect(jsonPath.segments).toEqual(['a~b', 'c/d']);
      expect(jsonPath.toString()).toBe(path);
    });
    it('should parse array indices correctly (e.g., /arr/0)', () => {
      const path = '/arr/0';
      const jsonPath = JsonPath.parse(path);
      expect(jsonPath.segments).toEqual(['arr', '0']);
      expect(jsonPath.toString()).toBe(path);
    });
    it('should parse the trailing hyphen correctly (e.g., /arr/-)', () => {
      const path = '/arr/-';
      const jsonPath = JsonPath.parse(path);
      expect(jsonPath.segments).toEqual(['arr', '-']);
      expect(jsonPath.toString()).toBe(path);
    });

    it('should throw an error if the path does not start with a slash', () => {
      const invalidPath = 'foo/bar';
      // JsonPath.parse が特定のエラーを投げることを期待する
      // エラーの種類とメッセージは JsonPath.parse の実装に合わせる必要がある
      expect(() => JsonPath.parse(invalidPath)).toThrow('JSON Pointer must start with "/" or be an empty string');
    });
    it('should throw an error for invalid escape sequences', () => {
      const invalidPath = '/foo~3bar';
      // 不正なエスケープシーケンスに対するエラーメッセージを確認
      expect(() => JsonPath.parse(invalidPath)).toThrow('Invalid JSON Pointer escape sequence');
    });
  });

  describe('fromSegments', () => {
    it('should generate the correct JSON pointer string from a segment array', () => {
      const segments = ['foo', 'bar'];
      const jsonPath = JsonPath.fromSegments(segments);
      expect(jsonPath.toString()).toBe('/foo/bar');
      expect(jsonPath.segments).toEqual(segments);
    });
    it('should correctly escape special characters in segments', () => {
      const segments = ['a~b', 'c/d'];
      const jsonPath = JsonPath.fromSegments(segments);
      expect(jsonPath.toString()).toBe('/a~0b/c~1d');
      expect(jsonPath.segments).toEqual(segments);
    });
    it('should generate the root path from an empty segment array', () => {
      const segments: string[] = [];
      const jsonPath = JsonPath.fromSegments(segments);
      expect(jsonPath.toString()).toBe('');
      expect(jsonPath.segments).toEqual(segments);
    });
  });

  describe('toString', () => {
    it('should return the correct JSON pointer string from the instance', () => {
      const path = '/foo/bar~0baz~1qux';
      const jsonPath = JsonPath.parse(path);
      expect(jsonPath.toString()).toBe(path);

      const rootPath = JsonPath.parse('');
      expect(rootPath.toString()).toBe('');
    });
  });

  describe('segments getter', () => {
    it('should return the correct segment array', () => {
      const segments = ['foo', 'bar~baz', 'qux/quux'];
      const jsonPath = JsonPath.fromSegments(segments);
      expect(jsonPath.segments).toEqual(segments);

      const parsedPath = JsonPath.parse('/a~0b/c~1d/0');
      expect(parsedPath.segments).toEqual(['a~b', 'c/d', '0']);

      const rootPath = JsonPath.parse('');
      expect(rootPath.segments).toEqual([]); // ルートパス "" のセグメントは空配列
    });
  });

  describe('parent', () => {
    it('should get the parent path correctly (e.g., /foo/bar -> /foo)', () => {
      const jsonPath = JsonPath.parse('/foo/bar');
      const parentPath = jsonPath.parent(); // メソッド呼び出しに変更
      expect(parentPath.toString()).toBe('/foo');
      expect(parentPath.segments).toEqual(['foo']);
    });
    it('should throw an error when getting the parent of the root path', () => {
      const rootPath = JsonPath.parse('/'); // ルートパスのインスタンスを作成
      expect(() => rootPath.parent()).toThrow('Root path has no parent');
    });
    it('should return the root path as the parent of a single-level path (e.g., /foo -> /)', () => {
      const jsonPath = JsonPath.parse('/foo');
      const parentPath = jsonPath.parent();
      expect(parentPath.toString()).toBe(''); // ルートパス "" が返るはず
      expect(parentPath.segments).toEqual([]); // ルートパス '/' のセグメントは空配列
    });
  });

  describe('child', () => {
    it('should generate a child path correctly (e.g., /foo + bar -> /foo/bar)', () => {
      const parentPath = JsonPath.parse('/foo');
      const childSegment = 'bar';
      const childPath = parentPath.child(childSegment);
      expect(childPath.toString()).toBe('/foo/bar');
      expect(childPath.segments).toEqual(['foo', 'bar']);
    });
    it('should correctly escape special characters in the child segment', () => {
      const parentPath = JsonPath.parse('/a');
      const childSegment = 'b~c/d';
      const childPath = parentPath.child(childSegment);
      expect(childPath.toString()).toBe('/a/b~0c~1d'); // エスケープされたパスを確認
      expect(childPath.segments).toEqual(['a', 'b~c/d']); // 元のセグメントを確認
    });
  });

  describe('isArrayElement', () => {
    it('should return true if the last segment is a number', () => {
      const jsonPath = JsonPath.parse('/arr/0');
      expect(jsonPath.isArrayElement()).toBe(true);

      const jsonPathWithHyphen = JsonPath.parse('/arr/-'); // ハイフンも配列要素扱い
      expect(jsonPathWithHyphen.isArrayElement()).toBe(true);
    });
    it('should return false if the last segment is not a number', () => {
      const jsonPath = JsonPath.parse('/foo/bar');
      expect(jsonPath.isArrayElement()).toBe(false);
    });
    it('should return false for the root path', () => {
      const rootPath = JsonPath.parse('/'); // ルートパスのインスタンスを作成
      expect(rootPath.isArrayElement()).toBe(false);
    });
  });
});
