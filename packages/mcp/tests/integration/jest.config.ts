/** @type {import('jest').Config} */
import type { Config } from 'jest'; // Import Config type

const config: Config = { // Use Config type
  // preset: 'ts-jest/presets/default-esm', // <<<--- プリセットをやめて詳細設定に戻す
  testEnvironment: 'node',
  // rootDir は Jest が自動検出 (tests/integration)
  // testMatch は rootDir (tests/integration) からの相対パス
  testMatch: ['**/*.integration.test.ts'],
  transform: { // <<<--- transform のコメントアウトを解除
    // preset がうまく動かない場合は、以下のように詳細設定を試す
    '^.+\\.m?ts$': ['ts-jest', { // .mts も含める
        useESM: true, // <<<--- useESM: true を確実に指定
        tsconfig: '<rootDir>/tsconfig.test.json',
     }],
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
  // extensionsToTreatAsEsm は preset に含まれることが多いので不要かも <<<--- コメントアウト解除！
  extensionsToTreatAsEsm: ['.ts', '.mts'],
  maxWorkers: 1,
  transformIgnorePatterns: [
    // Add fs-extra to ignore patterns to prevent transformation issues with ESM
    '/node_modules/(?!@modelcontextprotocol/sdk)(?!uuid)(?!react-is)(?!fs-extra)/'
  ],
  // setupFilesAfterEnv は rootDir (tests/integration) からの相対パス
  setupFilesAfterEnv: ['<rootDir>/setup.mts'], // Change extension to .mts
  testTimeout: 30000,
  silent: false, // Temporarily disable silent mode to see logs
};

export default config; // Export the config object
