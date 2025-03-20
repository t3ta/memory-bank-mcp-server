# テストとアーキテクチャの分析レポート

## 現状の問題点

### 1. テストの構造と配置の問題

#### 1.1. テストの分散
- ユースケースのテストが `src/application/usecases/*/__tests__/` に配置されている
- 統合テストが `tests/integration/` に配置されている
- テストコードがソースコードと混在している箇所がある

#### 1.2. テストの分類が不明確
- ユニットテストとインテグレーションテストの境界が曖昧
- どのレベルのテストをどこに配置すべきかの基準が不明確

### 2. テストの粒度と責務の問題

#### 2.1. ユースケーステスト
```typescript
// 例: DeleteJsonDocumentUseCase.test.ts
describe('DeleteJsonDocumentUseCase', () => {
  // モックの作成が複雑
  let jsonRepositoryMock: IJsonDocumentRepository;
  let globalRepositoryMock: IJsonDocumentRepository;
  let indexServiceMock: IIndexService;

  // テストケースが長く、複数の責務が混在
  it('should delete a document by path', async () => {
    // ...
  });
});
```

問題点：
- テストケースが長く、複数の検証を1つのテストケースで行っている
- モックの設定が複雑で、テストの意図が分かりにくい
- テストケース間で重複するセットアップコードが多い

#### 2.2. 統合テスト
```typescript
// 例: json-operations-completeness.test.ts
describe('JSON Operations Completeness Integration Tests', () => {
  // 多くの依存関係を直接インスタンス化
  let repository: FileSystemBranchMemoryBankRepository;
  let jsonRepository: FileSystemJsonDocumentRepository;
  let tagRepository: FileSystemTagIndexRepositoryImpl;
  // ...

  // テストケースが大きすぎる
  it('should perform basic CRUD operations on JSON documents', async () => {
    // 100行以上のテストケース
  });
});
```

問題点：
- テストケースが大きすぎて、何をテストしているのか分かりにくい
- エラーハンドリングのための try-catch ブロックが多く、テストの意図を覆い隠している
- テストデータの準備が複雑で、テストケースの本質的な部分が見えにくい

### 3. アーキテクチャとテストの整合性の問題

#### 3.1. レイヤー間の依存関係
```typescript
// 例: BranchController の統合テスト
const controller = new BranchController(
  readBranchUseCase,
  writeBranchUseCase,
  searchDocumentsUseCase,
  // ... 多くの依存関係
);
```

問題点：
- コントローラーが多くのユースケースに直接依存している
- レイヤー間の境界が曖昧になっている
- テストのセットアップが複雑になっている

#### 3.2. インフラストラクチャの依存関係
```typescript
// ファイルシステムへの直接の依存
const fileSystemService = new FileSystemService();
repository = new FileSystemBranchMemoryBankRepository(fileSystemService, configProvider);
```

問題点：
- インフラストラクチャの実装に強く依存している
- テスト環境のセットアップが複雑
- テストの実行が遅くなる可能性がある

## 改善提案

### 1. テストの構造化と配置の改善

#### 1.1. テストディレクトリの再構成
```
tests/
  ├── unit/              # ユニットテスト
  │   ├── domain/       # ドメインレイヤーのテスト
  │   ├── application/  # アプリケーションレイヤーのテスト
  │   └── interface/    # インターフェースレイヤーのテスト
  ├── integration/       # 統合テスト
  │   ├── usecase/     # ユースケースレベルの統合テスト
  │   └── api/         # APIレベルの統合テスト
  └── e2e/              # エンドツーエンドテスト
```

#### 1.2. テストヘルパーの整理
```typescript
// tests/helpers/test-builder.ts
export class TestBuilder {
  static createDocument() { /* ... */ }
  static createRepository() { /* ... */ }
  // ...
}
```

### 2. テストケースの改善

#### 2.1. テストケースの分割
```typescript
describe('DeleteJsonDocumentUseCase', () => {
  describe('Validation', () => {
    it('should validate input parameters', () => {});
    it('should check document existence', () => {});
  });

  describe('Document Deletion', () => {
    it('should delete document by path', () => {});
    it('should delete document by ID', () => {});
  });

  describe('Index Management', () => {
    it('should update index after deletion', () => {});
  });
});
```

#### 2.2. テストデータファクトリの導入
```typescript
// tests/factories/document-factory.ts
export class DocumentFactory {
  static createBasicDocument() { /* ... */ }
  static createComplexDocument() { /* ... */ }
  static createWithTags(tags: string[]) { /* ... */ }
}
```

### 3. アーキテクチャの改善

#### 3.1. 依存関係の注入の改善
```typescript
// 依存関係を抽象化
interface IDocumentOperations {
  read(id: string): Promise<Document>;
  write(doc: Document): Promise<void>;
  delete(id: string): Promise<void>;
}

class BranchController {
  constructor(private operations: IDocumentOperations) {}
}
```

#### 3.2. テスト用インフラストラクチャの導入
```typescript
// tests/infrastructure/in-memory-repository.ts
export class InMemoryRepository implements IJsonDocumentRepository {
  private documents = new Map<string, JsonDocument>();

  async findById(id: string): Promise<JsonDocument | null> {
    return this.documents.get(id) || null;
  }
  // ...
}
```

## 実装プラン

1. テストディレクトリの再構成
2. テストヘルパーとファクトリの実装
3. 既存テストの移行と分割
4. インフラストラクチャ層の抽象化
5. 依存関係の注入の改善
6. CI/CDパイプラインの更新

## 期待される効果

- テストの保守性と可読性の向上
- テスト実行時間の短縮
- テストカバレッジの向上
- アーキテクチャの一貫性の改善
- 新機能追加時のテスト作成の効率化
