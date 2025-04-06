import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm', // ESMプリセットを再度試す
  testEnvironment: 'node',
  transform: {
    // preset を使う場合、transform は不要になることが多いが、念のため残す
    // tsconfig の指定は重要そうなので残しておく
    '^.+\\.m?ts$': [
      'ts-jest',
      {
        useESM: true, // preset に含まれるはずだが明示
        tsconfig: '<rootDir>/../../../../tsconfig.test.json', // プロジェクトルートを参照
      },
    ],
  },
  // extensionsToTreatAsEsm: ['.ts', '.mts'], // preset に含まれるはずなので削除してみる
  moduleNameMapper: {
    // Integration からエイリアスを追加 (パス調整済み)
    '^@/(.*)\\.js$': '<rootDir>/../../src/$1.ts',
    '^@memory-bank/schemas(.*)$': '<rootDir>/../../../schemas/src$1',
    // SDKの個別ファイルパスを直接マッピング
    '^@modelcontextprotocol/sdk/inMemory$': '<rootDir>/../../../../node_modules/@modelcontextprotocol/sdk/dist/inMemory.js',
    '^@modelcontextprotocol/sdk/server$': '<rootDir>/../../../../node_modules/@modelcontextprotocol/sdk/dist/server/index.js',
    // '^@modelcontextprotocol/sdk$': '<rootDir>/../../../../node_modules/@modelcontextprotocol/sdk/dist/index.js', // これは不要かも
    '^(\\.{1,2}/.+)\\.js$': '$1',
  },
  testMatch: ['**/tests/e2e/**/*.e2e.test.ts'],
  setupFilesAfterEnv: ['<rootDir>/../../tests/setupTests.ts'], // プロジェクトルートの tests/setupTests.ts を参照
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    // E2Eテストではカバレッジ計測対象外のファイルを追加するかも
  ],
  // transformIgnorePatterns は preset に含まれることが多いので一旦削除
  // transformIgnorePatterns: [
  //   '/node_modules/(?!@modelcontextprotocol/sdk)(?!uuid)(?!react-is)(?!fs-extra)/',
  //   '\\.pnp\\.[^\\/]+$'
  // ],
  globals: {
    // ts-jest の設定は transform 内に移動したので不要
  },
  // E2Eテストは時間がかかる可能性があるのでタイムアウトを長めに設定
  testTimeout: 30000,
  // インメモリテストでもリソース競合を避けるため直列実行 (maxWorkers: 1 で代用)
  maxWorkers: 1,
  // 開いているハンドルを検出して警告（デバッグに役立つ）
  detectOpenHandles: true,
  // テスト終了時に強制終了（ハンドルが閉じない問題への対策）
  forceExit: true,
};

export default config;
