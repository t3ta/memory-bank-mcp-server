/**
 * Data Transfer Object for Active Context information
 */
export interface ActiveContextDTO {
  /**
   * Current work description
   */
  currentWork?: string;

  /**
   * Recent changes list
   */
  recentChanges?: string[];

  /**
   * Active decisions list
   */
  activeDecisions?: string[];

  /**
   * Considerations list
   */
  considerations?: string[];

  /**
   * Next steps list
   */
  nextSteps?: string[];
}

/**
 * Data Transfer Object for Progress information
 */
export interface ProgressDTO {
  /**
   * Current status
   */
  status?: string;

  /**
   * Working features list
   */
  workingFeatures?: string[];

  /**
   * Pending implementation list
   */
  pendingImplementation?: string[];

  /**
   * Known issues list
   */
  knownIssues?: string[];
}

/**
 * Data Transfer Object for Technical Decision information
 */
export interface TechnicalDecisionDTO {
  /**
   * Decision title
   */
  title: string;

  /**
   * Decision context
   */
  context: string;

  /**
   * Decision description
   */
  decision: string;

  /**
   * Decision consequences
   */
  consequences: string[];
}

/**
 * Data Transfer Object for System Patterns information
 */
export interface SystemPatternsDTO {
  /**
   * Technical decisions list
   */
  technicalDecisions?: TechnicalDecisionDTO[];
}

/**
 * Data Transfer Object for Core Files
 */
export interface CoreFilesDTO {
  /**
   * Active context information
   */
  activeContext?: ActiveContextDTO;

  /**
   * Progress information
   */
  progress?: ProgressDTO;

  /**
   * System patterns information
   */
  systemPatterns?: SystemPatternsDTO;
}
