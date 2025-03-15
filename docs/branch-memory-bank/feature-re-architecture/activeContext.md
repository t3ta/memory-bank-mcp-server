# アクティブコンテキスト

## 現在の作業内容

アプリケーション層の基本的なユースケース実装を完了し、インフラストラクチャ層のリポジトリ実装に移行します。基本的なCRUD操作（読み取りと書き込み）のアプリケーションロジックを実装しました。今後はこれらのユースケースを実際に動作させるためのインフラストラクチャレイヤーを実装していきます。

## 最近の変更点

- アプリケーション層のインターフェース（IUseCase）を実装
- アプリケーション層のデータ転送オブジェクト（DTO）を定義
  - DocumentDTO
  - WriteDocumentDTO
  - BranchInfoDTO
  - RecentBranchDTO
- 基本的なユースケースの実装
  - ReadGlobalDocumentUseCase
  - WriteGlobalDocumentUseCase
  - ReadBranchDocumentUseCase
  - WriteBranchDocumentUseCase
- エラーハンドリングの強化と一貫性の維持

## アクティブな決定事項

- クリーンアーキテクチャパターンを採用する
- エンティティとバリューオブジェクトを明確に分離する
- イミュータブルなオブジェクト設計を採用する
- リポジトリパターンを採用し、データアクセスをドメイン層から分離する
- エラーコードを階層化して管理する
- データ転送オブジェクト（DTO）を使用してレイヤー間のデータ変換を行う
- ユースケースを単一責任の原則に基づいて設計する
- エラーハンドリングを各レイヤーで適切に実装する

## 検討事項

- ファイルシステムリポジトリの実装アプローチ
  - 既存コードからどのようにクリーンに移行するか
  - エンティティとデータオブジェクトの変換方法
  - ファイルシステムアクセスの抽象化方法
- 依存性注入のアプローチ
  - 外部ライブラリ（TypeDI, Inversify等）を使用するか
  - 手動で簡易的なDIコンテナを実装するか
- 既存機能との互換性の確保
  - MCP SDKとの統合方法
  - 既存機能の段階的な移行方法

## 次のステップ

1. インフラストラクチャ層のファイルシステム抽象化
   - IFileSystemService インターフェースの設計
   - FileSystemService の実装
2. リポジトリ実装
   - FileSystemMemoryDocumentRepository
   - FileSystemGlobalMemoryBankRepository
   - FileSystemBranchMemoryBankRepository
3. インターフェース層の設計
   - コントローラーの設計
   - プレゼンターの設計
4. 依存性注入の仕組みの設計
5. 既存コードとの統合計画の立案
