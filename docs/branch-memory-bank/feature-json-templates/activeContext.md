# アクティブコンテキスト: feature/json-templates

tags: #active-context #json #templates

## 現在の作業内容

新しく考案された設計仕様に基づいて、JSONテンプレートシステムと多言語対応基盤を実装中。

## 直近の変更点

1. クリーンアーキテクチャに準拠したI18n構造の設計と実装
2. JSONベースのテンプレートスキーマの定義
3. テンプレートローダーとレンダラーの実装
4. 翻訳辞書ファイルの準備

## アクティブな決定事項

1. 当初検討していたアプローチから、より洗練された設計（`docs/global-memory-bank/template-system-json-i18n-design.md`に記載）に切り替え
2. 翻訳キーを用いた国際化対応を実施
3. JSONテンプレートは`src/templates/json/`ディレクトリに格納
4. 既存のMarkdownテンプレートとの互換性を保持

## 検討事項

1. 既存のCreatePullRequestUseCaseをどのタイミングで修正するか
2. MarkdownからJSONへの自動変換ユーティリティをどのように実装するか
3. DIコンテナへのI18nProviderとJsonTemplateLoaderの登録方法

## 次のステップ

1. テストコードの拡充（各コンポーネントの単体テストと統合テスト）
2. MarkdownToJsonConverterの実装の完成
3. CreatePullRequestUseCaseの修正
4. CILコマンドの追加
