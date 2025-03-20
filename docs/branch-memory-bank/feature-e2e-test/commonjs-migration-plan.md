# CommonJS移行計画

## 背景と目的

メモリバンクMCPサーバーはもともとESモジュール形式で開発されていました。しかし、以下の理由からCommonJSへの移行を実施しています：

1. **テストフレームワーク（Jest）との互換性向上**: Jestの基本的な動作はCommonJSベース
2. **MCPのSDKとの整合性**: SDKのモジュール解決の安定化
3. **E2Eテストの安定性向上**: テスト環境の一貫性確保

## 進捗状況

### 完了した項目

1. **設定ファイルの変更**:
   - tsconfig.jsonのmoduleをcommonjsに変更
   - tsconfig.test.jsonにisolatedModules:trueを追加
   - jest.config.cjsの最適化

2. **基本的なテストの変換**:
   - シンプルなE2Eテスト(basic-mcp-test.test.ts)がCommonJS形式で実行可能に

### 現在の課題

1. **MCP SDKとの互換性**:
   - モジュール解決エラー: `Cannot find module '/Users/t3ta/workspace/memory-bank-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/server/index'`
   - ESMとCommonJSの混在による参照問題

2. **テストヘルパーの変換**:
   - mcp-client.tsのインポート/エクスポート形式の完全な変換
   - server-manager.tsのモジュール間連携の安定化

## 次のアクション

### 1. MCPのSDK互換性修正

- **moduleNameMapperの調整**:
  ```javascript
  moduleNameMapper: {
    '^(.*/.*)\\.js$': '$1',
    '^@modelcontextprotocol/sdk/(.*)$': '<rootDir>/node_modules/@modelcontextprotocol/sdk/dist/$1'
  }
  ```

- **transformIgnorePatternsの最適化**:
  ```javascript
  transformIgnorePatterns: [
    '/node_modules/(?!@modelcontextprotocol)(?!uuid)'
  ]
  ```

### 2. テストヘルパーモジュールの修正

- **mcp-client.tsの変換**:
  - TypeScriptのinterfaceをtype定義に変更
  - exportをmodule.exportsに変更
  - importをrequireに変換

- **server-manager.tsの改善**:
  - サーバー起動方法の見直し
  - プロセス管理の安定化

### 3. 段階的なテストアプローチ

1. **ファイルシステムベースのシンプルなテスト**:
   - サーバープロセスを起動
   - ファイルシステム操作を実行
   - 結果をファイルシステムで検証

2. **JSONメッセージベースのテスト**:
   - サーバープロセスのstdinにJSONメッセージを送信
   - ファイルシステムで結果を検証

3. **MCP SDK統合テスト**:
   - SDKの互換性問題が解決した段階で実装

## 完了の基準

1. すべてのE2Eテストが正常に実行できる
2. MCP SDKとの互換性が確保されている
3. テスト実行の安定性が向上している
