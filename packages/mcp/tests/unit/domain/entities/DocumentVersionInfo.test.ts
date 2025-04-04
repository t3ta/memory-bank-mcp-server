import { DocumentVersionInfo } from '../../../../src/domain/entities/DocumentVersionInfo';

describe('DocumentVersionInfo', () => {
  const now = new Date();
  const initialProps = {
    version: 1,
    createdAt: now,
    lastModified: now,
    lastModifiedBy: 'user1',
    updateReason: 'Initial creation',
  };

  describe('constructor', () => {
    it.todo('有効なプロパティでインスタンスを作成できること');
    it.todo('version が 0 以下の場合にデフォルト値 (1) が設定されること');
    // it.todo('必須プロパティが不足している場合にエラーが発生すること'); // コンストラクタで必須チェックしてるか確認
  });

  describe('nextVersion', () => {
    let initialVersionInfo: DocumentVersionInfo;

    beforeEach(() => {
      initialVersionInfo = new DocumentVersionInfo(initialProps);
    });

    it.todo('バージョン番号がインクリメントされること');
    it.todo('lastModified が更新されること');
    it.todo('lastModifiedBy が指定された値に更新されること');
    it.todo('updateReason が指定された値に更新されること');
    it.todo('createdAt は変更されないこと');
    it.todo('lastModifiedBy や updateReason が指定されない場合にデフォルト値が設定されること');
  });

  describe('toObject', () => {
    it.todo('正しいオブジェクト構造を返すこと');
    it.todo('Date オブジェクトが ISO 文字列に変換されること');
  });
});
