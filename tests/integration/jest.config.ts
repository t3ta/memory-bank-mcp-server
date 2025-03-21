/**
 * 統合テスト用Jestの設定ファイル
 */
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // タイムアウト値を設定（単位:ミリ秒）
  testTimeout: 10000,
  // テストのセットアップとティアダウン
  globalSetup: './setup.ts',
  globalTeardown: './setup.ts',
  // テスト対象のディレクトリ
  roots: ['<rootDir>'],
  testMatch: ['**/*.test.ts'],
  // TypeScriptの設定
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: '<rootDir>/../../tsconfig.test.json',
      useESM: true,
    }]
  },
  // モジュール解決の設定
  moduleNameMapper: {
    '^src/(.*)$': '<rootDir>/../../src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  // キャッシュディレクトリの設定
  cacheDirectory: '<rootDir>/../../.jest-cache',
  // カバレッジの設定
  collectCoverage: false, // 必要に応じてtrueに変更
  coverageDirectory: '<rootDir>/../../coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/tests/e2e/'
  ],
  // ESMサポートの設定
  extensionsToTreatAsEsm: ['.ts'],
  // 詳細なログ出力
  verbose: true
};
