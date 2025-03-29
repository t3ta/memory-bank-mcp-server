/**
 * Base error class for application
 * All custom errors should extend this class or its subclasses
 */
export abstract class BaseError extends Error {
  /**
   * Error creation timestamp
   */
  public readonly timestamp: Date;

  /**
   * Original error that caused this error (if any)
   */
  public readonly cause?: Error;

  /**
   * Create a new BaseError
   *
   * @param code Unique error code for identification and documentation
   * @param message Human-readable error message
   * @param details Additional error details for debugging and logging
   * @param options Additional error options
   */
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
    options?: { cause?: Error }
  ) {
    super(message, options);
    this.name = this.constructor.name;
    this.timestamp = new Date();
    this.cause = options?.cause;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Converts error to a plain object suitable for logging or serialization
   */
  public toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      timestamp: this.timestamp.toISOString(),
      details: this.details,
      cause: this.cause ? {
        name: this.cause.name,
        message: this.cause.message,
        stack: this.cause.stack
      } : undefined,
    };
  }

  /**
   * Get the HTTP status code corresponding to this error
   * Should be overridden by subclasses if needed
   */
  public getHttpStatusCode(): number {
    // Default to 500 Internal Server Error
    return 500;
  }

  /**
   * Returns true if the error is of the specified class
   * Safer than using instanceof when class definitions might be different
   *
   * @param errorClass Error class to check against
   */
  public isInstanceOf(errorClass: string): boolean {
    return this.constructor.name === errorClass || this.name === errorClass;
  }

  /**
   * Create a new error with the same code but a new message
   * Useful for adding context to existing errors
   *
   * @param newMessage New error message
   * @param additionalDetails Additional details to merge with existing details
   */
  // Make this abstract as it must be implemented by subclasses
  // Return BaseError instead of this for compatibility with subclass implementations
  public abstract withMessage(newMessage: string, additionalDetails?: Record<string, unknown>): BaseError;
}
// Removed extra closing brace
