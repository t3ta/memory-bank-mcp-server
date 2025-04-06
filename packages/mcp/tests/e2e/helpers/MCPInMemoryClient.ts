// import { InMemoryTransport, Client, JSONRPCMessage, InitializeParams, CallToolParams } from '@modelcontextprotocol/sdk'; // SDKが見つからないためコメントアウト
import { logger } from '../../../src/shared/utils/logger.js';

// --- any を使って無理やり回避 ---
// SDKが見つかるようになったら元に戻す
const sdk = await import('@modelcontextprotocol/sdk' as any);
const InMemoryTransport = sdk.InMemoryTransport;
const Client = sdk.Client;
// JSONRPCMessage, InitializeParams, CallToolParams は Client クラスのメソッドの引数型なので、any で代用するか、必要なら定義する

/**
 * MCPサーバーと通信するためのインメモリクライアント (E2Eテスト用)
 */
export class MCPInMemoryClient {
  private client: any; // Client 型を any に変更
  private transport: any; // InMemoryTransport 型を any に変更
  private isConnected: boolean = false;

  /**
   * クライアントを作成する
   * @param clientTransport クライアント側のトランスポート (setupE2ETestEnvから渡される)
   */
  constructor(clientTransport: any /* InMemoryTransport */) { // 型を any に変更
    this.transport = clientTransport;
    this.client = new Client(this.transport);
    logger.debug('[MCPInMemoryClient] Client created.');
  }

  /**
   * クライアントを初期化し、サーバーに接続する
   */
  async initialize(): Promise<void> {
    if (this.isConnected) {
      logger.warn('[MCPInMemoryClient] Already initialized.');
      return;
    }

    try {
      logger.debug('[MCPInMemoryClient] Starting transport...');
      await this.transport.start(); // Transportを開始
      logger.debug('[MCPInMemoryClient] Transport started. Initializing client...');

      // InitializeParams 型の代わりに any を使用
      const initializeParams: any /* InitializeParams */ = {
        protocolVersion: '2024-11-05', // サーバーと合わせる
        capabilities: {}, // 必要に応じて機能フラグを設定
        clientInfo: {
          name: 'MCPInMemoryClient',
          version: '1.0.0'
        }
      };
      await this.client.initialize(initializeParams);
      this.isConnected = true;
      logger.debug('[MCPInMemoryClient] Client initialized successfully.');
    } catch (error) {
      logger.error('[MCPInMemoryClient] Initialization failed:', error);
      this.isConnected = false; // 失敗したら接続状態をfalseに
      throw error; // エラーを再スロー
    }
  }

  /**
   * サーバーとの接続を閉じる
   */
  async close(): Promise<void> {
    if (!this.isConnected) {
      logger.warn('[MCPInMemoryClient] Already closed or not initialized.');
      return;
    }
    try {
      logger.debug('[MCPInMemoryClient] Closing transport...');
      await this.transport.close();
      this.isConnected = false;
      logger.debug('[MCPInMemoryClient] Transport closed.');
    } catch (error) {
      logger.error('[MCPInMemoryClient] Failed to close transport:', error);
      // エラーが発生しても接続状態はfalseにする
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * サーバー側のツールを呼び出す汎用メソッド
   * @param toolName 呼び出すツールの名前
   * @param args ツールに渡す引数
   */
  private async callTool<TResult = any>(toolName: string, args: Record<string, any>): Promise<TResult> {
    if (!this.isConnected) {
      throw new Error('Client is not connected. Call initialize() first.');
    }
    logger.debug(`[MCPInMemoryClient] Calling tool: ${toolName}`, { args });
    try {
      // CallToolParams 型の代わりに any を使用
      const params: any /* CallToolParams */ = { name: toolName, arguments: args };
      const result = await this.client.callTool(params);
      logger.debug(`[MCPInMemoryClient] Tool call successful: ${toolName}`, { result });
      // MCPサーバーのツールは { success: boolean, data?: any, error?: any } の形式で返すことが多いので、
      // エラーがあればここで投げるか、そのまま返すかは設計次第。ここではそのまま返す。
      return result as TResult;
    } catch (error) {
      logger.error(`[MCPInMemoryClient] Tool call failed: ${toolName}`, { error, args });
      throw error;
    }
  }

  // --- MCPサーバーのツールに対応するメソッド ---

  async readBranchMemoryBank(branch: string, path: string, docs: string): Promise<any> {
    return this.callTool('read_branch_memory_bank', { branch, path, docs });
  }

  async writeBranchMemoryBank(
    branch: string,
    path: string,
    docs: string,
    options: { content?: string; patches?: any[]; tags?: string[]; returnContent?: boolean }
  ): Promise<any> {
    return this.callTool('write_branch_memory_bank', {
      branch,
      path,
      docs,
      ...options // content, patches, tags, returnContent を展開
    });
  }

  async readGlobalMemoryBank(path: string, docs: string): Promise<any> {
    return this.callTool('read_global_memory_bank', { path, docs });
  }

  async writeGlobalMemoryBank(
    path: string,
    docs: string,
    options: { content?: string; patches?: any[]; tags?: string[]; returnContent?: boolean }
  ): Promise<any> {
    return this.callTool('write_global_memory_bank', {
      path,
      docs,
      ...options // content, patches, tags, returnContent を展開
    });
  }

  async readContext(branch: string, language: string, docs: string): Promise<any> {
    return this.callTool('read_context', { branch, language, docs });
  }

  async searchDocumentsByTags(
    tags: string[],
    docs: string,
    options: { match?: 'and' | 'or'; scope?: 'branch' | 'global' | 'all'; branch?: string }
  ): Promise<any> {
    // search_documents_by_tags ツールが e2e-test-env でコメントアウトされている場合、
    // このメソッドを呼ぶとエラーになる可能性があるため注意。
    // 必要であれば、e2e-test-env のコメントアウトを解除するか、
    // このメソッド自体を使わないようにテストを修正する。
    return this.callTool('search_documents_by_tags', {
      tags,
      docs,
      ...options // match, scope, branch を展開
    });
  }
}
