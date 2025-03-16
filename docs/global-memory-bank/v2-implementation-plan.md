# Memory Bank 2.0: 実装計画

tags: #implementation #plan #version-2 #json

## 概要

Memory Bank 2.0への移行を段階的に行うための実装計画です。各フェーズは1つのブランチで完結する単位に分割され、明確な責任範囲と成果物を持ちます。

## フェーズ分割

### フェーズ1: JSONスキーマ定義（ブランチ名: `feature/json-schema-v2`）

**目的**: Memory Bank 2.0のJSONスキーマを確定させる

**作業項目**:
1. 基本ドキュメントスキーマの定義
   - BaseJsonDocument インターフェイス
   - 各ドキュメントタイプ固有のスキーマ
2. Zodスキーマの実装
   - バリデーションロジック
   - 型推論用のタイプエクスポート
3. スキーマのテスト
   - 有効なJSONのバリデーション
   - 無効なJSONの拒否テスト
4. TypeScript型定義の生成

**成果物**:
- `src/schemas/v2/json-document.ts`
- `src/schemas/v2/index.ts`
- 各スキーマのテスト

**推定工数**: 2-3日

---

### フェーズ2: ドメインモデル拡張（ブランチ名: `feature/domain-model-v2`）

**目的**: 新しいJSONスキーマに基づいたドメインモデルを構築する

**作業項目**:
1. JsonDocument エンティティクラスの実装
   - ファクトリーメソッド
   - バリデーションロジック
2. DocumentId 値オブジェクトの実装
3. 既存の DocumentPath クラスの更新
4. テストの実装

**成果物**:
- `src/domain/entities/JsonDocument.ts`
- `src/domain/entities/DocumentId.ts`
- `src/domain/entities/DocumentPath.ts` (更新)
- 各エンティティのテスト

**推定工数**: 2-3日

---

### フェーズ3: インデックスシステム（ブランチ名: `feature/json-index`）

**目的**: JSONドキュメントのインデックスシステムを構築する

**作業項目**:
1. インデックス構造の定義
   - ドキュメントインデックス
   - タグインデックス
   - リレーションインデックス
2. インデックスサービスの実装
   - ビルド機能
   - 検索機能
3. インデックス永続化の実装
4. テストの実装

**成果物**:
- `src/infrastructure/index/IndexService.ts`
- `src/infrastructure/index/interfaces/IIndexService.ts`
- `src/schemas/v2/index-schema.ts`
- インデックスシステムのテスト

**推定工数**: 3-4日

---

### フェーズ4: JSONリポジトリ（ブランチ名: `feature/json-repository`）

**目的**: JSON専用のリポジトリ実装を提供する

**作業項目**:
1. リポジトリインターフェイスの定義
2. ファイルシステム実装の作成
   - CRUD操作
   - 検索操作
   - インデックス統合
3. モック実装（テスト用）
4. テストの実装

**成果物**:
- `src/domain/repositories/IJsonDocumentRepository.ts`
- `src/infrastructure/repositories/file-system/FileSystemJsonDocumentRepository.ts`
- `src/infrastructure/repositories/mock/MockJsonDocumentRepository.ts`
- リポジトリのテスト

**推定工数**: 3-4日

---

### フェーズ5: Markdownコンバーター（ブランチ名: `feature/json-to-markdown`）

**目的**: JSONからMarkdownへの一方向変換機能を実装する

**作業項目**:
1. 基本変換ロジックの実装
2. ドキュメントタイプ別の変換ロジック
3. テストの実装
4. Markdownプレビュー機能の実装

**成果物**:
- `src/shared/utils/json-to-markdown-converter.ts`
- 変換ロジックのテスト

**推定工数**: 2-3日

---

### フェーズ6: アプリケーションレイヤー（ブランチ名: `feature/json-usecases`）

**目的**: JSON操作のためのユースケースを実装する

**作業項目**:
1. 基本CRUD操作のユースケース
   - 読み取り
   - 作成
   - 更新
   - 削除
2. 検索・クエリユースケース
3. インデックス操作ユースケース
4. テストの実装

**成果物**:
- `src/application/usecases/json/ReadJsonDocumentUseCase.ts`
- `src/application/usecases/json/WriteJsonDocumentUseCase.ts`
- `src/application/usecases/json/DeleteJsonDocumentUseCase.ts`
- `src/application/usecases/json/SearchJsonDocumentsUseCase.ts`
- `src/application/usecases/json/UpdateIndexUseCase.ts`
- 各ユースケースのテスト

**推定工数**: 3-4日

---

### フェーズ7: CLIコマンド（ブランチ名: `feature/json-cli-commands`）

**目的**: JSON操作のためのCLIコマンドを実装する

**作業項目**:
1. 基本CRUD操作のコマンド
2. 検索・クエリコマンド
3. インデックス操作コマンド
4. エディタ統合
5. テストの実装

**成果物**:
- `src/cli/commands/json/CreateJsonCommand.ts`
- `src/cli/commands/json/ReadJsonCommand.ts`
- `src/cli/commands/json/UpdateJsonCommand.ts`
- `src/cli/commands/json/DeleteJsonCommand.ts`
- `src/cli/commands/json/SearchJsonCommand.ts`
- `src/cli/commands/json/BuildIndexCommand.ts`
- 各コマンドのテスト

**推定工数**: 3-4日

---

### フェーズ8: マイグレーションツール（ブランチ名: `feature/markdown-to-json-migration`）

**目的**: 既存のMarkdownファイルをJSONに変換するツールを実装する

**作業項目**:
1. マイグレーションロジックの実装
   - ドキュメントタイプ検出
   - Markdownパース
   - JSON生成
   - バリデーション
2. バックアップとロールバック機能
3. CLI統合
4. テストの実装

**成果物**:
- `src/migration/MarkdownToJsonMigrator.ts`
- `src/migration/MigrationValidator.ts`
- `src/migration/MigrationBackup.ts`
- `src/cli/commands/migration/MigrateCommand.ts`
- マイグレーションテスト

**推定工数**: 4-5日

---

### フェーズ9: コントローラーと統合（ブランチ名: `feature/json-controllers`）

**目的**: JSONインターフェースをMCPコントローラーと統合する

**作業項目**:
1. JSONコントローラーの実装
   - ブランチコントローラー
   - グローバルコントローラー
2. プレゼンターの更新
3. DIコンテナの更新
4. テストの実装

**成果物**:
- `src/interface/controllers/JsonBranchController.ts`
- `src/interface/controllers/JsonGlobalController.ts`
- `src/interface/presenters/JsonResponsePresenter.ts`
- `src/main/di/providers.ts` (更新)
- 各コントローラーのテスト

**推定工数**: 3-4日

---

### フェーズ10: 古いコード削除（ブランチ名: `feature/remove-markdown-support`）

**目的**: Markdown関連の不要なコードを削除する

**作業項目**:
1. Markdownパーサーの削除
2. Markdown→JSON変換ロジックの削除
3. 古いリポジトリの削除
4. 依存関係の更新
5. テストの更新

**成果物**:
- 多数のファイル削除
- 依存関係グラフの更新
- 更新されたテスト

**推定工数**: 2-3日

---

### フェーズ11: サンプルとドキュメント（ブランチ名: `feature/json-samples-docs`）

**目的**: サンプルJSONファイルとドキュメントを提供する

**作業項目**:
1. サンプルJSONファイルの作成
   - 各ドキュメントタイプのサンプル
   - テンプレート
2. JSONスキーマドキュメント
3. 使用方法ガイド
4. マイグレーションガイド

**成果物**:
- `docs/samples/json/branchContext.json`
- `docs/samples/json/activeContext.json`
- `docs/samples/json/progress.json`
- `docs/samples/json/systemPatterns.json`
- `docs/json-schema.md`
- `docs/migration-guide.md`
- `docs/usage-guide.md`

**推定工数**: 2-3日

---

### フェーズ12: 統合テストとバグ修正（ブランチ名: `feature/json-integration-test`）

**目的**: エンドツーエンドテストと最終的なバグ修正

**作業項目**:
1. 統合テストシナリオの実装
2. エンドツーエンドテスト
3. パフォーマンステスト
4. バグ修正
5. 最終リファクタリング

**成果物**:
- `test/integration/json-workflow.test.ts`
- `test/end-to-end/json-cli.test.ts`
- `test/performance/json-large-memory-bank.test.ts`
- バグ修正コミット

**推定工数**: 3-4日

---

## 実装順序

フェーズは基本的に順番に実施しますが、一部は並行して進めることも可能です：

- フェーズ1→2→3→4は順次進める必要があります（基盤となるため）
- フェーズ5とフェーズ6は並行して進めることが可能です
- フェーズ7と8は並行して進めることが可能です
- フェーズ9→10→11→12は順次進める必要があります（依存関係があるため）

## リスク管理

1. **スコープクリープ**: 各フェーズの範囲を明確に定め、追加機能は別のフェーズに回す
2. **統合の問題**: 早期から統合テストを開始し、問題を早期に発見する
3. **マイグレーションの複雑さ**: 既存ドキュメントの多様性に対応するため、十分なテストケースを用意する
4. **パフォーマンス懸念**: 大規模メモリバンクでのテストを計画的に実施する

## マイルストーン

1. **基盤の確立**: フェーズ1-4の完了（推定: 2週間）
2. **機能の実装**: フェーズ5-9の完了（推定: 3週間）
3. **仕上げと安定化**: フェーズ10-12の完了（推定: 2週間）

## フィードバックとレビュー

各フェーズの終了時に以下のレビュープロセスを実施します：

1. コードレビュー（プルリクエスト）
2. テストカバレッジの確認
3. ドキュメントの更新
4. 次フェーズへの依存関係の確認

## リリース計画

1. **ベータ版**: すべてのフェーズ完了後、限定ユーザーでテスト
2. **RC版**: ベータテスト完了後、修正を適用
3. **正式リリース**: 2.0.0として正式リリース
4. **サポート**: 移行サポートと初期バグ修正（2.0.x）
