/**
 * Rules result type
 */
export type RulesResult = {
  content: string;
  language: string;
};

/**
 * Context request type
 */
export type ContextRequest = {
  branch: string;
  language: string;
};

/**
 * Context result type
 */
export type ContextResult = {
  rules?: RulesResult;
  branchMemory?: Record<string, string>;
  globalMemory?: Record<string, string>;
};
