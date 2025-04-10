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
    return false; // Empty or whitespace only is invalid
  }

  // Split by slash and check each part
  const parts = branchName.split('/');

  // Must contain at least one slash (meaning at least two parts)
  if (parts.length < 2) {
    return false;
  }

  // Check if any part is empty (handles leading/trailing/consecutive slashes)
  if (parts.some(part => part.trim() === '')) {
     // Allow leading slash (empty first part) but not others being empty
     // Example: '/feature/name' is allowed by current tests, parts[0] is ""
     // Example: 'feature//name' is not allowed, parts[1] is ""
     // Example: 'feature/name/' is not allowed, last part is ""
     // Example: '//name' is not allowed, parts[1] is ""
     if (parts[0] !== '' || parts.slice(1).some(part => part.trim() === '')) {
        return false;
     }
  }

  // Optional: Add more checks based on git branch naming rules if needed
  // (e.g., cannot contain '..', cannot end with '.', etc.)

  return true;
}
