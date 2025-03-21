# ESM移行計画

## 背景と目的

メモリバンクMCPサーバーはESモジュール形式で開発されていましたが、テスト環境との互換性問題から一時的にCommonJSへの移行を検討していました。しかし、MCP SDKがデュアルパッケージ形式（ESM/CommonJS両対応）であり、内部テストもESMで実行されていることが判明したため、ESM形式に戻す方針に変更します。

この移行の主な目的は：

1. **SDKのネイティブサポート形式との一致**: MCP SDKのメイン形式はESM
2. **将来的な互換性の確保**: ESMは今後の標準となるモジュールシステム
3. **コード品質と一貫性の向上**: 一時的な変換によるバグリスクの低減

## 実装計画

### 1. Jest設定のESMモード対応

```javascript
// jest.config.js
import { createDefaultEsmPreset } from "ts-jest";
const defaultEsmPreset = createDefaultEsmPreset();

export default {
  ..defaultEsmPreset,
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1"
  },
  transformIgnorePatterns: [
    "/node_modules/(?!@modelcontextprotocol/sdk)(?!uuid)/"
  ],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"]
};
```

### 2. TypeScript設定の最適化

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "Node16",
    "moduleResolution": "Node16",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  }
}
```

### 3. package.json設定の更新

```json
{
  "type": "module",
  "scripts": {
    "test": "node --experimental-vm-modules node_modules/jest/bin/jest.js"
  }
}
```

### 4. 必要なファイルの修正

1. **ヘルパーモジュールの更新**:
   - `import` 文と `export` 文の形式を確認・修正
   - 相対パスでの `.js` 拡張子の追加
   - 型定義方法の最適化

2. **テストファイルの更新**:
   - モジュールインポート方法の修正
   - 型定義の参照方法の確認

## 実装手順

1. **基本設定の変更**:
   - package.jsonの`"type": "module"`の追加/確認
   - tsconfig.jsonの更新
   - jest.config.jsの作成・最適化

2. **テスト基盤の更新**:
   - server-manager.tsの修正
   - mcp-client.tsの修正
   - test-utils.tsの修正

3. **テストファイルの更新**:
   - basic-mcp-test.test.tsの修正
   - その他のテストファイルの段階的更新

4. **検証プロセス**:
   - 基本的なテストの実行確認
   - より複雑なテストへの段階的移行
   - 完全なテストスイートのカバレッジ確保

## 期待される成果

1. MCP SDKとのシームレスな統合
2. より安定したテスト環境
3. 将来の拡張に対する堅牢な基盤
4. 開発生産性の向上

## 修正影響範囲

1. テスト環境の設定ファイル
2. テストヘルパーモジュール
3. 既存のテストファイル

本番コードへの影響は最小限に抑えられる見込みです。
