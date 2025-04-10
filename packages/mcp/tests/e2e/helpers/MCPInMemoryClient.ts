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
      this.isConnected = false;
      throw error;
    }
  }

  /**
   * Generic method to call a tool on the server side.
   * @param toolName The name of the tool to call.
   * @param args The arguments to pass to the tool.
   */
  private async callTool<TResult = any>(toolName: string, args: Record<string, any>): Promise<TResult> {
    if (!this.isConnected) {
      throw new Error('Client is not connected. Call initialize() first.');
    }
    logger.debug(`[MCPInMemoryClient] Calling tool: ${toolName}`, { args });
    try {
      const params = { name: toolName, arguments: args }; // Removed type annotation CallToolParams
      // logger.debug(`[MCPInMemoryClient] Calling tool: ${toolName}`, { args }); // Remove duplicate log
      const result = await this.client.callTool(params);
      logger.debug(`[MCPInMemoryClient] Tool call successful: ${toolName}`, { result }); // Restore original log
      return result as TResult;
    } catch (error) {
      logger.error(`[MCPInMemoryClient] Tool call failed: ${toolName}`, { error, args });
      throw error;
    }
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
}

