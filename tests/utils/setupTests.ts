/**
 * Jest setup file
 * This file is executed before each test file
 */
// Extend Jest matchers if needed
// import 'jest-extended';

// Silence console logs during tests
global.console = {
  ...console,
  // Uncomment to silence specific console methods during tests
  // log: jest.fn(),
  // info: jest.fn(),
  // debug: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
};

// Set timezone for consistent Date handling in tests
process.env.TZ = 'UTC';

// Add any global test setup here

// Import ts-mockito for mocking
import { reset } from 'ts-mockito';

// Reset all mocks before each test
beforeEach(() => {
  // Jest's built-in reset
  jest.clearAllMocks();

  // You can add specific ts-mockito reset logic here if needed
  // Note: ts-mockito's reset() function is for resetting specific mocks,
  // not for global reset like Jest's clearAllMocks()
});
