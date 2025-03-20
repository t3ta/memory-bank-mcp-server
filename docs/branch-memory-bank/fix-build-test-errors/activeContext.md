# アクティブコンテキスト

## 現在の作業内容

TypeScript 5.8.2バージョンアップデートに伴うビルドエラーとテストエラーの修正を進めています。主に以下の課題に取り組んでいます：

1. ESモジュールのインポートパスに.js拡張子を追加
2. テストコードの型エラー解決
3. 未使用変数/インポートの修正
4. モックオブジェクトの型付け強化
5. 重複する型インポートの解決（ドメイン層とスキーマ層）
6. リポジトリ実装の型互換性問題

## 最近の変更点

- **コントローラー層の完全修正**:
  - IContextControllerの戻り値型を具体的なオブジェクト型に修正
  - GlobalControllerとBranchControllerにDocumentType型をインポート
  - result型のimplicitAny問題を解決
  - インターフェース層の相対パスを修正

- **FileSystemTagIndexRepositoryBaseの改善**:
  - DocumentPathのインポートを追加
  - createDocumentReferenceメソッドでのpath処理を改善
  - FileSystemServiceをIFileSystemServiceインターフェースに変更

## アクティブな決定事項

- **ESモジュール使用の継続**: Node.jsでESモジュール形式を維持し、TypeScript 5.8.2の要件に合わせてインポートパスに拡張子を追加
- **未使用コードの整理**: 使用されていない変数や関数を削除または修正する
- **型安全性の強化**: 積極的な型チェックと条件分岐による型互換性の保証
- **インスタンス型チェックを活用**: `instanceof`を利用した動的型チェックを導入し、型安全性と互換性を両立
- **インターフェースへの依存**: 具体的な実装クラスよりもインターフェース型への依存を優先し、疎結合を促進
- **型キャストの戦略的使用**: モジュール間の非互換性に対処するため、`as`演算子によるキャストを必要な箇所で導入
- **複雑な型定義の簡素化**: 返り値の型をインラインで定義し、わかりやすくする

## 検討事項

- **インフラ層の次のターゲット**: FileSystemTagIndexRepositoryの関連ファイルとFileSystemJsonDocumentRepositoryのどちらを先に修正すべきか
- **アプリケーション層のエラー取り組み方**: UseCaseのエラーにどのように効率的に対処するか
- **テスト修正フェーズへの移行タイミング**: ビルドが部分的に通った段階でテスト修正に着手するか
- **解決戦略の優先順位**: インポートパス問題と型互換性問題、どちらを先に対処するか
- **汎用的な修正ツールの検討**: 拡張子追加などの繰り返し作業の自動化が可能か

## 次のステップ

1. FileSystemTagIndexRepositoryの実装ファイル群（FileSystemTagIndexRepositoryImpl, FileSystemTagIndexRepositoryGetters, FileSystemTagIndexRepositoryModifiers）の修正
2. FileSystemJsonDocumentRepositoryの残りのエラー修正
3. アプリケーション層のWriteGlobalDocumentUseCaseとUpdateJsonIndexUseCaseのエラー対応
4. インデックス関連のインフラコードの修正
5. より多くのインポートパスに.js拡張子を追加
