import { toSafeBranchName, isValidBranchName } from '../../../../src/shared/utils/branchNameUtils.js'; // .js 追加

describe('branchNameUtils', () => {
  describe('toSafeBranchName', () => {
    it('should replace slashes with hyphens', () => {
      expect(toSafeBranchName('feature/new-login')).toBe('feature-new-login');
    });

    it('should replace multiple slashes', () => {
      expect(toSafeBranchName('bugfix/issue/123')).toBe('bugfix-issue-123');
    });

    it('should handle names without slashes', () => {
      expect(toSafeBranchName('main')).toBe('main');
    });

    it('should handle names starting or ending with slashes (though likely invalid)', () => {
      expect(toSafeBranchName('/feature/start')).toBe('-feature-start');
      expect(toSafeBranchName('feature/end/')).toBe('feature-end-');
    });

    it('should handle empty string', () => {
      expect(toSafeBranchName('')).toBe('');
    });
  });

  describe('isValidBranchName', () => {
    it('should return true for valid branch names with namespace prefix', () => {
      expect(isValidBranchName('feature/add-button')).toBe(true);
      expect(isValidBranchName('fix/login-bug')).toBe(true);
      expect(isValidBranchName('docs/update-readme')).toBe(true);
      expect(isValidBranchName('release/v1.0.0')).toBe(true);
      expect(isValidBranchName('user/my-feature')).toBe(true);
      expect(isValidBranchName('a/b')).toBe(true); // Minimal valid case
    });

    it('should return false for branch names without a namespace prefix (slash)', () => {
      expect(isValidBranchName('main')).toBe(false);
      expect(isValidBranchName('develop')).toBe(false);
      expect(isValidBranchName('myfeature')).toBe(false);
    });

    it('should return false for empty or whitespace-only branch names', () => {
      expect(isValidBranchName('')).toBe(false);
      expect(isValidBranchName('   ')).toBe(false);
    });

    it('should return false if the part after the first slash is empty or whitespace', () => {
      expect(isValidBranchName('feature/')).toBe(false);
      expect(isValidBranchName('fix/   ')).toBe(false);
      expect(isValidBranchName('docs/ ')).toBe(false);
    });

    it('should return true if the part before the first slash is empty (starts with slash)', () => {
      // This might be debatable based on actual git rules, but the function allows it.
      expect(isValidBranchName('/my-feature')).toBe(true);
    });

     it('should handle multiple slashes correctly (only checks first slash)', () => {
      expect(isValidBranchName('feature/sub/task')).toBe(true); // Valid
      expect(isValidBranchName('feature//')).toBe(false); // Invalid (empty after first slash)
      expect(isValidBranchName('//test')).toBe(false); // Invalid (empty after first slash)
    });
  });
});
