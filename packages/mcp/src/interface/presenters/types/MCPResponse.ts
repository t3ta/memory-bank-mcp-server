/**
 * Base MCP response structure
 */
export interface MCPBaseResponse {
  success: boolean;
}

/**
 * Successful MCP response
 */
export interface MCPSuccessResponse<T = any> extends MCPBaseResponse {
  success: true;
  data: T;
  meta?: {
    format?: string;
    timestamp?: string;
    version?: string;
    [key: string]: any;
  };
}

/**
 * Error MCP response
 */
export interface MCPErrorResponse extends MCPBaseResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
    status?: number;
  };
  meta?: {
    format?: string;
    timestamp?: string;
    version?: string;
    [key: string]: any;
  };
}

/**
 * Combined MCP response type
 */
export type MCPResponse<T = any> = MCPSuccessResponse<T> | MCPErrorResponse;
