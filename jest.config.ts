/**
 * Jest configuration for the Memory Bank MCP Server
 */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src/', '<rootDir>/tests/'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.test.json'
    }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@modelcontextprotocol/sdk(.*)$': '<rootDir>/node_modules/@modelcontextprotocol/sdk/dist/esm$1',
    '^src/(.*)$': '<rootDir>/src/$1',
    '(.+)\\.js': '$1'
  },
  modulePaths: ['<rootDir>', '<rootDir>/src'],
  moduleDirectories: ['node_modules', 'src'],
  maxWorkers: 1,
  verbose: true,
  testTimeout: 60000,
  moduleFileExtensions: ['ts', 'js', 'json'],
  extensionsToTreatAsEsm: ['.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  setupFilesAfterEnv: ['<rootDir>/tests/utils/setupTests.ts'],
  transformIgnorePatterns: [
    '/node_modules/(?!@modelcontextprotocol/sdk)(?!uuid)/'
  ]
};
