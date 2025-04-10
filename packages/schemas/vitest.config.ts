import { defineConfig } from 'vitest/config';
// import { resolve } from 'path'; // 現在は使用していないのでコメントアウト
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()], // プラグインを再度有効化
  test: {
    environment: 'node',
    include: ['**/tests/**/*.test.ts'], // tests ディレクトリ配下の .test.ts ファイルを対象に
    exclude: ['node_modules', 'dist'],
    // root: '.', // packages/schemas をルートに (コメントアウトしてみる)
    globals: true // グローバル API を有効化
  },
  // resolve: { // tsconfigPaths プラグインに任せるためコメントアウト
  //   alias: {
  //     '@': resolve(__dirname, 'src')
  //   }
  // }
});
