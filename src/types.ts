export interface McpError {
  code: number;
  message: string;
}

export enum ErrorCode {
  ParseError = -32700,
  InvalidRequest = -32600,
  MethodNotFound = -32601,
  InvalidParams = -32602,
  InternalError = -32603
}

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: any;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: any;
  error?: McpError;
}

export interface ToolResponse {
  result: boolean;
  content: Array<{ type: string; text: string }>;
  _meta?: Record<string, any>;
}

export interface CliOptions {
  workspace?: string;
  memoryRoot?: string;
  verbose?: boolean;
  language?: "en" | "ja";
}

export interface WorkspaceConfig {
  workspaceRoot: string;
  memoryBankRoot: string;
  verbose: boolean;
  language: "en" | "ja";
}

export interface ReadMemoryBankArgs {
  path: string;
}

export interface WriteMemoryBankArgs {
  path: string;
  content: string;
  tags?: string[];
}

export interface UpdateActiveContextArgs {
  currentWork?: string;
  recentChanges?: string[];
  activeDecisions?: string[];
  considerations?: string[];
  nextSteps?: string[];
}

export interface UpdateProgressArgs {
  workingFeatures?: string[];
  pendingImplementation?: string[];
  status?: string;
  knownIssues?: string[];
}

export interface AddTechnicalDecisionArgs {
  title: string;
  context: string;
  decision: string;
  consequences: string[];
}

export interface SearchByTagsArgs {
  tags: string[];
}
