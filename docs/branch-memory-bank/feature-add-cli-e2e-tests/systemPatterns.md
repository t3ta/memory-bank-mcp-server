# システムパターン

## 技術的決定事項

### E2Eテストの構成

E2Eテストは以下のディレクトリ構造で管理します：

```
tests/e2e/
├── commands/              - コマンド別のテストケース
│   ├── global/            - グローバルメモリバンク関連コマンド
│   │   ├── read-global.test.ts
│   │   └── write-global.test.ts
│   ├── branch/            - ブランチメモリバンク関連コマンド
│   │   ├── read-branch.test.ts
│   │   └── write-branch.test.ts
│   ├── json/              - JSON操作関連コマンド
│   │   └── json-basic.test.ts
│   └── ... (その他のコマンド)
├── helpers/               - テスト用ヘルパー関数
│   ├── cli-runner.ts      - CLIコマンド実行ユーティリティ
│   ├── setup.ts           - テスト環境セットアップユーティリティ
│   └── test-utils.ts      - テスト用アサーションユーティリティ
├── cli.test.ts            - 基本的なCLI機能のテスト
├── jest.config.ts         - Jest設定
└── setup-e2e.ts           - E2Eテスト用セットアップ
```

### テスト実行パターン

E2Eテストは以下のパターンで実行されます：

1. テスト用の一時ディレクトリを作成
2. 必要なファイル構造をセットアップ
3. CLIコマンドを実行
4. 結果を検証
5. 一時ディレクトリを削除

### テストヘルパー関数

既存のヘルパー関数を活用します：

- `runCli()`: CLIコマンドを実行し結果を返す
- `runCliSuccessful()`: CLIコマンドを実行し、成功を期待
- `runCliFailing()`: CLIコマンドを実行し、失敗を期待
- `createTempTestDir()`: テスト用一時ディレクトリを作成
- `createDocsStructure()`: 基本的なドキュメント構造を作成
- `deleteTempDir()`: テスト用一時ディレクトリを削除

### テストアサーション

以下のアサーション関数を使用します：

- `assertFileExists()`: ファイルが存在することを確認
- `assertFileContent()`: ファイルの内容を確認
- `assertJsonFileProperties()`: JSONファイルのプロパティを確認
- `assertFileContentMatches()`: ファイルの内容が正規表現にマッチすることを確認

### テスト対象コマンド

現在のCLIでは以下のコマンドが実装されています：

- `read-global`: グローバルメモリバンクからドキュメントを読み込む
- `write-global`: グローバルメモリバンクにドキュメントを書き込む
- `read-branch`: ブランチメモリバンクからドキュメントを読み込む
- `write-branch`: ブランチメモリバンクにドキュメントを書き込む
- `json`: JSONドキュメント操作（create, read, update, delete等のサブコマンドを持つ）
- `init`: メモリバンク初期化
- `migrate`: ドキュメント形式の移行
- `search`: タグやキーワードでドキュメントを検索
- `tags`: タグ操作（list, add, remove等のサブコマンドを持つ）

### 今回テスト対象とするコマンド

今回のブランチで実装するテストの対象コマンドは以下の通りです：

- `read-branch`: ブランチメモリバンクドキュメント読み取り
- `write-branch`: ブランチメモリバンクドキュメント書き込み
- `init`: メモリバンク初期化
- `search`: ドキュメント検索
- `tags`: タグ操作
- `migrate`: ドキュメント形式移行

### テスト戦略

各コマンドについて以下のパターンをテストします：

1. 基本的な成功パターン
2. エラー処理（無効な入力、存在しないファイル等）
3. オプション指定（--pretty, --content-only等）
4. エッジケース
