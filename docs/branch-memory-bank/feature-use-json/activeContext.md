# アクティブコンテキスト

## 現在の作業内容

JSONをベースファイルとしてMarkdownをプレゼンテーション用として位置づける実装。将来的にはSurrealDBのembeddedへの移行を見据えたデータ構造設計。

## 最近の変更点

- DocumentPathクラスに`isJSON()`と`isMarkdown()`ヘルパーメソッドを追加
- JSON形式のスキーマ定義（json-document.ts）を実装
- Markdown⇔JSON変換ユーティリティを実装
- MemoryDocumentエンティティにJSON変換メソッドを追加
- FileSystemMemoryDocumentRepositoryをJSON対応に拡張
- 初期実装をコミット (0a2df55)

## アクティブな決定事項

- JSONファイルが主体で、Markdownはそこから生成する一方向の関係とする
- 最初は単純に直読みする実装から始める（オーバーエンジニアリングを避ける）
- JSONとMarkdownのマッピングはシンプルにし、メタデータとコンテンツを分離する
- 将来的なDB移行を見据えた設計にするが、最初から複雑にしすぎない
- 基本構造として以下を採用：
  ```json
  {
    "schema": "memory_document_v1",
    "metadata": {
      "title": "タイトル",
      "documentType": "ドキュメントタイプ",
      "path": "パス",
      "tags": ["タグ1", "タグ2"],
      "lastModified": "日時"
    },
    "content": {
      // ドキュメントタイプに応じた内容
    }
  }
  ```

## 検討事項

- テスト戦略（単体テストだけでなく統合テストも必要）
- Markdownパーサーの複雑なドキュメント対応
- MarkdownとJSONの二重管理問題（同期方法など）
- パフォーマンス最適化（特に大量のJSONファイル検索時）
- バリデーションの厳密さのバランス

## 次のステップ

- Markdown/JSONパーサーと変換ユーティリティのテスト実装
- リポジトリの統合テスト実装
- サンプルJSONファイルの作成
- CLIコマンドでのJSON対応明示化
- ドキュメント同期機能の検討
