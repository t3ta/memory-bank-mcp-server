/**
 * Jest configuration for the Memory Bank MCP Server
 */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/src/', '<rootDir>/tests/'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  testPathIgnorePatterns: [
    // Still need fixes for these tests
    // 'unit/infrastructure/repositories/file-system/FileSystemTagIndexRepositoryImpl.test.ts', // 一時的にコメントアウト
    // 'unit/infrastructure/storage/FileSystemService.test.ts', // 一時的にコメントを外す
    // 'unit/infrastructure/templates/FileTemplateRepository.test.ts', // 修正済み
    // 'unit/interface/controllers/BranchController.test.ts', // 修正済み
    // 'unit/migration/MarkdownMigrationService.test.ts', // 修正済み
    'unit/application/usecases/JsonPatchUseCase.test.ts', // fast-json-patchのESMモジュール問題により一時的にスキップ
    '.*ts-mockito-backup.*', // バックアップディレクトリを除外
  ],
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
    '(.+)\\.js': '$1',
    '^../../../../src/(.*)$': '<rootDir>/src/$1',
    '^fast-json-patch$': '<rootDir>/node_modules/fast-json-patch/index.ts'
  },
  modulePaths: ['<rootDir>', '<rootDir>/src'],
  moduleDirectories: ['node_modules', 'src'],
  maxWorkers: 1,
  verbose: true,
  testTimeout: 60000,
  moduleFileExtensions: ['ts', 'js', 'json'],
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/**/*.d.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'clover'],
  setupFilesAfterEnv: ['<rootDir>/tests/utils/setupTests.ts'],
  transformIgnorePatterns: [
    '/node_modules/(?!@modelcontextprotocol/sdk)(?!uuid)(?!fast-json-patch)/'
  ]
};
