# アクティブコンテキスト

## 現在の作業内容

JSONをベースファイルとしてMarkdownをプレゼンテーション用として位置づける実装を進めている。将来的にはSurrealDBのembeddedへ置き換えることも視野に入れている。

## 最近の変更点

- DocumentPathクラスに`isJSON()`と`isMarkdown()`ヘルパーメソッドを追加
- JSON直読みから始めて、必要に応じてインデックスや検索機能を強化していく方針に決定

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
      "path": "パス",
      "documentType": "ドキュメントタイプ",
      "tags": ["タグ1", "タグ2"],
      "lastModified": "日時"
    },
    "content": {
      // ドキュメントタイプに応じた内容
    }
  }
  ```

## 検討事項

- コンフリクト対応（当初はgit管理による解決に依存）
- 検索性の確保（最初はシンプルに全ファイル検索、将来的にインデックス導入？）
- 各ドキュメントタイプに応じたJSONスキーマの詳細設計
- Markdownからの初期マイグレーション戦略

## 次のステップ

- MemoryDocument JSONスキーマの詳細定義
- JSONからMarkdownへの変換ユーティリティ実装
- FileSystemMemoryDocumentRepositoryのJSON対応
- コアファイルのJSONバージョン作成
