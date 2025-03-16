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
