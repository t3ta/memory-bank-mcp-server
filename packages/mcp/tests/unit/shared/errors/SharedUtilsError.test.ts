import { SharedUtilsError, SharedUtilsErrorCodes, SharedUtilsErrors } from '../../../../src/shared/errors/SharedUtilsError';
import { BaseError } from '../../../../src/shared/errors/BaseError';

describe('SharedUtilsError', () => {
  it('should create a SharedUtilsError instance with correct properties', () => {
    const code = SharedUtilsErrorCodes.PARSING_ERROR;
    const message = 'Failed to parse configuration file.';
    const details = { filename: 'config.yaml', line: 10 };
    const cause = new Error('YAML syntax error');

    const error = new SharedUtilsError(code, message, details, { cause });

    // Check inheritance
    expect(error).toBeInstanceOf(SharedUtilsError);
    expect(error).toBeInstanceOf(BaseError);
    expect(error).toBeInstanceOf(Error);

    // Check properties from BaseError
    expect(error.name).toBe('SharedUtilsError');
    expect(error.code).toBe(`SHARED_UTILS_${code}`); // Prefix should be added
    expect(error.message).toBe(message);
    expect(error.details).toEqual(details);
    expect(error.cause).toBe(cause);
    expect(error.timestamp).toBeInstanceOf(Date);

    // Check specific method from SharedUtilsError
    expect(error.getHttpStatusCode()).toBe(500); // Default HTTP status code
  });

  it('should create a SharedUtilsError without details and cause', () => {
    const code = SharedUtilsErrorCodes.UNKNOWN_ERROR;
    const message = 'An unknown utility error occurred.';

    const error = new SharedUtilsError(code, message);

    expect(error.code).toBe(`SHARED_UTILS_${code}`);
    expect(error.message).toBe(message);
    expect(error.details).toBeUndefined(); // Details should be undefined
    expect(error.cause).toBeUndefined();
  });

  it('should use factory function SharedUtilsErrors.validationError correctly', () => {
    const message = 'Invalid format for logger configuration.';
    const details = { configKey: 'logLevel' };
    const error = SharedUtilsErrors.validationError(message, details);

    expect(error).toBeInstanceOf(SharedUtilsError);
    expect(error.code).toBe(`SHARED_UTILS_${SharedUtilsErrorCodes.VALIDATION_ERROR}`);
    expect(error.message).toBe(message);
    expect(error.details).toEqual(details);
  });

  it('should use factory function SharedUtilsErrors.parsingError correctly', () => {
    const message = 'Could not parse date string.';
    const cause = new Error('Invalid date format');
    const details = { value: '2025-13-01' }; // Invalid month
    const error = SharedUtilsErrors.parsingError(message, cause, details);

    expect(error).toBeInstanceOf(SharedUtilsError);
    expect(error.code).toBe(`SHARED_UTILS_${SharedUtilsErrorCodes.PARSING_ERROR}`);
    expect(error.message).toBe(message);
    expect(error.details).toEqual(details);
    expect(error.cause).toBe(cause);
  });

  it('should use factory function SharedUtilsErrors.invalidArgument correctly', () => {
    const argumentName = 'timeoutMs';
    const message = 'Timeout must be a positive number.';
    const details = { value: -100 };
    const error = SharedUtilsErrors.invalidArgument(argumentName, message, details);

    expect(error).toBeInstanceOf(SharedUtilsError);
    expect(error.code).toBe(`SHARED_UTILS_${SharedUtilsErrorCodes.INVALID_ARGUMENT}`);
    expect(error.message).toBe(message);
    expect(error.details).toEqual({ argumentName, ...details });
  });

  it('should create a new error with updated message using withMessage', () => {
    const code = SharedUtilsErrorCodes.CONVERSION_ERROR;
    const originalMessage = 'Failed to convert data.';
    const originalDetails = { from: 'xml', to: 'json' };
    const originalCause = new Error('XML parsing failed');
    const originalError = new SharedUtilsError(code, originalMessage, originalDetails, { cause: originalCause });

    const newMessage = 'Data conversion failed due to invalid XML structure.';
    const additionalDetails = { element: '<unclosed' };
    const newError = originalError.withMessage(newMessage, additionalDetails);

    // Check new error properties
    expect(newError).toBeInstanceOf(SharedUtilsError);
    expect(newError.code).toBe(`SHARED_UTILS_${code}`); // Code remains the same
    expect(newError.message).toBe(newMessage);
    expect(newError.cause).toBe(originalCause); // Cause should be preserved

    // Check combined details
    expect(newError.details).toEqual({
      ...originalDetails,
      ...additionalDetails,
      originalMessage: originalMessage, // originalMessage should be added
    });

    // Ensure original error is unchanged
    expect(originalError.message).toBe(originalMessage);
    expect(originalError.details).toEqual(originalDetails);
  });

  // TODO: Add tests for other factory functions if needed
});
