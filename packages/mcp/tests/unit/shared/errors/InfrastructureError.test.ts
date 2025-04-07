import { InfrastructureError, InfrastructureErrorCodes, InfrastructureErrors } from '../../../../src/shared/errors/InfrastructureError.js'; // .js 追加
import { BaseError } from '../../../../src/shared/errors/BaseError.js'; // .js 追加

describe('InfrastructureError Unit Tests', () => {
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
      // Test other codes that default to 500
      const configError = new InfrastructureError(InfrastructureErrorCodes.CONFIGURATION_ERROR, '');
      expect(configError.getHttpStatusCode()).toBe(500);
      const fileReadError = new InfrastructureError(InfrastructureErrorCodes.FILE_READ_ERROR, '');
      expect(fileReadError.getHttpStatusCode()).toBe(500);
      const fileWriteError = new InfrastructureError(InfrastructureErrorCodes.FILE_WRITE_ERROR, '');
      expect(fileWriteError.getHttpStatusCode()).toBe(500);
      const fileDeleteError = new InfrastructureError(InfrastructureErrorCodes.FILE_DELETE_ERROR, '');
      expect(fileDeleteError.getHttpStatusCode()).toBe(500);
      const dirCreateError = new InfrastructureError(InfrastructureErrorCodes.DIRECTORY_CREATE_ERROR, '');
      expect(dirCreateError.getHttpStatusCode()).toBe(500);
      const indexUpdateError = new InfrastructureError(InfrastructureErrorCodes.INDEX_UPDATE_ERROR, '');
      expect(indexUpdateError.getHttpStatusCode()).toBe(500);
      const initError = new InfrastructureError(InfrastructureErrorCodes.INITIALIZATION_ERROR, '');
      expect(initError.getHttpStatusCode()).toBe(500);
      const mcpServerError = new InfrastructureError(InfrastructureErrorCodes.MCP_SERVER_ERROR, '');
      expect(mcpServerError.getHttpStatusCode()).toBe(500);
      const invalidFileContentError = new InfrastructureError(InfrastructureErrorCodes.INVALID_FILE_CONTENT, '');
      expect(invalidFileContentError.getHttpStatusCode()).toBe(500);
      const invalidArgumentError = new InfrastructureError(InfrastructureErrorCodes.INVALID_ARGUMENT, '');
      expect(invalidArgumentError.getHttpStatusCode()).toBe(500);
      const persistenceError = new InfrastructureError(InfrastructureErrorCodes.PERSISTENCE_ERROR, '');
      expect(persistenceError.getHttpStatusCode()).toBe(500);
      // Removed reference to non-existent templateNotFoundError
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
  expect(error.getHttpStatusCode()).toBe(403);
});

// --- Test remaining factory functions ---

it('should use factory function InfrastructureErrors.fileReadError correctly', () => {
  const message = 'Cannot read file';
  const details = { path: '/read/only.txt' };
  const error = InfrastructureErrors.fileReadError(message, details);
  expect(error.code).toBe(InfrastructureErrorCodes.FILE_READ_ERROR);
  expect(error.message).toBe(message);
  expect(error.details).toEqual(details);
  expect(error.getHttpStatusCode()).toBe(500);
});

it('should use factory function InfrastructureErrors.fileDeleteError correctly', () => {
  const message = 'Cannot delete file';
  const details = { path: '/protected/file.cfg' };
  const error = InfrastructureErrors.fileDeleteError(message, details);
  expect(error.code).toBe(InfrastructureErrorCodes.FILE_DELETE_ERROR);
  expect(error.message).toBe(message);
  expect(error.details).toEqual(details);
  expect(error.getHttpStatusCode()).toBe(500);
});

it('should use factory function InfrastructureErrors.fileSystemError correctly', () => {
  const message = 'Disk full';
  const details = { operation: 'write' };
  const error = InfrastructureErrors.fileSystemError(message, details);
  expect(error.code).toBe(InfrastructureErrorCodes.FILE_SYSTEM_ERROR);
  expect(error.message).toBe(message);
  expect(error.details).toEqual(details);
  expect(error.getHttpStatusCode()).toBe(500);
});

it('should use factory function InfrastructureErrors.fileAlreadyExists correctly', () => {
  const message = 'File already exists';
  const details = { path: '/existing/file.txt' };
  const error = InfrastructureErrors.fileAlreadyExists(message, details);
  expect(error.code).toBe(InfrastructureErrorCodes.FILE_ALREADY_EXISTS);
  expect(error.message).toBe(message);
  expect(error.details).toEqual(details);
  expect(error.getHttpStatusCode()).toBe(409);
});

it('should use factory function InfrastructureErrors.directoryNotFound correctly', () => {
  const message = 'Directory not found';
  const details = { path: '/missing/dir' };
  const error = InfrastructureErrors.directoryNotFound(message, details);
  expect(error.code).toBe(InfrastructureErrorCodes.DIRECTORY_NOT_FOUND);
  expect(error.message).toBe(message);
  expect(error.details).toEqual(details);
  expect(error.getHttpStatusCode()).toBe(404);
});

it('should use factory function InfrastructureErrors.directoryCreateError correctly', () => {
  const message = 'Cannot create directory';
  const details = { path: '/no/permission/dir' };
  const error = InfrastructureErrors.directoryCreateError(message, details);
  expect(error.code).toBe(InfrastructureErrorCodes.DIRECTORY_CREATE_ERROR);
  expect(error.message).toBe(message);
  expect(error.details).toEqual(details);
  expect(error.getHttpStatusCode()).toBe(500);
});

it('should use factory function InfrastructureErrors.indexUpdateError correctly', () => {
  const message = 'Failed to update search index';
  const details = { indexName: 'document_index' };
  const error = InfrastructureErrors.indexUpdateError(message, details);
  expect(error.code).toBe(InfrastructureErrorCodes.INDEX_UPDATE_ERROR);
  expect(error.message).toBe(message);
  expect(error.details).toEqual(details);
  expect(error.getHttpStatusCode()).toBe(500);
});

it('should use factory function InfrastructureErrors.initializationError correctly', () => {
  const message = 'Initialization failed';
  const details = { component: 'DatabaseConnection' };
  const error = InfrastructureErrors.initializationError(message, details);
  expect(error.code).toBe(InfrastructureErrorCodes.INITIALIZATION_ERROR);
  expect(error.message).toBe(message);
  expect(error.details).toEqual(details);
  expect(error.getHttpStatusCode()).toBe(500);
});

it('should use factory function InfrastructureErrors.mcpServerError correctly', () => {
  const message = 'MCP server internal error';
  const details = { requestId: '123-abc' };
  const error = InfrastructureErrors.mcpServerError(message, details);
  expect(error.code).toBe(InfrastructureErrorCodes.MCP_SERVER_ERROR);
  expect(error.message).toBe(message);
  expect(error.details).toEqual(details);
  expect(error.getHttpStatusCode()).toBe(500);
});

it('should use factory function InfrastructureErrors.invalidFileContent correctly', () => {
  const message = 'Invalid JSON content';
  const details = { path: '/data.json', reason: 'Unexpected token' };
  const error = InfrastructureErrors.invalidFileContent(message, details);
  expect(error.code).toBe(InfrastructureErrorCodes.INVALID_FILE_CONTENT);
  expect(error.message).toBe(message);
  expect(error.details).toEqual(details);
  expect(error.getHttpStatusCode()).toBe(500);
});

it('should use factory function InfrastructureErrors.gitCommandFailed correctly', () => {
  const command = 'git push origin main';
  const reason = 'Authentication failed';
  const cause = new Error('Underlying auth error');
  const error = InfrastructureErrors.gitCommandFailed(command, reason, cause);

  expect(error).toBeInstanceOf(InfrastructureError);
  expect(error.code).toBe(InfrastructureErrorCodes.GIT_COMMAND_FAILED);
  expect(error.message).toBe(`Git command failed: '${command}'. Reason: ${reason}`);
  expect(error.details).toEqual({ command, reason, cause });
  expect(error.cause).toBeUndefined();
  expect(error.getHttpStatusCode()).toBe(500);
});

// --- Test withMessage ---
it('should create a new error with updated message using withMessage', () => {
  const code = InfrastructureErrorCodes.INDEX_UPDATE_ERROR;
  const originalMessage = 'Failed to update index.';
  const originalDetails = { index: 'tags' };
  const originalError = new InfrastructureError(code, originalMessage, originalDetails);

  const newMessage = 'Index update failed due to lock.';
  const newError = originalError.withMessage(newMessage);

  // Check new error properties
  expect(newError).toBeInstanceOf(InfrastructureError);
  expect(newError.code).toBe(code);
  expect(newError.message).toBe(newMessage);
  expect(newError.details).toEqual(originalDetails);

  // Ensure original error is unchanged
  expect(originalError.message).toBe(originalMessage);
  expect(originalError.details).toEqual(originalDetails);
});

// withDetails does not exist, so tests for it are removed.
});
