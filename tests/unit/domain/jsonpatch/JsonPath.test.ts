import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError.js';
import { JsonPath } from '../../../../src/domain/jsonpatch/JsonPath.js';

describe('JsonPath', () => {
  describe('基本パス解析', () => {
    it('ルートパスが正しく解析される', () => {
      // Arrange & Act
      const path = JsonPath.parse('/');

      // Assert
      expect(path.path).toBe('/');
      expect(path.segments).toEqual(['']);
      expect(path.isRoot()).toBe(true);
    });

    it('単一階層パスが正しく解析される', () => {
      // Arrange & Act
      const path = JsonPath.parse('/prop');

      // Assert
      expect(path.path).toBe('/prop');
      expect(path.segments).toEqual(['prop']);
      expect(path.isRoot()).toBe(false);
    });

    it('複数階層パスが正しく解析される', () => {
      // Arrange & Act
      const path = JsonPath.parse('/a/b/c');

      // Assert
      expect(path.path).toBe('/a/b/c');
      expect(path.segments).toEqual(['a', 'b', 'c']);
      expect(path.isRoot()).toBe(false);
    });

    it('配列インデックスを含むパスが正しく解析される', () => {
      // Arrange & Act
      const path = JsonPath.parse('/a/0/b');

      // Assert
      expect(path.path).toBe('/a/0/b');
      expect(path.segments).toEqual(['a', '0', 'b']);
    });

    it('配列末尾指定が正しく解析される', () => {
      // Arrange & Act
      const path = JsonPath.parse('/a/-');

      // Assert
      expect(path.path).toBe('/a/-');
      expect(path.segments).toEqual(['a', '-']);
    });

    it('特殊文字エスケープが正しく解析される', () => {
      // Arrange & Act
      const path = JsonPath.parse('/a~0b/c~1d');

      // Assert
      expect(path.path).toBe('/a~0b/c~1d');
      expect(path.segments).toEqual(['a~b', 'c/d']);
    });
  });

  describe('異常系パス解析', () => {
    it('空文字列パスでエラーが発生する', () => {
      // Assert
      expect(() => JsonPath.parse('')).toThrow('Invalid JSON path: path cannot be empty');
    });

    it('スラッシュで始まらないパスでエラーが発生する', () => {
      // Assert
      expect(() => JsonPath.parse('a/b/c')).toThrow('Invalid JSON path: must start with \'/\'');
    });

    it('不正なエスケープシーケンスでエラーが発生する', () => {
      // Assert
      expect(() => JsonPath.parse('/a~2b')).toThrow('Invalid JSON path: invalid escape sequence');
    });

    it('末尾のチルダでエラーが発生する', () => {
      // Assert
      expect(() => JsonPath.parse('/a/b~')).toThrow('Invalid JSON path: incomplete escape sequence');
    });

    it('エラーがDomainErrorの適切なインスタンスである', () => {
      try {
        JsonPath.parse('');
        fail('エラーが発生しませんでした');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).code).toBe(`DOMAIN_ERROR.${DomainErrorCodes.INVALID_JSON_PATH}`);
      }
    });
  });

  describe('パス操作', () => {
    it('parent()メソッドが正しく親パスを返す', () => {
      // Arrange
      const path = JsonPath.parse('/a/b/c');

      // Act
      const parent = path.parent();

      // Assert
      expect(parent.path).toBe('/a/b');
      expect(parent.toString()).toBe('/a/b');
    });

    it('ルートパスの親パス取得でエラーが発生する', () => {
      // Arrange
      const path = JsonPath.parse('/');

      // Assert
      expect(() => path.parent()).toThrow('Root path has no parent');
    });

    it('lastSegment()メソッドが最後のセグメントを返す', () => {
      // Arrange
      const path = JsonPath.parse('/a/b/c');

      // Act
      const lastSegment = path.lastSegment();

      // Assert
      expect(lastSegment).toBe('c');
    });

    it('isRoot()メソッドがルートパスを正しく判定する', () => {
      // Assert
      expect(JsonPath.parse('/').isRoot()).toBe(true);
      expect(JsonPath.parse('/a').isRoot()).toBe(false);
    });

    it('child()メソッドが新しい子パスを生成する', () => {
      // Arrange
      const path = JsonPath.parse('/a/b');

      // Act
      const child = path.child('c');

      // Assert
      expect(child.path).toBe('/a/b/c');
      expect(child.toString()).toBe('/a/b/c');
    });

    it('equals()メソッドがパスの等価性を判断する', () => {
      // Assert
      expect(JsonPath.parse('/a/b').equals(JsonPath.parse('/a/b'))).toBe(true);
      expect(JsonPath.parse('/a/b').equals(JsonPath.parse('/a/c'))).toBe(false);
      expect(JsonPath.parse('/a~0b').equals(JsonPath.parse('/a~0b'))).toBe(true);
    });
  });

  describe('インスタンス生成', () => {
    it('静的parse()メソッドでインスタンスが正しく生成される', () => {
      // Act
      const path = JsonPath.parse('/a/b');

      // Assert
      expect(path).toBeInstanceOf(JsonPath);
      expect(path.path).toBe('/a/b');
    });

    it('静的root()メソッドでルートパスが生成される', () => {
      // Act
      const path = JsonPath.root();

      // Assert
      expect(path.path).toBe('/');
      expect(path.isRoot()).toBe(true);
    });

    it('静的fromSegments()メソッドでパスが生成される', () => {
      // Act
      const path = JsonPath.fromSegments(['a', 'b', 'c']);

      // Assert
      expect(path.path).toBe('/a/b/c');
    });
  });

  describe('ユーティリティ機能', () => {
    it('静的escapeSegment()メソッドが文字列を正しくエスケープする', () => {
      // Assert
      expect(JsonPath.escapeSegment('a~b')).toBe('a~0b');
      expect(JsonPath.escapeSegment('c/d')).toBe('c~1d');
      expect(JsonPath.escapeSegment('e')).toBe('e');
    });

    it('静的unescapeSegment()メソッドがエスケープを正しく解除する', () => {
      // Assert
      expect(JsonPath.unescapeSegment('a~0b')).toBe('a~b');
      expect(JsonPath.unescapeSegment('c~1d')).toBe('c/d');
      expect(JsonPath.unescapeSegment('e')).toBe('e');
    });

    it('toString()メソッドが正しいパス文字列を返す', () => {
      // Arrange
      const segments = ['a~b', 'c/d', 'e'];
      
      // Act
      const path = JsonPath.fromSegments(segments);
      
      // Assert
      expect(path.toString()).toBe('/a~0b/c~1d/e');
    });

    it('isArrayElement()メソッドが配列要素かどうかを判定する', () => {
      // Assert
      expect(JsonPath.parse('/a/0').isArrayElement()).toBe(true);
      expect(JsonPath.parse('/a/-').isArrayElement()).toBe(true);
      expect(JsonPath.parse('/a/b').isArrayElement()).toBe(false);
    });

    it('isArrayAppend()メソッドが配列末尾追加かどうかを判定する', () => {
      // Assert
      expect(JsonPath.parse('/a/-').isArrayAppend()).toBe(true);
      expect(JsonPath.parse('/a/0').isArrayAppend()).toBe(false);
      expect(JsonPath.parse('/a/b').isArrayAppend()).toBe(false);
    });
  });
});