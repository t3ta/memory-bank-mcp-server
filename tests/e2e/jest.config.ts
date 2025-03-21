/**
 * Jest configuration for E2E tests
 */
import type { Config } from 'jest';
import { defaults } from 'jest-config';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  rootDir: '../..',
  testMatch: ['**/tests/e2e/**/*.test.ts'],
  testPathIgnorePatterns: ['/node_modules/'],
  maxWorkers: 1, // Run tests sequentially to avoid conflicts
  verbose: true,
  testTimeout: 30000, // Longer timeout for E2E tests
  setupFilesAfterEnv: ['<rootDir>/tests/e2e/setup-e2e.ts'],
  collectCoverage: false, // Disable coverage for E2E tests
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@modelcontextprotocol/sdk(.*)$': '<rootDir>/node_modules/@modelcontextprotocol/sdk/dist/esm$1',
    '^src/(.*)$': '<rootDir>/src/$1',
    '(.+)\\.js': '$1'
  },
  modulePaths: ['<rootDir>', '<rootDir>/src'],
  moduleDirectories: ['node_modules', 'src'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.test.json'
    }]
  },
  extensionsToTreatAsEsm: ['.ts'],
  transformIgnorePatterns: [
    '/node_modules/(?!@modelcontextprotocol/sdk)(?!uuid)/'
  ]
};

export default config;
