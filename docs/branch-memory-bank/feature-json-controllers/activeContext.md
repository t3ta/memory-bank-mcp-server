# アクティブコンテキスト

## 現在の作業内容

JSONコントローラーの基本実装を完了しました。MCPレスポンスの形式も
メタデータをサポートするように拡張しています。次はコントローラーの
テストケースを実装する予定です。

## 最近の変更点

- JsonBranchControllerを実装
- JsonGlobalControllerを実装
- IResponsePresenterインターフェースを作成
- JsonResponsePresenterを実装（メタデータ対応）
- DIコンテナの設定を更新
- MCPResponse型をメタデータ対応に拡張

## アクティブな決定事項

- クリーンアーキテクチャの原則を遵守
- 統一的なエラーハンドリングを採用
- 型安全性を重視した設計
- メタデータをレスポンスに含めることでクライアント側の処理を容易に
- アダプターパターンでインターフェースを分離

## 検討事項

- JsonResponsePresenterのメタデータのカスタマイズ方法
- レスポンスのバージョニング戦略
- エラー時のHTTPステータスコードの扱い
- レスポンスのフォーマットの国際化対応

## 次のステップ

- JsonBranchControllerのテスト実装
- JsonGlobalControllerのテスト実装
- JsonResponsePresenterのテスト実装
- 統合テストの実装
- ドキュメントの整備（APIリファレンス）
