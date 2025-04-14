import { BaseError } from "../../../shared/errors/BaseError.js";
import { MCPResponse } from "./MCPResponse.js";
import { MCPToolResponse } from "../../../types/protocol/MCPProtocolTypes.js";

/**
 * MCP Response Presenter interface
 * Handles formatting of responses and errors
 */
export interface MCPResponsePresenter {
  /**
   * Present success response
   * @param data Response data
   * @returns Formatted MCP response
   */
  presentSuccess<T>(data: T): MCPResponse<T>;

  /**
   * Present error response
   * @param error Error to format
   * @returns Formatted MCP error response
   */
  presentError(error: BaseError | Error): MCPResponse;

  /**
   * Present raw MCP protocol response
   * @param response Raw MCP protocol response
   * @returns MCP response formatted for output
   */
  presentRawResponse(response: MCPToolResponse): MCPResponse;
}
