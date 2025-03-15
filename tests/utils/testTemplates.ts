/**
 * Test templates for memory bank files
 * 
 * This file contains template content used in tests to simulate
 * the memory bank file structure and content.
 */

// Template for branch context file
export const branchContextTemplate = `# ブランチコンテキスト

## 目的

ブランチ: {branchName}
作成日時: {timestamp}

## ユーザーストーリー

- [ ] 解決する課題を定義
- [ ] 必要な機能を記述
- [ ] 期待される動作を明記
`;

// Template for active context file
export const activeContextTemplate = `# アクティブコンテキスト

## 現在の作業内容

## 最近の変更点

## アクティブな決定事項

## 検討事項

## 次のステップ
`;

// Template for system patterns file
export const systemPatternsTemplate = `# システムパターン

## 技術的決定事項

## 関連ファイルとディレクトリ構造
`;

// Template for progress file
export const progressTemplate = `# 進捗状況

## 動作している機能

## 未実装の機能

## 現在の状態

## 既知の問題
`;

// Sample branch memory bank structure
export const sampleBranchMemoryBank = {
  branchContext: `# ブランチコンテキスト

## 目的

ブランチ: feature-test
作成日時: 2025-03-15T10:00:00.000Z

このブランチの目的は、テスト機能を開発することです。

## ユーザーストーリー

- [x] テスト環境をセットアップする
- [ ] ユニットテストを実装する
- [ ] 統合テストを追加する

## 期待される動作

- テストが正常に実行され、コードの品質が確保される
- テストカバレッジが80%以上になる
`,

  activeContext: `# アクティブコンテキスト

## 現在の作業内容

テスト環境のセットアップとユニットテストの実装を進めています。

## 最近の変更点

- Jest設定を追加
- ファイルシステムのモックを実装
- テストユーティリティを作成

## アクティブな決定事項

- Jest+ts-jestをテストフレームワークとして使用する
- ファイルシステム操作はすべてモック化する
- テストカバレッジは80%以上を目標とする

## 検討事項

- どのようにエラーケースをテストするか
- 統合テストのアプローチ

## 次のステップ

- BranchMemoryBankのユニットテスト実装
- GlobalMemoryBankのユニットテスト実装
- WorkspaceManagerのユニットテスト実装
`,

  systemPatterns: `# システムパターン

## 技術的決定事項

### テストフレームワークの選択

#### コンテキスト
テストフレームワークの選択によって、テストの書きやすさや実行速度が変わります。

#### 決定事項
Jest+ts-jestを採用することにしました。TypeScriptのサポートが優れており、モック機能が充実しているためです。

#### 影響
- TypeScriptのサポートにより型安全なテストが書ける
- スナップショットテスト機能を活用できる
- パラレル実行により高速なテスト実行が可能

### ファイルシステムモックの方針

#### コンテキスト
テスト時に実際のファイルシステムを使用すると、テストの再現性や速度に問題が生じます。

#### 決定事項
fs/promisesモジュールをモック化し、インメモリの仮想ファイルシステムを実装することにしました。

#### 影響
- テストの再現性が向上する
- テスト実行が高速化される
- ファイルシステム状態に依存せずテストができる

## 関連ファイルとディレクトリ構造

- tests/
  - managers/ - 各マネージャークラスのテスト
  - utils/ - テストユーティリティ
  - jest.config.js - Jestの設定ファイル
`,

  progress: `# 進捗状況

## 動作している機能

- テスト環境のセットアップ
- ファイルシステムのモック実装
- Jest設定

## 未実装の機能

- BranchMemoryBankのユニットテスト
- GlobalMemoryBankのユニットテスト
- WorkspaceManagerのユニットテスト
- 統合テスト

## 現在の状態

開発中。テスト環境のセットアップが完了し、ユニットテスト実装に着手する準備ができています。

## 既知の問題

- テストカバレッジがまだ低い
- エラーケースのテストが不十分
`
};
