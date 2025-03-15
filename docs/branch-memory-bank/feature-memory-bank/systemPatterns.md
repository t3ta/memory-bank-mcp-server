# システムパターン

## 技術的決定事項

### アーキテクチャ
- MCPサーバーSDK (@modelcontextprotocol/sdk v0.5.0) を使用してサーバーを実装
- TypeScriptを使用して型安全性を確保
- マネージャークラスを使用して各機能を分離・カプセル化

### 主要コンポーネント
1. BaseMemoryBank
   - メモリーバンクの基本機能を提供する抽象クラス
   - 読み書きの共通インターフェースを定義

2. BranchMemoryBank
   - ブランチ固有のメモリーバンクを管理
   - ブランチごとのドキュメントの読み書きを担当

3. GlobalMemoryBank
   - プロジェクト全体のグローバルメモリーバンクを管理
   - 共通知識やプロジェクト設定の保存を担当

4. WorkspaceManager
   - ワークスペース全体の管理を担当
   - メモリーバンクの初期化と設定を管理

### MCPツール
1. write_branch_memory_bank
   - ブランチメモリーバンクにドキュメントを書き込む
   - 入力: path, content, branch

2. read_branch_memory_bank
   - ブランチメモリーバンクからドキュメントを読み込む
   - 入力: path, branch

3. read_rules
   - メモリーバンクのルールを指定言語で読み込む
   - 入力: language (en or ja)

## 関連ファイルとディレクトリ構造

```
src/
├── index.ts                # エントリーポイント、MCPサーバー設定
├── types.ts               # 共通型定義
├── managers/              # 各種マネージャークラス
│   ├── BaseMemoryBank.ts    # 基底メモリーバンククラス
│   ├── BranchMemoryBank.ts  # ブランチメモリーバンク実装
│   ├── GlobalMemoryBank.ts  # グローバルメモリーバンク実装
│   └── WorkspaceManager.ts  # ワークスペース管理
├── models/               # モデル定義
│   └── types.ts          # モデル関連の型定義
└── templates/           # テンプレートファイル
    ├── rules-en.md      # 英語ルール
    └── rules-ja.md      # 日本語ルール
```

### ドキュメント構造
```
docs/
├── global-memory-bank/     # グローバルメモリーバンク
│   ├── architecture.md     # システムアーキテクチャ
│   ├── coding-standards.md # コーディング規約
│   ├── domain-models.md    # ドメインモデル
│   ├── glossary.md        # 用語集
│   ├── tech-stack.md      # 技術スタック
│   └── user-guide.md      # ユーザーガイド
└── branch-memory-bank/    # ブランチメモリーバンク
    └── [branch-name]/     # 各ブランチのディレクトリ
        ├── activeContext.md  # 現在の作業状況
        ├── branchContext.md  # ブランチの目的
        ├── systemPatterns.md # 技術的決定事項
        └── progress.md       # 進捗状況
