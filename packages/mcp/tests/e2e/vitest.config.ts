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
    testTimeout: 60000,
    sequence: {
      concurrent: false
    },
    setupFiles: ['./tests/setupTests.ts'],
    resolveSnapshotPath: (testPath, snapExt) => testPath + snapExt,
    deps: {
      inline: [
        /@modelcontextprotocol\/sdk/
      ]
    }
  },
  resolve: {
    alias: {
      '@modelcontextprotocol/sdk/inMemory.js': resolve(__dirname, '../../../../node_modules/@modelcontextprotocol/sdk/dist/inMemory/index.js'),
      '@modelcontextprotocol/sdk/server/index.js': resolve(__dirname, '../../../../node_modules/@modelcontextprotocol/sdk/dist/server/index.js'),
    },
  },
});
