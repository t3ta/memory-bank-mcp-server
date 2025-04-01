import { BaseError } from "../../../shared/errors/BaseError.js";
import { MCPResponse } from "./MCPResponse.js";

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
  presentSuccess<T>(data: T): MCPResponse<T>; // Correct method name

  /**
   * Present error response
   * @param error Error to format
   * @returns Formatted MCP error response
   */
  presentError(error: BaseError | Error): MCPResponse;
}
