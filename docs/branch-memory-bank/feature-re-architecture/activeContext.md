# アクティブコンテキスト

## 現在の作業内容

旧マネージャークラスとmodelsディレクトリの削除が完了
## 最近の変更点

- 既存マネージャークラスを削除（BaseMemoryBank, BranchMemoryBank, GlobalMemoryBank, WorkspaceManager）
- models/types.tsの削除（すでにshared/types/index.tsに移行済み）
- index.tsの型定義インポートパスを修正
## アクティブな決定事項

- 既存の不要なコードを削除し、新しいアーキテクチャへの完全移行を進める
- shared/typesを使用して型定義を一元管理する
- エントリーポイントを新しいアーキテクチャを使用するように変更する
## 検討事項

- テストの実装方法と範囲
- ドキュメントの更新方法
## 次のステップ

- テストの実装
- 残りの必要なドキュメントの更新
