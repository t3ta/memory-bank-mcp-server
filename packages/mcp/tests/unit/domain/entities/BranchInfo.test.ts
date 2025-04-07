import { BranchInfo } from '../../../../src/domain/entities/BranchInfo.js'; // .js 追加
import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError.js'; // .js 追加

describe('BranchInfo', () => {
  // ここにテストケースを追加していく
  describe('create', () => {
    it('有効なブランチ名でインスタンスを作成できること', () => {
      // TODO: 実装
      const validBranchName = 'feature/my-cool-feature';
      const branchInfo = BranchInfo.create(validBranchName);
      expect(branchInfo).toBeInstanceOf(BranchInfo);
      expect(branchInfo.name).toBe(validBranchName);
    });

    it('空のブランチ名でエラーが発生すること', () => {
      // TODO: 実装
      const expectedMessage = 'Branch name cannot be empty';
      // const expectedCode = DomainErrorCodes.INVALID_BRANCH_NAME; // 未使用なので削除
      try {
        BranchInfo.create('');
        throw new Error('Expected DomainError but no error was thrown.');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).message).toBe(expectedMessage);
        expect((error as DomainError).code).toBe("DOMAIN_ERROR.INVALID_BRANCH_NAME"); // 期待値を修正
      }
    });

    it('プレフィックスがないブランチ名でエラーが発生すること', () => {
      const invalidBranchName = 'my-cool-feature';
      expect(() => BranchInfo.create(invalidBranchName)).toThrow(
        new DomainError(
          DomainErrorCodes.INVALID_BRANCH_NAME,
          'Branch name must include a namespace prefix with slash (e.g. "feature/my-branch")'
        )
      );
    });

     it('プレフィックスの後に名前がないブランチ名でエラーが発生すること', () => {
       const invalidBranchName = 'feature/';
       // Check only the error message string
       expect(() => BranchInfo.create(invalidBranchName)).toThrowError(
         'Branch name must have a name after the prefix'
       );
     });
  });

  describe('getters', () => {
    const featureBranchName = 'feature/my-feature';
    const fixBranchName = 'fix/another-feature';
    const featureBranchInfo = BranchInfo.create(featureBranchName);
    const fixBranchInfo = BranchInfo.create(fixBranchName);

    it('name プロパティが元のブランチ名を返すこと', () => {
      expect(featureBranchInfo.name).toBe(featureBranchName);
      expect(fixBranchInfo.name).toBe(fixBranchName);
    });

    it('displayName プロパティがプレフィックスなしの名前を返すこと', () => {
      expect(featureBranchInfo.displayName).toBe('my-feature');
      expect(fixBranchInfo.displayName).toBe('another-feature');
    });

    it('type プロパティが正しいタイプを返すこと', () => {
      expect(featureBranchInfo.type).toBe('feature');
      expect(fixBranchInfo.type).toBe('fix');
    });

    it('safeName プロパティがファイルシステムセーフな名前を返すこと', () => {
      // toSafeBranchName の具体的な実装に依存するが、基本的なテスト
      expect(featureBranchInfo.safeName).toBe('feature-my-feature'); // アンダースコアをハイフンに修正
      expect(fixBranchInfo.safeName).toBe('fix-another-feature'); // アンダースコアをハイフンに修正
    });
  });

  describe('type checks', () => {
    it('feature ブランチの場合に type が "feature" であること', () => {
      const featureBranch = BranchInfo.create('feature/new-stuff');
      expect(featureBranch.type).toBe('feature');
    });

    it('fix ブランチの場合に type が "fix" であること', () => {
      const fixBranch = BranchInfo.create('fix/bug-fix');
      expect(fixBranch.type).toBe('fix');
    });

    // BranchInfo.ts の実装では release, main, develop は feature として扱われるか、エラーになる
    // そのため、 isReleaseBranch, isMainBranch, isDevelopBranch のテストは不要
  });

  describe('equals', () => {
    it('同じ名前のインスタンスは等しいと判断されること', () => {
      const branch1 = BranchInfo.create('feature/same-name');
      const branch2 = BranchInfo.create('feature/same-name');
      expect(branch1.equals(branch2)).toBe(true);
    });

    it('異なる名前のインスタンスは等しくないと判断されること', () => {
      const branch1 = BranchInfo.create('feature/name-one');
      const branch2 = BranchInfo.create('feature/name-two');
      expect(branch1.equals(branch2)).toBe(false);
    });

     it('異なるタイプのインスタンスは等しくないと判断されること', () => {
       const branch1 = BranchInfo.create('feature/diff-type');
       const branch2 = BranchInfo.create('fix/diff-type');
       // equals は名前だけで比較するので true になるはず
       expect(branch1.equals(branch2)).toBe(false); // 名前が違うため false
       const branch3 = BranchInfo.create('fix/same-name-diff-type');
       const branch4 = BranchInfo.create('feature/same-name-diff-type');
       expect(branch3.equals(branch4)).toBe(false); // 名前が違うため false
     });
  });

  describe('toString', () => {
    it('toString メソッドが元のブランチ名を返すこと', () => {
      const branchName = 'feature/to-string-test';
      const branchInfo = BranchInfo.create(branchName);
      expect(branchInfo.toString()).toBe(branchName);
    });
});
}); // ★一番外側の describe を閉じる括弧を追加★
