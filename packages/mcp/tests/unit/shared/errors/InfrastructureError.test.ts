import { InfrastructureError, InfrastructureErrorCodes, InfrastructureErrors } from '../../../../src/shared/errors/InfrastructureError';
import { BaseError } from '../../../../src/shared/errors/BaseError';

describe('InfrastructureError', () => {
  it('should create an InfrastructureError instance with correct properties', () => {
    const code = InfrastructureErrorCodes.FILE_READ_ERROR;
    const message = 'Failed to read the file.';
    const details = { path: '/path/to/file.txt', permissions: 'read-only' };
    // InfrastructureError constructor doesn't take cause directly in this definition
    // const cause = new Error('Original I/O error');

    const error = new InfrastructureError(code, message, details);

    // Check inheritance
    expect(error).toBeInstanceOf(InfrastructureError);
    expect(error).toBeInstanceOf(BaseError);
    expect(error).toBeInstanceOf(Error);

    // Check properties from BaseError
    expect(error.name).toBe('InfrastructureError');
    expect(error.code).toBe(code); // Code should match the enum value directly
    expect(error.message).toBe(message);
    expect(error.details).toEqual(details);
    // expect(error.cause).toBe(cause); // Cause is not directly passed in this constructor
    expect(error.timestamp).toBeInstanceOf(Date);
  });

  it('should create an InfrastructureError without details', () => {
    const code = InfrastructureErrorCodes.CONFIGURATION_ERROR;
    const message = 'Missing configuration value.';

    const error = new InfrastructureError(code, message);

    expect(error.code).toBe(code);
    expect(error.message).toBe(message);
    expect(error.details).toBeUndefined(); // Details should be undefined
  });

  describe('getHttpStatusCode', () => {
    it('should return 404 for FILE_NOT_FOUND', () => {
      const error = new InfrastructureError(InfrastructureErrorCodes.FILE_NOT_FOUND, '');
      expect(error.getHttpStatusCode()).toBe(404);
    });

    it('should return 404 for DIRECTORY_NOT_FOUND', () => {
      const error = new InfrastructureError(InfrastructureErrorCodes.DIRECTORY_NOT_FOUND, '');
      expect(error.getHttpStatusCode()).toBe(404);
    });

    it('should return 403 for FILE_PERMISSION_ERROR', () => {
      const error = new InfrastructureError(InfrastructureErrorCodes.FILE_PERMISSION_ERROR, '');
      expect(error.getHttpStatusCode()).toBe(403);
    });

    it('should return 409 for FILE_ALREADY_EXISTS', () => {
      const error = new InfrastructureError(InfrastructureErrorCodes.FILE_ALREADY_EXISTS, '');
      expect(error.getHttpStatusCode()).toBe(409);
    });

    it('should return 500 for other codes (default)', () => {
      const error = new InfrastructureError(InfrastructureErrorCodes.FILE_SYSTEM_ERROR, '');
      expect(error.getHttpStatusCode()).toBe(500);
      const gitError = new InfrastructureError(InfrastructureErrorCodes.GIT_COMMAND_FAILED, '');
      expect(gitError.getHttpStatusCode()).toBe(500);
    });
  });

  it('should use factory function InfrastructureErrors.fileNotFound correctly', () => {
    const message = 'File not found at path';
    const details = { path: '/not/found.txt' };
    const error = InfrastructureErrors.fileNotFound(message, details);

    expect(error).toBeInstanceOf(InfrastructureError);
    expect(error.code).toBe(InfrastructureErrorCodes.FILE_NOT_FOUND);
    expect(error.message).toBe(message);
    expect(error.details).toEqual(details);
    expect(error.getHttpStatusCode()).toBe(404);
  });

  it('should use factory function InfrastructureErrors.fileWriteError correctly', () => {
    const message = 'Could not write to file';
    const details = { path: '/locked/file.log', operation: 'append' };
    const error = InfrastructureErrors.fileWriteError(message, details);

    expect(error).toBeInstanceOf(InfrastructureError);
    expect(error.code).toBe(InfrastructureErrorCodes.FILE_WRITE_ERROR);
    expect(error.message).toBe(message);
    expect(error.details).toEqual(details);
    expect(error.getHttpStatusCode()).toBe(500); // Default
  });

   it('should use factory function InfrastructureErrors.permissionDenied correctly', () => {
    const message = 'Permission denied';
    const details = { path: '/admin/config', operation: 'read' };
    const error = InfrastructureErrors.permissionDenied(message, details);

    expect(error).toBeInstanceOf(InfrastructureError);
    expect(error.code).toBe(InfrastructureErrorCodes.FILE_PERMISSION_ERROR);
    expect(error.message).toBe(message);
    expect(error.details).toEqual(details);
    expect(error.getHttpStatusCode()).toBe(403);
  });

  it('should use factory function InfrastructureErrors.gitCommandFailed correctly', () => {
    const command = 'git push origin main';
    const reason = 'Authentication failed';
    const cause = new Error('Underlying auth error');
    const error = InfrastructureErrors.gitCommandFailed(command, reason, cause);

    expect(error).toBeInstanceOf(InfrastructureError);
    expect(error.code).toBe(InfrastructureErrorCodes.GIT_COMMAND_FAILED);
    expect(error.message).toBe(`Git command failed: '${command}'. Reason: ${reason}`);
    // Note: The factory adds 'cause' to details, not as the error's direct cause property based on BaseError constructor
    expect(error.details).toEqual({ command, reason, cause });
    expect(error.cause).toBeUndefined(); // BaseError constructor doesn't take cause from details
    expect(error.getHttpStatusCode()).toBe(500); // Default
  });

  it('should create a new error with updated message using withMessage', () => {
    const code = InfrastructureErrorCodes.INDEX_UPDATE_ERROR;
    const originalMessage = 'Failed to update index.';
    const originalDetails = { index: 'tags' };
    const originalError = new InfrastructureError(code, originalMessage, originalDetails);

    const newMessage = 'Index update failed due to lock.';
    // withMessage for InfrastructureError doesn't take additionalDetails
    const newError = originalError.withMessage(newMessage);

    // Check new error properties
    expect(newError).toBeInstanceOf(InfrastructureError);
    expect(newError.code).toBe(code); // Code remains the same
    expect(newError.message).toBe(newMessage);
    // expect(newError.cause).toBeUndefined(); // Cause is not handled by this withMessage

    // Check details (should remain the same as original)
    expect(newError.details).toEqual(originalDetails);

    // Ensure original error is unchanged
    expect(originalError.message).toBe(originalMessage);
    expect(originalError.details).toEqual(originalDetails);
  });

  // TODO: Add tests for other factory functions if needed
});
