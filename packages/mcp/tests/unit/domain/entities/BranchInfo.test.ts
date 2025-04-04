import { BranchInfo } from '../../../../src/domain/entities/BranchInfo';
// import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError'; // 必要に応じてコメント解除

describe('BranchInfo', () => {
  describe('create', () => {
    it.todo('有効なブランチ名でインスタンスを作成できること (例: feature/my-branch)');
    it.todo('有効なブランチ名でインスタンスを作成できること (例: fix/some-issue)');
    it.todo('有効なブランチ名でインスタンスを作成できること (例: release/v1.0.0)');
    it.todo('有効なブランチ名でインスタンスを作成できること (例: main)');
    it.todo('有効なブランチ名でインスタンスを作成できること (例: develop)');

    it.todo('空のブランチ名でエラーが発生すること');
    it.todo('長すぎるブランチ名でエラーが発生すること'); // 制限があるか確認
    it.todo('無効な文字を含むブランチ名でエラーが発生すること'); // Gitのブランチ名ルールに基づく
    it.todo('スラッシュで始まる/終わるブランチ名でエラーが発生すること');
    it.todo('連続したスラッシュを含むブランチ名でエラーが発生すること');
    it.todo('不正な名前空間プレフィックスの場合にエラーが発生すること'); // (feature/, fix/, release/ など)
  });

  describe('getters', () => {
    const branchName = 'feature/my-cool-feature';
    const branchInfo = BranchInfo.create(branchName);

    it.todo('name プロパティが元のブランチ名を返すこと');
    it.todo('safeName プロパティがファイルシステムセーフな名前を返すこと'); // スラッシュが置換されるはず
    it.todo('namespace プロパティが正しい名前空間を返すこと (feature)');
    it.todo('shortName プロパティが正しい短い名前を返すこと (my-cool-feature)');

    it.todo('名前空間がない場合に namespace が null または undefined を返すこと (例: main)');
    it.todo('名前空間がない場合に shortName が元の名前を返すこと (例: main)');
  });

  describe('isFeatureBranch', () => {
    it.todo('feature/ プレフィックスの場合に true を返すこと');
    it.todo('他のプレフィックスの場合に false を返すこと');
    it.todo('プレフィックスがない場合に false を返すこと');
  });

  describe('isFixBranch', () => {
    it.todo('fix/ プレフィックスの場合に true を返すこと');
    // ... 他のケース
  });

  describe('isReleaseBranch', () => {
    it.todo('release/ プレフィックスの場合に true を返すこと');
    // ... 他のケース
  });

  // 他にも isMainBranch, isDevelopBranch などがあればテストを追加
});
