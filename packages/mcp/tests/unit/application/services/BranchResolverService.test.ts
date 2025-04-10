import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BranchResolverService } from '../../../../src/application/services/BranchResolverService';
import type { IGitService } from '../../../../src/infrastructure/git/IGitService';
import type { IConfigProvider } from '../../../../src/infrastructure/config/interfaces/IConfigProvider';
import type { WorkspaceConfig } from '../../../../src/infrastructure/config/WorkspaceConfig';
import { ApplicationError } from '../../../../src/shared/errors/ApplicationError';

describe('BranchResolverService', () => {
  // モックの作成
  const mockGitService: IGitService = {
    getCurrentBranchName: vi.fn<() => Promise<string>>()
  };

  const mockConfigProvider: IConfigProvider = {
    initialize: vi.fn(),
    getConfig: vi.fn<() => WorkspaceConfig>(),
    getGlobalMemoryPath: vi.fn<() => string>(),
    getBranchMemoryPath: vi.fn<(branchName: string) => string>(),
    getLanguage: vi.fn<() => 'en' | 'ja' | 'zh'>()
  };

  let branchResolverService: BranchResolverService;

  beforeEach(() => {
    // テスト前にモックをリセット
    vi.resetAllMocks();
    
    // テスト用のデフォルト値を設定
    mockGitService.getCurrentBranchName.mockResolvedValue('feature/test-branch');
    mockConfigProvider.getConfig.mockReturnValue({
      docsRoot: '/test/docs',
      verbose: false,
      language: 'en',
      isProjectMode: true
    });
    
    // テスト対象のインスタンスを作成
    branchResolverService = new BranchResolverService(mockGitService, mockConfigProvider);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveBranchName', () => {
    it('should return the provided branch name when it is valid', async () => {
      // テスト実行
      const result = await branchResolverService.resolveBranchName('feature/my-branch');
      
      // 検証
      expect(result).toBe('feature/my-branch');
      // GitServiceは呼ばれていないはず
      expect(mockGitService.getCurrentBranchName).not.toHaveBeenCalled();
    });

    it('should auto-detect current branch in project mode when branch name is not provided', async () => {
      // プロジェクトモードを確認
      mockConfigProvider.getConfig.mockReturnValue({
        docsRoot: '/test/docs',
        verbose: false,
        language: 'en',
        isProjectMode: true
      });
      
      // テスト実行（ブランチ名なし）
      const result = await branchResolverService.resolveBranchName();
      
      // 検証
      expect(result).toBe('feature/test-branch');
      // GitServiceが呼ばれたことを確認
      expect(mockGitService.getCurrentBranchName).toHaveBeenCalledTimes(1);
    });

    it('should throw an error in non-project mode when branch name is not provided', async () => {
      // 非プロジェクトモードに設定
      mockConfigProvider.getConfig.mockReturnValue({
        docsRoot: '/test/docs',
        verbose: false,
        language: 'en',
        isProjectMode: false
      });
      
      // テスト実行と例外確認
      await expect(branchResolverService.resolveBranchName()).rejects.toThrow(
        'Branch name is required when not running in project mode.'
      );
      
      // GitServiceは呼ばれていないはず
      expect(mockGitService.getCurrentBranchName).not.toHaveBeenCalled();
    });

    it('should throw an error when GitService fails to get current branch', async () => {
      // GitServiceがエラーを投げるように設定
      const gitError = new Error('Not a git repository');
      mockGitService.getCurrentBranchName.mockRejectedValue(gitError);
      
      // プロジェクトモードを確認
      mockConfigProvider.getConfig.mockReturnValue({
        docsRoot: '/test/docs',
        verbose: false,
        language: 'en',
        isProjectMode: true
      });
      
      // テスト実行と例外確認
      await expect(branchResolverService.resolveBranchName()).rejects.toThrow(
        'Branch name is required but could not be automatically determined.'
      );
      
      // GitServiceが呼ばれたことを確認
      expect(mockGitService.getCurrentBranchName).toHaveBeenCalledTimes(1);
    });

    it('should throw an error when an invalid branch name is provided', async () => {
      // 無効なブランチ名（プレフィックスなし）でテスト
      await expect(branchResolverService.resolveBranchName('invalid-branch')).rejects.toThrow(
        'Branch name must include a namespace prefix with slash'
      );
      
      // 空のブランチ名でテスト
      await expect(branchResolverService.resolveBranchName('')).rejects.toThrow(
        'Branch name cannot be empty'
      );
      
      // スラッシュだけのブランチ名でテスト
      await expect(branchResolverService.resolveBranchName('feature/')).rejects.toThrow(
        'Branch name must have a name after the prefix'
      );
    });
  });
});
