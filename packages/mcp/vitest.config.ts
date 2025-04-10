import { defineConfig } from 'vitest/config';
// import { resolve } from 'path'; // 現在は使用していないのでコメントアウト
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()], // tsconfigPaths プラグインを有効化 (元々有効だったけど確認)
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    // root: '.', // MCPパッケージのルートを指定 - Vitestのデフォルトに任せる
    globals: true, // グローバルAPIを有効化
    testTimeout: 60000, // タイムアウトを60秒に設定
    threads: {
      maxWorkers: 1 // ワーカースレッド数を1に制限（デバッグしやすくするため）
    },
    setupFiles: ['tests/setupTests.ts'], // セットアップファイル指定
    // スナップショットのパス解決方法を指定（Jestと同じ挙動にする）
    resolveSnapshotPath: (testPath, snapExt) => testPath + snapExt,
  },
  // resolve: { // tsconfigPaths に任せるためコメントアウト
  //   alias: {
  //     // パッケージ間のエイリアス設定
  //     '@memory-bank/schemas': resolve('../schemas/src'),
  //     // MCPパッケージ内のエイリアス設定
  //     '@': resolve('src')
  //   }
  // }
});
