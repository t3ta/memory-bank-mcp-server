import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import tsconfigPaths from 'vite-tsconfig-paths';

// Issue #160対応：完全なモックを使用することで、モジュール解決の問題を回避
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'node',
    include: ['**/*.mcp-test.ts'],
    exclude: ['node_modules', 'dist'],
    globals: true,
    testTimeout: 60000, // Restore original test timeout
    hookTimeout: 60000, // Restore original hook timeout
    sequence: {
      concurrent: false
    },
    // setupFilesが問題になるので一旦コメントアウト
    // setupFiles: ['../setupTests.ts'],
    resolveSnapshotPath: (testPath, snapExt) => testPath + snapExt,
  },
});
