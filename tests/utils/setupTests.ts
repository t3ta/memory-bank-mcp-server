/**
 * Jest setup file
 * 
 * This file runs before each test file and sets up the global test environment.
 */

import { mockFsImplementation } from './fsUtils';

// Mock the Node.js file system module
jest.mock('fs/promises');

// Apply mock implementation
const mockFs = jest.requireMock('fs/promises');
Object.assign(mockFs, mockFsImplementation());

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
});

// Global test timeout
jest.setTimeout(10000);
