# @memory-bank/schemas

このパッケージは、Memory Bankプロジェクトで使用されるスキーマ定義を提供します。JSONデータの検証や型チェックに使用できます。

## インストール

```bash
npm install @memory-bank/schemas
# または
yarn add @memory-bank/schemas
```

## 使用方法

```typescript
import { DocumentMetadataV2Schema } from '@memory-bank/schemas';

// スキーマを使用してデータを検証
const result = DocumentMetadataV2Schema.safeParse(data);
if (result.success) {
  // 検証成功
  const validatedData = result.data;
  // ...
} else {
  // 検証失敗
  console.error(result.error);
}
```

## 主要なスキーマ

- `DocumentMetadataV2Schema` - ドキュメントのメタデータスキーマ
- `TagSchema` - タグのスキーマ
- `FlexibleDateSchema` - 柔軟な日付形式のスキーマ
- `MemoryDocumentV2Schema` - Memory Bank ドキュメント全体のスキーマ

## 型定義

このパッケージは、TypeScriptの型定義も提供します：

```typescript
import { Document, Metadata, Tag } from '@memory-bank/schemas';

// 型を使用
const metadata: Metadata = {
  id: 'document-id',
  title: 'Document Title',
  documentType: 'generic',
  path: 'path/to/document.json',
  tags: ['tag1', 'tag2'],
  lastModified: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  version: 1
};
```

## ライセンス

MIT
