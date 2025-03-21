# グローバルメモリバンク タグ更新スクリプト

このツールは、グローバルメモリバンク内のドキュメントのタグを更新し、タグインデックスを再生成するためのスクリプトです。

## 機能

- グローバルメモリバンク内のJSONファイルをスキャン
- `tag_categorization.json`の定義に基づいてタグを更新
- 新しい形式のタグインデックスを生成
- レガシーインデックス（`_global_index.json`）も更新
- バックアップと復元機能
- 詳細なログ出力

## インストール

```bash
cd scripts/tag-update
yarn install
```

## 使用方法

```bash
# ビルド
yarn build

# 実行
yarn start [options]
```

### オプション

| オプション | 説明 |
|------------|------|
| `-c, --config <path>` | 設定ファイルのパス |
| `-r, --root-dir <path>` | グローバルメモリバンクのルートディレクトリ |
| `-t, --tag-categorization <path>` | タグカテゴリ定義ファイルのパス |
| `-b, --backup-dir <path>` | バックアップディレクトリのパス |
| `-d, --dry-run` | 変更を実際に適用せずに実行（テストモード） |
| `-v, --verbose` | 詳細なログを出力 |
| `-s, --skip-backup` | バックアップを作成しない |
| `-l, --legacy-only` | レガシーインデックスのみを更新 |
| `-h, --help` | ヘルプを表示 |

### 使用例

```bash
# ドライランモードで実行（変更は適用されない）
yarn start --dry-run

# 詳細なログを出力
yarn start --verbose

# カスタムディレクトリを指定
yarn start --root-dir ./docs/global-memory-bank

# バックアップをスキップ
yarn start --skip-backup

# レガシーインデックスのみを更新
yarn start --legacy-only
```

## デフォルト設定

スクリプトは以下のデフォルト設定で動作します：

- ルートディレクトリ: `./docs/global-memory-bank`
- バックアップディレクトリ: `./docs/global-memory-bank/backups`
- タグカテゴリ定義: `./docs/global-memory-bank/tags/tag_categorization.json`
- 新インデックスパス: `./docs/global-memory-bank/tags/index.json`
- レガシーインデックスパス: `./docs/global-memory-bank/_global_index.json`

## 処理フロー

1. 設定の読み込み
2. ディレクトリのスキャン
3. バックアップの作成
4. タグの更新
5. 新しいタグインデックスの生成
6. レガシーインデックスの生成
7. インデックスの保存

## トラブルシューティング

### エラーが発生した場合

1. `--verbose`オプションを付けて詳細なログを確認
2. バックアップディレクトリから復元
3. `--dry-run`オプションを付けて安全にテスト

### バックアップからの復元

現在のスクリプトバージョンでは、コマンドラインから直接復元機能は提供されていません。
必要に応じて、バックアップディレクトリからファイルを手動でコピーしてください。
