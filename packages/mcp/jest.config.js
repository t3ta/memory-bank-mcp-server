/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.json',
      isolatedModules: true // Skip type checking for tests
    }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // ESM import support
    '^@memory-bank/schemas(.*)$': '<rootDir>/../schemas/src$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^fast-json-patch$': '<rootDir>/node_modules/fast-json-patch/index.ts'
  },
  modulePaths: ['<rootDir>', '<rootDir>/src'],
  moduleDirectories: ['node_modules', 'src'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  verbose: true,
  testTimeout: 60000,
  maxWorkers: 1,
  transformIgnorePatterns: [
    '/node_modules/(?!@modelcontextprotocol/sdk)(?!uuid)(?!fast-json-patch)/'
  ],
  // Skip type checking to focus on functionality
  globals: {
    'ts-jest': {
      isolatedModules: true
    }
  },
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts']
};