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
  };
}

/**
 * Combined MCP response type
 */
export type MCPResponse<T = any> = MCPSuccessResponse<T> | MCPErrorResponse;
