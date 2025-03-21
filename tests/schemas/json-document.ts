/**
 * Mock JSON document types for testing
 */

export type DocumentType = 
  | 'generic'
  | 'branch_context'
  | 'active_context'
  | 'progress'
  | 'system_patterns';

export interface BaseJsonDocument {
  schema: string;
  metadata: {
    title: string;
    documentType: DocumentType;
    path: string;
    tags?: string[];
    lastModified: Date | string;
    createdAt?: Date | string;
    version?: number;
    id?: string;
  };
  content: Record<string, any>;
}

export interface BranchContextJson extends BaseJsonDocument {
  metadata: {
    title: string;
    documentType: 'branch_context';
    path: string;
    tags?: string[];
    lastModified: Date | string;
    createdAt?: Date | string;
    version?: number;
  };
  content: {
    purpose: string;
    createdAt?: Date | string;
    userStories?: Array<{
      description: string;
      completed: boolean;
    }>;
  };
}

export interface ActiveContextJson extends BaseJsonDocument {
  metadata: {
    title: string;
    documentType: 'active_context';
    path: string;
    tags?: string[];
    lastModified: Date | string;
    createdAt?: Date | string;
    version?: number;
  };
  content: {
    currentWork: string;
    recentChanges: string[];
    activeDecisions: string[];
    considerations: string[];
    nextSteps: string[];
  };
}

export interface ProgressJson extends BaseJsonDocument {
  metadata: {
    title: string;
    documentType: 'progress';
    path: string;
    tags?: string[];
    lastModified: Date | string;
    createdAt?: Date | string;
    version?: number;
  };
  content: {
    workingFeatures: string[];
    pendingImplementation: string[];
    status: string;
    knownIssues: string[];
  };
}

export interface SystemPatternsJson extends BaseJsonDocument {
  metadata: {
    title: string;
    documentType: 'system_patterns';
    path: string;
    tags?: string[];
    lastModified: Date | string;
    createdAt?: Date | string;
    version?: number;
  };
  content: {
    technicalDecisions: Array<{
      title: string;
      context: string;
      decision: string;
      consequences: string[];
    }>;
  };
}

export type JsonDocument = 
  | BranchContextJson
  | ActiveContextJson
  | ProgressJson
  | SystemPatternsJson
  | BaseJsonDocument;
