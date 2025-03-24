# モック置き換え計画

## 背景と目的

現在のテストコードでは、各テストファイル内で独自のモックオブジェクトを作成しています。これにより、以下の問題が発生しています：

- モック実装の重複
- テスト間での一貫性の欠如
- メンテナンスの困難さ
- 変更時の影響範囲の把握が難しい

この計画は、プロジェクト全体でモックを共有・再利用できる仕組みを構築し、テストコードの品質と保守性を向上させることを目的としています。

## 現状分析

### 現在のモック実装の問題点

1. **重複コード**：同じインターフェースに対して複数のテストファイルで類似したモックが実装されている
2. **一貫性の欠如**：同じコンポーネントに対して異なるモック実装が存在する
3. **型安全性の欠如**：一部のモックでは型チェックが無効化されている
4. **メンテナンスコスト**：インターフェースが変更された場合、複数の場所で修正が必要

### 対象となる主なモック

- `IJsonDocumentRepository`
- `IIndexService`
- `IBranchMemoryBankRepository`
- 各種ユースケース（`SearchDocumentsByTagsUseCase`など）

## 改善計画

### フェーズ1: 共有モックライブラリの構築（2週間）

1. **共有モックディレクトリの作成**
   - `tests/mocks/` ディレクトリを作成
   - カテゴリごとにサブディレクトリを作成（repositories, services, usecases）

2. **基本モックファクトリの実装**
   - ts-mockitoを活用した型安全なモックファクトリを実装
   - 各インターフェースに対する基本モックを作成
   - カスタマイズ可能なAPIを設計

3. **ドキュメント作成**
   - モックライブラリの使用方法を説明するドキュメントを作成
   - サンプルコードと使用例を提供

### フェーズ2: 既存テストの移行（3週間）

1. **優先度の高いテストから移行開始**
   - インテグレーションテスト（`tests/integration/`）
   - 複雑なユニットテスト

2. **段階的な移行プロセス**
   - 各テストファイルごとに移行
   - 移行後のテスト実行で動作確認
   - コードレビューで品質確保

3. **進捗管理**
   - 移行状況を追跡するためのチェックリスト作成
   - 週次進捗レポート

### フェーズ3: 標準化と最適化（1週間）

1. **ベストプラクティスの確立**
   - モック使用のガイドライン作成
   - コードレビューチェックリストの更新

2. **パフォーマンス最適化**
   - テスト実行時間の測定と比較
   - 必要に応じた最適化

3. **最終レビュー**
   - 全体的なコード品質の評価
   - フィードバックの収集と反映

## 実装詳細

### 共有モックの基本構造

```typescript
// tests/mocks/repositories/json-document-repository.mock.ts

import { mock, instance, when, anyString, anything, deepEqual } from 'ts-mockito';
import { IJsonDocumentRepository } from '../../../src/domain/repositories/IJsonDocumentRepository';

/**
 * JSONドキュメントリポジトリのモックを作成する
 * @param customizations カスタマイズ関数
 * @returns モックされたリポジトリとそのインスタンス
 */
export function createMockJsonRepository(
  customizations?: (mockRepo: IJsonDocumentRepository) => void
): {
  mockRepo: IJsonDocumentRepository;
  instanceRepo: IJsonDocumentRepository;
} {
  const mockRepo = mock<IJsonDocumentRepository>();

  // デフォルトの振る舞いを設定
  when(mockRepo.findById(anything())).thenResolve(null);
  when(mockRepo.findByPath(anything(), anything())).thenResolve(null);
  when(mockRepo.findByTags(anything(), anything(), anything())).thenResolve([]);
  when(mockRepo.findByType(anything(), anything())).thenResolve([]);
  when(mockRepo.listAll(anything())).thenResolve([]);
  when(mockRepo.exists(anything(), anything())).thenResolve(true);
  when(mockRepo.delete(anything(), anything())).thenResolve(true);

  // カスタマイズ関数があれば実行
  if (customizations) {
    customizations(mockRepo);
  }

  // 実際のインスタンスを返す
  return {
    mockRepo,
    instanceRepo: instance(mockRepo)
  };
}
```

### 使用例

```typescript
// tests/integration/api/global-controller.test.ts

import { createMockJsonRepository } from '../../mocks/repositories/json-document-repository.mock';
import { createMockIndexService } from '../../mocks/services/index-service.mock';

describe('GlobalController Integration Tests', () => {
  // ...

  beforeAll(async () => {
    // ...

    // 基本モックの作成
    const { instanceRepo: jsonRepo } = createMockJsonRepository();

    // カスタマイズしたモックの作成
    const { instanceRepo: customJsonRepo } = createMockJsonRepository(mockRepo => {
      // 特定のテストケース用にカスタマイズ
      when(mockRepo.delete(anything(), anything())).thenCall(async (_, docPath) => {
        // 実際にファイルを削除する実装
        if (docPath instanceof DocumentPath) {
          const filePath = path.join(globalDir, docPath.value);
          try {
            await fs.unlink(filePath);
            return true;
          } catch {
            return false;
          }
        }
        return false;
      });
    });

    // ...
  });

  // ...
});
```

## 移行スケジュール

| 週 | 作業内容 | 担当者 | 成果物 |
|---|---------|-------|-------|
| 1 | 共有モック基盤の設計と実装 | チームA | モックファクトリの基本実装 |
| 2 | リポジトリモックの実装 | チームA | リポジトリモックライブラリ |
| 3 | サービスモックの実装 | チームB | サービスモックライブラリ |
| 4 | ユースケースモックの実装 | チームB | ユースケースモックライブラリ |
| 5 | インテグレーションテストの移行 (1/2) | チームA | 更新されたテスト |
| 6 | インテグレーションテストの移行 (2/2) | チームA | 更新されたテスト |
| 7 | ユニットテストの移行 (1/2) | チームB | 更新されたテスト |
| 8 | ユニットテストの移行 (2/2) | チームB | 更新されたテスト |
| 9 | 最適化とドキュメント作成 | 全員 | 最終ドキュメント |

## 期待される効果

1. **コード量の削減**: モックの重複が排除され、全体のコード量が減少
2. **保守性の向上**: インターフェース変更時の修正箇所が集約される
3. **テスト品質の向上**: 一貫したモック実装によるテストの信頼性向上
4. **開発効率の向上**: 新しいテスト作成時のモック実装コストの削減
5. **型安全性の向上**: ts-mockitoによる型チェックの強化

## リスクと対策

| リスク | 影響度 | 対策 |
|-------|-------|-----|
| 既存テストの動作変更 | 高 | 段階的な移行と各ステップでのテスト実行 |
| チーム間の知識格差 | 中 | ドキュメント作成とペアプログラミングの実施 |
| スケジュールの遅延 | 中 | 優先度に基づく段階的実装と定期的な進捗確認 |
| パフォーマンス低下 | 低 | テスト実行時間のモニタリングと必要に応じた最適化 |

## 結論

共有モックライブラリの構築と既存テストの移行は、短期的には一定の工数を要しますが、長期的にはテストコードの品質向上と保守コスト削減に大きく貢献します。段階的なアプローチにより、リスクを最小限に抑えながら移行を進めることができます。

## 参考資料

- [ts-mockito ドキュメント](https://github.com/NagRock/ts-mockito)
- [テスト駆動開発のベストプラクティス](https://martinfowler.com/articles/mocksArentStubs.html)
- [効果的なモックの使い方](https://www.manning.com/books/unit-testing)
