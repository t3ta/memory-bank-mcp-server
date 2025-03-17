# システムパターン

## 技術的な決定事項

### サンプルJSON設計

#### 背景
各ドキュメントタイプの実用的なサンプルを提供し、新しいアーキテクチャの理解を促進する必要がありました。

#### 決定内容
```json
{
  "schema": "memory_document_v2",
  "metadata": {
    "path": "docs/branch-memory-bank/feature-example/branchContext.json",
    "title": "Example Branch Context",
    "documentType": "branch_context",
    "id": "example-branch-context-001",
    "tags": ["example", "branch-context", "documentation"],
    "lastModified": "2025-03-16T11:53:00.000Z",
    "createdAt": "2025-03-16T11:53:00.000Z",
    "version": 1
  },
  "content": {
    "purpose": "サンプルブランチコンテキストを提供する",
    "userStories": [
      {
        "type": "challenge",
        "description": "実際の使用例が必要"
      },
      {
        "type": "feature",
        "description": "具体的な実装パターンの提示"
      }
    ]
  }
}
```

#### 影響
- 実装パターンの明確化
- 学習曲線の緩和
- コード品質の標準化
- ドキュメントの充実

### ドキュメント構造

#### 背景
JSONスキーマと使用方法を分かりやすく説明するドキュメント構造が必要でした。

#### 決定内容
```markdown
# JSONスキーマドキュメント

## 基本構造
\`\`\`typescript
interface BaseJsonDocument {
  schema: "memory_document_v2";
  metadata: DocumentMetadata;
  content: Record<string, unknown>;
}
\`\`\`

## メタデータ
\`\`\`typescript
interface DocumentMetadata {
  path: string;     // ドキュメントパス
  title: string;    // タイトル
  documentType: string; // ドキュメントタイプ
  id: string;       // 一意のID
  tags: string[];   // タグリスト
  lastModified: string; // 最終更新日時
  createdAt: string;    // 作成日時
  version: number;      // バージョン
}
\`\`\`

## 使用例
\`\`\`typescript
const doc: BaseJsonDocument = {
  schema: "memory_document_v2",
  metadata: {
    // メタデータ
  },
  content: {
    // コンテンツ
  }
};
\`\`\`
```

#### 影響
- 理解の促進
- 実装の一貫性
- エラーの防止
- メンテナンス性の向上

### マイグレーションガイド

#### 背景
既存のMarkdownファイルからJSONへの移行手順を明確に示す必要がありました。

#### 決定内容
```typescript
// マイグレーション手順の例
const migrationSteps = {
  1: {
    title: "バックアップの作成",
    command: "npm run backup",
    validation: "バックアップファイルの存在確認"
  },
  2: {
    title: "Markdownの解析",
    command: "npm run analyze",
    validation: "解析結果の確認"
  },
  3: {
    title: "JSON変換",
    command: "npm run convert",
    validation: "スキーマ検証"
  },
  4: {
    title: "検証",
    command: "npm run validate",
    validation: "すべてのテストが成功"
  }
};

// 進捗管理
interface MigrationProgress {
  totalFiles: number;
  converted: number;
  validated: number;
  errors: MigrationError[];
}
```

#### 影響
- 移行プロセスの明確化
- エラーの最小化
- 進捗の可視化
- ロールバック手順の提供
