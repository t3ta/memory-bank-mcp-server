import { BranchInfo } from '../../../../src/domain/entities/BranchInfo.js'; // .js 追加
import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError.js'; // .js 追加

describe('BranchInfo Unit Tests', () => {
  // ここにテストケースを追加していく
  describe('create', () => {
    it('should create an instance with a valid branch name', () => {
      // TODO: 実装
      const validBranchName = 'feature/my-cool-feature';
      const branchInfo = BranchInfo.create(validBranchName);
      expect(branchInfo).toBeInstanceOf(BranchInfo);
      expect(branchInfo.name).toBe(validBranchName);
    });

    it('should throw an error for an empty branch name', () => {
      // TODO: 実装
      const expectedMessage = 'Branch name cannot be empty';
      // const expectedCode = DomainErrorCodes.INVALID_BRANCH_NAME; // 未使用なので削除
      try {
        BranchInfo.create('');
        throw new Error('Expected DomainError but no error was thrown.');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).message).toBe(expectedMessage);
        expect((error as DomainError).code).toBe("DOMAIN_ERROR.INVALID_BRANCH_NAME");
      }
    });

    it('should throw an error for a branch name without a prefix', () => {
      const invalidBranchName = 'my-cool-feature';
      expect(() => BranchInfo.create(invalidBranchName)).toThrow(
        new DomainError(
          DomainErrorCodes.INVALID_BRANCH_NAME,
          'Branch name must include a namespace prefix with slash (e.g. "feature/my-branch")'
        )
      );
    });

     it('should throw an error for a branch name with only a prefix', () => {
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

    it('should return the original branch name for the name property', () => {
      expect(featureBranchInfo.name).toBe(featureBranchName);
      expect(fixBranchInfo.name).toBe(fixBranchName);
    });

    it('should return the name without prefix for the displayName property', () => {
      expect(featureBranchInfo.displayName).toBe('my-feature');
      expect(fixBranchInfo.displayName).toBe('another-feature');
    });

    it('should return the correct type for the type property', () => {
      expect(featureBranchInfo.type).toBe('feature');
      expect(fixBranchInfo.type).toBe('fix');
    });

    it('should return a filesystem-safe name for the safeName property', () => {
      // Basic test, depends on the specific implementation of toSafeBranchName
      expect(featureBranchInfo.safeName).toBe('feature-my-feature');
      expect(fixBranchInfo.safeName).toBe('fix-another-feature');
    });
  });

  describe('type checks', () => {
    it('should have type "feature" for a feature branch', () => {
      const featureBranch = BranchInfo.create('feature/new-stuff');
      expect(featureBranch.type).toBe('feature');
    });

    it('should have type "fix" for a fix branch', () => {
      const fixBranch = BranchInfo.create('fix/bug-fix');
      expect(fixBranch.type).toBe('fix');
    });

    // In the current BranchInfo.ts implementation, release, main, develop might be treated as feature or throw an error.
    // Therefore, tests for isReleaseBranch, isMainBranch, isDevelopBranch are not needed.
  });

  describe('equals', () => {
    it('should return true for instances with the same name', () => {
      const branch1 = BranchInfo.create('feature/same-name');
      const branch2 = BranchInfo.create('feature/same-name');
      expect(branch1.equals(branch2)).toBe(true);
    });

    it('should return false for instances with different names', () => {
      const branch1 = BranchInfo.create('feature/name-one');
      const branch2 = BranchInfo.create('feature/name-two');
      expect(branch1.equals(branch2)).toBe(false);
    });

     it('should return false for instances with different types but same base name (due to name comparison)', () => {
       const branch1 = BranchInfo.create('feature/diff-type');
       const branch2 = BranchInfo.create('fix/diff-type');
       // equals compares the full name, so this should be false
       expect(branch1.equals(branch2)).toBe(false);
       const branch3 = BranchInfo.create('fix/same-name-diff-type');
       const branch4 = BranchInfo.create('feature/same-name-diff-type');
       // equals compares the full name, so this should be false
       expect(branch3.equals(branch4)).toBe(false);
     });
  });

  describe('toString', () => {
    it('should return the original branch name for the toString method', () => {
      const branchName = 'feature/to-string-test';
      const branchInfo = BranchInfo.create(branchName);
      expect(branchInfo.toString()).toBe(branchName);
    });
});
});
