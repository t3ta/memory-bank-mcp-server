# 進捗状況

## 動作している機能

- ドメインレイヤーの一部エンティティ（BranchInfo, MemoryDocument, DocumentPath, Tag）のテスト実装
- アプリケーションレイヤーの一部ユースケース（GetRecentBranchesUseCase, ReadBranchDocumentUseCase, WriteBranchDocumentUseCase, ReadGlobalDocumentUseCase, WriteGlobalDocumentUseCase）のテスト実装
- インフラストラクチャレイヤーのFileSystemGlobalMemoryBankRepositoryのテスト実装
- インターフェースレイヤーのBranchControllerのテスト実装
- コンパイルエラーの修正
## 未実装の機能

- ドメインレイヤーの残りのエンティティとバリューオブジェクトのテスト実装
- アプリケーションレイヤーの残りのユースケースのテスト実装
- インフラストラクチャレイヤーの残りのリポジトリ実装のテスト実装
- インターフェースレイヤーの残りのコントローラーのテスト実装
- テストカバレッジレポートの生成と閾値設定
- CI/CDパイプラインとの統合
## 現在の状態

実装中 - 各レイヤーに対するテストを追加し、コアロジックのカバレッジを向上
## 既知の問題

- テストカバレッジのCI/CD連携がまだ設定されていない
