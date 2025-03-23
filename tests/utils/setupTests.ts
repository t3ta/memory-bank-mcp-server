// FileSystemRetryUtils モックも追加
jest.mock('../../src/infrastructure/repositories/file-system/FileSystemRetryUtils.js', () => ({
  withFileSystemRetry: (operationName, fn) => fn(),
  isRetryableError: () => false,
}), { virtual: true });

/**
 * Jest setup file for ESM environment
 * This file is executed before each test file
 */

// ESM-specific setup
import { jest } from '@jest/globals';
import { reset } from 'ts-mockito';

// Logger モックをグローバルに定義
jest.mock('../../src/shared/utils/logger.js', () => ({
  logger: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLevel: jest.fn(),
  },
  createConsoleLogger: jest.fn().mockReturnValue({
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    setLevel: jest.fn(),
  }),
}), { virtual: true });

// Silence console logs during tests
// global.console = {
//   ..console,
//   // コンソール出力を無効化
//   log: jest.fn(),
//   info: jest.fn(),
//   debug: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Set timezone for consistent Date handling in tests
process.env.TZ = 'UTC';

// Add any global test setup here

// In ESM mode, we need to use beforeEach from Jest globals explicitly
beforeEach(() => {
  // Clear mocks and reset ts-mockito
  jest.clearAllMocks();
  reset(); // ts-mockitoのモックをキレイにリセットするんだから！

  // Add any other setup logic here
});

// Add afterEach cleanup if needed
afterEach(() => {
  // Clean up resources, close connections, etc.
});

// Add afterAll global cleanup
afterAll(async () => {
  // Force cleanup of any remaining resources
  jest.useRealTimers(); // Make sure we're using real timers

  // Delay a bit to allow any pending async operations to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});

// Increase timeout for E2E tests
jest.setTimeout(60000);
