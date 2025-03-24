/**
 * Mock implementation for FileSystemRetryUtils
 */

import { jest } from '@jest/globals';

// Just calls the function without any retry or error handling
export const withFileSystemRetry = jest.fn().mockImplementation((operation, fn) => fn());

// Mock implementation that always returns false 
export const isRetryableError = jest.fn().mockImplementation(() => false);

// Default export for the module
export default {
  withFileSystemRetry,
  isRetryableError
};
