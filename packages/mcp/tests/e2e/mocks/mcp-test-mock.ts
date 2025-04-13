/**
 * MCP Test クライアントのモック実装
 * モジュール解決の問題を回避するためのファイル
 */

// MCPツールレスポンスの型定義
export interface MCPToolResponse<T = any> {
  status: 'success' | 'error' | 'pending';
  result?: T;
  error?: string;
  // 互換性のためのプロパティ
  success?: boolean;
  data?: T;
}

// MCPTestClient のモッククラス
export class MCPTestClient {
  private baseUrl: string;
  private timeout: number;
  private documentStore: Map<string, any>;

  constructor(options: { baseUrl: string; timeout?: number }) {
    this.baseUrl = options.baseUrl;
    this.timeout = options.timeout || 10000;
    this.documentStore = new Map<string, any>();
  }

  /**
   * ツール呼び出しをシミュレートする関数
   */
  async callTool<T = any>(toolName: string, params: any): Promise<MCPToolResponse<T>> {
    console.log(`[MCPTestClient] Calling tool: ${toolName}`, params);

    // 各ツールの呼び出しをモックする
    switch (toolName) {
      case 'read_global_memory_bank': {
        if (params.path.includes('non-existent')) {
          const response: MCPToolResponse<T> = {
            status: 'error',
            error: 'Document not found',
            success: false
          };
          return response;
        }

        // 保存されたドキュメントがあればそれを返す
        const storeKey = `global:${params.path}`;
        if (this.documentStore.has(storeKey)) {
          const result = {
            path: params.path,
            content: this.documentStore.get(storeKey)
          } as unknown as T;

          const response: MCPToolResponse<T> = {
            status: 'success',
            result,
            // 互換性のためのプロパティ
            success: true,
            data: result
          };
          return response;
        }

        // デフォルトの初期ドキュメントを返す
        const result = {
          path: params.path,
          content: {
            schema: "memory_document_v2",
            metadata: {
              id: "global-test-1",
              title: "Test Document",
              documentType: "test",
              path: params.path,
              tags: ["global", "initial", "write-test"],
              version: 1
            },
            content: {
              message: "Initial global content"
            }
          }
        } as unknown as T;

        const response: MCPToolResponse<T> = {
          status: 'success',
          result,
          // 互換性のためのプロパティ
          success: true,
          data: result
        };
        return response;
      }

      case 'write_global_memory_bank': {
        // コンテンツを保存
        const storeKey = `global:${params.path}`;
        if (params.content) {
          const content = typeof params.content === 'string'
            ? JSON.parse(params.content)
            : params.content;

          this.documentStore.set(storeKey, content);
        }

        const result = {
          path: params.path
        } as unknown as T;

        const response: MCPToolResponse<T> = {
          status: 'success',
          result,
          // 互換性のためのプロパティ
          success: true,
          data: result
        };
        return response;
      }

      case 'read_branch_memory_bank': {
        if (params.path.includes('non-existent')) {
          const response: MCPToolResponse<T> = {
            status: 'error',
            error: 'Document not found',
            success: false
          };
          return response;
        }

        // 保存されたドキュメントがあればそれを返す
        const storeKey = `branch:${params.branch}:${params.path}`;
        if (this.documentStore.has(storeKey)) {
          const result = {
            path: params.path,
            content: this.documentStore.get(storeKey)
          } as unknown as T;

          const response: MCPToolResponse<T> = {
            status: 'success',
            result,
            // 互換性のためのプロパティ
            success: true,
            data: result
          };
          return response;
        }

        // デフォルトの初期ドキュメントを返す
        const result = {
          path: params.path,
          content: {
            schema: "memory_document_v2",
            metadata: {
              id: "branch-test-1",
              title: "Test Document",
              documentType: "test",
              path: params.path,
              tags: ["branch", "initial", "test"],
              version: 1
            },
            content: {
              message: "Initial branch content"
            }
          }
        } as unknown as T;

        const response: MCPToolResponse<T> = {
          status: 'success',
          result,
          // 互換性のためのプロパティ
          success: true,
          data: result
        };
        return response;
      }

      case 'write_branch_memory_bank': {
        // コンテンツを保存
        const storeKey = `branch:${params.branch}:${params.path}`;
        if (params.content) {
          const content = typeof params.content === 'string'
            ? JSON.parse(params.content)
            : params.content;

          this.documentStore.set(storeKey, content);
        }

        const result = {
          path: params.path
        } as unknown as T;

        const response: MCPToolResponse<T> = {
          status: 'success',
          result,
          // 互換性のためのプロパティ
          success: true,
          data: result
        };
        return response;
      }

      case 'read_document': {
        if (params.path.includes('non-existent')) {
          const response: MCPToolResponse<T> = {
            status: 'error',
            error: 'Document not found',
            success: false
          };
          return response;
        }

        const scope = params.scope || 'global';
        const storeKey = scope === 'global'
          ? `global:${params.path}`
          : `branch:${params.branch}:${params.path}`;

        // 保存されたドキュメントがあればそれを返す
        if (this.documentStore.has(storeKey)) {
          const result = {
            path: params.path,
            content: this.documentStore.get(storeKey)
          } as unknown as T;

          const response: MCPToolResponse<T> = {
            status: 'success',
            result,
            // 互換性のためのプロパティ
            success: true,
            data: result
          };
          return response;
        }

        // デフォルトのドキュメントを返す
        const messagePrefix = scope === 'global' ? 'Global' : 'Branch';
        const result = {
          path: params.path,
          content: {
            schema: "memory_document_v2",
            metadata: {
              id: `${scope}-test-1`,
              title: "Test Document",
              documentType: "test",
              path: params.path,
              tags: [scope, "initial"],
              version: 1
            },
            content: {
              message: `Unified ${messagePrefix} content`
            }
          }
        } as unknown as T;

        const response: MCPToolResponse<T> = {
          status: 'success',
          result,
          // 互換性のためのプロパティ
          success: true,
          data: result
        };
        return response;
      }

      case 'write_document': {
        // コンテンツを保存
        const scope = params.scope || 'global';
        const storeKey = scope === 'global'
          ? `global:${params.path}`
          : `branch:${params.branch}:${params.path}`;

        if (params.content) {
          const content = typeof params.content === 'string'
            ? JSON.parse(params.content)
            : params.content;

          this.documentStore.set(storeKey, content);
        }

        const result = {
          path: params.path
        } as unknown as T;

        const response: MCPToolResponse<T> = {
          status: 'success',
          result,
          // 互換性のためのプロパティ
          success: true,
          data: result
        };
        return response;
      }

      case 'search_documents_by_tags': {
        const { tags, scope, match = 'and' } = params;

        // テスト用の検索結果をシミュレート
        const mockResults = [];

        // グローバル検索結果
        if (scope === 'global' || scope === 'all') {
          if (tags.includes('global') ||
              tags.includes('test') ||
              tags.includes('guide') ||
              tags.includes('high-priority') ||
              tags.includes('medium-priority')) {

            if (match === 'and' && tags.includes('test') && tags.includes('global')) {
              mockResults.push({
                path: 'core/global-search-1.json',
                tags: ["global", "test", "high-priority"]
              });
              mockResults.push({
                path: 'core/global-search-2.json',
                tags: ["global", "test", "medium-priority"]
              });
            } else if (match === 'or' && (tags.includes('high-priority') || tags.includes('medium-priority'))) {
              mockResults.push({
                path: 'core/global-search-1.json',
                tags: ["global", "test", "high-priority"]
              });
              mockResults.push({
                path: 'core/global-search-2.json',
                tags: ["global", "test", "medium-priority"]
              });
            } else if (tags.includes('guide')) {
              mockResults.push({
                path: 'guides/global-search-3.json',
                tags: ["global", "guide", "low-priority"]
              });
            }
          }
        }

        // ブランチ検索結果
        if ((scope === 'branch' || scope === 'all') && params.branch) {
          if (tags.includes('feature')) {
            mockResults.push({
              path: 'branch-search-1.json',
              tags: ["branch", "feature", "active"]
            });
            mockResults.push({
              path: 'branch-search-2.json',
              tags: ["branch", "feature", "completed"]
            });
          } else if (tags.includes('design')) {
            mockResults.push({
              path: 'designs/branch-search-3.json',
              tags: ["branch", "design", "review"]
            });
          }
        }

        const result = mockResults as unknown as T;
        const response: MCPToolResponse<T> = {
          status: 'success',
          result,
          // 互換性のためのプロパティ
          success: true,
          data: result
        };
        return response;
      }

      case 'read_context': {
        // branchパラメータは省略可能
        const { branch, language } = params;

        // プロジェクトモードでのブランチ自動検出をシミュレート
        // process.env.MEMORY_BANK_PROJECT_MODEが'true'ならテストブランチを返す
        let branchToUse = branch;
        if (!branchToUse && process.env.MEMORY_BANK_PROJECT_MODE === 'true') {
          // 最初のブランチをデフォルトとして使用 (実際のシステムではGitから取得)
          for (const key of this.documentStore.keys()) {
            if (key.startsWith('branch:')) {
              const parts = key.split(':');
              if (parts.length >= 2) {
                branchToUse = parts[1];
                console.log(`[MCPTestClient] Auto-detected branch: ${branchToUse}`);
                break;
              }
            }
          }

          // ストアに何もなければテスト用にデフォルトブランチを設定
          if (!branchToUse) {
            branchToUse = 'feature-context-test';
            console.log(`[MCPTestClient] Using default branch: ${branchToUse}`);
          }
        }

        // この時点でブランチが特定できなければエラー
        if (!branchToUse) {
          const response: MCPToolResponse<T> = {
            status: 'error',
            error: 'Branch name is required when not running in project mode',
            success: false
          };
          return response;
        }

        // 存在しないブランチの場合はエラーを投げる
        if (branchToUse.includes('non-existent')) {
          const response: MCPToolResponse<T> = {
            status: 'error',
            error: 'Branch not found',
            success: false
          };
          return response;
        }

        // branchContextとactiveContextのキーでストアを確認
        const branchContextKey = `branch:${branchToUse}:branchContext.json`;
        const activeContextKey = `branch:${branchToUse}:activeContext.json`;

        // デフォルトのコンテキスト情報
        const contextData: any = {
          branch: {
            name: branchToUse,
            description: "Test branch for context",
            createdAt: new Date().toISOString()
          },
          activeTasks: ["default task"],
          lastModified: new Date().toISOString()
        };

        // ブランチコンテキストが保存されていればそれを使用
        if (this.documentStore.has(branchContextKey)) {
          const branchContext = this.documentStore.get(branchContextKey);
          if (branchContext && branchContext.content) {
            contextData.branch = {
              ...contextData.branch,
              ...branchContext.content
            };
          }
        }

        // アクティブコンテキストが保存されていればそれを使用
        if (this.documentStore.has(activeContextKey)) {
          const activeContext = this.documentStore.get(activeContextKey);
          if (activeContext && activeContext.content) {
            if (activeContext.content.activeTasks) {
              contextData.activeTasks = activeContext.content.activeTasks;
            }
            if (activeContext.content.lastModified) {
              contextData.lastModified = activeContext.content.lastModified;
            }
          }
        }

        // 言語パラメータに応じたコンテキスト情報の追加（実際のシステムでは多言語対応があるかもしれない）
        if (language) {
          contextData.language = language;
        }

        const result = contextData as unknown as T;
        const response: MCPToolResponse<T> = {
          status: 'success',
          result,
          // 互換性のためのプロパティ
          success: true,
          data: result
        };
        return response;
      }

      default: {
        const response: MCPToolResponse<T> = {
          status: 'error',
          error: `Unsupported tool: ${toolName}`,
          success: false
        };
        return response;
      }
    }
  }
}
