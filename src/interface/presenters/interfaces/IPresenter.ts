/**
 * Generic presenter interface
 * Transforms application output to format suitable for delivery to client
 */
export interface IPresenter<Response, ErrorResponse> {
  /**
   * Present success response
   * @param data Data to present
   * @returns Formatted response
   */
  present<T>(data: T): Response;
  
  /**
   * Present error response
   * @param error Error to present
   * @returns Formatted error response
   */
  presentError(error: Error): ErrorResponse;
}
