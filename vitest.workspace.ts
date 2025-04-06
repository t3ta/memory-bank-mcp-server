import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([ // シンプルな配列形式に戻す
  'packages/mcp',
  'packages/schemas',
]);
