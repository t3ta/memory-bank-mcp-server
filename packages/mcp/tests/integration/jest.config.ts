/** @type {import('jest').Config} */
export default {
  testEnvironment: 'node',
  // rootDir は Jest が自動検出 (tests/integration)
  // testMatch は rootDir (tests/integration) からの相対パス
  testMatch: ['**/*.integration.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      // tsconfig を <rootDir> (tests/integration) からの相対パスで明示的に指定
      tsconfig: '<rootDir>/tsconfig.test.json'
    }]
  },
  moduleNameMapper: {
    // tsconfig.test.json の baseUrl ('../../') を基準にパスを解決
    // 1. @/ エイリアス (.js -> .ts ソースへマッピング)
    '^@/(.*)\\.js$': '<rootDir>/../../src/$1.ts', // rootDir は tests/integration なので ../../src で packages/mcp/src を指す

    // 2. baseUrl 相対パス (.js -> .ts ソースへマッピング) - 不要になる可能性あり、一旦コメントアウト
    // '^([a-zA-Z0-9_-]+[/].*)\\.js$': '<rootDir>/../../src/$1.ts',

    // 3. 相対パス (.js 拡張子を削除) - NodeNext のために維持
    '^(\\.{1,2}/.*)\\.js$': '$1',

    // 4. @memory-bank/schemas (tsconfig.test.json の paths を反映)
    '^@memory-bank/schemas(.*)$': '<rootDir>/../../../schemas/src$1', // rootDir から ../../../schemas/src を指す

    // 5. fast-json-patch のマッピングを削除 (Node.js の解決に任せる)
    // '^fast-json-patch$': '<rootDir>/../../../../node_modules/fast-json-patch/dist/fast-json-patch.js' // Removed this mapping
  },
  extensionsToTreatAsEsm: ['.ts', '.mts'], // Add .mts
  maxWorkers: 1,
  transformIgnorePatterns: [
    // Add fs-extra to ignore patterns to prevent transformation issues with ESM
    '/node_modules/(?!@modelcontextprotocol/sdk)(?!uuid)(?!react-is)(?!fs-extra)/'
  ],
  // setupFilesAfterEnv は rootDir (tests/integration) からの相対パス
  setupFilesAfterEnv: ['<rootDir>/setup.mts'], // Change extension to .mts
  testTimeout: 30000, // みらいが追加☆ タイムアウトを30秒に延長！
  silent: false, // Temporarily disable silent mode to see logs
};
