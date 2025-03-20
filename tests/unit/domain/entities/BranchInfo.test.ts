import { BranchInfo } from '../../../../src/domain/entities/BranchInfo';
import { DomainError } from '../../../../src/shared/errors/DomainError';

/**
 * Unit tests for BranchInfo entity
 * 
 * These tests verify that the BranchInfo entity correctly implements the following features:
 * - Instance creation from valid branch names
 * - Validation of invalid branch names and appropriate error handling
 * - Conversion of branch names to safe formats (replacing slashes with hyphens, etc.)
 * - Identity comparison
 * 
 * TODO: Add the following test cases
 * - Tests for complex branch name patterns
 * - Tests for branch name length limits
 * - Tests for handling branch names with special characters
 */
describe('BranchInfo', () => {
  // BranchInfo uses a private constructor, so instances must be created via the create method
  describe('create', () => {
    it('should create instance with valid branch name', () => {
      // Normal branch name (feature/xxx format)
      const branchInfo = BranchInfo.create('feature/login');
      expect(branchInfo).toBeDefined();
      expect(branchInfo.name).toBe('feature/login');

      // Branch name with namespace
      const fixBranch = BranchInfo.create('fix/bug-123');
      expect(fixBranch).toBeDefined();
      expect(fixBranch.name).toBe('fix/bug-123');
    });

    it('should throw error when branch name is empty', () => {
      expect(() => BranchInfo.create('')).toThrow(DomainError);
      expect(() => BranchInfo.create('')).toThrow('Branch name cannot be empty');
    });

    it('should throw error when branch name does not include namespace', () => {
      expect(() => BranchInfo.create('main')).toThrow(DomainError);
      expect(() => BranchInfo.create('main')).toThrow('Branch name must include a namespace prefix with slash');
    });
  });

  describe('name, displayName and type', () => {
    it('should return correct name, displayName and type', () => {
      const featureBranch = BranchInfo.create('feature/login');
      expect(featureBranch.name).toBe('feature/login');
      expect(featureBranch.displayName).toBe('login');
      expect(featureBranch.type).toBe('feature');

      const fixBranch = BranchInfo.create('fix/bug-123');
      expect(fixBranch.name).toBe('fix/bug-123');
      expect(fixBranch.displayName).toBe('bug-123');
      expect(fixBranch.type).toBe('fix');
    });
  });

  describe('safeName', () => {
    it('should convert slashes to hyphens', () => {
      const branchInfo = BranchInfo.create('feature/login');
      expect(branchInfo.safeName).toBe('feature-login');

      const nestedBranch = BranchInfo.create('feature/user/login');
      expect(nestedBranch.safeName).toBe('feature-user-login');
    });

    it('should not add additional hyphens to already hyphenated names', () => {
      const hyphenBranch = BranchInfo.create('feature/login-form');
      expect(hyphenBranch.safeName).toBe('feature-login-form');
    });
  });

  describe('equals', () => {
    it('should return true when branch names are the same', () => {
      const branch1 = BranchInfo.create('feature/login');
      const branch2 = BranchInfo.create('feature/login');
      expect(branch1.equals(branch2)).toBe(true);
    });

    it('should return false when branch names are different', () => {
      const branch1 = BranchInfo.create('feature/login');
      const branch2 = BranchInfo.create('feature/register');
      expect(branch1.equals(branch2)).toBe(false);
    });

    // Tests for null and undefined aren't compatible with the type definition of the equals method in BranchInfo class
  });

  describe('toString', () => {
    it('should return the branch name', () => {
      const branchInfo = BranchInfo.create('feature/login');
      expect(branchInfo.toString()).toBe('feature/login');
    });
  });

  // TODO: Tests for complex branch name patterns
  it.skip('should handle complex branch name patterns', () => {
    // Branch name containing numbers
    const numericBranch = BranchInfo.create('release/2.0.0');
    expect(numericBranch.name).toBe('release/2.0.0');
    expect(numericBranch.safeName).toBe('release-2.0.0');

    // Branch name containing dots
    const dottedBranch = BranchInfo.create('bugfix/auth.service');
    expect(dottedBranch.name).toBe('bugfix/auth.service');
    expect(dottedBranch.safeName).toBe('bugfix-auth.service');

    // Branch name containing underscores
    const underscoreBranch = BranchInfo.create('feature/user_profile');
    expect(underscoreBranch.name).toBe('feature/user_profile');
    expect(underscoreBranch.safeName).toBe('feature-user_profile');

    // Branch name with multiple levels of depth
    const deepBranch = BranchInfo.create('feature/auth/oauth/google');
    expect(deepBranch.name).toBe('feature/auth/oauth/google');
    expect(deepBranch.safeName).toBe('feature-auth-oauth-google');
  });

  // TODO: Tests for branch name length limits
  it.skip('should validate branch name length', () => {
    // Branch name of maximum length (using 100 characters as an arbitrary maximum)
    const maxLengthName = 'a'.repeat(100);
    const maxLengthBranch = BranchInfo.create(maxLengthName);
    expect(maxLengthBranch.name).toBe(maxLengthName);
    
    // Branch name exceeding maximum length
    const tooLongName = 'a'.repeat(101);
    expect(() => BranchInfo.create(tooLongName)).toThrow(DomainError);
    expect(() => BranchInfo.create(tooLongName)).toThrow('Branch name is too long');
  });

  // TODO: Tests for handling branch names with special characters
  it.skip('should properly handle or reject branch names with special characters', () => {
    // Allowed special characters
    const allowedSpecialChars = BranchInfo.create('feature/login-form.v2');
    expect(allowedSpecialChars.name).toBe('feature/login-form.v2');
    
    // Rejected special characters
    expect(() => BranchInfo.create('feature/login#form')).toThrow(DomainError);
    expect(() => BranchInfo.create('feature/login?v=2')).toThrow(DomainError);
    expect(() => BranchInfo.create('feature/login*')).toThrow(DomainError);
  });
});
