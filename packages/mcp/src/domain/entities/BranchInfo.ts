import { DomainError, DomainErrorCodes } from "../../shared/errors/DomainError.js";
import { toSafeBranchName } from "../../shared/utils/branchNameUtils.js";

/**
 * Value object representing branch information
 */
export class BranchInfo {
  private constructor(
    private readonly _name: string,
    private readonly _displayName: string,
    private readonly _type: 'feature' | 'fix'
  ) { }

  /**
   * Factory method to create a new BranchInfo
   * @param branchName Raw branch name
   * @returns BranchInfo instance
   * @throws DomainError if branch name is invalid
   */
  public static create(branchName: string): BranchInfo {
    if (!branchName) {
      throw new DomainError(DomainErrorCodes.INVALID_BRANCH_NAME, 'Branch name cannot be empty');
    }

    if (!branchName.includes('/')) {
      throw new DomainError(
        DomainErrorCodes.INVALID_BRANCH_NAME,
        'Branch name must include a namespace prefix with slash (e.g. "feature/my-branch")'
      );
    }

    const namespacePrefix = branchName.split('/')[0];

    const type = namespacePrefix === 'feature' ? 'feature' :
      namespacePrefix === 'fix' ? 'fix' :
        'feature';

    const displayName = branchName.substring(branchName.indexOf('/') + 1);

    if (!displayName) {
      throw new DomainError(
        DomainErrorCodes.INVALID_BRANCH_NAME,
        'Branch name must have a name after the prefix'
      );
    }

    return new BranchInfo(branchName, displayName, type);
  }

  /**
   * Get the raw branch name
   */
  public get name(): string {
    return this._name;
  }

  /**
   * Get the display name (without prefix)
   */
  public get displayName(): string {
    return this._displayName;
  }

  /**
   * Get the branch type
   */
  public get type(): 'feature' | 'fix' {
    return this._type;
  }

  /**
   * Get a safe branch name for filesystem usage
   */
  public get safeName(): string {
    return toSafeBranchName(this._name);
  }

  /**
   * Checks if two BranchInfo instances are equal
   * @param other Another BranchInfo instance
   * @returns boolean indicating equality
   */
  public equals(other: BranchInfo): boolean {
    return this._name === other._name;
  }

  /**
   * Convert to string
   * @returns Raw branch name
   */
  public toString(): string {
    return this._name;
  }
}
