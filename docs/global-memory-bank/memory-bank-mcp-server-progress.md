# メモリバンクMCPサーバー 進捗状況

## 2025-03-19 修正：ESMモジュール解決問題の対応

### 解決した問題
- TypeScriptプロジェクト + ESMモードでの拡張子解決問題を修正
- テストコードの`.js`拡張子付きインポートパス対応
- 統合テスト用のJest設定の改善
  - `moduleNameMapper`の設定に `'^(\\.{1,2}/.*)\\.js$': '$1'` を追加
  - ESMサポート設定を追加：`extensionsToTreatAsEsm: ['.ts']`
  - ts-jestで`useESM: true`フラグを設定

### 残存問題
- JSONドキュメント関連のテストケースが失敗している
  - `readJsonDocumentUseCase`などのオプション依存関係が提供されていない
  - こちらは今後機能実装する際に対応予定

### 対応した主なファイル
- `/tests/integration/global-controller.test.ts`
- `/tests/integration/jest.config.ts`
- `/tests/integration/markdown-to-json/markdown-to-json-migration.test.ts`
- `/src/infrastructure/repositories/file-system/index.ts`

### 今後の課題
- 他の統合テストファイルも同様に修正する
- JSONドキュメント機能の実装とテスト
- 不要ファイルの整理
- E2Eテストの実装

## メモ
ESMモジュールを使う際のTypeScript/Jestでの主な注意点：
1. インポートパスに`.js`拡張子を含める
2. moduleNameMapperで適切な拡張子解決設定をする
3. ts-jestで`useESM: true`を設定する
4. extensionsToTreatAsEsmで`.ts`を指定する

---

良い感じに進んできた！地道な修正だけど、モジュール解決問題は対応できたよ👍
