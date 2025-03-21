# Markdown から JSON への移行ガイド

tags: #migration #json #markdown #guide

## 概要

Memory Bank 2.0では、データ保存形式としてMarkdownからJSONに移行しています。このガイドでは、既存のMarkdownファイルをJSONに変換する方法と、新しいJSON形式の使用方法について説明します。

## 移行の背景

### なぜJSONに移行するのか

1. **構造化データの管理**: JSONはデータの構造を明示的に定義でき、バリデーションが容易
2. **多言語対応の強化**: 翻訳キーと翻訳テキストの分離が容易
3. **プログラムによるアクセスの改善**: JSONはプログラムから扱いやすい形式
4. **スキーマ検証**: JSONスキーマによる型チェックが可能

### 移行のタイムライン

- **現在**: 両方の形式をサポート（Markdownを優先）
- **移行期間**: 両方の形式をサポート（JSONを優先）
- **最終段階**: JSONのみをサポート

## 自動移行

Memory Bank 2.0では、Markdownファイルを自動的にJSONに変換する機能が組み込まれています。

### オートマイグレーション

MCPサーバー起動時に、自動的にMarkdownファイルをJSONに変換します。

1. サーバーがMarkdownファイルを検出
2. 対応するJSONファイルが存在しない場合、自動的に変換
3. 元のMarkdownファイルはバックアップとして保持

### 手動マイグレーション

`migrate`コマンドを使用して、手動で移行することもできます。

```bash
# 特定のディレクトリ内のすべてのMarkdownファイルを変換
memory-bank migrate --source ./docs/branch-memory-bank/feature-example

# 特定のファイルを変換
memory-bank migrate --file ./docs/global-memory-bank/architecture.md

# オプション
memory-bank migrate --help
```

#### 主なオプション

- `--backup`: バックアップを作成（デフォルト: true）
- `--overwrite`: 既存のJSONファイルを上書き（デフォルト: false）
- `--validate`: 生成されたJSONを検証（デフォルト: true）
- `--delete-originals`: 元のMarkdownファイルを削除（デフォルト: false）

## 新しいJSON形式

### 基本構造

すべてのJSONドキュメントは以下の基本構造に従います：

```json
{
  "schema": "memory_document_v2",
  "metadata": {
    "id": "unique-uuid",
    "title": "ドキュメントタイトル",
    "documentType": "document_type",
    "path": "relative/path.json",
    "tags": ["tag1", "tag2"],
    "lastModified": "2025-03-17T00:00:00Z",
    "createdAt": "2025-03-17T00:00:00Z",
    "version": 1
  },
  "content": {
    // ドキュメントタイプ固有のコンテンツ
  }
}
```

### コアドキュメントタイプ

#### ブランチコンテキスト (branchContext.json)

```json
{
  "schema": "memory_document_v2",
  "metadata": {
    "id": "branch-context-uuid",
    "title": "ブランチコンテキスト",
    "documentType": "branch_context",
    "path": "branchContext.json",
    "tags": ["branch-context", "feature-name"],
    "lastModified": "2025-03-17T00:00:00Z",
    "createdAt": "2025-03-17T00:00:00Z",
    "version": 1
  },
  "content": {
    "branchName": "feature/example",
    "purpose": "この機能の目的説明",
    "createdAt": "2025-03-17T00:00:00Z",
    "userStories": [
      {
        "id": "story-uuid",
        "description": "ユーザーストーリーの説明",
        "completed": false,
        "priority": 1
      }
    ],
    "additionalNotes": "追加メモ"
  }
}
```

#### アクティブコンテキスト (activeContext.json)

```json
{
  "schema": "memory_document_v2",
  "metadata": {
    "id": "active-context-uuid",
    "title": "アクティブコンテキスト",
    "documentType": "active_context",
    "path": "activeContext.json",
    "tags": ["active-context", "feature-name"],
    "lastModified": "2025-03-17T00:00:00Z",
    "createdAt": "2025-03-17T00:00:00Z",
    "version": 1
  },
  "content": {
    "currentWork": "現在の作業内容",
    "recentChanges": [
      {
        "date": "2025-03-17T00:00:00Z",
        "description": "変更内容"
      }
    ],
    "activeDecisions": [
      {
        "id": "decision-uuid",
        "description": "決定内容",
        "reason": "決定理由"
      }
    ],
    "considerations": [
      {
        "id": "consideration-uuid",
        "description": "検討内容",
        "status": "open"
      }
    ],
    "nextSteps": [
      {
        "id": "step-uuid",
        "description": "次のステップ",
        "priority": "high"
      }
    ]
  }
}
```

#### 進捗状況 (progress.json)

```json
{
  "schema": "memory_document_v2",
  "metadata": {
    "id": "progress-uuid",
    "title": "進捗状況",
    "documentType": "progress",
    "path": "progress.json",
    "tags": ["progress", "feature-name"],
    "lastModified": "2025-03-17T00:00:00Z",
    "createdAt": "2025-03-17T00:00:00Z",
    "version": 1
  },
  "content": {
    "workingFeatures": [
      {
        "id": "feature-uuid",
        "description": "機能説明",
        "implementedAt": "2025-03-17T00:00:00Z"
      }
    ],
    "pendingImplementation": [
      {
        "id": "pending-uuid",
        "description": "実装予定内容",
        "priority": "high",
        "estimatedCompletion": "2025-03-20T00:00:00Z"
      }
    ],
    "status": "in-development",
    "completionPercentage": 50,
    "knownIssues": [
      {
        "id": "issue-uuid",
        "description": "問題説明",
        "severity": "medium",
        "workaround": "回避策"
      }
    ]
  }
}
```

#### システムパターン (systemPatterns.json)

```json
{
  "schema": "memory_document_v2",
  "metadata": {
    "id": "system-patterns-uuid",
    "title": "システムパターン",
    "documentType": "system_patterns",
    "path": "systemPatterns.json",
    "tags": ["system-patterns", "feature-name"],
    "lastModified": "2025-03-17T00:00:00Z",
    "createdAt": "2025-03-17T00:00:00Z",
    "version": 1
  },
  "content": {
    "technicalDecisions": [
      {
        "id": "decision-uuid",
        "title": "タイトル",
        "context": "コンテキスト",
        "decision": "決定内容",
        "consequences": {
          "positive": ["ポジティブな影響"],
          "negative": ["ネガティブな影響"]
        },
        "status": "accepted",
        "date": "2025-03-17T00:00:00Z",
        "alternatives": [
          {
            "description": "代替案",
            "reason": "採用しなかった理由"
          }
        ]
      }
    ],
    "implementationPatterns": [
      {
        "id": "pattern-uuid",
        "name": "パターン名",
        "description": "説明",
        "useCases": ["ユースケース"],
        "codeExample": "コード例"
      }
    ]
  }
}
```

## テンプレートシステム

Memory Bank 2.0では、テンプレートシステムもJSON化されています。テンプレートの構造と翻訳コンテンツが分離され、多言語対応が強化されています。

### テンプレート構造

テンプレート構造は、`src/templates/json/`ディレクトリに保存されています。例えば、`rules.json`は以下のような構造になっています：

```json
{
  "schema": "template_v1",
  "metadata": {
    "id": "rules",
    "titleKey": "template.title.rules",
    "descriptionKey": "template.description.rules",
    "type": "system",
    "lastModified": "2025-03-17T11:49:00.000Z"
  },
  "content": {
    "sections": [
      {
        "id": "globalMemoryBank",
        "titleKey": "template.section.global_memory_bank",
        "contentKey": "template.content.global_memory_bank",
        "isOptional": false
      },
      // 他のセクション..
    ],
    "placeholders": {}
  }
}
```

### 翻訳ファイル

翻訳ファイルは、`src/infrastructure/i18n/translations/`ディレクトリに保存されています。例えば、`en.json`は以下のような構造になっています：

```json
{
  "language": "en",
  "translations": {
    "template.title.rules": "Memory Bank Rules",
    "template.description.rules": "Explanation of memory bank usage rules and structure",
    "template.section.global_memory_bank": "Global Memory Bank",
    "template.content.global_memory_bank": "The \"Global Memory Bank\" manages common knowledge..",
    // 他の翻訳..
  },
  "metadata": {
    "version": "1.0.0",
    "updatedAt": "2025-03-17T11:49:00.000Z"
  }
}
```

## 既存コードの更新

### ファイルパスの更新

Markdownファイルを参照しているコードを更新する必要があります。例えば：

```typescript
// 変更前
const mdFilePath = path.join(dirname, 'templates', `rules-${language}.md`);
const content = await fs.readFile(mdFilePath, 'utf-8');

// 変更後
const jsonFilePath = path.join(dirname, 'templates', 'json', `rules-${language}.json`);
const content = await fs.readFile(jsonFilePath, 'utf-8');
```

### パース処理の更新

Markdownをパースしているコードを更新する必要があります。例えば：

```typescript
// 変更前
const parsedContent = parseMarkdown(content);

// 変更後
const parsedContent = JSON.parse(content);
```

## トラブルシューティング

### 自動移行が失敗する場合

1. ログを確認して、エラーの原因を特定
2. 手動で移行を試みる
3. 問題が解決しない場合は、元のMarkdownファイルを修正して再試行

### JSONファイルが正しく読み込まれない場合

1. JSONの構文が正しいことを確認
2. スキーマに準拠していることを確認
3. ファイルパスが正しいことを確認

### 移行後にコンテンツが失われる場合

1. バックアップファイルを確認
2. 移行ログを確認
3. 手動で移行を再試行

## サポートとフィードバック

移行に関する問題やフィードバックは、以下の方法で報告してください：

- GitHub Issues: [https://github.com/example/memory-bank/issues](https://github.com/example/memory-bank/issues)
- メール: support@example.com

## 参考資料

- [JSON Schema](https://json-schema.org/)
- [Memory Bank 2.0: JSON ベースアーキテクチャ詳細設計](/docs/global-memory-bank/json-based-architecture.md)
- [テンプレートシステムのJSON化と多言語対応 - 設計仕様書](/docs/global-memory-bank/template-system-json-i18n-design.md)
