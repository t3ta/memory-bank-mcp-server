/**
 * Data Transfer Object for branch information
 */
export interface BranchInfoDTO {
  /**
   * Branch name
   */
  name: string;
  
  /**
   * Display name (without prefix)
   */
  displayName: string;
  
  /**
   * Branch type
   */
  type: 'feature' | 'fix';
}
