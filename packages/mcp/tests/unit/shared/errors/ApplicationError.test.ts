import { ApplicationError, ApplicationErrorCodes, ApplicationErrors } from '../../../../src/shared/errors/ApplicationError';
import { BaseError } from '../../../../src/shared/errors/BaseError';

describe('ApplicationError', () => {
  it('should create an ApplicationError instance with correct properties', () => {
    const code = ApplicationErrorCodes.INVALID_INPUT;
    const message = 'Invalid user input provided.';
    const details = { field: 'email', value: 'invalid-email' };
    const cause = new Error('Original validation error');

    const error = new ApplicationError(code, message, details, { cause });

    // Check inheritance
    expect(error).toBeInstanceOf(ApplicationError);
    expect(error).toBeInstanceOf(BaseError);
    expect(error).toBeInstanceOf(Error);

    // Check properties from BaseError
    expect(error.name).toBe('ApplicationError');
    expect(error.code).toBe(`APP_ERROR.${code}`); // Prefix should be added
    expect(error.message).toBe(message);
    expect(error.details).toEqual(details);
    expect(error.cause).toBe(cause);
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('should create an ApplicationError without details and cause', () => {
    const code = ApplicationErrorCodes.UNAUTHORIZED;
    const message = 'User is not authorized.';

    const error = new ApplicationError(code, message);

    expect(error.code).toBe(`APP_ERROR.${code}`);
    expect(error.message).toBe(message);
    expect(error.details).toBeUndefined(); // Details should be undefined
    expect(error.cause).toBeUndefined();
  });

  describe('getHttpStatusCode', () => {
    it('should return 400 for INVALID_INPUT', () => {
      const error = new ApplicationError(ApplicationErrorCodes.INVALID_INPUT, '');
      expect(error.getHttpStatusCode()).toBe(400);
    });

    it('should return 401 for UNAUTHORIZED', () => {
      const error = new ApplicationError(ApplicationErrorCodes.UNAUTHORIZED, '');
      expect(error.getHttpStatusCode()).toBe(401);
    });

    it('should return 403 for FORBIDDEN', () => {
      const error = new ApplicationError(ApplicationErrorCodes.FORBIDDEN, '');
      expect(error.getHttpStatusCode()).toBe(403);
    });

    it('should return 404 for NOT_FOUND', () => {
      const error = new ApplicationError(ApplicationErrorCodes.NOT_FOUND, '');
      expect(error.getHttpStatusCode()).toBe(404);
    });

     it('should return 409 for CONFLICT', () => {
      const error = new ApplicationError(ApplicationErrorCodes.CONFLICT, '');
      expect(error.getHttpStatusCode()).toBe(409);
    });

    it('should return 500 for BRANCH_INITIALIZATION_FAILED', () => {
        const error = new ApplicationError(ApplicationErrorCodes.BRANCH_INITIALIZATION_FAILED, '');
        expect(error.getHttpStatusCode()).toBe(500);
      });

    it('should return 500 for other codes (default)', () => {
      const error = new ApplicationError(ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED, '');
      expect(error.getHttpStatusCode()).toBe(500);
      const unknownError = new ApplicationError('SOME_OTHER_CODE', '');
      expect(unknownError.getHttpStatusCode()).toBe(500);
    });
  });

  it('should use factory function ApplicationErrors.invalidInput correctly', () => {
    const message = 'Email is required.';
    const details = { field: 'email' };
    const error = ApplicationErrors.invalidInput(message, details);

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(`APP_ERROR.${ApplicationErrorCodes.INVALID_INPUT}`);
    expect(error.message).toBe(message);
    expect(error.details).toEqual(details);
  });

  it('should use factory function ApplicationErrors.notFound correctly', () => {
    const resource = 'User';
    const id = 'user-456';
    const error = ApplicationErrors.notFound(resource, id);

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(`APP_ERROR.${ApplicationErrorCodes.NOT_FOUND}`);
    expect(error.message).toBe(`${resource} with id ${id} was not found`);
    expect(error.details).toEqual({ resourceType: resource, resourceId: id });
  });

  it('should use factory function ApplicationErrors.unauthorized correctly', () => {
    const message = 'Invalid credentials.';
    const error = ApplicationErrors.unauthorized(message);

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(`APP_ERROR.${ApplicationErrorCodes.UNAUTHORIZED}`);
    expect(error.message).toBe(message);
    expect(error.details).toBeUndefined();
  });

  it('should use factory function ApplicationErrors.executionFailed correctly', () => {
    const useCaseName = 'CreateUserUseCase';
    const cause = new Error('DB error');
    const details = { userId: 'temp-123' };
    const error = ApplicationErrors.executionFailed(useCaseName, cause, details);

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(`APP_ERROR.${ApplicationErrorCodes.USE_CASE_EXECUTION_FAILED}`);
    expect(error.message).toBe(`Execution of use case '${useCaseName}' failed`);
    expect(error.details).toEqual({ useCaseName, ...details });
    expect(error.cause).toBe(cause);
  });

   it('should use factory function ApplicationErrors.configurationError correctly', () => {
    const message = 'Missing API key';
    const error = ApplicationErrors.configurationError(message);

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(`APP_ERROR.${ApplicationErrorCodes.CONFIGURATION_ERROR}`);
    expect(error.message).toBe(message);
    expect(error.details).toBeUndefined();
  });

  it('should use factory function ApplicationErrors.validationFailed correctly', () => {
    const useCaseName = 'UpdateProfileUseCase';
    const message = 'Invalid phone number format';
    const details = { field: 'phone' };
    const error = ApplicationErrors.validationFailed(useCaseName, message, details);

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(`APP_ERROR.${ApplicationErrorCodes.VALIDATION_FAILED}`);
    expect(error.message).toBe(`Validation failed in ${useCaseName}: ${message}`);
    expect(error.details).toEqual({ useCaseName, ...details });
  });

  it('should use factory function ApplicationErrors.branchInitializationFailed correctly', () => {
    const branchName = 'feature/new-init';
    const cause = new Error('Git command failed');
    const error = ApplicationErrors.branchInitializationFailed(branchName, cause);

    expect(error).toBeInstanceOf(ApplicationError);
    expect(error.code).toBe(`APP_ERROR.${ApplicationErrorCodes.BRANCH_INITIALIZATION_FAILED}`);
    expect(error.message).toBe(`Failed to initialize branch '${branchName}'`);
    expect(error.details).toEqual({ branchName });
    expect(error.cause).toBe(cause);
  });


  it('should create a new error with updated message using withMessage', () => {
    const code = ApplicationErrorCodes.FORBIDDEN;
    const originalMessage = 'Access denied.';
    const originalDetails = { role: 'guest' };
    const originalCause = new Error('Permission check failed');
    const originalError = new ApplicationError(code, originalMessage, originalDetails, { cause: originalCause });

    const newMessage = 'User does not have permission.';
    const additionalDetails = { permission: 'admin' };
    const newError = originalError.withMessage(newMessage, additionalDetails);

    // Check new error properties
    expect(newError).toBeInstanceOf(ApplicationError);
    expect(newError.code).toBe(`APP_ERROR.${code}`); // Code remains the same
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
