import type { Config } from 'jest'; // 型定義をインポート

const config: Config = { // 型注釈を追加
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/tests/unit/**/*.test.ts'], // Only run unit tests with this config
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: 'tsconfig.json',
        // isolatedModules: true, // Removed as per ts-jest recommendation (set in tsconfig.json)
      },
    ],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1', // ESM import support
    '^@memory-bank/schemas(.*)$': '<rootDir>/../schemas/src$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^fast-json-patch$': '<rootDir>/node_modules/fast-json-patch/index.ts',
  },
  modulePaths: ['<rootDir>', '<rootDir>/src'],
  moduleDirectories: ['node_modules', 'src'],
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  testTimeout: 60000,
  maxWorkers: 1,
  transformIgnorePatterns: [
    '/node_modules/(?!@modelcontextprotocol/sdk)(?!uuid)(?!fast-json-patch)/',
  ],
  // globals: { // Removed as per ts-jest recommendation
  //   'ts-jest': {
  //     isolatedModules: true,
  //   },
  // },
  // Setup files to run before tests
  setupFilesAfterEnv: ['<rootDir>/tests/setupTests.ts'],
};

export default config; // export default を最後に移動
