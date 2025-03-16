# `read_context`コマンド実装ガイド

tags: #implementation #mcp #command #context #v2

## 概要

このドキュメントは、`read_context`コマンドの実装方法を説明します。このコマンドは、ルール、ブランチメモリバンク、グローバルメモリバンクの情報を一度に取得できるようにするものです。

## 実装手順

### 1. `AVAILABLE_TOOLS`配列への追加

`src/index.ts`ファイルの`AVAILABLE_TOOLS`配列（行38-185）に以下のコード定義を追加します：

```typescript
{
  name: 'read_context',
  description: 'Read all context information (rules, branch memory bank, global memory bank) at once',
  inputSchema: {
    type: 'object',
    properties: {
      branch: {
        type: 'string',
        description: 'Branch name (required if includeBranchMemory is true)',
      },
      language: {
        type: 'string',
        enum: ['en', 'ja'],
        description: 'Language code (en or ja)',
      },
      includeRules: {
        type: 'boolean',
        description: 'Whether to include rules (default: true)',
      },
      includeBranchMemory: {
        type: 'boolean',
        description: 'Whether to include branch memory bank (default: true)',
      },
      includeGlobalMemory: {
        type: 'boolean',
        description: 'Whether to include global memory bank (default: true)',
      },
    },
  },
},
```

### 2. `CallToolRequestSchema`ハンドラーへの追加

`src/index.ts`ファイルの`CallToolRequestSchema`ハンドラーのswitch文（行220-450）に以下のケースを追加します：

```typescript
case 'read_context': {
  const branch = params.branch as string | undefined;
  const language = (params.language as string) || 'ja';
  const includeRules = params.includeRules !== false; // デフォルトはtrue
  const includeBranchMemory = params.includeBranchMemory !== false; // デフォルトはtrue
  const includeGlobalMemory = params.includeGlobalMemory !== false; // デフォルトはtrue

  logger.info(`Reading context (branch: ${branch || 'none'}, language: ${language})`);

  // ブランチメモリバンクを含める場合は、ブランチ名が必須
  if (includeBranchMemory && !branch) {
    throw new Error('Branch name is required when includeBranchMemory is true');
  }

  if (!app) {
    throw new Error('Application not initialized');
  }

  // 結果を格納するオブジェクト
  const result: Record<string, any> = {};

  // ルールを取得
  if (includeRules) {
    logger.debug('Including rules in context');
    if (!['en', 'ja'].includes(language)) {
      throw new Error('Invalid language for rules');
    }

    const dirname = path.dirname(fileURLToPath(import.meta.url));
    const filePath = path.join(dirname, 'templates', `rules-${language}.md`);
    const content = await fs.readFile(filePath, 'utf-8');
    result.rules = { content };
  }

  // ブランチメモリバンクを取得
  if (includeBranchMemory && branch) {
    logger.debug(`Including branch memory bank for branch: ${branch}`);
    const branchResponse = await app.getBranchController().readCoreFiles(branch);
    if (!branchResponse.success) {
      throw new Error(branchResponse.error.message);
    }
    result.branchMemory = branchResponse.data;
  }

  // グローバルメモリバンクを取得
  if (includeGlobalMemory) {
    logger.debug('Including global memory bank in context');
    const globalResponse = await app.getGlobalController().readCoreFiles();
    if (!globalResponse.success) {
      throw new Error(globalResponse.error.message);
    }
    result.globalMemory = globalResponse.data;
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
```

## 実装上の注意点

1. `includeBranchMemory`がtrueで`branch`パラメータが指定されていない場合は、明確なエラーメッセージを返します。
2. 言語が'en'または'ja'以外の場合は、エラーを返します。
3. アプリケーションが初期化されていない場合は、エラーを返します。
4. 各コンポーネント（ルール、ブランチメモリバンク、グローバルメモリバンク）の取得に失敗した場合は、エラーを返します。

## テスト方法

実装後、以下のようなコマンドでテストできます：

```bash
# すべての情報を取得
curl -X POST -H "Content-Type: application/json" -d '{"name":"read_context","arguments":{"branch":"feature/example","language":"ja"}}' http://localhost:3000/api/mcp

# ルールのみを取得
curl -X POST -H "Content-Type: application/json" -d '{"name":"read_context","arguments":{"includeBranchMemory":false,"includeGlobalMemory":false,"language":"ja"}}' http://localhost:3000/api/mcp

# グローバルメモリバンクのみを取得
curl -X POST -H "Content-Type: application/json" -d '{"name":"read_context","arguments":{"includeBranchMemory":false,"language":"ja"}}' http://localhost:3000/api/mcp

# ブランチメモリバンクとグローバルメモリバンクを取得
curl -X POST -H "Content-Type: application/json" -d '{"name":"read_context","arguments":{"branch":"feature/example","includeRules":false}}' http://localhost:3000/api/mcp
```

## エラーケースのテスト

以下のようなエラーケースもテストする必要があります：

```bash
# ブランチ名が指定されていない場合（エラーになるはず）
curl -X POST -H "Content-Type: application/json" -d '{"name":"read_context","arguments":{"language":"ja"}}' http://localhost:3000/api/mcp

# 無効な言語が指定されている場合（エラーになるはず）
curl -X POST -H "Content-Type: application/json" -d '{"name":"read_context","arguments":{"branch":"feature/example","language":"fr"}}' http://localhost:3000/api/mcp
```

## 次のステップ

この実装が完了したら、以下の作業を行うことをお勧めします：

1. 単体テストの作成
2. 統合テストの作成
3. ドキュメントの更新
4. ユーザーガイドへの追加
