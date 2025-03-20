# Markdown から JSON 形式への移行ポリシー

tags: #migration #json #markdown #policy

## 概要

Memory Bankでは、より構造化されたデータ管理を実現するため、Markdownベースのドキュメント形式からJSON形式への移行を進めています。このドキュメントでは、移行ポリシーと技術的対応について説明します。

## 現在の状態

- **2025年3月21日より**：Markdownドキュメントへの書き込みは禁止されています
- JSONフォーマットがすべてのドキュメントに対する標準形式となっています
- 既存のMarkdownドキュメントは読み取りのみ可能です

## 技術的な実装

### 禁止メカニズム

1. `Constants.MIGRATION.disableMarkdownWrites = true` の設定により、Markdownへの書き込みを全面的に禁止
2. `WriteBranchDocumentUseCase` および `WriteGlobalDocumentUseCase` 内でチェックが実装されており、.md拡張子を持つファイルへの書き込み時に例外を発生させます
3. エラーメッセージは代替のJSON形式のパスを提案します（例：foo.md → foo.json）

### エラーハンドリング

Markdownファイルへの書き込み試行時は以下のようなエラーが発生します：

```
ApplicationError: Writing to Markdown files is disabled. Please use JSON format instead: example.json
```

### ファクトリパターン

- `UseCaseFactory` クラスが各UseCase生成を担当し、一貫した設定を適用します
- `createWriteBranchDocumentUseCase` と `createWriteGlobalDocumentUseCase` メソッドを提供

## 移行ガイド

### 開発者向け

1. すべての新規ドキュメントはJSON形式で作成してください
2. 既存のMarkdownドキュメントを更新する場合は、まず対応するJSONファイルを作成してください
3. CLI、API、UIを通じて行われるすべての書き込み操作はJSONファイルに対して行われます
4. すべてのテストケースはJSONファイル書き込みをテストするよう更新してください

### ユーザー向け

1. CLIコマンドを使う際は、.json拡張子を持つファイルパスを指定してください
2. Markdownファイルへの書き込みを試みると、自動的にエラーと代替パスが提示されます
3. 移行コマンド (`migrate`) を使用して既存のMarkdownファイルをJSON形式に変換できます

## 将来計画

- 将来的にMarkdownファイルの読み取りサポートも段階的に廃止される予定です
- 完全なJSON形式への移行後、データベースへの保存など、より高度なデータ管理機能の実装を検討しています
- すべてのユーザーインターフェースはJSON/Markdownの実装の詳細を抽象化し、シームレスな移行を提供します

## テクニカルノート

- JSON形式では、メタデータとコンテンツが明示的に分離されています
- タグの取り扱いが改善され、より高度な検索機能が実装可能になります
- スキーマ検証により、データの整合性が向上します
