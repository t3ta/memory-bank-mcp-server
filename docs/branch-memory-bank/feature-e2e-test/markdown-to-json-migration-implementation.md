# Markdown→JSON移行実装

## 実装概要

Markdownドキュメント形式からJSON形式への移行を進めるため、以下の機能を実装しました：

1. **Markdown書き込み禁止機能**
2. **マイグレーション設定管理**
3. **ユースケースファクトリー**
4. **テストケース**

## 実装内容

### 1. WriteBranchDocumentUseCaseの拡張

`WriteBranchDocumentUseCase`クラスに`disableMarkdownWrites`オプションを追加し、Markdownファイルへの書き込みを制御できるようにしました。

```typescript
constructor(
  private readonly branchRepository: IBranchMemoryBankRepository,
  options?: {
    /**
     * Whether to disable Markdown writes
     * @default false
     */
    disableMarkdownWrites?: boolean;
  }
) {
  this.disableMarkdownWrites = options?.disableMarkdownWrites ?? false;
}
```

ドキュメントパスが`.md`で終わる場合、設定に基づいてエラーを投げるようにしました：

```typescript
// Check if markdown writes are disabled
if (this.disableMarkdownWrites && documentPath.isMarkdown) {
  const jsonPath = documentPath.value.replace(/\.md$/, '.json');
  throw new ApplicationError(
    ApplicationErrorCodes.OPERATION_NOT_ALLOWED,
    `Writing to Markdown files is disabled. Please use JSON format instead: ${jsonPath}`
  );
}
```

### 2. マイグレーション設定ファイル

`src/config/migration-config.ts`に設定ファイルを作成し、マイグレーション関連の設定を一元管理できるようにしました。

```typescript
export interface MigrationConfig {
  disableMarkdownWrites: boolean;
  enableAutoMigration: boolean;
  forceJsonFormat: boolean;
  showMigrationNotices: boolean;
}
```

環境変数による設定切替も実装：

```typescript
export function getMigrationConfig(): MigrationConfig {
  return {
    disableMarkdownWrites: process.env.NODE_ENV === 'production' || 
                           process.env.DISABLE_MARKDOWN_WRITES === 'true',
    enableAutoMigration: process.env.ENABLE_AUTO_MIGRATION === 'true',
    forceJsonFormat: process.env.FORCE_JSON_FORMAT === 'true',
    showMigrationNotices: process.env.SHOW_MIGRATION_NOTICES !== 'false'
  };
}
```

### 3. ユースケースファクトリー

`src/factory/use-case-factory.ts`にファクトリークラスを実装しました。マイグレーション設定に基づいて適切なユースケースを提供します。

```typescript
export class UseCaseFactory {
  static createWriteBranchDocumentUseCase(
    branchRepository: IBranchMemoryBankRepository
  ): WriteBranchDocumentUseCase {
    return new WriteBranchDocumentUseCase(branchRepository, {
      disableMarkdownWrites: migrationConfig.disableMarkdownWrites
    });
  }
}
```

### 4. DIコンテナ設定の修正

`src/main/di/providers.ts`内の`writeBranchDocumentUseCase`ファクトリーをファクトリークラスを使用するように更新しました。

```typescript
container.registerFactory('writeBranchDocumentUseCase', () => {
  const branchRepository = container.get(
    'branchMemoryBankRepository'
  ) as FileSystemBranchMemoryBankRepository;

  // ファクトリーを使用してマイグレーション設定付きのUseCaseを取得
  return UseCaseFactory.createWriteBranchDocumentUseCase(branchRepository);
});
```

### 5. テスト実装

以下のテストケースを実装しました：

#### Markdown書き込みブロックテスト

`tests/integration/markdown-to-json/markdown-write-block.test.ts`

- 通常モードでのMarkdown書き込み
- 禁止モードでのMarkdown書き込み（エラー確認）
- JSON書き込み（成功確認）
- Markdown読み取り（成功確認）

#### マイグレーションテスト

`tests/integration/markdown-to-json/markdown-to-json-migration.test.ts`

- Markdownファイルの変換
- バックアップと復元
- 移行後の読み取り
- 既存ファイルの処理

#### JSON操作の完全性テスト

`tests/integration/markdown-to-json/json-operations-completeness.test.ts`

- 基本CRUD操作
- タグ管理
- 複雑なJSONデータ
- 特殊文字/エスケープシーケンス処理
- 大量データ処理

## 運用方針

1. 開発環境：デフォルトでMarkdown書き込み許可（柔軟な開発）
2. 本番環境：Markdown書き込み禁止（JSON移行を推進）
3. 将来的には段階的にMarkdown読み取りも制限

## 今後の課題

1. 自動マイグレーション機能の実装
2. 完全移行のためのデータ検証
3. YAMLフォーマットへの最終移行準備
