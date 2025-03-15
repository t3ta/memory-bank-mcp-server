#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { WorkspaceManager } from './managers/WorkspaceManager.js';
import { GlobalMemoryBank } from './managers/GlobalMemoryBank.js';
import { BranchMemoryBank } from './managers/BranchMemoryBank.js';
import { Language, BRANCH_CORE_FILES, GLOBAL_CORE_FILES } from './models/types.js';
import { MemoryBankError } from './errors/MemoryBankError.js';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';

// Parse command line arguments
const argv = yargs(hideBin(process.argv))
  .option('docs', {
    alias: 'd',
    type: 'string',
    description: 'Path to docs directory',
    default: './docs'
  })
  .help()
  .parseSync();

// Logger setup
const logger = {
  debug: (...args: any[]) => console.error('[DEBUG]', ...args),
  info: (...args: any[]) => console.error('[INFO]', ...args),
  error: (...args: any[]) => console.error('[ERROR]', ...args)
};

// Initialize managers
const workspaceManager = new WorkspaceManager();
let globalMemoryBank: GlobalMemoryBank | null = null;
let branchMemoryBank: BranchMemoryBank | null = null;

// Available tools definition
const AVAILABLE_TOOLS = [
  {
    name: "create_pull_request",
    description: "Creates a pull request based on branch memory bank information",
    inputSchema: {
      type: "object",
      properties: {
        branch: {
          type: "string",
          description: "Branch name"
        },
        title: {
          type: "string",
          description: "Custom PR title (optional)"
        },
        base: {
          type: "string",
          description: "Target branch for the PR (default: develop for feature branches, master for fix branches)"
        },
        language: {
          type: "string",
          enum: ["en", "ja"],
          description: "Language for PR (en or ja)"
        },
        push: {
          type: "boolean",
          description: "Whether to automatically push the changes"
        }
      },
      required: ["branch"]
    }
  },
  {
    name: "list_tools",
    description: "List all available tools",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "write_branch_memory_bank",
    description: "Write a document to the current branch's memory bank",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        content: { type: "string" },
        branch: {
          type: "string",
          description: "Branch name"
        }
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
        path: { type: "string" },
        branch: {
          type: "string",
          description: "Branch name"
        }
      },
      required: ["path"]
    }
  },
  {
    name: "write_global_memory_bank",
    description: "Write a document to the global memory bank",
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
    name: "read_global_memory_bank",
    description: "Read a document from the global memory bank",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" }
      },
      required: ["path"]
    }
  },
  {
    name: "read_branch_core_files",
    description: "Read all core files from the branch memory bank",
    inputSchema: {
      type: "object",
      properties: {
        branch: {
          type: "string",
          description: "Branch name"
        }
      },
      required: ["branch"]
    }
  },
  {
    name: "write_branch_core_files",
    description: "Write multiple core files at once",
    inputSchema: {
      type: "object",
      properties: {
        branch: {
          type: "string",
          description: "Branch name"
        },
        files: {
          type: "object",
          properties: {
            activeContext: {
              type: "object",
              properties: {
                currentWork: { type: "string" },
                recentChanges: { type: "array", items: { type: "string" } },
                activeDecisions: { type: "array", items: { type: "string" } },
                considerations: { type: "array", items: { type: "string" } },
                nextSteps: { type: "array", items: { type: "string" } }
              }
            },
            progress: {
              type: "object",
              properties: {
                workingFeatures: { type: "array", items: { type: "string" } },
                pendingImplementation: { type: "array", items: { type: "string" } },
                status: { type: "string" },
                knownIssues: { type: "array", items: { type: "string" } }
              }
            },
            systemPatterns: {
              type: "object",
              properties: {
                technicalDecisions: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      context: { type: "string" },
                      decision: { type: "string" },
                      consequences: { type: "array", items: { type: "string" } }
                    },
                    required: ["title", "context", "decision", "consequences"]
                  }
                }
              }
            }
          }
        }
      },
      required: ["branch", "files"]
    }
  },
  {
    name: "read_global_core_files",
    description: "Read all core files from the global memory bank",
    inputSchema: {
      type: "object",
      properties: {}
    }
  },
  {
    name: "read_rules",
    description: "Read the memory bank rules in specified language",
    inputSchema: {
      type: "object",
      properties: {
        language: {
          type: "string",
          enum: ["en", "ja"],
          description: "Language code (en or ja)"
        }
      },
      required: ["language"]
    }
  },
  {
    name: "get_recent_branches",
    description: "Get recently updated branch memory banks",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Maximum number of branches to return (default: 10, max: 100)",
          minimum: 1,
          maximum: 100
        }
      }
    }
  }
];

// Create a server
const server = new Server(
  {
    name: "memory-bank-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Set up tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: AVAILABLE_TOOLS
  };
});

// Add tool request handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  logger.debug('Tool call received:', { name, args });

  if (!args || typeof args !== 'object') {
    logger.error('Invalid arguments:', { name, args });
    throw new Error(`No arguments provided for tool: ${name}`);
  }

  const params = args as Record<string, unknown>;
  logger.debug('Parsed params:', params);

  switch (name) {
    case "list_tools": {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(AVAILABLE_TOOLS, null, 2)
          }
        ]
      };
    }

    case "write_branch_memory_bank": {
      const path = params.path as string;
      const content = params.content as string | undefined;
      const branch = (params.branch as string);

      if (!path) {
        throw new Error('Invalid arguments for write_branch_memory_bank');
      }

      const config = await workspaceManager.initialize(undefined, branch);
      branchMemoryBank = new BranchMemoryBank(
        workspaceManager.getBranchMemoryPath(branch),
        branch,
        config
      );
      await branchMemoryBank.initialize();

      if (!content) {
        return { content: [{ type: "text", text: "Branch memory bank initialized successfully" }] };
      }

      await branchMemoryBank.writeDocument(path, content);
      return { content: [{ type: "text", text: "Document written successfully" }] };
    }

    case "read_branch_memory_bank": {
      const path = params.path as string;
      const branch = (params.branch as string);

      if (!path) {
        throw new Error('Invalid arguments for read_branch_memory_bank');
      }

      const config = await workspaceManager.initialize(undefined, branch);
      branchMemoryBank = new BranchMemoryBank(
        workspaceManager.getBranchMemoryPath(branch),
        branch,
        config
      );
      await branchMemoryBank.initialize();

      const doc = await branchMemoryBank.readDocument(path);
      return {
        content: [{ type: "text", text: doc.content }],
        _meta: { lastModified: doc.lastModified.toISOString() }
      };
    }

    case "read_rules": {
      const language = params.language as string;

      if (!language || !["en", "ja"].includes(language)) {
        throw new Error('Invalid arguments for read_rules');
      }

      const validLanguage = language as Language;

      const dirname = path.dirname(fileURLToPath(import.meta.url));
      const filePath = path.join(dirname, 'templates', `rules-${language}.md`);
      const content = await fs.readFile(filePath, 'utf-8');
      return {
        content: [{ type: "text", text: content }],
        _meta: { lastModified: new Date().toISOString() }
      };
    }

    case "write_global_memory_bank": {
      const path = params.path as string;
      const content = params.content as string | undefined;

      if (!path) {
        throw new Error('Invalid arguments for write_global_memory_bank');
      }

      if (!content) {
        return { content: [{ type: "text", text: "Global memory bank initialized successfully" }] };
      }

      await globalMemoryBank?.writeDocument(path, content);
      await globalMemoryBank?.updateTagsIndex();
      return { content: [{ type: "text", text: "Document written successfully" }] };
    }

    case "read_global_memory_bank": {
      const path = params.path as string;

      if (!path) {
        throw new Error('Invalid arguments for read_global_memory_bank');
      }

      const doc = await globalMemoryBank?.readDocument(path);
      if (!doc) {
        throw new Error(`Document not found: ${path}`);
      }

      return {
        content: [{ type: "text", text: doc.content }],
        _meta: { lastModified: doc.lastModified.toISOString() }
      };
    }

    case "read_branch_core_files": {
      const branch = params.branch as string;

      if (!branch) {
        throw new Error('Invalid arguments for read_branch_core_files');
      }

      const config = await workspaceManager.initialize(undefined, branch);
      branchMemoryBank = new BranchMemoryBank(
        workspaceManager.getBranchMemoryPath(branch),
        branch,
        config
      );
      await branchMemoryBank.initialize();

      if (!branchMemoryBank) {
        throw new Error('Branch memory bank not initialized');
      }

      const results = await Promise.all(
        BRANCH_CORE_FILES.map(async (file) => {
          try {
            const doc = await branchMemoryBank!.readDocument(file);
            return {
              path: file,
              content: doc.content,
              lastModified: doc.lastModified.toISOString()
            };
          } catch (error: any) {
            return {
              path: file,
              error: `Failed to read ${file}: ${error?.message || 'Unknown error'}`
            };
          }
        })
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2)
          }
        ]
      };
    }

    case "write_branch_core_files": {
      const branch = params.branch as string;
      const files = params.files as Record<string, unknown>;

      if (!branch || !files) {
        throw new Error('Invalid arguments for write_branch_core_files');
      }

      const config = await workspaceManager.initialize(undefined, branch);
      branchMemoryBank = new BranchMemoryBank(
        workspaceManager.getBranchMemoryPath(branch),
        branch,
        config
      );
      await branchMemoryBank.initialize();

      await branchMemoryBank.writeCoreFiles({ branch, files });
      return { content: [{ type: "text", text: "Core files updated successfully" }] };
    }

    case "read_global_core_files": {
      if (!globalMemoryBank) {
        throw new Error('Global memory bank not initialized');
      }

      const results = await Promise.all(
        GLOBAL_CORE_FILES.map(async (file: string) => {
          try {
            const doc = await globalMemoryBank!.readDocument(file);
            return {
              path: file,
              content: doc.content,
              lastModified: doc.lastModified.toISOString()
            };
          } catch (error: any) {
            return {
              path: file,
              error: `Failed to read ${file}: ${error?.message || 'Unknown error'}`
            };
          }
        })
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2)
          }
        ]
      };
    }

    case "get_recent_branches": {
      const limit = params.limit as number | undefined;
      const config = await workspaceManager.initialize();
      branchMemoryBank = new BranchMemoryBank(
        workspaceManager.getBranchMemoryPath('main'),
        'main',
        config
      );

      const branches = await branchMemoryBank.getRecentBranches({ limit });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(branches, null, 2)
          }
        ]
      };
    }

    case "create_pull_request": {
      const branch = params.branch as string;
      const title = params.title as string | undefined;
      const base = params.base as string | undefined;
      const language = params.language as string || 'ja';
      const push = params.push as boolean | undefined;

      if (!branch) {
        throw new Error('Invalid arguments for create_pull_request');
      }

      // Initialize workspace and branch memory bank
      const config = await workspaceManager.initialize(undefined, branch);
      branchMemoryBank = new BranchMemoryBank(
        workspaceManager.getBranchMemoryPath(branch),
        branch,
        config
      );
      await branchMemoryBank.initialize();

      // Generate pull request content
      const prContent = await generatePullRequestContent(branchMemoryBank, branch, title, base, language);

      // Create the pullRequest.md file
      await branchMemoryBank.writeDocument('pullRequest.md', prContent.content);

      // Set up response message
      let responseMessage = `pullRequest.md ファイルを作成しました。\n\n`;
      responseMessage += `このファイルをコミットしてプッシュすると、GitHub Actionsによって自動的にPull Requestが作成されます。\n\n`;
      responseMessage += `以下のコマンドを実行してください:\n`;
      responseMessage += `git add ${workspaceManager.getBranchMemoryPath(branch)}/pullRequest.md\n`;
      responseMessage += `git commit -m "chore: PR作成準備"\n`;
      responseMessage += `git push\n\n`;
      responseMessage += `PR情報:\n`;
      responseMessage += `タイトル: ${prContent.title}\n`;
      responseMessage += `ターゲットブランチ: ${prContent.baseBranch}\n`;
      responseMessage += `ラベル: ${prContent.labels.join(', ')}\n`;

      return { content: [{ type: "text", text: responseMessage }] };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

/**
 * メモリバンクの情報からPRコンテンツを生成する
 */
async function generatePullRequestContent(
  memoryBank: BranchMemoryBank,
  branch: string,
  customTitle?: string,
  customBase?: string,
  language: string = 'ja'
): Promise<{
  title: string;
  baseBranch: string;
  labels: string[];
  content: string;
}> {
  try {
    // テンプレートファイルの読み込み
    // 言語に応じたテンプレートを選択（ただし生成されるファイル名は常に同一）
    const templatePath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'templates', `pull-request-template${language === 'en' ? '-en' : ''}.md`);
    let templateContent = await fs.readFile(templatePath, 'utf-8');

    // メモリバンクから必要なファイルを読み込み
    const [activeContext, progress, systemPatterns] = await Promise.all([
      memoryBank.readDocument('activeContext.md').catch(() => ({ content: '', lastModified: new Date() })),
      memoryBank.readDocument('progress.md').catch(() => ({ content: '', lastModified: new Date() })),
      memoryBank.readDocument('systemPatterns.md').catch(() => ({ content: '', lastModified: new Date() }))
    ]);

    // 英語の場合はセクション見出しも英語で検索
    const sectionHeaders = language === 'en' ? {
      currentWork: '## Current Work',
      recentChanges: '## Recent Changes',
      activeDecisions: '## Active Decisions',
      considerations: '## Considerations',
      workingFeatures: '## Working Features',
      knownIssues: '## Known Issues'
    } : {
      currentWork: '## 現在の作業内容',
      recentChanges: '## 最近の変更点',
      activeDecisions: '## アクティブな決定事項',
      considerations: '## 検討事項',
      workingFeatures: '## 動作している機能',
      knownIssues: '## 既知の問題'
    };

    // 現在の作業内容からタイトルを取得
    let title = customTitle || '';
    let currentWork = '';

    if (!title && typeof activeContext.content === 'string') {
      const currentWorkMatch = activeContext.content.match(new RegExp(`${sectionHeaders.currentWork}\s*\n([^\n#]+)`));
      if (currentWorkMatch && currentWorkMatch[1].trim()) {
        currentWork = currentWorkMatch[1].trim();
        title = currentWork;
      }
    }

    // タイトルが取得できなかった場合はブランチ名から生成
    if (!title) {
      const type = branch.startsWith('feature/') ? 'feat' : 'fix';
      const featureName = branch.replace(/^(feature|fix)\//, '').replace(/-/g, ' ');
      title = `${type}: ${featureName}`;
    }

    // テンプレートの各セクションを置換
    const replacements: Record<string, string> = {
      '{{CURRENT_WORK}}': currentWork,
      '{{RECENT_CHANGES}}': extractSection(activeContext.content, sectionHeaders.recentChanges),
      '{{ACTIVE_DECISIONS}}': extractSection(activeContext.content, sectionHeaders.activeDecisions),
      '{{CONSIDERATIONS}}': extractSection(activeContext.content, sectionHeaders.considerations),
      '{{WORKING_FEATURES}}': extractSection(progress.content, sectionHeaders.workingFeatures),
      '{{KNOWN_ISSUES}}': extractSection(progress.content, sectionHeaders.knownIssues)
    };

    // テンプレートにデータを挿入
    Object.entries(replacements).forEach(([placeholder, value]) => {
      if (value) {
        templateContent = templateContent.replace(placeholder, value);
      } else {
        // 該当するコンテンツがない場合はプレースホルダごと削除
        const regex = new RegExp(`\n+<!-- [^>]+ -->\n+${placeholder}\n+`, 'g');
        templateContent = templateContent.replace(regex, '');
        templateContent = templateContent.replace(placeholder, '');
      }
    });

    // 空のセクションをクリーンアップ
    templateContent = templateContent.replace(/##\s+[^\n]+\n\s*\n+##/g, '##');
    templateContent = templateContent.replace(/\n{3,}/g, '\n\n');

    // PRのタイプに基づいてラベルを設定
    const labels = ['memory-bank', 'auto-pr'];
    if (title.toLowerCase().includes('fix:') || title.toLowerCase().includes('修正')) {
      labels.push('bug');
    } else if (title.toLowerCase().includes('feat:') || title.toLowerCase().includes('機能')) {
      labels.push('enhancement');
    } else if (title.toLowerCase().includes('doc:') || title.toLowerCase().includes('ドキュメント')) {
      labels.push('documentation');
    }

    // ベースブランチの決定
    const baseBranch = customBase || (branch.startsWith('feature/') ? 'develop' : 'master');

    // PR作成メッセージを言語に合わせる
    const prReadyMsg = language === 'en' ?
      '# PR Ready\n\n' :
      '# PRの準備完了\n\n';

    const prFooter = language === 'en' ?
      '\n\n_This PR was automatically generated based on information from the memory bank_' :
      '\n\n_このPRはメモリバンクの情報を基に自動生成されました_';

    // pullRequest.mdファイルのコンテンツを生成
    const prContent = `${prReadyMsg}#title: ${title}\n#targetBranch: ${baseBranch}\n#labels: ${labels.join(',')}\n\n${templateContent}${prFooter}`;

    return {
      title,
      baseBranch,
      labels,
      content: prContent
    };
  } catch (error) {
    console.error('PR生成エラー:', error);
    throw new MemoryBankError(
      -33500,
      `PR内容の生成に失敗しました: ${(error as Error).message || String(error)}`
    );
  }
}

/**
 * マークダウンからセクションを抽出する
 */
function extractSection(content: string, sectionHeader: string): string {
  if (!content) return '';

  const lines = content.split('\n');
  let capturing = false;
  let result: string[] = [];

  for (const line of lines) {
    if (line.includes(sectionHeader)) {
      capturing = true;
      continue;
    }

    if (capturing) {
      if (line.startsWith('##')) {
        break;
      }

      // 空行でなければ追加
      if (line.trim()) {
        result.push(line);
      }
    }
  }

  return result.join('\n');
}

// Start the server
async function main() {
  logger.info('Starting Memory Bank MCP Server...');
  const transport = new StdioServerTransport();

  logger.debug('Connecting transport...');
  await server.connect(transport);

  logger.debug('Initializing workspace...');
  const config = await workspaceManager.initialize({
    memoryRoot: argv.docs as string,
    language: 'ja',
    verbose: false
  });

  logger.debug('Initializing global memory bank...');
  globalMemoryBank = new GlobalMemoryBank(
    workspaceManager.getGlobalMemoryPath(),
    config
  );
  await globalMemoryBank.initialize();

  logger.info(`Memory Bank MCP Server running on stdio (language: ${config.language})`);
  logger.info(`Using docs directory: ${config.memoryBankRoot}`);
}

main().catch((error) => {
  logger.error('Fatal error:', error);
  console.error("Fatal error in main():", error);
  process.exit(1);
});
