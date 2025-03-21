# テストディレクトリのリファクタリング

## 新しいディレクトリ構造

```
tests/
  ├── unit/                     # ユニットテスト
  │   ├── domain/              # ドメインレイヤーのテスト
  │   ├── application/         # アプリケーションレイヤーのテスト
  │   │   └── usecases/       # ユースケースのテスト
  │   │       ├── branch/     # ブランチ関連のユースケース
  │   │       ├── common/     # 共通ユースケース
  │   │       ├── global/     # グローバル関連のユースケース
  │   │       └── json/       # JSON関連のユースケース
  │   └── interface/          # インターフェースレイヤーのテスト
  ├── integration/             # 統合テスト
  │   ├── api/               # APIレベルの統合テスト（コントローラー）
  │   └── usecase/          # ユースケースレベルの統合テスト
  │       ├── markdown-to-json/  # マークダウンからJSONへの変換テスト
  │       ├── repositories/      # リポジトリの統合テスト
  │       └── infrastructure/    # インフラストラクチャの統合テスト
  └── e2e/                    # エンドツーエンドテスト

```

## 主な変更点

1. テストの種類による明確な分離
   - ユニットテスト (`tests/unit/`)
   - 統合テスト (`tests/integration/`)
   - E2Eテスト (`tests/e2e/`)

2. クリーンアーキテクチャに合わせた構造化
   - ドメインレイヤー
   - アプリケーションレイヤー
   - インターフェースレイヤー
   - インフラストラクチャレイヤー

3. モジュールインポートの標準化
   - すべてのテストファイルで相対パスを使用
   - srcディレクトリからの正確なパス指定

## 設定の変更

### Jest の設定 (jest.config.js)

```javascript
module.exports = {
  ..
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^@modelcontextprotocol/sdk(.*)$': '<rootDir>/node_modules/@modelcontextprotocol/sdk/dist/esm$1',
    '^src/(.*)$': '<rootDir>/src/$1',
    '^src/(.*)\.js$': '<rootDir>/src/$1',
    '(.+)\\.js': '$1'
  },
  modulePaths: ['<rootDir>', '<rootDir>/src'],
  moduleDirectories: ['node_modules', 'src'],
  ..
}
```

### TypeScript の設定 (tsconfig.test.json)

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": ".",
    "baseUrl": ".",
    "paths": {
      "src/*": ["./src/*"]
    },
    ..
  }
}
```

## 移行のメリット

1. テストの種類が明確に分離され、目的に応じたテストの特定が容易になった
2. クリーンアーキテクチャの各レイヤーに対応したテスト構造により、テストカバレッジの把握が容易になった
3. パスの標準化により、テストファイルの移動や新規作成が容易になった
4. テストの意図とスコープが明確になり、保守性が向上した

## 今後の課題

1. E2Eテストの実装と配置の検討
2. テストヘルパーやファクトリの整備
3. テストデータの管理方法の標準化
4. CIパイプラインでのテスト実行の最適化
