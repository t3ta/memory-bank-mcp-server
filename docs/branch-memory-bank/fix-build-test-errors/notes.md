# 型解決に関する問題と修正

## 発生していた問題

TypeScript 5.8.2にアップデートしたことで、型の解決に関する問題が発生していました。主に以下の問題が見つかりました：

1. 同じ名前の型が複数の場所からインポートされていた
   - 例：`WriteGlobalDocumentUseCase.ts`で、ドメイン層とスキーマ層から同時に`MemoryDocument`をインポート

2. JSXとの互換性問題
   - TypeScriptの新しいバージョンでは型解決の方法が変わり、.jsファイル拡張子を明示的に付ける必要がある

3. 型と実装の混同
   - 一部のファイルで、`import type`を使うべき場所で通常の`import`が使われていた
   - 逆に、`import type`を使っていた場所で実際のクラスを使おうとしていた

## 修正内容

1. `WriteGlobalDocumentUseCase.ts`
   - スキーマからのインポート `import type { MemoryDocument } from "../../../schemas/index.js";` を削除
   - ドメイン層の `MemoryDocument` クラスだけを使用するように修正

2. `WriteJsonDocumentUseCase.ts`
   - 重複するインポートを解消：
   ```typescript
   // 削除
   import type { JsonDocument } from "../../../schemas/json-document.js";
   
   // 型ではなくクラスとしてインポート
   import { JsonDocument, DocumentType } from "../../../domain/entities/JsonDocument.js";
   ```

## 今後の修正が必要な項目

1. 他のファイルでも同様の型の重複や不整合がある可能性がある
2. 特に以下のファイルには注意が必要：
   - `ReadJsonDocumentUseCase.ts`
   - `SearchJsonDocumentsUseCase.ts`

## 考察

この問題は以前行ったスキーマとドメインオブジェクトの分離作業の続きと関連しています。ドメイン層の実装クラスとスキーマ層の型定義の名前が衝突したことが原因です。

TypeScript 5.8.2では型解決がより厳格になり、以前は問題なかった曖昧なインポートが検出されるようになりました。この機会に型定義とクラス実装の関係を整理することが重要です。
