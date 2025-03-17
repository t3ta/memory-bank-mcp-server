# `read_context`コマンド設計書

tags: #design #mcp #command #context #v2

## 1. 概要

本ドキュメントは、Memory Bank MCPサーバーに新たに追加する`read_context`コマンドの設計を定義します。このコマンドは、現在別々のコマンドで取得している「ルール」、「ブランチメモリバンク」、「グローバルメモリバンク」の情報を一度に取得できるようにするものです。

## 2. 背景と目的

現在のMemory Bank MCPサーバーでは、以下のコマンドを使って各種情報を取得しています：

- `read_rules`: メモリバンクのルールを取得
- `read_branch_core_files`: ブランチメモリバンクのコアファイルを取得
- `read_global_core_files`: グローバルメモリバンクのコアファイルを取得

これらのコマンドを個別に実行する必要があり、コンテキスト全体を把握するためには複数のコマンドを実行する必要があります。`read_context`コマンドは、これらの情報を一度に取得できるようにすることで、より効率的なコンテキスト取得を可能にします。

## 3. コマンド仕様

### 3.1 コマンド名

```
read_context
```

### 3.2 入力パラメータ

| パラメータ名 | 型 | 必須 | デフォルト値 | 説明 |
|------------|----|----|------------|------|
| branch | string | △ | なし | ブランチ名（`includeBranchMemory`がtrueの場合は必須） |
| language | string | × | 'ja' | 言語コード（'en'または'ja'） |
| includeRules | boolean | × | true | ルールを含めるかどうか |
| includeBranchMemory | boolean | × | true | ブランチメモリバンクを含めるかどうか |
| includeGlobalMemory | boolean | × | true | グローバルメモリバンクを含めるかどうか |

### 3.3 出力

```json
{
  "rules": {
    "content": "ルールの内容（Markdown形式）"
  },
  "branchMemory": {
    "branchContext.md": {
      "path": "branchContext.md",
      "content": "ブランチコンテキストの内容",
      "tags": ["core", "branch-context"],
      "lastModified": "2025-03-17T00:00:00Z"
    },
    "activeContext.md": {
      "path": "activeContext.md",
      "content": "アクティブコンテキストの内容",
      "tags": ["core", "active-context"],
      "lastModified": "2025-03-17T00:00:00Z"
    },
    "systemPatterns.md": {
      "path": "systemPatterns.md",
      "content": "システムパターンの内容",
      "tags": ["core", "system-patterns"],
      "lastModified": "2025-03-17T00:00:00Z"
    },
    "progress.md": {
      "path": "progress.md",
      "content": "進捗状況の内容",
      "tags": ["core", "progress"],
      "lastModified": "2025-03-17T00:00:00Z"
    }
  },
  "globalMemory": {
    "architecture.md": {
      "path": "architecture.md",
      "content": "アーキテクチャの内容",
      "tags": ["core", "architecture"],
      "lastModified": "2025-03-17T00:00:00Z"
    },
    "coding-standards.md": {
      "path": "coding-standards.md",
      "content": "コーディング規約の内容",
      "tags": ["core", "coding-standards"],
      "lastModified": "2025-03-17T00:00:00Z"
    },
    "domain-models.md": {
      "path": "domain-models.md",
      "content": "ドメインモデルの内容",
      "tags": ["core", "domain-models"],
      "lastModified": "2025-03-17T00:00:00Z"
    },
    "glossary.md": {
      "path": "glossary.md",
      "content": "用語集の内容",
      "tags": ["core", "glossary"],
      "lastModified": "2025-03-17T00:00:00Z"
    },
    "tech-stack.md": {
      "path": "tech-stack.md",
      "content": "技術スタックの内容",
      "tags": ["core", "tech-stack"],
      "lastModified": "2025-03-17T00:00:00Z"
    },
    "user-guide.md": {
      "path": "user-guide.md",
      "content": "ユーザーガイドの内容",
      "tags": ["core", "user-guide"],
      "lastModified": "2025-03-17T00:00:00Z"
    }
  }
}
```

各セクション（`rules`、`branchMemory`、`globalMemory`）は、対応するパラメータ（`includeRules`、`includeBranchMemory`、`includeGlobalMemory`）がfalseの場合は出力に含まれません。

## 4. 実装詳細

### 4.1 ブランチパラメータの扱い

安全性を優先し、ブランチの自動検出は行いません。`includeBranchMemory`がtrueの場合は、`branch`パラメータを必須とします。`branch`パラメータが指定されていない場合は、明確なエラーメッセージを返します。

これは、MCPサーバーが起動しているディレクトリと実際のプロジェクトディレクトリが異なる可能性があり、自動検出を行うと誤ったブランチ情報を取得してしまう可能性があるためです。

### 4.2 `src/index.ts`への追加

`src/index.ts`ファイルの`AVAILABLE_TOOLS`配列に新しいコマンド定義を追加します：

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

また、`CallToolRequestSchema`ハンドラーのswitch文に新しいケースを追加します。詳細な実装は実装ガイドを参照してください。

### 4.3 エラーハンドリング

- `includeBranchMemory`がtrueで`branch`パラメータが指定されていない場合は、エラーを返します。
- 言語が'en'または'ja'以外の場合は、エラーを返します。
- アプリケーションが初期化されていない場合は、エラーを返します。
- 各コンポーネント（ルール、ブランチメモリバンク、グローバルメモリバンク）の取得に失敗した場合は、エラーを返します。

### 4.4 パフォーマンス考慮事項

- 複数のコンポーネントを一度に取得するため、処理時間が長くなる可能性があります。
- 必要なコンポーネントのみを取得するために、`includeRules`、`includeBranchMemory`、`includeGlobalMemory`パラメータを提供しています。

## 5. テスト計画

### 5.1 単体テスト

- 各パラメータの組み合わせでコマンドが正しく動作することを確認します。
- エラーケースが適切に処理されることを確認します。
- `includeBranchMemory`がtrueで`branch`パラメータが指定されていない場合のエラーハンドリングを確認します。

### 5.2 統合テスト

- 実際のメモリバンク環境でコマンドを実行し、正しい結果が返されることを確認します。
- 大量のデータがある場合のパフォーマンスを確認します。
- 様々なパラメータの組み合わせでのテストを行います。

## 6. 今後の拡張性

- JSON形式のドキュメントサポートが追加された場合は、それらも含めるようにコマンドを拡張できます。
- 将来的に新しいタイプのメモリバンクが追加された場合は、それらも含めるようにコマンドを拡張できます。
- 将来的に安全なブランチ自動検出の仕組みが実装された場合は、それを利用するようにコマンドを拡張できます。

## 7. 結論

`read_context`コマンドは、Memory Bank MCPサーバーのユーザビリティを向上させ、より効率的なコンテキスト取得を可能にします。このコマンドにより、ユーザーは一度のコマンド実行で必要なすべてのコンテキスト情報を取得できるようになります。安全性を優先し、ブランチの自動検出は行わず、明示的にブランチ名を指定する必要がありますが、これにより誤ったブランチ情報を取得するリスクを回避できます。
