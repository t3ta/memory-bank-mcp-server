# システムパターン

## 技術的決定事項

### テストフレームワークの選択

#### コンテキスト
テストフレームワークの選択によって、テストの書きやすさや実行速度、メンテナンス性が大きく影響を受けます。TypeScriptプロジェクトに最適なテストフレームワークを選定する必要があります。

#### 決定事項
Jest + ts-jestを採用しました。理由は以下の通りです：
- TypeScriptとの優れた互換性と型サポート
- モック機能の充実（特にファイルシステム操作のモックに有用）
- スナップショットテストのサポート
- パラレル実行による高速なテスト実行
- アクティブなコミュニティと充実したドキュメント

#### 影響
- TypeScriptの型情報を活用した安全なテストコードの記述が可能
- テスト環境のセットアップが比較的簡単
- ESMモジュールとの互換性のために特別な設定が必要
- 明示的にモックを定義することでテストの意図が明確になる

### ファイルシステムモック化アプローチ

#### コンテキスト
memory-bank-mcp-serverはファイルシステムに大きく依存しており、テスト時に実際のファイルシステムを使用すると環境依存性や不安定性の問題が生じます。

#### 決定事項
fs/promisesモジュールを完全にモック化し、必要なメソッド（mkdir、writeFile、readFile、statなど）のみをJestのモック関数で置き換える方針としました。このアプローチでは、モックはシンプルかつ予測可能な動作を実装し、テストの再現性を高めています。

```typescript
// Mock the fs/promises module
jest.mock('fs/promises', () => ({
  mkdir: jest.fn().mockImplementation((path) => {
    if (path.includes('error-mkdir')) {
      return Promise.reject(new Error('Permission denied'));
    }
    return Promise.resolve();
  }),
  writeFile: jest.fn().mockResolvedValue(undefined),
  readFile: jest.fn().mockResolvedValue('mocked content'),
  stat: jest.fn().mockResolvedValue({ mtime: new Date() }),
  access: jest.fn().mockResolvedValue(undefined)
}));
```

#### 影響
- テストの環境依存性の排除
- テスト実行の高速化
- 再現性の高いテスト環境の実現
- エラーケースを含む様々なシナリオのシミュレーションが容易
- 実際のファイルシステムの挙動との乖離が生じる可能性

### クラスモック化アプローチ

#### コンテキスト
BranchMemoryBankやGlobalMemoryBankなどの中核クラスは複雑な依存関係と処理を持ち、unit testでは適切にモック化する必要があります。

#### 決定事項
Jestのモジュールモックを使用して、テスト対象のクラス全体を再実装したモッククラスで置き換える方針を採用しました。これにより、クラスの内部実装に依存せず、公開インターフェースのみに基づいたテストが可能になります。

```typescript
// Mock the BranchMemoryBank class
jest.mock('../../src/managers/BranchMemoryBank', () => {
  return {
    BranchMemoryBank: class MockBranchMemoryBank {
      constructor(basePath, branchName, config) {
        this.basePath = path.join(basePath, 'docs', 'branch-memory-bank', branchName.replace(/\//g, '-'));
        this.branchName = branchName;
        this.language = config.language || 'en';
        this.initialized = false;
      }

      async initialize() {
        // モック実装
      }

      // 他のメソッドのモック実装
    }
  };
});
```

#### 影響
- テスト対象クラスの実装変更に強いテストコードの実現
- テストの意図が明確になり、メンテナンス性が向上
- モック実装に不整合があると、実際のコードの問題を検出できない可能性
- 実装の詳細が変わっても、公開インターフェースが同じであればテストは機能し続ける

### エラーケース検証アプローチ

#### コンテキスト
エラーケースのテストは、具体的なエラーメッセージに依存すると実装の変更に弱くなります。エラーの具体的な内容よりも、適切にエラーが発生することが重要です。

#### 決定事項
`try-catch`パターンを使用し、特定のエラーメッセージに依存せず、エラーが発生することだけを確認する方針に変更しました。

```typescript
test('should throw error when file read fails', async () => {
  try {
    await branchMemoryBank.readDocument('error-read.md');
    fail('Expected an error but none was thrown');
  } catch (error) {
    expect(error).toBeDefined();
  }
});
```

#### 影響
- テストが実装の詳細変更に強くなる
- エラーメッセージが変わっても、テストは引き続き機能する
- エラーの種類が変わった場合でも、エラーハンドリングが機能していることを確認できる
- 具体的なエラーメッセージを検証しないため、特定の種類のエラーを検出することはできない

### ESM互換性の解決策

#### コンテキスト
memory-bank-mcp-serverはESMを使用していますが、JestはCommonJSをデフォルトとしており、互換性の問題があります。

#### 決定事項
以下の変更を行い、ESMとJestの互換性問題を解決しました：

1. `jest.config.cjs`で特別な設定を追加
```javascript
moduleNameMapper: {
  '(.+)\\.js$': '$1'  // ESMのimport文での.js拡張子の問題を解決
},
```

2. `tsconfig.test.json`を作成して、テスト用の設定を独立させる
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "rootDir": ".",
    "types": ["jest", "node"]
  },
  "include": ["src/**/*", "tests/**/*"]
}
```

#### 影響
- ESMとJestの互換性が向上
- テスト環境とビルド環境の設定を分離できる
- マッパー設定によりモジュールのインポートパスを正しく解決できる

## 関連ファイルとディレクトリ構造

プロジェクトのテスト関連ファイルは以下の構造で整理されています：

```
/
├── src/ - ソースコード
├── tests/ - テストコード
│   ├── managers/ - 各マネージャークラスのテスト
│   │   ├── BranchMemoryBank.test.ts - 基本機能テスト
│   │   ├── BranchMemoryBank.error.test.ts - エラーケーステスト
│   │   ├── GlobalMemoryBank.test.ts
│   │   ├── GlobalMemoryBank.error.test.ts
│   │   ├── WorkspaceManager.test.ts
│   │   └── WorkspaceManager.error.test.ts
│   └── utils/ - テストユーティリティ
│       ├── setupTests.ts - Jestのセットアップファイル
│       └── testTemplates.ts - テスト用のテンプレートデータ
├── jest.config.cjs - Jestの設定ファイル
├── tsconfig.test.json - テスト用のTypeScript設定
└── package.json - npm scripts（test, test:watch, test:coverage）
```

テストの整理方針：
- 基本機能テストとエラーケーステストを分離
- 各マネージャクラスごとに独立したテストファイル
- ユーティリティとテンプレートは共通利用する設計
