# アクティブコンテキスト

## 現在の作業内容

現在はテストが落ちている状態の修正が必要です。特に`FileSystemJsonDocumentRepository.ts`の追加と`markdown-parser.ts`の変更に伴い、各種テストファイルが更新されていない問題があります。

## 最近の変更点

- CommandBaseクラスの実装
- CreateJsonCommandの実装開始
- コマンドライン引数パーサーの設計
- ヘルプテキストの作成
- エラーメッセージの定義
- FileSystemJsonDocumentRepository.tsの実装（JSONドキュメント用のリポジトリ）
- markdown-parser.tsの更新（Markdownからの変換サポート追加）

## アクティブな決定事項

- コマンド構造を階層化して実装
- 統一的なエラーハンドリングを採用
- ヘルプテキストを充実させる
- インタラクティブモードをサポート
- JSONドキュメントをサポートする（新機能）

## 検討事項

- テスト修正アプローチ（モックの更新 vs. ファイル構造の変更）
- MarkdownとJSONの共存戦略

## 次のステップ

1. テストを修正する：
   - WriteBranchDocumentUseCase.test.ts
   - CreateBranchCoreFilesUseCase.test.ts
   - SearchDocumentsByTagsUseCase.test.ts
   - UpdateTagIndexUseCaseV2.test.ts
   - ReadGlobalDocumentUseCase.test.ts

2. モックとテストヘルパーファイルを確認・更新する

3. テスト実行で確認する

4. CRUD操作コマンドの実装完了
5. 検索コマンドの実装開始
6. インデックス管理コマンドの設計
