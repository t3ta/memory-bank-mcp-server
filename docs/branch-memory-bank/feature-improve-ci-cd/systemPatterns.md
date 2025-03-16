# システムパターン

## 技術的決定事項

### テンプレートの言語分岐

#### コンテキスト
PRテンプレートは言語によってフォーマットが変わる必要がある

#### 決定事項
リポジトリ名に基づいて言語を判断し、適切なテンプレートファイルを選択する

#### 影響
- リポジトリ名に言語指定がある場合（例：-en付き）、英語テンプレートを使用
- それ以外の場合は日本語テンプレートをデフォルトとする
- テンプレートは src/templates/ ディレクトリで管理

### コミットメッセージに基づくPRタイプの判断

#### コンテキスト
PRのタイトルとラベルはコミットの種類を反映すべき

#### 決定事項
コミットメッセージのプレフィックス（feat:, fix:など）に基づいてPRのタイトルとラベルを設定

#### 影響
- 機能追加（feat:）の場合は「✨ feat: Merge develop into master」というタイトルになる
- バグ修正（fix:）の場合は「🐛 fix: Merge develop into master」というタイトルになる
- その他の場合は「🔄 chore: Merge develop into master」というタイトルになる
- 対応するラベル（enhancement, bug, chore）も自動付与される

### コンカレンシー制御の統一

#### コンテキスト
ワークフローのコンカレンシー設定が統一されていないと、同時実行による問題が発生する可能性がある

#### 決定事項
すべてのワークフローに同一のコンカレンシー設定を追加する

#### 影響
- 同じブランチで同時に実行されるのを防止する
- 進行中のワークフローは新しいワークフローによってキャンセルされる
- リソースの効率的な使用が可能になる

## 関連ファイルとディレクトリ構造

- .github/workflows/develop-to-master-pr.yml - 新規作成するワークフロー
- .github/workflow-templates/develop-to-master-pr-template.md - 日本語テンプレート
- .github/workflow-templates/develop-to-master-pr-template-en.md - 英語テンプレート
- .github/workflows/auto-pr.yml - 既存のPR自動作成ワークフロー
- .github/workflows/release.yml - masterブランチでのリリースワークフロー
- .github/workflows/test.yml - テストワークフロー
- .github/workflows/version-bump.yml - バージョンアップワークフロー
- docs/global-memory-bank/ci-cd/workflows.md - CI/CDワークフローのドキュメント
- src/templates/ - ソフトウェア機能として提供するテンプレート
