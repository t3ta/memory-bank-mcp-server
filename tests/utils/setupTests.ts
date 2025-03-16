/**
 * Jest setup file
 * This file is executed before each test file
 */
// Extend Jest matchers if needed
// import 'jest-extended';

// Ensure NODE_ENV is set to 'test'
process.env.NODE_ENV = 'test';

// Import logger and configure it for tests
import { logger } from '../../src/shared/utils/logger.js';

// Configure logger to be silent during tests
logger.configure({ silent: true });

// Optionally silence console logs during tests
global.console = {
  ...console,
  // Uncomment to silence specific console methods during tests
  // log: jest.fn(),
  // info: jest.fn(),
  // debug: jest.fn(),
  // warn: jest.fn(),
  error: console.error, // Keep error output for test failures
};

// Set timezone for consistent Date handling in tests
process.env.TZ = 'UTC';

// Add any global test setup here
