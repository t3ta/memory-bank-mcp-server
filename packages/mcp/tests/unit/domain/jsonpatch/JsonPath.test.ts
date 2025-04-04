import { JsonPath } from '../../../../src/domain/jsonpatch/JsonPath';
// import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError'; // 必要に応じてコメント解除

describe('JsonPath', () => {
  describe('parse', () => {
    it.todo('有効なJSONポインタ文字列を正しくパースできること (例: /foo/bar)');
    it.todo('ルートパス ("") を正しくパースできること');
    it.todo('チルダエスケープ (~0, ~1) を正しくデコードできること (例: /a~0b/c~1d)');
    it.todo('配列インデックス (例: /arr/0) を正しくパースできること');
    it.todo('末尾のハイフン (例: /arr/-) を正しくパースできること');

    it.todo('スラッシュで始まらない場合にエラーが発生すること');
    it.todo('不正なエスケープシーケンスを含む場合にエラーが発生すること');
  });

  describe('fromSegments', () => {
    it.todo('セグメント配列から正しいJSONポインタ文字列を生成できること');
    it.todo('特殊文字を含むセグメントを正しくエスケープできること');
    it.todo('空のセグメント配列からルートパスを生成できること');
  });

  describe('toString', () => {
    it.todo('インスタンスから正しいJSONポインタ文字列を返すこと');
  });

  describe('segments getter', () => {
    it.todo('正しいセグメント配列を返すこと');
  });

  describe('parent', () => {
    it.todo('親パスを正しく取得できること (例: /foo/bar -> /foo)');
    it.todo('ルートパスの親がルートパス自身であること');
    it.todo('一段階パスの親がルートパスであること (例: /foo -> "")');
  });

  describe('child', () => {
    it.todo('子パスを正しく生成できること (例: /foo + bar -> /foo/bar)');
    it.todo('特殊文字を含む子セグメントを正しくエスケープできること');
  });

  describe('isArrayElement', () => {
    it.todo('最後のセグメントが数値の場合に true を返すこと');
    it.todo('最後のセグメントが数値でない場合に false を返すこと');
    it.todo('ルートパスの場合に false を返すこと');
  });
});
