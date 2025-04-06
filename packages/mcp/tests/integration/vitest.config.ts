import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['**/*.integration.test.ts'], // 統合テストファイルのみ対象
    // root: '.', // ルート設定を削除してみる
    globals: true, // グローバルAPIを有効化
    testTimeout: 30000, // タイムアウトを30秒に設定
    // threads: { // Vitest v1以降では非推奨 or 変更された可能性あり
    //   maxWorkers: 1 // 統合テストは並列実行しない方が安全
    // },
    setupFiles: ['tests/integration/setup.ts'], // プロジェクトルートからのパスを指定
    silent: false, // ログ出力を有効にする（デバッグ用）
    server: { // testオブジェクト内にserverを追加
      deps: {
        inline: ['@memory-bank/schemas'] // server.deps.inline を使用
      }
    }
  },
  // resolve: { // vite-tsconfig-paths プラグインに任せるためコメントアウト
  //   alias: {
  //     // パッケージ間のエイリアス設定 (ルートからの相対パス)
  //     '@memory-bank/schemas': resolve('../../../schemas/src'),
  //     // MCPパッケージ内のエイリアス設定 (ルートからの相対パス)
  //     '@': resolve('../../src')
  //   }
  // }
});
