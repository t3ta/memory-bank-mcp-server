import { setupMcpTestEnv, callToolWithLegacySupport } from './helpers/mcp-test-helper.js';
import type { Application } from '../../src/main/Application.js';
import type { MCPTestClient } from '@t3ta/mcp-test';
import * as fs from 'fs';
import * as path from 'path';

describe('MCP E2E Tools List Tests', () => {
  let app: Application;
  let client: MCPTestClient;
  let cleanup: () => Promise<void>;
  let testEnv: any;

  beforeEach(async () => {
    const setup = await setupMcpTestEnv();
    app = setup.app;
    client = setup.client;
    cleanup = setup.cleanup;
    testEnv = setup.testEnv;
  });

  afterEach(async () => {
    await cleanup();
  });

  describe('tools export verification', () => {
    it('should export all required tools in the interface/tools/index.ts file', async () => {
      // 直接ソースコードファイルの内容を読み込んで検証
      const toolsIndexPath = path.join(process.cwd(), 'src/interface/tools/index.ts');
      const content = fs.readFileSync(toolsIndexPath, 'utf8');

      // 必要なツールがexportされているか確認
      expect(content).toContain('export const read_context');
      expect(content).toContain('export const search_documents_by_tags');
      expect(content).toContain('export * from');

      // document-toolsの中身も確認（必要なら）
      const documentToolsPath = path.join(process.cwd(), 'src/interface/tools/document-tools.ts');
      const documentToolsContent = fs.readFileSync(documentToolsPath, 'utf8');

      expect(documentToolsContent).toContain('export const read_document');
      expect(documentToolsContent).toContain('export const write_document');

      // ビルドファイルも確認（念のため）
      const distToolsIndexPath = path.join(process.cwd(), 'dist/interface/tools/index.js');
      if (fs.existsSync(distToolsIndexPath)) {
        const distContent = fs.readFileSync(distToolsIndexPath, 'utf8');
        expect(distContent).toContain('read_context');
        expect(distContent).toContain('search_documents_by_tags');
      }
    });
  });

  describe('tools/list API response format', () => {
    it('should return properly formatted tools in MCP format', async () => {
      // tools/list を呼び出す
      const response = await callToolWithLegacySupport(client, 'tools/list', {
        docs: testEnv.docRoot
      });

      // レスポンスの基本構造を検証
      expect(response.data).toHaveProperty('tools');
      expect(Array.isArray(response.data.tools)).toBe(true);

      // 各ツールにMCP SDKが期待する形式の属性があるか検証
      for (const tool of response.data.tools) {
        // 必須プロパティのチェック
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool).toHaveProperty('parameters');

        // inputSchemaの構造をチェック
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');

        // もしrequiredがある場合は配列であることを確認
        if (tool.inputSchema.required) {
          expect(Array.isArray(tool.inputSchema.required)).toBe(true);
        }

        // parametersの構造をチェック
        expect(tool.parameters).toHaveProperty('type', 'object');
        expect(tool.parameters).toHaveProperty('properties');

        // もしrequiredがある場合は配列であることを確認
        if (tool.parameters.required) {
          expect(Array.isArray(tool.parameters.required)).toBe(true);
        }
      }
    });
  });
});

