# システムパターン

## 技術的な決定事項

### コード削除戦略

#### 背景
Markdownサポート関連のコードを安全に削除し、システムの整合性を維持する必要がありました。

#### 決定内容
```typescript
// 削除すべきファイルとその依存関係を特定
const markdownDependencies = {
  core: [
    'src/shared/utils/markdown-parser.ts',
    'src/shared/utils/markdown-converter.ts'
  ],
  repositories: [
    'src/infrastructure/repositories/markdown/*'
  ],
  tests: [
    'src/shared/utils/__tests__/markdown-*.test.ts',
    'src/infrastructure/repositories/__tests__/markdown-*.test.ts'
  ]
};

// 削除順序を定義
const removalOrder = [
  'tests',      // まずテストを削除
  'repositories', // 次にリポジトリ実装
  'core'        // 最後にコア機能
];
```

#### 影響
- コードベースの簡素化
- メンテナンス性の向上
- ビルド時間の短縮
- パッケージサイズの縮小

### 依存関係管理

#### 背景
Markdown関連の依存パッケージを安全に削除し、パッケージ構成を最適化する必要がありました。

#### 決定内容
```json
{
  "dependencies": {
    // 削除する依存関係
    "markdown-it": "removed",
    "remark": "removed",
    "unified": "removed",

    // 保持する依存関係
    "json-schema": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    // 削除する開発依存関係
    "@types/markdown-it": "removed",
    "@types/remark": "removed",

    // 保持する開発依存関係
    "@types/json-schema": "latest"
  }
}
```

#### 影響
- パッケージ構成の最適化
- インストール時間の短縮
- 依存関係の明確化
- セキュリティリスクの低減

### テスト戦略

#### 背景
Markdownサポートの削除に伴い、テスト戦略を見直し、カバレッジを維持する必要がありました。

#### 決定内容
```typescript
describe('Migration Tests', () => {
  beforeAll(async () => {
    // 既存のテストデータをJSONに変換
    await convertTestDataToJson();
  });

  it('should maintain functionality after markdown removal', () => {
    // JSONベースの機能テスト
    const result = processDocument(jsonTestData);
    expect(result).toBeDefined();
    expect(result.content).toMatchSnapshot();
  });

  it('should handle edge cases correctly', () => {
    const edgeCases = loadJsonEdgeCases();
    edgeCases.forEach(testCase => {
      expect(() => processDocument(testCase))
        .not.toThrow();
    });
  });
});
```

#### 影響
- テストカバレッジの維持
- エッジケースの保証
- 回帰テストの更新
- テスト実行時間の短縮

### リファクタリングガイド

#### 背景
削除作業中に発生する可能性のあるリグレッションを防ぎ、コードの品質を維持する必要がありました。

#### 決定内容
```typescript
// 削除前のチェックリスト
const removalChecklist = {
  validateDependencies(): boolean {
    // 依存パッケージの使用状況を確認
    return checkPackageUsage();
  },

  validateTests(): boolean {
    // テストの依存関係を確認
    return runTestDependencyCheck();
  },

  validateBuild(): boolean {
    // ビルドの正常性を確認
    return verifyBuildProcess();
  }
};

// 各ステップで実行
async function executeRemoval(step: string): Promise<void> {
  if (!removalChecklist.validateDependencies()) {
    throw new Error('Dependency check failed');
  }
  if (!removalChecklist.validateTests()) {
    throw new Error('Test validation failed');
  }
  if (!removalChecklist.validateBuild()) {
    throw new Error('Build validation failed');
  }
  await performRemoval(step);
}
```

#### 影響
- リグレッションの防止
- コード品質の維持
- 削除プロセスの標準化
- トレーサビリティの向上
