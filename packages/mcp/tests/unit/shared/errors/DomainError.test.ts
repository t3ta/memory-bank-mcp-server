import { DomainError, DomainErrorCodes, DomainErrors } from '../../../../src/shared/errors/DomainError';
import { BaseError } from '../../../../src/shared/errors/BaseError';

describe('DomainError', () => {
  it('should create a DomainError instance with correct properties', () => {
    const code = DomainErrorCodes.INVALID_DOCUMENT_PATH;
    const message = 'The provided document path is invalid.';
    const details = { path: '/absolute/path' };
    const cause = new Error('Original cause');

    const error = new DomainError(code, message, details, { cause });

    // Check inheritance
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(BaseError);
    expect(error).toBeInstanceOf(Error);

    // Check properties from BaseError
    expect(error.name).toBe('DomainError');
    expect(error.code).toBe(`DOMAIN_ERROR.${code}`); // Prefix should be added
    expect(error.message).toBe(message);
    expect(error.details).toEqual(details);
    expect(error.cause).toBe(cause);
    expect(error.timestamp).toBeInstanceOf(Date);

    // Check specific method from DomainError
    expect(error.getHttpStatusCode()).toBe(400); // Default HTTP status code
  });

  it('should create a DomainError without details and cause', () => {
    const code = DomainErrorCodes.BRANCH_NOT_FOUND;
    const message = 'Branch not found.';

    const error = new DomainError(code, message);

    expect(error.code).toBe(`DOMAIN_ERROR.${code}`);
    expect(error.message).toBe(message);
    expect(error.details).toBeUndefined(); // Details should be undefined when not provided
    expect(error.cause).toBeUndefined();
  });

  it('should use factory function DomainErrors.documentNotFound correctly', () => {
    const docId = 'doc-123';
    const additionalDetails = { searchParam: 'test' };
    const error = DomainErrors.documentNotFound(docId, additionalDetails);

    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe(`DOMAIN_ERROR.${DomainErrorCodes.DOCUMENT_NOT_FOUND}`);
    expect(error.message).toBe(`Document with ID ${docId} was not found`);
    expect(error.details).toEqual({ documentId: docId, ...additionalDetails });
  });

  it('should use factory function DomainErrors.branchNotFound correctly', () => {
    const branchName = 'feature/test';
    const error = DomainErrors.branchNotFound(branchName);

    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe(`DOMAIN_ERROR.${DomainErrorCodes.BRANCH_NOT_FOUND}`);
    expect(error.message).toBe(`Branch '${branchName}' was not found`);
    expect(error.details).toEqual({ branchName });
  });

   it('should use factory function DomainErrors.validationError correctly', () => {
    const message = 'Input validation failed';
    const details = { field: 'email' };
    const error = DomainErrors.validationError(message, details);

    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe(`DOMAIN_ERROR.${DomainErrorCodes.VALIDATION_ERROR}`);
    expect(error.message).toBe(message);
    expect(error.details).toEqual(details);
  });

  it('should use factory function DomainErrors.invalidTagFormat correctly', () => {
    const tag = 'Invalid Tag';
    const error = DomainErrors.invalidTagFormat(tag);

    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe(`DOMAIN_ERROR.${DomainErrorCodes.INVALID_TAG_FORMAT}`);
    expect(error.message).toContain(`Invalid tag format: '${tag}'`);
    expect(error.details).toEqual({ tag });
  });

  it('should use factory function DomainErrors.unexpectedError correctly', () => {
    const message = 'Something unexpected happened';
    const error = DomainErrors.unexpectedError(message);

    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe(`DOMAIN_ERROR.${DomainErrorCodes.UNEXPECTED_ERROR}`);
    expect(error.message).toBe(message);
    expect(error.details).toBeUndefined(); // Details should be undefined when not provided by factory
  });

   it('should use factory function DomainErrors.invalidOperation correctly', () => {
    const operation = 'delete';
    const message = 'Cannot delete root document';
    const error = DomainErrors.invalidOperation(operation, message);

    expect(error).toBeInstanceOf(DomainError);
    expect(error.code).toBe(`DOMAIN_ERROR.${DomainErrorCodes.INVALID_OPERATION}`);
    expect(error.message).toBe(`Invalid operation '${operation}': ${message}`);
    expect(error.details).toEqual({ operation });
  });


  it('should create a new error with updated message using withMessage', () => {
    const code = DomainErrorCodes.REPOSITORY_ERROR;
    const originalMessage = 'Original repository error.';
    const originalDetails = { db: 'primary' };
    const originalCause = new Error('DB connection lost');
    const originalError = new DomainError(code, originalMessage, originalDetails, { cause: originalCause });

    const newMessage = 'Failed to access repository.';
    const additionalDetails = { table: 'users' };
    const newError = originalError.withMessage(newMessage, additionalDetails);

    // Check new error properties
    expect(newError).toBeInstanceOf(DomainError);
    expect(newError.code).toBe(`DOMAIN_ERROR.${code}`); // Code remains the same
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
  // TODO: Add tests for specific HTTP status code overrides if any exist
});
