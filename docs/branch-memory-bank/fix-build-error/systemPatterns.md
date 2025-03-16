# システムパターン

## 技術的決定事項

### MCPResponseの型チェック方式の変更

#### コンテキスト
MCPResponseはMCPSuccessResponse<T> | MCPErrorResponseの合併型で、TypeScriptではUnion型の場合、共通のプロパティにしかアクセスできない。success属性はどちらの型にも存在するが、errorとdataはそれぞれの型にしか存在しない。

#### 決定事項
result.errorやresult.dataに直接アクセスする代わりに、result.successを使用して型を絞り込む方式に変更

#### 影響
- 型安全性が向上し、ビルドエラーが解消される
- コードがTypeScriptの型システムに準拠した形になる
- 可読性は少し下がるが、型安全性のトレードオフとして許容範囲内

## 関連ファイルとディレクトリ構造
