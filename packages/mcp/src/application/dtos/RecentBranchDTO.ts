/**
 * Data transfer object for recent branch information
 */
export interface RecentBranchDTO {
  /**
   * Branch name
   */
  name: string;

  /**
   * Last modified timestamp (ISO string)
   */
  lastModified: string;

  /**
   * Branch summary information
   */
  summary: {
    /**
     * Current work in progress
     */
    currentWork?: string;

    /**
     * Recent changes
     */
    recentChanges?: string[];
  };
}
