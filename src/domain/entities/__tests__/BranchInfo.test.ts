import { BranchInfo } from '../BranchInfo.js';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';

describe('BranchInfo', () => {
  describe('create', () => {
    it('should create a valid BranchInfo with feature prefix', () => {
      // Arrange
      const branchName = 'feature/login';
      
      // Act
      const branchInfo = BranchInfo.create(branchName);
      
      // Assert
      expect(branchInfo).toBeDefined();
      expect(branchInfo.name).toBe(branchName);
      expect(branchInfo.displayName).toBe('login');
      expect(branchInfo.type).toBe('feature');
    });

    it('should create a valid BranchInfo with fix prefix', () => {
      // Arrange
      const branchName = 'fix/auth-bug';
      
      // Act
      const branchInfo = BranchInfo.create(branchName);
      
      // Assert
      expect(branchInfo).toBeDefined();
      expect(branchInfo.name).toBe(branchName);
      expect(branchInfo.displayName).toBe('auth-bug');
      expect(branchInfo.type).toBe('fix');
    });

    it('should throw DomainError when branch name is empty', () => {
      // Arrange
      const branchName = '';
      
      // Act & Assert
      expect(() => BranchInfo.create(branchName)).toThrow(DomainError);
      expect(() => BranchInfo.create(branchName)).toThrow('Branch name cannot be empty');
      
      try {
        BranchInfo.create(branchName);
      } catch (error) {
        expect(error instanceof DomainError).toBe(true);
        expect((error as DomainError).code).toBe(`DOMAIN_ERROR.${DomainErrorCodes.INVALID_BRANCH_NAME}`);
      }
    });

    it('should throw DomainError when branch name has invalid prefix', () => {
      // Arrange
      const branchName = 'invalid/login';
      
      // Act & Assert
      expect(() => BranchInfo.create(branchName)).toThrow(DomainError);
      expect(() => BranchInfo.create(branchName)).toThrow('Branch name must start with "feature/" or "fix/"');
      
      try {
        BranchInfo.create(branchName);
      } catch (error) {
        expect(error instanceof DomainError).toBe(true);
        expect((error as DomainError).code).toBe(`DOMAIN_ERROR.${DomainErrorCodes.INVALID_BRANCH_NAME}`);
      }
    });

    it('should throw DomainError when branch name has no name after prefix', () => {
      // Arrange
      const branchName = 'feature/';
      
      // Act & Assert
      expect(() => BranchInfo.create(branchName)).toThrow(DomainError);
      expect(() => BranchInfo.create(branchName)).toThrow('Branch name must have a name after the prefix');
      
      try {
        BranchInfo.create(branchName);
      } catch (error) {
        expect(error instanceof DomainError).toBe(true);
        expect((error as DomainError).code).toBe(`DOMAIN_ERROR.${DomainErrorCodes.INVALID_BRANCH_NAME}`);
      }
    });
  });

  describe('safeName', () => {
    it('should return name with slashes replaced by hyphens', () => {
      // Arrange
      const branchName = 'feature/login';
      const branchInfo = BranchInfo.create(branchName);
      
      // Act
      const safeName = branchInfo.safeName;
      
      // Assert
      expect(safeName).toBe('feature-login');
    });
  });

  describe('equals', () => {
    it('should return true when branch names are the same', () => {
      // Arrange
      const branchName = 'feature/login';
      const branchInfo1 = BranchInfo.create(branchName);
      const branchInfo2 = BranchInfo.create(branchName);
      
      // Act
      const result = branchInfo1.equals(branchInfo2);
      
      // Assert
      expect(result).toBe(true);
    });

    it('should return false when branch names are different', () => {
      // Arrange
      const branchInfo1 = BranchInfo.create('feature/login');
      const branchInfo2 = BranchInfo.create('feature/register');
      
      // Act
      const result = branchInfo1.equals(branchInfo2);
      
      // Assert
      expect(result).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return the raw branch name', () => {
      // Arrange
      const branchName = 'feature/login';
      const branchInfo = BranchInfo.create(branchName);
      
      // Act
      const result = branchInfo.toString();
      
      // Assert
      expect(result).toBe(branchName);
    });
  });
});
