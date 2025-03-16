# System Patterns: JSONリポジトリ実装

tags: #patterns #repository #json #design

## アーキテクチャパターン

### リポジトリパターン
- ドメインとデータアクセスの分離
- インターフェースベースの設計
- 集約の永続化を担当

### 抽象化レイヤー
- インフラストラクチャの詳細を隠蔽
- テスト容易性の確保
- 依存性の逆転

## 設計パターン

### Factory Method
- リポジトリインスタンスの作成
- 設定に基づく実装の切り替え
- テスト時のモック注入

### Strategy
- 異なるストレージ戦略の切り替え
- 検索アルゴリズムの変更
- インデックス更新方式の選択

### Unit of Work
- トランザクション管理
- 整合性の確保
- バッチ処理の最適化

## 実装パターン

### エラーハンドリング
```typescript
try {
  await this.writeJson(document);
} catch (error) {
  if (error instanceof FileSystemError) {
    throw new RepositoryError('Failed to write document', error);
  }
  throw error;
}
```

### インデックス更新
```typescript
async save(document: JsonDocument): Promise<void> {
  await this.writeDocument(document);
  await this.updateIndex(document);
  await this.notifyObservers(document);
}
```

### 検索最適化
```typescript
async findByTag(tag: string): Promise<JsonDocument[]> {
  const index = await this.indexService.getTagIndex();
  const ids = index.getDocumentIds(tag);
  return await Promise.all(ids.map(id => this.findById(id)));
}
```

## データアクセスパターン

### ファイル構造
```
/memory-bank
  /json
    /documents
      /{documentId}.json
    /indexes
      tags.json
      relations.json
```

### ドキュメントID生成
```typescript
function generateDocumentId(): DocumentId {
  return new DocumentId(uuidv4());
}
```

### インデックス管理
```typescript
interface TagIndex {
  [tag: string]: {
    documentIds: string[];
    lastUpdated: string;
  }
}
```

## 最適化パターン

### キャッシング
- インメモリキャッシュの利用
- インデックスのキャッシング
- 検索結果のキャッシング

### バッチ処理
- 一括読み込み
- 一括書き込み
- インデックス更新の遅延

### 非同期処理
- 非同期ファイルI/O
- インデックス更新の並列化
- バックグラウンド最適化

## テストパターン

### モックリポジトリ
```typescript
class MockJsonDocumentRepository implements IJsonDocumentRepository {
  private documents = new Map<string, JsonDocument>();

  async findById(id: DocumentId): Promise<JsonDocument> {
    const doc = this.documents.get(id.value);
    if (!doc) throw new DocumentNotFoundError(id);
    return doc;
  }
}
```

### テストデータ生成
```typescript
function createTestDocument(): JsonDocument {
  return JsonDocument.create({
    id: generateDocumentId(),
    content: { /* test data */ },
    tags: ['test']
  });
}
```

### 統合テスト
```typescript
describe('FileSystemJsonDocumentRepository', () => {
  it('should maintain index consistency', async () => {
    const doc = createTestDocument();
    await repository.save(doc);
    const index = await indexService.getTagIndex();
    expect(index.hasDocument(doc.id)).toBe(true);
  });
});
