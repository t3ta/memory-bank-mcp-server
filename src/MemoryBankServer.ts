import { McpError, ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { WorkspaceManager } from './managers/WorkspaceManager.js';
import { GlobalMemoryBank } from './managers/GlobalMemoryBank.js';
import { BranchMemoryBank } from './managers/BranchMemoryBank.js';
import {
  CliOptions,
  ToolResponse,
  ReadMemoryBankArgs,
  WriteMemoryBankArgs,
  UpdateActiveContextArgs,
  UpdateProgressArgs,
  AddTechnicalDecisionArgs,
  SearchByTagsArgs,
  WorkspaceConfig
} from './models/types.js';

interface JsonRpcError {
  code: number;
  message: string;
}

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: any;
  error?: JsonRpcError;
}

export class MemoryBankServer {
  private workspaceManager: WorkspaceManager;
  private globalMemoryBank: GlobalMemoryBank | null = null;
  private branchMemoryBank: BranchMemoryBank | null = null;
  private config: WorkspaceConfig | null = null;
  private verbose: boolean;
  private requestId: number = 1;

  constructor(options?: CliOptions) {
    this.workspaceManager = new WorkspaceManager();
    this.verbose = options?.verbose ?? false;
  }

  private log(message: string): void {
    if (this.verbose) {
      console.error(`[DEBUG] ${message}`);
    }
  }

  private createErrorResponse(id: number, code: number, message: string): JsonRpcResponse {
    return {
      jsonrpc: "2.0",
      id,
      error: {
        code,
        message
      }
    };
  }

  async handleRequest(request: JsonRpcRequest): Promise<JsonRpcResponse> {
    try {
      switch (request.method) {
        case "tools/list":
          return {
            jsonrpc: "2.0",
            id: request.id,
            result: {
              tools: [
                {
                  name: "write_branch_memory_bank",
                  description: "Write a document to the current branch's memory bank",
                  inputSchema: {
                    type: "object",
                    properties: {
                      path: { type: "string" },
                      content: { type: "string" }
                    },
                    required: ["path"]
                  }
                },
                {
                  name: "read_branch_memory_bank",
                  description: "Read a document from the current branch's memory bank",
                  inputSchema: {
                    type: "object",
                    properties: {
                      path: { type: "string" }
                    },
                    required: ["path"]
                  }
                },
                {
                  name: "read_rules",
                  description: "Read the memory bank rules in the specified language",
                  inputSchema: {
                    type: "object",
                    properties: {
                      language: {
                        type: "string",
                        enum: ["en", "ja"],
                        description: "Language of the rules (en or ja)"
                      }
                    },
                    required: ["language"]
                  }
                }
              ]
            }
          };

        case "tools/call": {
          const { name, arguments: args } = request.params;

          if (!args) {
            return this.createErrorResponse(
              request.id,
              ErrorCode.InvalidParams,
              `No arguments provided for tool: ${name}`
            );
          }

          this.log(`Handling request for tool: ${name}`);

          try {
            let result;
            switch (name) {
              case "write_branch_memory_bank":
                result = await this.handleWriteBranchMemoryBank(args as WriteMemoryBankArgs);
                break;
              case "read_branch_memory_bank":
                result = await this.handleReadBranchMemoryBank(args as ReadMemoryBankArgs);
                break;
              case "read_rules":
                result = await this.handleReadRules(args as { language: "en" | "ja" });
                break;
              default:
                return this.createErrorResponse(
                  request.id,
                  ErrorCode.MethodNotFound,
                  `Unknown tool: ${name}`
                );
            }

            return {
              jsonrpc: "2.0",
              id: request.id,
              result
            };
          } catch (error) {
            return this.createErrorResponse(
              request.id,
              ErrorCode.InternalError,
              error instanceof Error ? error.message : String(error)
            );
          }
        }

        default:
          return this.createErrorResponse(
            request.id,
            ErrorCode.MethodNotFound,
            `Unknown method: ${request.method}`
          );
      }
    } catch (error) {
      return this.createErrorResponse(
        request.id,
        ErrorCode.InternalError,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  private async ensureConfig(): Promise<WorkspaceConfig> {
    if (!this.config) {
      this.config = await this.workspaceManager.initialize();
    }
    return this.config;
  }

  private async ensureGlobalMemoryBank(): Promise<GlobalMemoryBank> {
    if (!this.globalMemoryBank) {
      const config = await this.ensureConfig();
      this.globalMemoryBank = new GlobalMemoryBank(
        this.workspaceManager.getGlobalMemoryPath(),
        config
      );
      await this.globalMemoryBank.initialize();
    }
    return this.globalMemoryBank;
  }

  private async ensureBranchMemoryBank(): Promise<BranchMemoryBank> {
    if (!this.branchMemoryBank) {
      const config = await this.ensureConfig();
      const branchName = await this.workspaceManager.getCurrentBranch();
      this.branchMemoryBank = new BranchMemoryBank(
        this.workspaceManager.getBranchMemoryPath(branchName),
        branchName,
        config
      );
      await this.branchMemoryBank.initialize();
    }
    return this.branchMemoryBank;
  }

  private async handleReadBranchMemoryBank(args: ReadMemoryBankArgs): Promise<ToolResponse> {
    try {
      this.log(`Reading from branch memory bank: ${args.path}`);
      const bank = await this.ensureBranchMemoryBank();
      const doc = await bank.readDocument(args.path);
      return {
        result: true,
        content: [{ type: "text", text: doc.content }],
        _meta: { lastModified: doc.lastModified.toISOString() }
      };
    } catch (error) {
      this.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async handleWriteBranchMemoryBank(args: WriteMemoryBankArgs): Promise<ToolResponse> {
    try {
      this.log(`Initializing branch memory bank...`);
      const bank = await this.ensureBranchMemoryBank();

      if (!args.content) {
        this.log(`No content provided, initializing with template...`);
        await bank.initialize();
        return {
          result: true,
          content: [{ type: "text", text: "Branch memory bank initialized successfully" }]
        };
      }

      this.log(`Writing content to ${args.path}...`);
      await bank.writeDocument(args.path, args.content);
      return {
        result: true,
        content: [{ type: "text", text: "Document written successfully" }]
      };
    } catch (error) {
      this.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private async handleReadRules(args: { language: "en" | "ja" }): Promise<ToolResponse> {
    try {
      this.log(`Reading rules in ${args.language}`);
      const filePath = `rules-${args.language}.md`;
      const bank = await this.ensureGlobalMemoryBank();
      const doc = await bank.readDocument(filePath);
      return {
        result: true,
        content: [{ type: "text", text: doc.content }],
        _meta: { lastModified: doc.lastModified.toISOString() }
      };
    } catch (error) {
      this.log(`Error: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  async start(): Promise<void> {
    try {
      const config = await this.ensureConfig();
      this.log(`Memory Bank MCP Server initialized with config: ${JSON.stringify(config)}`);
      console.error(`Memory Bank MCP Server running on stdio (language: ${config.language})`);
    } catch (error) {
      console.error('Error starting server:', error);
      throw error;
    }
  }
}
