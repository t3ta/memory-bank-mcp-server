import { BranchInfoDTO } from './BranchInfoDTO.js';

/**
 * Data Transfer Object for recent branch information
 */
export interface RecentBranchDTO {
  /**
   * Branch information
   */
  branch: BranchInfoDTO;
  
  /**
   * Last modified date (ISO string)
   */
  lastModified: string;
  
  /**
   * Branch summary
   */
  summary: {
    /**
     * Current work description
     */
    currentWork?: string;
    
    /**
     * Recent changes
     */
    recentChanges?: string[];
  };
}
