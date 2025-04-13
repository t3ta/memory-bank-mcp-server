import { setupMcpTestEnv, callToolWithLegacySupport } from './helpers/mcp-test-helper.js';
import type { Application } from '../../src/main/Application.js';
import type { MCPTestClient } from '@t3ta/mcp-test';
import * as fs from 'fs';
import * as path from 'path';

// SDK型をインポート
import { ListToolsResult, Tool, ToolSchema } from '@modelcontextprotocol/sdk/types.js';

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

        // inputSchemaの構造をチェック
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('schema');
        expect(tool.inputSchema.schema).toHaveProperty('type', 'object');
        expect(tool.inputSchema.schema).toHaveProperty('properties');

        // もしrequiredがある場合は配列であることを確認
        if (tool.inputSchema.schema.required) {
          expect(Array.isArray(tool.inputSchema.schema.required)).toBe(true);
        }
      }
    });

    it('should not include non-standard parameters field', async () => {
      // tools/list を呼び出す
      const response = await callToolWithLegacySupport(client, 'tools/list', {
        docs: testEnv.docRoot
      });

      // 各ツールを検証
      for (const tool of response.data.tools) {
        // parametersフィールドがないことを確認（修正後はこのフィールドは削除されたはず）
        expect(tool).not.toHaveProperty('parameters');
      }
    });

    it('should reflect environment-specific requirements based on dynamic generation', async () => {
      // 環境変数を設定してツールリストを取得
      process.env.MEMORY_BANK_ROOT = testEnv.docRoot;
      process.env.LANGUAGE = 'en';

      const response = await callToolWithLegacySupport(client, 'tools/list', {
        docs: testEnv.docRoot
      });

      // 環境変数で指定されたパラメータが必須でなくなっているか確認
      const readContextTool = response.data.tools.find(t => t.name === 'read_context');
      expect(readContextTool).toBeDefined();

      // 動的スキーマが環境変数を反映しているか確認
      // docsとlanguageが環境変数でセットされているので、必須パラメータから除外されているはず
      if (readContextTool?.inputSchema?.schema?.required) {
        expect(readContextTool.inputSchema.schema.required).not.toContain('docs');
        expect(readContextTool.inputSchema.schema.required).not.toContain('language');
      }

      // クリーンアップ
      delete process.env.MEMORY_BANK_ROOT;
      delete process.env.LANGUAGE;
    });

    it('should return response compatible with SDK ListToolsResult type', async () => {
      // tools/list を呼び出す
      const response = await callToolWithLegacySupport(client, 'tools/list', {
        docs: testEnv.docRoot
      });

      // レスポンスがListToolsResult型と互換性があるか検証
      expect(response.success).toBe(true);

      // SDKが期待する構造になっているか詳細に検証
      const result = response.data as ListToolsResult;
      expect(Array.isArray(result.tools)).toBe(true);

      // 各ツールの構造とプロパティタイプを検証
      for (const tool of result.tools) {
        // スキーマプロパティへのアクセスを行う
        const schema = tool.inputSchema.schema;
        // 必須プロパティの存在と型
        expect(typeof tool.name).toBe('string');
        if (tool.description !== undefined) {
          expect(typeof tool.description).toBe('string');
        }

        // inputSchemaの構造
        expect(tool.inputSchema).toHaveProperty('type');
        expect(tool.inputSchema.type).toBe('object');
        expect(tool.inputSchema).toHaveProperty('schema');
        expect(schema).toHaveProperty('type');
        expect(schema.type).toBe('object');

        // プロパティの検証
        if (schema.properties) {
          expect(typeof schema.properties).toBe('object');
        }

        // 必須フィールドが配列の場合
        if (schema.required) {
          expect(Array.isArray(schema.required)).toBe(true);
          for (const req of schema.required) {
            expect(typeof req).toBe('string');
          }
        }
      }
    });

    it('should adapt tool schemas based on different runtime options', async () => {
      // ベースラインとして標準設定でツールリストを取得
      const standardResponse = await callToolWithLegacySupport(client, 'tools/list', {
        docs: testEnv.docRoot
      });

      // 環境変数を設定して異なる条件でテスト
      process.env.MEMORY_BANK_ROOT = testEnv.docRoot;
      process.env.LANGUAGE = 'ja';

      const envVarResponse = await callToolWithLegacySupport(client, 'tools/list', {
        docs: testEnv.docRoot
      });

      // read_contextツールの必須パラメータを比較
      const standardReadContext = standardResponse.data.tools.find(t => t.name === 'read_context');
      const envVarReadContext = envVarResponse.data.tools.find(t => t.name === 'read_context');

      expect(standardReadContext).toBeDefined();
      expect(envVarReadContext).toBeDefined();

      // 環境変数設定時に必須パラメータが正しく調整されているか確認
      if (standardReadContext?.inputSchema?.schema?.required && envVarReadContext?.inputSchema?.schema?.required) {
        // 標準設定では、これらのパラメータは必須であるべき
        expect(standardReadContext.inputSchema.schema.required).toContain('branch');

        // 環境変数設定時には、docs と language は必須でなくなるべき
        expect(envVarReadContext.inputSchema.schema.required).not.toContain('docs');
        expect(envVarReadContext.inputSchema.schema.required).not.toContain('language');
      }

      // 異なる引数で呼び出した場合の動作検証
      const customDocsResponse = await callToolWithLegacySupport(client, 'tools/list', {
        docs: path.join(testEnv.tempDir, 'custom-docs')
      });

      // ツールの総数が一致することを確認
      expect(customDocsResponse.data.tools.length).toBe(standardResponse.data.tools.length);

      // クリーンアップ
      delete process.env.MEMORY_BANK_ROOT;
      delete process.env.LANGUAGE;
    });
  });
});

