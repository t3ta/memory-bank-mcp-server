/**
 * Mock for logger
 */
import { jest } from '@jest/globals';

export const logger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
