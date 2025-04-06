import type { Config } from 'jest';

const config: Config = {
  // --- Base config from jest.config.ts ---
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  // rootDir: '.', // Base config rootDir, overridden below
  // testMatch: ['<rootDir>/tests/unit/**/*.test.ts'], // Overridden below for E2E
  transform: {
    '^.+\\.tsx?$': [ // .ts(x) ファイルのみを変換対象に戻す
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json', // Assuming E2E uses the same tsconfig
      },
    ],
  },
  // moduleNameMapper: { ... }, // Base config moduleNameMapper, overridden below
  // }, // Remove trailing comma after commented out block
  modulePaths: ['<rootDir>', '<rootDir>/src'], // Paths relative to packages/mcp
  moduleDirectories: ['node_modules', 'src'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  // testTimeout: 60000, // Overridden below for E2E
  // maxWorkers: 1, // Overridden below for E2E
  transformIgnorePatterns: [
    '/node_modules/(?!@modelcontextprotocol/sdk)(?!uuid)(?!fast-json-patch)/',
  ],
  // setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'], // Overridden below for E2E
  // --- E2E specific overrides ---
  displayName: 'MCP E2E Tests',
  // Adjust rootDir for E2E tests, assuming this config file is in packages/mcp/tests/e2e
  rootDir: '.', // E2E specific rootDir
  testMatch: ['<rootDir>/**/*.e2e.test.ts'], // Match E2E tests in the current directory
  setupFilesAfterEnv: ['<rootDir>/../setupTests.ts'], // Path relative to packages/mcp/tests/e2e
  testTimeout: 60000, // Longer timeout for E2E
  maxWorkers: 1, // Avoid parallel execution for E2E
  // Override moduleNameMapper paths to be relative to packages/mcp/tests/e2e
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // Keep ESM import support
    '^@memory-bank/schemas(.*)$': '<rootDir>/../../../schemas/src$1', // Adjusted path
    '^@/(.*)$': '<rootDir>/../../src/$1', // Adjusted path
    // fast-json-patch mapping might be inherited correctly, or adjust if needed:
    // '^fast-json-patch$': '<rootDir>/../../node_modules/fast-json-patch/index.ts',
  },
};

export default config;
