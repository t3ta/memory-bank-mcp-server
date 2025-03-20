# システムパターンと技術的決定

## ESモジュールとTypeScript

### 決定

TypeScriptプロジェクトをESM（ECMAScript Modules）方式で構築し、モジュール間の依存関係を明示的に記述する。

### 背景

Node.jsとTypeScriptの両方が進化するにつれて、CommonJSからESMへの移行が標準となっています。TypeScript 5.8以降では、ESMモードでの使用時にインポートパスに拡張子を含めることが必要になりました。

### 選択肢と検討事項

1. **CommonJSに戻す**
   - 利点: 従来の方式に慣れている開発者が多い
   - 欠点: 将来的に非推奨になる可能性が高い

2. **ESMを継続し、インポートパスを更新する**
   - 利点: 将来のECMAScript標準に準拠
   - 欠点: 既存コードの更新が必要

3. **ハイブリッドアプローチ（dual package）**
   - 利点: 両方のモジュールシステムをサポート
   - 欠点: 設定と維持が複雑になる

### 決定理由

ESMは今後のJavaScriptエコシステムの標準となるため、プロジェクトをESMに準拠させることが長期的には最適です。TypeScript 5.8以降の要件に合わせてインポートパスを更新することで、最新の言語機能と型チェック機能を活用できます。

### 実装詳細

1. package.jsonに`"type": "module"`を設定
2. tsconfig.jsonで`"module": "node16"`を設定
3. すべてのインポートパスに`.js`拡張子を追加
   ```typescript
   // 修正前
   import { Tag } from '../../../domain/entities/Tag';
   
   // 修正後
   import { Tag } from '../../../domain/entities/Tag.js';
   ```
4. jestの設定で`--experimental-vm-modules`フラグを使用

## エラーコードの具体化

### 決定

ドメインエラーコードをより具体的なものに変更し、一般的なエラーコードからより具体的なエラーコードへ移行する。

### 背景

以前のエラーコードでは、例えば`NOT_FOUND`のような一般的なコードが使用されていましたが、これではどのエンティティが見つからないのかが不明確でした。

### 実装詳細

```typescript
// 修正前
throw new DomainError(
  DomainErrorCodes.NOT_FOUND,
  `Branch not found: ${branch}`
);

// 修正後
throw new DomainError(
  DomainErrorCodes.BRANCH_NOT_FOUND,
  `Branch not found: ${branch}`
);
```

この変更により、エラーの原因がより明確になり、トラブルシューティングが容易になります。