# Memory Bank MCP Server プロジェクトの状態

## プロジェクト概要

Memory Bank MCP Serverは、クリーンアーキテクチャに基づいたドキュメント管理システムです。主にブランチごとのメモリバンクとグローバルメモリバンクを管理し、AI開発者のためのコンテキスト保持を支援します。

## 現在のブランチ: feature/e2e-test

### 目的

エンドツーエンドテストを実装し、テストディレクトリ構造をクリーンアーキテクチャに合わせて再編成することです。

### 最近の進捗

- テストディレクトリ構造の標準化完了
  - ユニットテスト: `tests/unit/{layer}/{module}/`
  - 統合テスト: `tests/integration/{category}/` 
  - E2Eテスト: `tests/e2e/`

- コントローラーテストの整理完了
  - `src/interface/controllers/__tests__/`を削除
  - `tests/unit/interface/controllers/BranchController.test.ts`のインポートパス修正
  - 単体テストと統合テストの明確な分離

### 次のステップ

1. 残りのテストファイルの移動計画の作成
2. 優先度の高いテストファイルから順次移動
3. テストカバレッジの改善と実行の最適化

## 技術スタック

- **言語**: TypeScript
- **アーキテクチャ**: クリーンアーキテクチャ
- **テストフレームワーク**: Jest
- **主要コンポーネント**:
  - BranchController
  - GlobalController
  - JsonController
  - 各種ユースケース
  - ファイルシステムベースのリポジトリ

## 重要なファイル

- `docs/test-directory-refactoring.md`: テストディレクトリ構造の定義
- `tests/unit/interface/controllers/BranchController.test.ts`: 修正済みのユニットテスト
- `tests/integration/api/branch-controller.test.ts