# システムパターン

## 技術的決定事項

### テストフレームワーク

#### コンテキスト

テストフレームワークを選択する必要があった

#### 決定事項

Jestを使用する

#### 影響

- TypeScriptとの統合が良い
- モック機能が充実
- ESMモジュール形式のテストをサポート（`--experimental-vm-modules`オプション使用）

### ディレクトリ構造

#### コンテキスト

ファイル配置の規則を定義する必要があった

#### 決定事項

クリーンアーキテクチャに従った階層構造を採用

```
tests/
  ├── unit/                     # ユニットテスト
  │   ├── domain/              # ドメインレイヤー
  │   ├── application/         # アプリケーションレイヤー
  │   ├── interface/           # インターフェースレイヤー
  │   └── infrastructure/      # インフラストラクチャレイヤー
  ├── integration/             # 統合テスト
  │   ├── api/                # APIレベル
  │   └── usecase/            # ユースケースレベル
  └── e2e/                    # エンドツーエンドテスト
      ├── helpers/            # ヘルパー類
      ├── tools/              # ツール別テスト
      └── error-handling/     # エラーハンドリング
```

#### 影響

- 関心の分離が明確
- テスト可能性の向上
- テストの目的とスコープが明確
- ファイル検索と管理が容易

### テスト実行戦略

#### コンテキスト

効率的なテスト実行方法を定義する必要があった

#### 決定事項

テストタイプ別のnpmスクリプトを提供

```json
"test": "NODE_OPTIONS='--experimental-vm-modules' jest --no-coverage",
"test:watch": "NODE_OPTIONS='--experimental-vm-modules' jest --watch",
"test:coverage": "NODE_OPTIONS='--experimental-vm-modules' jest --coverage",
"test:e2e": "NODE_OPTIONS='--experimental-vm-modules' jest --no-coverage --testMatch='**/tests/e2e/**/*.test.ts' --runInBand",
"test:integration": "NODE_OPTIONS='--experimental-vm-modules' jest --no-coverage --testMatch='**/tests/integration/**/*.test.ts' --config=tests/integration/jest.config.ts"
```

#### 影響

- 目的に応じたテスト実行が容易
- CIパイプラインとの統合が容易
- テスト実行時間の最適化が可能

### E2Eテスト実装戦略

#### コンテキスト

エンドツーエンドテストの範囲と実装順序を決定する必要があった

#### 決定事項

フェーズ分けアプローチを採用

1. Phase 1: テストインフラストラクチャ
2. Phase 2: コアメモリ操作
3. Phase 3: メタデータ＆コンテキスト操作
4. Phase 4: エラーハンドリング＆エッジケース

#### 影響

- 実装の優先順位が明確
- 依存関係を考慮した順序立てた実装が可能
- 各フェーズ完了時点で価値を提供できる
