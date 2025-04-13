import { setupMcpTestEnv, callToolWithLegacySupport } from './helpers/mcp-test-helper.js';
import type { Application } from '../../src/main/Application.js';
import type { MCPTestClient } from '@t3ta/mcp-test';
import * as fs from 'fs';
import * as path from 'path';

// SDK型とスキーマをインポート
import {
  ListToolsResult,
  Tool,
  ListToolsResultSchema,
  ToolSchema
} from '@modelcontextprotocol/sdk/types.js';

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
    it('should export all required tools in the interface/tools/index.ts file with Zod validation', async () => {
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

      // ビルド後、正しく動作することをZodスキーマで検証
      if (fs.existsSync(distToolsIndexPath)) {
        // tools/list を実行してみる
        const testResponse = await callToolWithLegacySupport(client, 'tools/list', {
          docs: testEnv.docRoot
        });

        // Zodスキーマを使用してレスポンスを検証
        const validationResult = ListToolsResultSchema.safeParse(testResponse.data);
        expect(validationResult.success).toBe(true,
          `ListToolsResultSchema validation failed: ${
            !validationResult.success ? JSON.stringify(validationResult.error.format()) : ''
          }`
        );

        // 各ツールがToolSchemaに準拠しているか確認
        for (const tool of testResponse.data.tools) {
          const toolValidation = ToolSchema.safeParse(tool);
          expect(toolValidation.success).toBe(true,
            `Tool schema validation failed for tool '${tool.name}': ${
              !toolValidation.success ? JSON.stringify(toolValidation.error.format()) : ''
            }`
          );
        }
      }
    });
  });

  describe('tools/list API response format', () => {
    it('should return properly formatted tools in MCP format with Zod validation', async () => {
      // tools/list を呼び出す
      const response = await callToolWithLegacySupport(client, 'tools/list', {
        docs: testEnv.docRoot
      });

      // レスポンスの基本構造を検証
      expect(response.data).toHaveProperty('tools');
      expect(Array.isArray(response.data.tools)).toBe(true);

      // SDKのZodスキーマを使用してレスポンス全体を検証
      try {
        const validationResult = ListToolsResultSchema.safeParse(response.data);
        expect(validationResult.success).toBe(true,
          `ListToolsResultSchema validation failed: ${
            !validationResult.success ? JSON.stringify(validationResult.error.format()) : ''
          }`
        );
      } catch (error) {
        console.error('ListToolsResultSchema validation error:', error);
        throw error;
      }

      // 各ツールにMCP SDKが期待する形式の属性があるか検証
      for (const tool of response.data.tools) {
        try {
          // ToolSchemaを使って各ツールを検証
          const toolValidation = ToolSchema.safeParse(tool);
          expect(toolValidation.success).toBe(true,
            `Tool schema validation failed for tool '${tool.name}': ${
              !toolValidation.success ? JSON.stringify(toolValidation.error.format()) : ''
            }`
          );
        } catch (error) {
          console.error(`Tool schema validation error for tool '${tool.name}':`, error);
          throw error;
        }

        // 追加の型チェック
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('inputSchema');

        // inputSchemaの構造をチェック
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');
        expect(tool.inputSchema).toHaveProperty('additionalProperties');
        expect(tool.inputSchema).toHaveProperty('$schema');

        // もしrequiredがある場合は配列であることを確認
        if (tool.inputSchema.required) {
          expect(Array.isArray(tool.inputSchema.required)).toBe(true);
        }
      }
    });

    it('should not include non-standard parameters field', async () => {
      // tools/list を呼び出す
      const response = await callToolWithLegacySupport(client, 'tools/list', {
        docs: testEnv.docRoot
      });

      // Zodスキーマを使用してレスポンス全体を検証
      const validationResult = ListToolsResultSchema.safeParse(response.data);
      expect(validationResult.success).toBe(true,
        `ListToolsResultSchema validation failed: ${
          !validationResult.success ? JSON.stringify(validationResult.error.format()) : ''
        }`
      );

      // 各ツールを検証
      for (const tool of response.data.tools) {
        // ToolSchemaでの検証
        const toolValidation = ToolSchema.safeParse(tool);
        expect(toolValidation.success).toBe(true,
          `Tool schema validation failed for tool '${tool.name}': ${
            !toolValidation.success ? JSON.stringify(toolValidation.error.format()) : ''
          }`
        );

        // parametersフィールドがないことを確認（修正後はこのフィールドは削除されたはず）
        expect(tool).not.toHaveProperty('parameters');
      }
    });

    it('should reflect environment-specific requirements based on dynamic generation with Zod validation', async () => {
      // 環境変数を設定してツールリストを取得
      process.env.MEMORY_BANK_ROOT = testEnv.docRoot;
      process.env.LANGUAGE = 'en';

      const response = await callToolWithLegacySupport(client, 'tools/list', {
        docs: testEnv.docRoot
      });

      // Zodスキーマを使用してレスポンス全体を検証
      const validationResult = ListToolsResultSchema.safeParse(response.data);
      expect(validationResult.success).toBe(true,
        `ListToolsResultSchema validation failed: ${
          !validationResult.success ? JSON.stringify(validationResult.error.format()) : ''
        }`
      );

      // 各ツールを検証
      for (const tool of response.data.tools) {
        // ToolSchemaでの検証
        const toolValidation = ToolSchema.safeParse(tool);
        expect(toolValidation.success).toBe(true,
          `Tool schema validation failed for tool '${tool.name}': ${
            !toolValidation.success ? JSON.stringify(toolValidation.error.format()) : ''
          }`
        );
      }

      // 環境変数で指定されたパラメータが必須でなくなっているか確認
      const readContextTool = response.data.tools.find(t => t.name === 'read_context');
      expect(readContextTool).toBeDefined();

      // 動的スキーマが環境変数を反映しているか確認
      // docsとlanguageが環境変数でセットされているので、必須パラメータから除外されているはず
      if (readContextTool?.inputSchema?.required) {
        expect(readContextTool.inputSchema.required).not.toContain('docs');
        expect(readContextTool.inputSchema.required).not.toContain('language');
      }

      // クリーンアップ
      delete process.env.MEMORY_BANK_ROOT;
      delete process.env.LANGUAGE;
    });

    it('should return response compatible with SDK ListToolsResult type using Zod schema', async () => {
      // tools/list を呼び出す
      const response = await callToolWithLegacySupport(client, 'tools/list', {
        docs: testEnv.docRoot
      });

      // レスポンスがListToolsResult型と互換性があるか検証
      expect(response.success).toBe(true);

      // Zodスキーマを使ってレスポンスを検証
      const result = response.data;

      // SDKのListToolsResultSchemaでバリデーション
      const validationResult = ListToolsResultSchema.safeParse(result);
      expect(validationResult.success).toBe(true);

      if (!validationResult.success) {
        // エラーが発生した場合はエラーの詳細を表示
        console.error('Validation error:', validationResult.error.format());
      }

      // 追加の型安全性検証
      const toolsResult = result as ListToolsResult;
      expect(Array.isArray(toolsResult.tools)).toBe(true);

      // 各ツールがToolSchemaに準拠しているか確認
      for (const tool of toolsResult.tools) {
        const toolValidation = ToolSchema.safeParse(tool);
        expect(toolValidation.success).toBe(true);

        if (!toolValidation.success) {
          console.error(`Tool validation error for tool '${tool.name}':`, toolValidation.error.format());
        }

        // スキーマプロパティを検証
        // const schema = tool.inputSchema.schema;

        // 必須プロパティの存在と型
        expect(typeof tool.name).toBe('string');
        expect(tool.inputSchema).toHaveProperty('type', 'object');
        expect(tool.inputSchema).toHaveProperty('properties');

        // スキーマの内部構造
        // expect(schema).toHaveProperty('type', 'object');

        // プロパティと必須項目の型チェック
        if (tool.inputSchema.properties) {
          expect(typeof tool.inputSchema.properties).toBe('object');
        }

        if (tool.inputSchema.required) {
          expect(Array.isArray(tool.inputSchema.required)).toBe(true);
          tool.inputSchema.required.forEach(req => {
            expect(typeof req).toBe('string');
          });
        }
      }
    });

    it('should adapt tool schemas based on different runtime options with Zod validation', async () => {
      // ベースラインとして標準設定でツールリストを取得
      const standardResponse = await callToolWithLegacySupport(client, 'tools/list', {
        docs: testEnv.docRoot
      });

      // 標準レスポンスのZodスキーマ検証
      const stdValidationResult = ListToolsResultSchema.safeParse(standardResponse.data);
      expect(stdValidationResult.success).toBe(true,
        `Standard response validation failed: ${
          !stdValidationResult.success ? JSON.stringify(stdValidationResult.error.format()) : ''
        }`
      );

      // 標準レスポンスの各ツールを検証
      for (const tool of standardResponse.data.tools) {
        const toolValidation = ToolSchema.safeParse(tool);
        expect(toolValidation.success).toBe(true,
          `Tool schema validation failed for tool '${tool.name}' in standard response: ${
            !toolValidation.success ? JSON.stringify(toolValidation.error.format()) : ''
          }`
        );
      }

      // 環境変数を設定して異なる条件でテスト
      process.env.MEMORY_BANK_ROOT = testEnv.docRoot;
      process.env.LANGUAGE = 'ja';

      const envVarResponse = await callToolWithLegacySupport(client, 'tools/list', {
        docs: testEnv.docRoot
      });

      // 環境変数レスポンスのZodスキーマ検証
      const envValidationResult = ListToolsResultSchema.safeParse(envVarResponse.data);
      expect(envValidationResult.success).toBe(true,
        `Environment variable response validation failed: ${
          !envValidationResult.success ? JSON.stringify(envValidationResult.error.format()) : ''
        }`
      );

      // 環境変数レスポンスの各ツールを検証
      for (const tool of envVarResponse.data.tools) {
        const toolValidation = ToolSchema.safeParse(tool);
        expect(toolValidation.success).toBe(true,
          `Tool schema validation failed for tool '${tool.name}' in env var response: ${
            !toolValidation.success ? JSON.stringify(toolValidation.error.format()) : ''
          }`
        );
      }

      // read_contextツールの必須パラメータを比較
      const standardReadContext = standardResponse.data.tools.find(t => t.name === 'read_context');
      const envVarReadContext = envVarResponse.data.tools.find(t => t.name === 'read_context');

      expect(standardReadContext).toBeDefined();
      expect(envVarReadContext).toBeDefined();

      // 環境変数設定時に必須パラメータが正しく調整されているか確認
      if (standardReadContext?.inputSchema?.required && envVarReadContext?.inputSchema?.required) {
        // 標準設定では、これらのパラメータは必須であるべき
        expect(standardReadContext.inputSchema.required).toContain('branch');

        // 環境変数設定時には、docs と language は必須でなくなるべき
        expect(envVarReadContext.inputSchema.required).not.toContain('docs');
        expect(envVarReadContext.inputSchema.required).not.toContain('language');
      }

      // 異なる引数で呼び出した場合の動作検証
      const customDocsResponse = await callToolWithLegacySupport(client, 'tools/list', {
        docs: path.join(testEnv.tempDir, 'custom-docs')
      });

      // カスタムドキュメントレスポンスのZodスキーマ検証
      const customValidationResult = ListToolsResultSchema.safeParse(customDocsResponse.data);
      expect(customValidationResult.success).toBe(true,
        `Custom docs response validation failed: ${
          !customValidationResult.success ? JSON.stringify(customValidationResult.error.format()) : ''
        }`
      );

      // カスタムドキュメントレスポンスの各ツールを検証
      for (const tool of customDocsResponse.data.tools) {
        const toolValidation = ToolSchema.safeParse(tool);
        expect(toolValidation.success).toBe(true,
          `Tool schema validation failed for tool '${tool.name}' in custom docs response: ${
            !toolValidation.success ? JSON.stringify(toolValidation.error.format()) : ''
          }`
        );
      }

      // ツールの総数が一致することを確認
      expect(customDocsResponse.data.tools.length).toBe(standardResponse.data.tools.length);

      // クリーンアップ
      delete process.env.MEMORY_BANK_ROOT;
      delete process.env.LANGUAGE;
    });

    it('should validate tool schemas with Zod when environment variables are set', async () => {
      // 環境変数を設定
      process.env.MEMORY_BANK_ROOT = testEnv.docRoot;
      process.env.LANGUAGE = 'en';

      const response = await callToolWithLegacySupport(client, 'tools/list', {
        docs: testEnv.docRoot
      });

      expect(response.success).toBe(true);

      // SDKのZodスキーマを使用して検証
      const validationResult = ListToolsResultSchema.safeParse(response.data);
      expect(validationResult.success).toBe(true);

      // 各ツールのバリデーション
      const toolsResult = response.data as ListToolsResult;
      for (const tool of toolsResult.tools) {
        // 個別のツールをToolSchemaで検証
        const toolValidation = ToolSchema.safeParse(tool);
        expect(toolValidation.success).toBe(true);

        // read_contextツールは環境変数のため必須パラメータが変わっているはず
        if (tool.name === 'read_context') {
          if (tool.inputSchema.required) {
            // 環境変数でセットされた項目は必須でないはず
            expect(tool.inputSchema.required).not.toContain('docs');
            expect(tool.inputSchema.required).not.toContain('language');
          }
        }
      }

      // クリーンアップ
      delete process.env.MEMORY_BANK_ROOT;
      delete process.env.LANGUAGE;
    });
  });
});

