import { MCPResponse } from '..types/index.js';

/**
 * Interface for response presenters
 * Defines methods for formatting responses
 */
export interface IResponsePresenter {
  /**
   * Present success response
   * @param data Data to present
   * @returns Formatted response with data
   */
  present<T>(data: T): MCPResponse<T>;

  /**
   * Present error response
   * @param error Error to present
   * @returns Formatted error response
   */
  presentError(error: Error): MCPResponse;
}
