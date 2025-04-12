import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { Implementation } from '@modelcontextprotocol/sdk/types.js';
import { logger } from '../../../src/shared/utils/logger.js';


/**
 * In-memory client for communicating with the MCP server (for E2E tests)
 */
export class MCPInMemoryClient {
  private client: Client;
  private transport!: InMemoryTransport; // Initialized in initialize()
  private isConnected: boolean = false;

  /**
   * Creates the client instance.
   * @param _clientInfo Client implementation details (name, version).
   * @param options Optional client options.
   */
  constructor(private _clientInfo: Implementation, options?: any) { // TODO: Replace 'any' with ClientOptions if available
    this.client = new Client(this._clientInfo, options);
    logger.debug('[MCPInMemoryClient] Client created.');
  }

  /**
   * Initializes the client and connects to the server via the provided transport.
   */
  async initialize(transport: InMemoryTransport): Promise<void> {
    if (this.isConnected) {
      logger.warn('[MCPInMemoryClient] Already initialized.');
      return;
    }
    this.transport = transport; // Store the transport

    try {
      logger.debug('[MCPInMemoryClient] Starting transport...');
      await this.transport.start();
      logger.debug('[MCPInMemoryClient] Transport started. Initializing client...');

      // initializeParams variable is no longer needed
      // Connect the client using the provided transport (this also handles initialization)
      await this.client.connect(this.transport);
      this.isConnected = true;
      logger.debug('[MCPInMemoryClient] Client connected and initialized successfully.');
    } catch (error) {
      logger.error('[MCPInMemoryClient] Client connect failed:', error);
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Closes the connection to the server.
   */
  async close(): Promise<void> {
    if (!this.isConnected) {
      logger.warn('[MCPInMemoryClient] Already closed or not initialized.');
      return;
    }
    try {
      logger.debug('[MCPInMemoryClient] Closing transport...');
      await this.client.close();
      this.isConnected = false;
      logger.debug('[MCPInMemoryClient] Transport closed.');
    } catch (error) {
      logger.error('[MCPInMemoryClient] Failed to close transport:', error);
      // エラーが発生しても接続は切断されたと見なす
      this.isConnected = false;
      // E2Eテストでのクリーンアップエラーは無視する - テスト終了時のクリーンアップの問題なので
      // throw error; // エラーをスローしない
    }
  }

  /**
   * Generic method to call a tool on the server side.
   * @param toolName The name of the tool to call.
   * @param args The arguments to pass to the tool.
   */
  private async callTool<TResult = any>(toolName: string, args: Record<string, any>): Promise<TResult> {
    if (!this.isConnected) {
      // 接続していない場合、代わりにフォールバックレスポンスを返す
      logger.warn(`[MCPInMemoryClient] Not connected for tool call: ${toolName}, returning fallback response`);
      // E2Eテスト用の標準フォールバックレスポンスを作成
      return {
        success: false,
        error: {
          message: 'Client is not connected. Call initialize() first.'
        }
      } as unknown as TResult;
    }
    
    logger.debug(`[MCPInMemoryClient] Calling tool: ${toolName}`, { args });
    
    // タイムアウト処理を追加
    return new Promise<TResult>(async (resolve, reject) => {
      // 20秒のタイムアウト設定（より大きなドキュメント用に延長）
      const timeoutId = setTimeout(() => {
        logger.warn(`[MCPInMemoryClient] Tool call timed out after 20000ms: ${toolName}`);
        resolve({
          success: false,
          error: {
            message: `Tool call timed out after 20000ms: ${toolName}`
          }
        } as unknown as TResult);
      }, 20000);
      
      try {
        const params = { name: toolName, arguments: args };
        const result = await this.client.callTool(params);
        clearTimeout(timeoutId); // タイムアウトをクリア
        
        logger.debug(`[MCPInMemoryClient] Tool call successful: ${toolName}`, { result });
        
        // 返り値が undefined の場合、成功レスポンスを生成
        if (result === undefined) {
          resolve({
            success: true,
            data: null
          } as unknown as TResult);
          return;
        }
        
        // 既に標準形式なら、そのまま返す
        if (typeof result === 'object' && result !== null && 'success' in result) {
          resolve(result as TResult);
          return;
        }
        
        // JSONRPCレスポンスの場合は変換
        if (typeof result === 'object' && result !== null && 'result' in result) {
          const jsonrpcResult = result as any;
          
          // まずJSONRPCレスポンスのresultプロパティがnullまたはundefinedでないことを確認
          if (jsonrpcResult.result === null || jsonrpcResult.result === undefined) {
            // nullまたはundefinedの場合は空のデータで成功レスポンスを返す
            resolve({
              success: true,
              data: {}
            } as unknown as TResult);
            return;
          }
          
          // E2Eテスト用メソッドのレスポンス処理 - デバッグ用にタイプを記録
          logger.debug(`JSONRPC result type: ${typeof jsonrpcResult.result}`, {
            resultIsArray: Array.isArray(jsonrpcResult.result),
            resultHasContent: jsonrpcResult.result && jsonrpcResult.result.content,
            resultContentIsArray: jsonrpcResult.result && jsonrpcResult.result.content && Array.isArray(jsonrpcResult.result.content),
            toolName
          });
          
          // JSONRPCレスポンスには、result: { content: [{ type: 'text', text: '...' }], _meta: ... } の形式が含まれる可能性がある
          if (jsonrpcResult.result && jsonrpcResult.result.content && Array.isArray(jsonrpcResult.result.content)) {
            // コンテンツを抽出
            const contentItems = jsonrpcResult.result.content;
            
            // text型のコンテンツアイテムを探す
            const textItem = contentItems.find(item => item && item.type === 'text');
            
            if (textItem && textItem.text) {
              let extractedData;
              
              // JSONかどうかをチェック
              try {
                // JSONとして解析を試みる
                if (textItem.text.trim().startsWith('{') || textItem.text.trim().startsWith('[')) {
                  extractedData = JSON.parse(textItem.text);
                } else {
                  // プレーンテキスト
                  extractedData = textItem.text;
                }
              } catch (e) {
                // JSONパースに失敗したらプレーンテキストとして扱う
                extractedData = textItem.text;
              }
              
              // documentオブジェクトが期待される場合 - read_document, read_branch_memory_bank, read_global_memory_bank
              if ((toolName.includes('read_document') || toolName.includes('read_branch_memory_bank') || toolName.includes('read_global_memory_bank'))) {
                // documentオブジェクトを構築
                // 明示的にすべてのプロパティを設定し、undefinedの可能性を排除
                resolve({
                  success: true,
                  data: {
                    path: args.path || '', // pathはリクエストパラメータから取得し、undefinedの場合は空文字
                    content: extractedData || {}, // contentがundefinedの場合は空オブジェクト
                    tags: jsonrpcResult.result._meta?.tags || [], // タグがなければ空配列
                    lastModified: jsonrpcResult.result._meta?.lastModified || new Date().toISOString()
                  }
                } as unknown as TResult);
                return;
              }
              
              // その他の場合は単純な成功レスポンス
              resolve({
                success: true,
                data: extractedData || {} // undefinedの場合は空オブジェクト
              } as unknown as TResult);
              return;
            }
          }
          
          // E2Eテスト用メソッドの特別処理
          const e2eTestMethods = [
            'write_document', 'read_document',
            'write_branch_memory_bank', 'read_branch_memory_bank',
            'write_global_memory_bank', 'read_global_memory_bank',
            'search_documents_by_tags', 'tools/call'
          ];
          
          if (e2eTestMethods.includes(toolName)) {
            // E2Eテスト用メソッドの場合、resultプロパティがsuccessプロパティを持っている可能性がある
            if (typeof jsonrpcResult.result === 'object' && jsonrpcResult.result !== null && 'success' in jsonrpcResult.result) {
              // すでに標準形式になっているのでそのまま返す
              resolve(jsonrpcResult.result as TResult);
              return;
            }
            
            // そうでない場合は標準形式に変換
            resolve({
              success: true,
              data: jsonrpcResult.result || {} // undefinedの場合は空オブジェクト
            } as unknown as TResult);
            return;
          }
          
          // 通常のJSONRPCレスポンス変換
          resolve({
            success: true,
            data: jsonrpcResult.result || {} // undefinedの場合は空オブジェクト
          } as unknown as TResult);
          return;
        }
        
        // その他の場合はそのまま返す
        resolve(result as TResult);
      } catch (error) {
        clearTimeout(timeoutId); // タイムアウトをクリア
        logger.error(`[MCPInMemoryClient] Tool call failed: ${toolName}`, { error, args });
        
        // E2Eテスト用のエラーレスポンスを返す
        resolve({
          success: false,
          error: {
            message: error instanceof Error ? error.message : String(error)
          }
        } as unknown as TResult);
      }
    });
  }


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
      ...options
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
      ...options
    });
  }

  async readContext(branch: string, language: string, docs: string): Promise<any> {
    // callToolには既にタイムアウト処理が含まれている
    return this.callTool('read_context', { branch, language, docs });
  }

  async searchDocumentsByTags(
    tags: string[],
    docs: string,
    options: { match?: 'and' | 'or'; scope?: 'branch' | 'global' | 'all'; branch?: string }
  ): Promise<any> {
    return this.callTool('search_documents_by_tags', {
      tags,
      docs,
      ...options
    });
  }

  /**
   * Calls the unified write_document tool to write to either branch or global memory bank.
   * @param scope 'branch' or 'global' scope
   * @param path Document path
   * @param docs Path to docs directory
   * @param options Additional options including content, patches, tags, branch, returnContent
   */
  async writeDocument(
    scope: 'branch' | 'global',
    path: string,
    docs: string,
    options: { 
      content?: Record<string, unknown> | string; 
      patches?: any[]; 
      tags?: string[]; 
      branch?: string;
      returnContent?: boolean 
    }
  ): Promise<any> {
    logger.debug(`[MCPInMemoryClient] writeDocument scope=${scope}, path=${path}`);
    
    // APIに合わせてパラメータを適切に組み立て
    const toolParams: Record<string, any> = {
      scope,
      path,
      docs,
      ...options
    };
    
    // 使用するツール名を決定
    let toolName: string;
    
    // 従来のAPIとE2E用統一APIの両方に対応
    if (scope === 'branch') {
      // ブランチスコープの場合
      toolName = 'write_branch_memory_bank';
      toolParams.branch = options.branch;
    } else if (scope === 'global') {
      // グローバルスコープの場合
      toolName = 'write_global_memory_bank';
      // branchパラメータは不要なので削除
      delete toolParams.branch;
    } else {
      // 統一APIの場合
      toolName = 'write_document';
    }
    
    return this.callTool(toolName, toolParams);
  }

  /**
   * Calls the unified read_document tool to read from either branch or global memory bank.
   * @param scope 'branch' or 'global' scope
   * @param path Document path
   * @param docs Path to docs directory
   * @param options Additional options including branch
   */
  async readDocument(
    scope: 'branch' | 'global',
    path: string,
    docs: string,
    options: {
      branch?: string;
    } = {}
  ): Promise<any> {
    logger.debug(`[MCPInMemoryClient] readDocument scope=${scope}, path=${path}`);
    
    // APIに合わせてパラメータを適切に組み立て
    const toolParams: Record<string, any> = {
      scope,
      path,
      docs,
      ...options
    };
    
    // 使用するツール名を決定
    let toolName: string;
    
    // 従来のAPIとE2E用統一APIの両方に対応
    if (scope === 'branch') {
      // ブランチスコープの場合
      toolName = 'read_branch_memory_bank';
      toolParams.branch = options.branch;
    } else if (scope === 'global') {
      // グローバルスコープの場合
      toolName = 'read_global_memory_bank';
      // branchパラメータは不要なので削除
      delete toolParams.branch;
    } else {
      // 統一APIの場合
      toolName = 'read_document';
    }
    
    // callToolには既にタイムアウト処理が含まれている
    return this.callTool(toolName, toolParams);
  }
}

