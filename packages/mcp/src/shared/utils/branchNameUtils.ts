/**
 * Utility functions for branch name operations
 */

/**
 * Convert a branch name to a safe file system name
 * @param branchName Original branch name (e.g. 'feature/my-branch')
 * @returns Safe branch name for file system operations (e.g. 'feature-my-branch')
 */
export function toSafeBranchName(branchName: string): string {
  // Simple replacement of slashes with hyphens - matches BranchInfo.ts implementation
  return branchName.replace(/\//g, '-');
}

/**
 * Check if a branch name is valid
 * @param branchName Branch name to validate
 * @returns Boolean indicating if the branch name is valid
 */
export function isValidBranchName(branchName: string): boolean {
  if (!branchName || branchName.trim() === '') {
    return false;
  }
  
  // Branch name should include a namespace prefix with slash
  if (!branchName.includes('/')) {
    return false;
  }
  
  const displayName = branchName.substring(branchName.indexOf('/') + 1);
  
  // The name after the prefix shouldn't be empty
  if (!displayName || displayName.trim() === '') {
    return false;
  }
  
  return true;
}