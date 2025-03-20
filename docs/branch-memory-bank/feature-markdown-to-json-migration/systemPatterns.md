# システムパターン

## 技術的判断

### マイグレーションアーキテクチャの選択

**コンテキスト**: Markdownファイルから新しいJSON形式へのマイグレーションを行うため、効率的で信頼性の高いアーキテクチャが必要です。

**判断**: ストラテジーパターンを採用し、各ドキュメントタイプに特化した変換ロジックを実装します。また、コマンドパターンを使用してマイグレーションプロセスをカプセル化します。

**理由**:
- ドキュメントタイプごとに異なる変換ロジックが必要
- 将来的に新しいドキュメントタイプが追加される可能性がある
- マイグレーションプロセスの一貫性と再利用性を確保するため

### バックアップとロールバック戦略

**コンテキスト**: マイグレーション中に問題が発生した場合、データ損失を防ぐためのバックアップとロールバック機能が必要です。

**判断**: トランザクション的なアプローチを採用し、以下のプロセスを実装します：
1. マイグレーション開始前に全ドキュメントのバックアップを作成
2. マイグレーション中のエラーを検出し、記録
3. エラー発生時または明示的な要求に応じてバックアップからロールバック

**理由**:
- データ安全性の確保
- 失敗したマイグレーションの容易な復旧
- 部分的成功の状況でも一貫性を維持

### JSON形式の検証方法

**コンテキスト**: 生成されたJSONファイルが正しいスキーマに準拠していることを確認する必要があります。

**判断**: Zodを使用して型安全な検証を実装します。既存のスキーマ定義を活用し、マイグレーション前後で検証を行います。

**理由**:
- TypeScriptとの統合が容易
- スキーマとの一貫性を確保
- エラーメッセージの詳細さ

## 関連するファイルやディレクトリ構造

### コアコンポーネント

```
src/
  migration/                          # マイグレーション関連のコンポーネント
    MarkdownToJsonMigrator.ts         # メインのマイグレーターロジック
    MigrationValidator.ts             # JSONスキーマ検証ロジック
    MigrationBackup.ts                # バックアップと復元機能
    converters/                       # ドキュメントタイプ別の変換ロジック
      BaseConverter.ts                # 基本変換インターフェース
      BranchContextConverter.ts       # branchContext用コンバーター
      ActiveContextConverter.ts       # activeContext用コンバーター
      SystemPatternsConverter.ts      # systemPatterns用コンバーター
      ProgressConverter.ts            # progress用コンバーター
      GenericConverter.ts             # 一般的なドキュメント用コンバーター
    utils/                            # ユーティリティ関数
      MarkdownParser.ts               # Markdownパースユーティリティ
      TypeDetector.ts                 # ドキュメントタイプ検出
  cli/
    commands/
      migration/
        MigrateCommand.ts             # マイグレーションのCLIコマンド
  schemas/                            # 既存のJSONスキーマ定義
    v2/
      json-document.ts                # JSONドキュメントスキーマ
```

### テスト構造

```
test/
  unit/
    migration/
      MarkdownToJsonMigrator.test.ts
      MigrationValidator.test.ts
      MigrationBackup.test.ts
      converters/
        BranchContextConverter.test.ts
        ActiveContextConverter.test.ts
        SystemPatternsConverter.test.ts
        ProgressConverter.test.ts
        GenericConverter.test.ts
  integration/
    migration/
      migration-flow.test.ts
```

## クラス設計

### MarkdownToJsonMigrator

メイン機能を提供するクラスで、マイグレーションプロセス全体を制御します。

```typescript
export class MarkdownToJsonMigrator {
  constructor(
    private readonly backupService: MigrationBackup,
    private readonly validator: MigrationValidator,
    private readonly converterFactory: ConverterFactory,
    private readonly logger: Logger
  ) {}

  async migrateDirectory(directory: string, options: MigrationOptions): Promise<MigrationResult>;
  async migrateFile(filePath: string, options: MigrationOptions): Promise<MigrationResult>;
  private async detectDocumentType(content: string, path: string): Promise<DocumentType>;
  // ..その他の内部メソッド
}
```

### ConverterFactory

ドキュメントタイプに応じた適切なコンバーターを提供するファクトリークラス。

```typescript
export class ConverterFactory {
  getConverter(documentType: DocumentType): BaseConverter;
}
```

### BaseConverter

すべてのコンバーターが実装する基本インターフェース。

```typescript
export interface BaseConverter {
  convert(markdownContent: string, path: string): JsonDocument;
}
```

### MigrationBackup

バックアップと復元機能を提供するクラス。

```typescript
export class MigrationBackup {
  async createBackup(directory: string): Promise<string>; // バックアップディレクトリのパスを返す
  async restoreFromBackup(backupPath: string, targetDir: string): Promise<boolean>;
}
```

### MigrationValidator

生成されたJSONの検証を行うクラス。

```typescript
export class MigrationValidator {
  validateJson(jsonContent: unknown, documentType: DocumentType): ValidationResult;
}
```
