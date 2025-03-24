# ロギング改善計画 v2

## アーキテクチャの分析

### 現状のアーキテクチャ
- クリーンアーキテクチャに基づく層の分離
  - Domain層
  - Application層
  - Infrastructure層
  - Interface層
- 各層でのインターフェース駆動設計
- プレゼンター・コントローラーパターンの採用

### 既存のロギング実装
1. 基本ロガーインターフェース（Logger）
```typescript
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}
```

2. CLIロガー（src/shared/utils/logger/cli.ts）
- カスタマイズされた出力フォーマット
- 色付きの出力サポート

## 問題点

1. アーキテクチャとの不整合
- console.log/errorの直接使用がクリーンアーキテクチャの原則に違反
- 各層の関心事の分離が不十分

2. ログ出力の混在
- JSONレスポンスと通常ログの混在
- デバッグ情報とビジネスログの未分離

3. テスト容易性の低さ
- ログ出力のモック化が困難
- テストでのログ検証が不可能

## 改善計画

### 1. コアロギングインターフェースの再設計

```typescript
export interface ILogger {
  // 基本ログメソッド
  log(level: LogLevel, message: string, context?: LogContext): void;

  // ユーティリティメソッド
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;

  // ログレベル制御
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;

  // コンテキスト管理
  withContext(context: LogContext): ILogger;
}

export interface LogContext {
  [key: string]: unknown;
}

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}
```

### 2. 専用ロガーの実装

1. JsonLogger
```typescript
export class JsonLogger implements ILogger {
  private format(message: string, context?: LogContext): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      message,
      ...context
    });
  }
}
```

2. FileLogger
```typescript
export class FileLogger implements ILogger {
  constructor(private readonly logPath: string) {}

  private async write(entry: LogEntry): Promise<void> {
    // ファイルへの非同期書き込み
  }
}
```

3. ConsoleLogger
```typescript
export class ConsoleLogger implements ILogger {
  constructor(private readonly options: ConsoleLoggerOptions) {}

  private formatWithColors(level: LogLevel, message: string): string {
    // 色付きフォーマット
  }
}
```

### 3. ロガーファクトリーの実装

```typescript
export class LoggerFactory {
  static createLogger(type: LoggerType, config: LoggerConfig): ILogger {
    switch (type) {
      case LoggerType.JSON:
        return new JsonLogger(config);
      case LoggerType.FILE:
        return new FileLogger(config);
      case LoggerType.CONSOLE:
        return new ConsoleLogger(config);
      default:
        throw new Error(`Unknown logger type: ${type}`);
    }
  }
}
```

## 実装フェーズ

### フェーズ1: 基盤整備（1週目）
1. ILoggerインターフェースの実装
2. 各種ロガーの実装
3. LoggerFactoryの実装
4. 設定システムの整備

### フェーズ2: 既存コードの修正（2-3週目）
1. Domain層の修正
   - エンティティでのログ出力をILoggerに置き換え
   - ドメインイベントのログ記録

2. Application層の修正
   - ユースケースでのログ出力の標準化
   - トランザクション境界でのログ記録

3. Infrastructure層の修正
   - リポジトリでのログ出力の改善
   - 外部サービス呼び出しのログ記録

4. Interface層の修正
   - コントローラーでのログ出力の統一
   - プレゼンターでのレスポンス形式の標準化

### フェーズ3: テストとドキュメント（4週目）
1. ロギングに関するユニットテストの作成
2. 統合テストの更新
3. ドキュメントの更新

## 移行戦略

1. グラデュアルな移行
- 新規コードには新しいロギングシステムを使用
- 既存コードは計画的に移行
- 重要度の高いコンポーネントから順次移行

2. 並行運用期間の設定
- 一定期間は両方のログシステムを維持
- 移行完了後に古いシステムを削除

3. モニタリングとフィードバック
- ログ品質の監視
- パフォーマンスへの影響測定
- 開発者フィードバックの収集

## 期待される効果

1. アーキテクチャの整合性向上
- クリーンアーキテクチャの原則との整合
- 関心事の適切な分離
- テスト容易性の向上

2. 運用性の向上
- 構造化されたログ
- 効率的なログ検索
- 環境別の適切なログレベル制御

3. 開発効率の向上
- 標準化されたログインターフェース
- コンテキスト付きのログ記録
- 型安全なログ出力
