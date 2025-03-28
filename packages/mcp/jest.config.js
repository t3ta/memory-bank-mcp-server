/** @type {import('jest').Config} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.json'
    }]
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // ESM import support
    '^@memory-bank/schemas(.*)$': '<rootDir>/../schemas/src$1'
  },
  extensionsToTreatAsEsm: ['.ts'],
  verbose: true,
  testTimeout: 10000,
  maxWorkers: 1
};