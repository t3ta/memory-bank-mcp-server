import { DocumentVersionInfo } from '../../../../src/domain/entities/DocumentVersionInfo';

describe('DocumentVersionInfo', () => {
  const initialVersion = 1;
  const initialDate = new Date('2024-01-01T00:00:00.000Z');
  const initialModifier = 'user1';
  const initialReason = 'Initial creation';

  describe('constructor', () => {
    it('指定された値でインスタンスを作成できること', () => {
      const versionInfo = new DocumentVersionInfo({
        version: initialVersion,
        lastModified: initialDate,
        modifiedBy: initialModifier,
        updateReason: initialReason,
      });

      expect(versionInfo.version).toBe(initialVersion);
      // Date オブジェクトは新しいインスタンスで比較
      expect(versionInfo.lastModified.getTime()).toBe(initialDate.getTime());
      expect(versionInfo.modifiedBy).toBe(initialModifier);
      expect(versionInfo.updateReason).toBe(initialReason);
    });

    it('オプションのパラメータがデフォルト値で設定されること', () => {
      const versionInfo = new DocumentVersionInfo({ version: initialVersion });

      expect(versionInfo.version).toBe(initialVersion);
      // lastModified は現在時刻に近い値になるはず
      expect(versionInfo.lastModified.getTime()).toBeCloseTo(new Date().getTime(), -2); // 100ms以内の誤差を許容
      expect(versionInfo.modifiedBy).toBe('system'); // デフォルト値
      expect(versionInfo.updateReason).toBeUndefined(); // デフォルト値
    });

    it('lastModified が Date オブジェクトのコピーであること', () => {
        const originalDate = new Date();
        const versionInfo = new DocumentVersionInfo({ version: 1, lastModified: originalDate });
        originalDate.setFullYear(2000); // 元の Date オブジェクトを変更
        expect(versionInfo.lastModified.getFullYear()).not.toBe(2000); // コピーなので影響を受けない
      });
  });

  describe('getters', () => {
    const versionInfo = new DocumentVersionInfo({
      version: initialVersion,
      lastModified: initialDate,
      modifiedBy: initialModifier,
      updateReason: initialReason,
    });

    it('version getter が正しい値を返すこと', () => {
      expect(versionInfo.version).toBe(initialVersion);
    });

    it('lastModified getter が正しい Date オブジェクトのコピーを返すこと', () => {
      const retrievedDate = versionInfo.lastModified;
      expect(retrievedDate.getTime()).toBe(initialDate.getTime());
      // 取得した Date オブジェクトを変更しても元の値は変わらないことを確認
      retrievedDate.setFullYear(2000);
      expect(versionInfo.lastModified.getTime()).toBe(initialDate.getTime());
    });

    it('modifiedBy getter が正しい値を返すこと', () => {
      expect(versionInfo.modifiedBy).toBe(initialModifier);
    });

    it('updateReason getter が正しい値を返すこと', () => {
      expect(versionInfo.updateReason).toBe(initialReason);
    });

     it('updateReason が未定義の場合に undefined を返すこと', () => {
       const versionInfoNoReason = new DocumentVersionInfo({ version: 1 });
       expect(versionInfoNoReason.updateReason).toBeUndefined();
     });
  });

  describe('nextVersion', () => {
    const versionInfo = new DocumentVersionInfo({
      version: initialVersion,
      lastModified: initialDate,
      modifiedBy: initialModifier,
      updateReason: initialReason,
    });
    const nextReason = 'Updated content';

    it('バージョンがインクリメントされた新しいインスタンスを返すこと', () => {
      const nextVersionInfo = versionInfo.nextVersion();
      expect(nextVersionInfo).toBeInstanceOf(DocumentVersionInfo);
      expect(nextVersionInfo.version).toBe(initialVersion + 1);
      expect(nextVersionInfo.modifiedBy).toBe(initialModifier); // modifiedBy は引き継がれる
      // lastModified は新しくなる
      expect(nextVersionInfo.lastModified.getTime()).toBeGreaterThan(initialDate.getTime());
      expect(nextVersionInfo.lastModified.getTime()).toBeCloseTo(new Date().getTime(), -2);
      // updateReason は指定がなければ引き継がれる
      expect(nextVersionInfo.updateReason).toBe(initialReason);
    });

    it('updateReason を指定した場合、それが設定されること', () => {
      const nextVersionInfo = versionInfo.nextVersion(nextReason);
      expect(nextVersionInfo.version).toBe(initialVersion + 1);
      expect(nextVersionInfo.updateReason).toBe(nextReason);
    });

     it('元のインスタンスは変更されないこと', () => {
       versionInfo.nextVersion();
       expect(versionInfo.version).toBe(initialVersion);
       expect(versionInfo.lastModified.getTime()).toBe(initialDate.getTime());
     });
  });

  describe('toObject', () => {
    it('正しいプレーンオブジェクトを返すこと (updateReason あり)', () => {
      const versionInfo = new DocumentVersionInfo({
        version: initialVersion,
        lastModified: initialDate,
        modifiedBy: initialModifier,
        updateReason: initialReason,
      });
      const obj = versionInfo.toObject();
      expect(obj).toEqual({
        version: initialVersion,
        lastModified: initialDate, // Date オブジェクトがそのまま入る
        modifiedBy: initialModifier,
        updateReason: initialReason,
      });
    });

    it('正しいプレーンオブジェクトを返すこと (updateReason なし)', () => {
      const versionInfo = new DocumentVersionInfo({
        version: initialVersion,
        lastModified: initialDate,
        modifiedBy: initialModifier,
      });
      const obj = versionInfo.toObject();
      expect(obj).toEqual({
        version: initialVersion,
        lastModified: initialDate,
        modifiedBy: initialModifier,
        // updateReason は含まれない
      });
      expect(obj).not.toHaveProperty('updateReason');
    });
  });
});
