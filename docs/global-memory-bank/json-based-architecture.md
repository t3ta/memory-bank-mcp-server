# Memory Bank 2.0: JSON ベースアーキテクチャ詳細設計

tags: #architecture #json #design #version-2

## 概要

このドキュメントは Memory Bank 2.0 のJSON専用アーキテクチャの詳細設計を記述します。バージョン2.0では、Markdownサポートを完全に廃止し、JSONをデータ保存形式として一本化します。

## データモデル

### 基本スキーマ構造

Memory Bank 2.0のすべてのドキュメントは、以下の基本構造に従います：

```typescript
interface BaseJsonDocument {
  schema: string;         // 例: "memory_document_v2"
  metadata: {
    id: string;           // ドキュメント一意識別子 (UUID v4)
    title: string;        // ドキュメントタイトル
    documentType: string; // ドキュメントタイプ識別子
    path: string;         // 相対パス
    tags: string[];       // タグ配列
    created: string;      // 作成日時 (ISO 8601)
    lastModified: string; // 最終更新日時 (ISO 8601)
    version: number;      // ドキュメントバージョン (1から開始)
  };
  content: Record<string, unknown>; // ドキュメントタイプ固有のコンテンツ
}
```

### ドキュメント ID

各ドキュメントは一意のIDを持ち、ファイル名や相対パスが変更されても追跡可能にします。
これにより将来的なデータベース移行も容易になります。

### コアドキュメントタイプ

#### ブランチコンテキスト

```typescript
interface BranchContextContent {
  branchName: string;     // ブランチ名
  purpose: string;        // 目的説明
  createdAt: string;      // ブランチ作成日時 (ISO 8601)
  userStories: {
    id: string;           // ストーリーID (UUID v4)
    description: string;  // ストーリー説明
    completed: boolean;   // 完了フラグ
    priority: number;     // 優先度 (1-5)
  }[];
  additionalNotes?: string; // 追加メモ (オプション)
}
```

#### アクティブコンテキスト

```typescript
interface ActiveContextContent {
  currentWork: string;    // 現在の作業内容
  recentChanges: {
    date: string;         // 変更日時 (ISO 8601)
    description: string;  // 変更内容
  }[];
  activeDecisions: {
    id: string;           // 決定ID (UUID v4)
    description: string;  // 決定内容
    reason?: string;      // 決定理由 (オプション)
  }[];
  considerations: {
    id: string;           // 検討項目ID (UUID v4)
    description: string;  // 検討内容
    status: 'open' | 'resolved' | 'deferred'; // 状態
  }[];
  nextSteps: {
    id: string;           // ステップID (UUID v4)
    description: string;  // 次のステップ
    priority: 'low' | 'medium' | 'high'; // 優先度
  }[];
}
```

#### 進捗状況

```typescript
interface ProgressContent {
  workingFeatures: {
    id: string;           // 機能ID (UUID v4)
    description: string;  // 機能説明
    implementedAt: string; // 実装日時 (ISO 8601)
  }[];
  pendingImplementation: {
    id: string;           // 実装予定ID (UUID v4)
    description: string;  // 実装予定内容
    priority: 'low' | 'medium' | 'high'; // 優先度
    estimatedCompletion?: string; // 完了予定日 (オプション)
  }[];
  status: 'planning' | 'in-development' | 'testing' | 'completed'; // 全体状態
  completionPercentage: number; // 完了率 (0-100)
  knownIssues: {
    id: string;           // 問題ID (UUID v4)
    description: string;  // 問題説明
    severity: 'low' | 'medium' | 'high' | 'critical'; // 重要度
    workaround?: string;  // 回避策 (オプション)
  }[];
}
```

#### システムパターン

```typescript
interface SystemPatternsContent {
  technicalDecisions: {
    id: string;           // 決定ID (UUID v4)
    title: string;        // タイトル
    context: string;      // コンテキスト
    decision: string;     // 決定内容
    consequences: {
      positive: string[]; // ポジティブな影響
      negative: string[]; // ネガティブな影響
    };
    status: 'proposed' | 'accepted' | 'deprecated'; // 状態
    date: string;         // 決定日時 (ISO 8601)
    alternatives?: {      // 検討した代替案 (オプション)
      description: string;
      reason: string;     // 採用しなかった理由
    }[];
  }[];
  implementationPatterns?: { // 実装パターン (オプション)
    id: string;           // パターンID (UUID v4)
    name: string;         // パターン名
    description: string;  // 説明
    useCases: string[];   // ユースケース
    codeExample?: string; // コード例 (オプション)
  }[];
}
```

### タグシステム

タグは単純な文字列配列としてメタデータに格納されます。タグ検索を効率化するために、以下の拡張機能を導入します：

1. インデックス生成 - すべてのタグとドキュメントIDのマッピングを持つインデックスファイル
2. 階層タグ - ドット表記による階層構造（例: `feature.ui`, `feature.api`）
3. タググループ - 関連タグのグループ化とエイリアス

## ファイルシステム構造

### 基本ディレクトリ構造

```
docs/
  ├── branch-memory-bank/
  │   ├── feature-xxx/
  │   │   ├── index.json           # ブランチインデックス
  │   │   ├── branchContext.json   # ブランチコンテキスト
  │   │   ├── activeContext.json   # アクティブコンテキスト
  │   │   ├── progress.json        # 進捗状況
  │   │   ├── systemPatterns.json  # システムパターン
  │   │   └── ..                  # その他ドキュメント
  │   └── ..
  ├── global-memory-bank/
  │   ├── index.json               # グローバルインデックス
  │   ├── architecture.json        # アーキテクチャ
  │   ├── coding-standards.json    # コーディング規約
  │   └── ..                      # その他ドキュメント
  └── .index/                      # インデックスディレクトリ
      ├── tags.json                # タグインデックス
      ├── documents.json           # ドキュメントメタデータ
      └── relations.json           # ドキュメント関係
```

### インデックスファイル

各メモリバンクはインデックスファイルを持ち、含まれるすべてのドキュメントのメタデータの概要を提供します：

```typescript
interface MemoryBankIndex {
  name: string;           // メモリバンク名
  path: string;           // 相対パス
  lastUpdated: string;    // 最終更新日時 (ISO 8601)
  documents: {
    id: string;           // ドキュメントID
    title: string;        // タイトル
    path: string;         // 相対パス
    documentType: string; // ドキュメントタイプ
    tags: string[];       // タグ配列
    lastModified: string; // 最終更新日時
  }[];
}
```

## データアクセスレイヤー

### リポジトリインターフェイス

```typescript
interface IMemoryDocumentRepository {
  // 基本CRUD操作
  findById(id: string): Promise<JsonDocument | null>;
  findByPath(path: DocumentPath): Promise<JsonDocument | null>;
  save(document: JsonDocument): Promise<void>;
  delete(id: string): Promise<boolean>;

  // 検索・クエリ操作
  list(): Promise<DocumentMetadata[]>;
  findByTags(tags: string[], matchAll?: boolean): Promise<JsonDocument[]>;
  search(query: string): Promise<DocumentMetadata[]>;

  // インデックス操作
  updateIndex(): Promise<void>;
  getIndex(): Promise<MemoryBankIndex>;
}
```

### ファイルシステム実装

```typescript
class FileSystemJsonDocumentRepository implements IMemoryDocumentRepository {
  constructor(
    private readonly basePath: string,
    private readonly fileSystemService: IFileSystemService,
    private readonly indexService: IIndexService
  ) {}

  // 実装詳細
  // ..
}
```

### インデックスサービス

```typescript
interface IIndexService {
  buildDocumentIndex(basePath: string): Promise<void>;
  buildTagIndex(basePath: string): Promise<void>;
  findDocumentsByTag(tag: string): Promise<string[]>; // ドキュメントID配列を返す
  findRelatedDocuments(documentId: string): Promise<string[]>;
  addDocument(document: JsonDocument): Promise<void>;
  removeDocument(documentId: string): Promise<void>;
  updateDocument(document: JsonDocument): Promise<void>;
}
```

## ドメインロジック

### エンティティ

```typescript
class JsonDocument {
  private readonly props: JsonDocumentProps;

  constructor(props: JsonDocumentProps) {
    this.props = {
      ..props,
      metadata: {
        ..props.metadata,
        lastModified: new Date().toISOString()
      }
    };
  }

  static create(props: JsonDocumentProps): JsonDocument {
    // バリデーションロジック
    return new JsonDocument(props);
  }

  static createFromRaw(raw: unknown): JsonDocument {
    // JSONの検証とパース
    // ZodまたはAjvでのスキーマ検証
    return new JsonDocument(validatedData);
  }

  // ゲッター、メソッド等
  get id(): string { /* .. */ }
  get type(): string { /* .. */ }
  get content(): Record<string, unknown> { /* .. */ }

  hasTag(tag: string): boolean { /* .. */ }
  addTag(tag: string): JsonDocument { /* .. */ }
  removeTag(tag: string): JsonDocument { /* .. */ }

  updateContent(content: Record<string, unknown>): JsonDocument { /* .. */ }

  // シリアライズ
  toJSON(): Record<string, unknown> { /* .. */ }

  // プレゼンテーション用にMarkdown形式に変換（オプション）
  toMarkdown(): string { /* .. */ }
}
```

### 値オブジェクト

```typescript
class DocumentId {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(): DocumentId {
    return new DocumentId(uuid.v4());
  }

  static fromString(value: string): DocumentId {
    // UUIDバリデーション
    return new DocumentId(value);
  }

  toString(): string {
    return this.value;
  }
}

class DocumentPath {
  // 既存実装を修正
}
```

## アプリケーションレイヤー

### ユースケース

```typescript
// 例: ドキュメント読み取りユースケース
interface ReadDocumentInput {
  documentId?: string;
  path?: string;
}

interface ReadDocumentOutput {
  document: JsonDocument;
}

class ReadDocumentUseCase implements IUseCase<ReadDocumentInput, ReadDocumentOutput> {
  constructor(
    private readonly documentRepository: IMemoryDocumentRepository
  ) {}

  async execute(input: ReadDocumentInput): Promise<ReadDocumentOutput> {
    // IDまたはパスでの検索ロジック
    // ..
  }
}
```

### コンバーター

JSONからMarkdownへの一方向変換機能は維持し、表示用途に限定使用します：

```typescript
class JsonToMarkdownConverter {
  static convert(document: JsonDocument): string {
    // ドキュメントタイプに基づく変換ロジック
    // ..
  }

  private static convertBranchContext(document: JsonDocument): string { /* .. */ }
  private static convertActiveContext(document: JsonDocument): string { /* .. */ }
  private static convertProgress(document: JsonDocument): string { /* .. */ }
  private static convertSystemPatterns(document: JsonDocument): string { /* .. */ }
}
```

## インターフェースレイヤー

### CLI コマンド

```typescript
// 例: JSONドキュメント作成コマンド
class CreateJsonDocumentCommand {
  static register(program: Command): void {
    program
      .command('create')
      .description('Create a new JSON document')
      .option('-t, --type <type>', 'Document type')
      .option('-p, --path <path>', 'Document path')
      .option('--tags <tags>', 'Comma-separated tags')
      .action(async (options) => {
        // コマンド実行ロジック
        // ..
      });
  }
}
```

### 対話型エディタ

```typescript
class JsonDocumentEditor {
  static async edit(document: JsonDocument): Promise<JsonDocument> {
    // ドキュメントを一時ファイルに保存
    // ユーザーの好みのエディタでの編集を許可
    // 編集後のJSONを検証
    // 新しいドキュメントインスタンスを返す
  }
}
```

## マイグレーション

### マイグレーションスクリプト

```typescript
class MarkdownToJsonMigrator {
  constructor(
    private readonly sourceDir: string,
    private readonly targetDir: string,
    private readonly logger: ILogger
  ) {}

  async migrate(): Promise<MigrationResult> {
    // 1. すべてのMarkdownファイルをスキャン
    // 2. ファイルタイプに基づいて適切なコンバーターを選択
    // 3. JSONに変換
    // 4. バリデーション
    // 5. 新しい場所に保存
    // 6. インデックスを更新
    // 7. 結果を返す
  }

  private async migrateFile(filePath: string): Promise<boolean> {
    // 個別ファイルマイグレーションロジック
  }

  private determineDocumentType(filePath: string, content: string): string {
    // ファイル名とコンテンツに基づくドキュメントタイプの特定
  }
}
```

### バリデーションと検証

```typescript
class MigrationValidator {
  static validate(originalMarkdown: string, convertedJson: JsonDocument): ValidationResult {
    // 1. JSONスキーマ検証
    // 2. 必須フィールドの確認
    // 3. コンテンツの整合性チェック
    // 4. タグの検証
  }

  static compare(originalMarkdown: string, convertedJson: JsonDocument): ComparisonResult {
    // マークダウンとJSONの内容比較
    // 情報損失の特定
  }
}
```

## バックアップとロールバック

```typescript
class MigrationBackup {
  static async backup(sourceDir: string, backupDir: string): Promise<void> {
    // ファイルシステムバックアップの作成
  }

  static async restore(backupDir: string, targetDir: string): Promise<void> {
    // バックアップからの復元
  }
}
```

## テスト戦略

### ユニットテスト

各コンポーネントの分離テスト：

1. JsonDocument エンティティのバリデーションとメソッド
2. リポジトリ実装
3. ユースケース
4. コンバーター

### 統合テスト

1. ファイルシステム操作を含むエンドツーエンドのフロー
2. インデックス生成と検索
3. CLIコマンド実行

### マイグレーションテスト

1. 代表的なMarkdownファイルの変換テスト
2. エッジケースの処理
3. 大規模変換のパフォーマンステスト

## パフォーマンス最適化

1. インデックスによる高速検索
2. 効率的なファイルアクセスパターン
3. キャッシング戦略
4. 大規模メモリバンクでの動作検証

## セキュリティ考慮事項

1. 入力検証
2. ファイルシステムアクセス制限
3. パスのサニタイズ
4. エラーメッセージでの情報漏洩防止

## デプロイメント戦略

1. フラグによる段階的ロールアウト
2. バージョンチェック
3. 自動バックアップ
4. アップグレードガイド

## 今後の展望

1. SurrealDB への移行パス
2. リアルタイム協調編集
3. REST/GraphQL API
4. Web UI の構築
5. プラグイン拡張アーキテクチャ
