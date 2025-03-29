import { BaseError } from './BaseError.js';
import { ApplicationError, ApplicationErrorCodes, ApplicationErrors } from './ApplicationError.js';
import { DomainError, DomainErrorCodes, DomainErrors } from './DomainError.js';
import { InfrastructureError, InfrastructureErrorCodes, InfrastructureErrors } from './InfrastructureError.js';
import { SharedUtilsError, SharedUtilsErrorCodes, SharedUtilsErrors } from './SharedUtilsError.js';
import { logger } from '../utils/logger.js';

// Re-export all error types
export { 
  BaseError, 
  ApplicationError, ApplicationErrorCodes, ApplicationErrors,
  DomainError, DomainErrorCodes, DomainErrors,
  InfrastructureError, InfrastructureErrorCodes, InfrastructureErrors,
  SharedUtilsError, SharedUtilsErrorCodes, SharedUtilsErrors 
};

/**
 * Error utility functions for common error handling patterns
 */
export const ErrorUtils = {
  /**
   * Wrap a promise to handle errors consistently
   * 
   * @param promise Promise to wrap
   * @param errorMapper Function to map unknown errors to typed errors
   * @returns Promise with consistently handled errors
   */
  async wrapAsync<T>(
    promise: Promise<T>, 
    errorMapper?: (error: unknown) => Error
  ): Promise<T> {
    try {
      return await promise;
    } catch (error) {
      // If already a known error type, just rethrow
      if (error instanceof BaseError) {
        throw error;
      }
      
      // Log the original error
      logger.error('Error caught in wrapAsync', { error });
      
      // Map unknown errors if mapper provided
      if (errorMapper) {
        throw errorMapper(error);
      }
      
      // Default error mapping
      if (error instanceof Error) {
        throw new InfrastructureError(
          InfrastructureErrorCodes.UNKNOWN_ERROR,
          error.message,
          { originalError: error.toString() },
          { cause: error }
        );
      }
      
      // Completely unknown error
      throw new InfrastructureError(
        InfrastructureErrorCodes.UNKNOWN_ERROR,
        'An unknown error occurred',
        { originalError: String(error) }
      );
    }
  },
  
  /**
   * Check if an error is an instance of a specific error type by name
   * More reliable than instanceof when dealing with errors across module boundaries
   * 
   * @param error Error to check
   * @param errorName Name of the error type to check against
   */
  isErrorOfType(error: unknown, errorName: string): boolean {
    if (!(error instanceof Error)) {
      return false;
    }
    
    // Check if it's a BaseError with isInstanceOf method
    if (error instanceof BaseError) {
      return error.isInstanceOf(errorName);
    }
    
    // Fallback to constructor name
    return error.constructor.name === errorName;
  },
  
  /**
   * Get error code from any error (BaseError or standard Error)
   * 
   * @param error Error to extract code from
   * @returns Error code or default code for unknown errors
   */
  getErrorCode(error: unknown): string {
    if (error instanceof BaseError) {
      return error.code;
    }
    
    if (error instanceof Error) {
      return `GENERAL_ERROR.${error.name.toUpperCase()}`;
    }
    
    return 'UNKNOWN_ERROR';
  },
  
  /**
   * Format any error for logging purposes
   * 
   * @param error Error to format
   * @returns Formatted error object suitable for logging
   */
  formatForLogging(error: unknown): Record<string, unknown> {
    if (error instanceof BaseError) {
      return error.toJSON();
    }
    
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      };
    }
    
    return {
      error: String(error),
      timestamp: new Date().toISOString()
    };
  }
};
