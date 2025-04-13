/**
 * Rules result type
 */
export type RulesResult = {
  content: Record<string, unknown>; // Allow object
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
  branchMemory?: Record<string, string | object>; // Allow object
  globalMemory?: Record<string, string | object>; // Allow object
};
