/**
 * Mock for logger
 */
import { jest } from '@jest/globals';

export const logger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  setLevel: jest.fn(),
};

export const createConsoleLogger = jest.fn().mockReturnValue(logger);

export default {
  logger,
  createConsoleLogger,
};
