import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['**/*.e2e.test.ts'],
    exclude: ['node_modules', 'dist'],
    globals: true,
    testTimeout: 10000, // 短くして問題を再現しやすく
    hookTimeout: 10000, // 同様に短く調整
    bail: false, // 失敗してもすべてのテストを実行
    sequence: {
      concurrent: false
    },
    // setupFiles: ['../../tests/setupTests.ts'], // Temporarily commented out
    resolveSnapshotPath: (testPath, snapExt) => testPath + snapExt,
    deps: {
      inline: [
        // Match the root package and any submodules starting with the name
        /^@modelcontextprotocol\/sdk/
      ]
    }
  },
  resolve: {
    alias: {
      // Comment out SDK aliases as deps.inline might handle it
      // '@modelcontextprotocol/sdk/inMemory.js': resolve(__dirname, '../../../../node_modules/@modelcontextprotocol/sdk/dist/inMemory.js'),
      // '@modelcontextprotocol/sdk/server/index.js': resolve(__dirname, '../../../../node_modules/@modelcontextprotocol/sdk/dist/server/index.js'),
      // '@modelcontextprotocol/sdk': resolve(__dirname, '../../../../node_modules/@modelcontextprotocol/sdk/dist/index.js'),
    },
  },
});
