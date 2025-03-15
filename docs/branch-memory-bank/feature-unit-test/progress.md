# 進捗状況

## 動作している機能

- ドメインレイヤーの一部エンティティ（BranchInfo, MemoryDocument, DocumentPath, Tag）のテストが実装済み
- アプリケーションレイヤーの一部ユースケース（GetRecentBranchesUseCase, ReadBranchDocumentUseCase, WriteBranchDocumentUseCase, ReadGlobalDocumentUseCase, WriteGlobalDocumentUseCase）のテストが実装済み
- インフラストラクチャレイヤーのFileSystemGlobalMemoryBankRepositoryのテスト実装済み
- インターフェースレイヤーのBranchControllerのテスト実装済み
## 未実装の機能

- ドメインレイヤーの残りのエンティティとバリューオブジェクトのテスト実装
- アプリケーションレイヤーの残りのユースケースのテスト実装
- インフラストラクチャレイヤーの残りのリポジトリ実装のテスト実装
- インターフェースレイヤーの残りのコントローラーのテスト実装
- テストカバレッジレポートの生成と閾値設定
- CI/CDパイプラインとの統合
## 現在の状態

実装中 - 各レイヤーに対するテストを追加し、コアロジックのカバレッジを向上させています。
## 既知の問題

- testsディレクトリ内の古いテストファイルが存在し、現在のアーキテクチャと一致していない可能性がある
- テストカバレッジのCI/CD連携がまだ設定されていない
