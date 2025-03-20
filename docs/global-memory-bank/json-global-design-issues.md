# JSON グローバルメモリバンクの設計上の課題

## 現在の実装上の問題

現在のJSON操作関連のUseCaseでは、グローバルメモリバンク操作時にもBranchInfoを使用しています。これは以下の問題を引き起こしています：

1. 概念的な矛盾：グローバルメモリバンクはブランチとは無関係であるべきなのに、内部的にはブランチ情報を必要としている
2. 設計の複雑化：実装が複雑になり、理解しづらくなっている
3. 不整合の可能性：WriteJsonDocumentUseCaseでは'feature/global'を使用しているが、DeleteJsonDocumentUseCaseでは'global'を使用していた（現在は修正済み）

## 修正方針（長期課題）

将来的には以下の方向で設計を改善すべきです：

1. グローバルメモリバンク操作では、BranchInfoに依存しない設計に変更する
2. リポジトリインターフェイスを、グローバル用とブランチ用で分離することを検討する
3. 概念的に明確な境界を設け、コードの保守性を向上させる

## 現在の暫定対応

現時点での修正として：

1. DeleteJsonDocumentUseCaseとWriteJsonDocumentUseCaseの間で統一性を持たせるために、両方とも`feature/global`を使用するよう修正
2. コード内にTODOコメントとして設計上の課題と改善方針を記載
3. この設計上の課題を文書化し、将来のリファクタリングの際の参考となるようにしておく

## 関連ファイル

- src/application/usecases/json/WriteJsonDocumentUseCase.ts
- src/application/usecases/json/DeleteJsonDocumentUseCase.ts
- src/application/usecases/json/ReadJsonDocumentUseCase.ts
- tests/integration/controllers/json-global-controller.test.ts

## 統合テストの状況

JSONグローバルコントローラーの統合テストを追加中です。現在は基本的なテストケースのみが実装され、今後さらに充実させる予定です。

---

*最終更新: 2025-03-19*
