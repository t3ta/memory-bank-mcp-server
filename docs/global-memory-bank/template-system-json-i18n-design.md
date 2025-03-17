# テンプレートシステムのJSON化と多言語対応 - 設計仕様書

tags: #design #template #json #i18n #l10n #v2

## 1. 概要

本ドキュメントは、Memory Bank 2.0におけるテンプレートシステムのJSON化と多言語対応の設計仕様を定義します。この設計は、v2実装計画のフェーズ7.5として位置づけられ、既存のMarkdownベースのテンプレートシステムをJSONベースに移行し、効率的な多言語対応を実現するものです。

## 2. 設計目標

- テンプレート構造とコンテンツの分離による保守性の向上
- 国際化（i18n）と地域化（l10n）のベストプラクティスの適用
- 既存のテンプレートからの円滑な移行
- 将来的な言語追加の容易化
- クリーンアーキテクチャに準拠した実装

## 3. アーキテクチャ概要

```
src/
  ├── schemas/v2/                      # スキーマ定義
  │   ├── template-schema.ts           # テンプレート基本スキーマ
  │   └── i18n-schema.ts               # 国際化スキーマ
  ├── infrastructure/                  # インフラストラクチャレイヤー
  │   ├── i18n/                        # 国際化関連
  │   │   ├── translations/            # 翻訳ファイル
  │   │   │   ├── en.json              # 英語翻訳
  │   │   │   ├── ja.json              # 日本語翻訳
  │   │   │   └── zh.json              # 中国語翻訳（オプション）
  │   │   ├── I18nProvider.ts          # 国際化プロバイダー
  │   │   └── interfaces/
  │   │       └── II18nProvider.ts     # 国際化プロバイダーインターフェース
  │   └── templates/                   # テンプレート関連
  │       ├── JsonTemplateLoader.ts    # テンプレートローダー
  │       ├── TemplateRenderer.ts      # テンプレートレンダラー
  │       └── interfaces/
  │           └── ITemplateLoader.ts   # テンプレートローダーインターフェース
  ├── templates/json/                  # JSONテンプレート
  │   ├── pull-request.json            # PRテンプレート
  │   ├── develop-to-master.json       # develop→masterテンプレート
  │   ├── branch-context.json          # ブランチコンテキストテンプレート
  │   ├── active-context.json          # アクティブコンテキストテンプレート
  │   ├── system-patterns.json         # システムパターンテンプレート
  │   └── progress.json                # 進捗テンプレート
  └── cli/commands/template/           # テンプレート関連コマンド
      ├── MigrateTemplatesCommand.ts   # テンプレート移行コマンド
      └── GenerateTemplateCommand.ts   # テンプレート生成コマンド
```

## 4. データモデル

### 4.1 国際化（i18n）スキーマ

```typescript
// src/schemas/v2/i18n-schema.ts

// 翻訳キー型
export type TranslationKey = string;

// 翻訳辞書型
export type TranslationDictionary = Record<TranslationKey, string>;

// 翻訳ファイル型
export interface TranslationFile {
  language: 'en' | 'ja' | 'zh';
  translations: TranslationDictionary;
  metadata: {
    version: string;
    updatedAt: string; // ISO 8601形式
  };
}
```

### 4.2 テンプレートスキーマ

```typescript
// src/schemas/v2/template-schema.ts

import { TranslationKey } from './i18n-schema.js';

// テンプレートセクション型
export interface TemplateSection {
  id: string;
  titleKey: TranslationKey;  // 翻訳キーを参照
  contentKey?: TranslationKey;  // 翻訳キーを参照（オプション）
  placeholder?: string;  // プレースホルダー（オプション）
  isOptional: boolean;  // オプションセクションかどうか
}

// テンプレート基本型
export interface BaseTemplate {
  id: string;
  type: string;
  version: string;
  titleKey: TranslationKey;  // 翻訳キーを参照
  descriptionKey?: TranslationKey;  // 翻訳キーを参照（オプション）
  sections: TemplateSection[];
  createdAt: string;  // ISO 8601形式
  updatedAt: string;  // ISO 8601形式
}

// 特定のテンプレートタイプ
export interface PullRequestTemplate extends BaseTemplate {
  type: 'pull-request';
}

export interface BranchMemoryTemplate extends BaseTemplate {
  type: 'branch-memory';
}
```

## 5. コンポーネント設計

### 5.1 国際化プロバイダー（I18nProvider）

**責務**:
- 翻訳ファイルの読み込みと管理
- 翻訳キーに基づくテキスト取得
- 言語フォールバック処理
- パラメータ置換

**インターフェース**:
```typescript
// src/infrastructure/i18n/interfaces/II18nProvider.ts

export interface II18nProvider {
  translate(key: TranslationKey, language: Language, params?: Record<string, string>): string;
  loadTranslations(language: Language): Promise<boolean>;
  isLanguageSupported(language: Language): boolean;
}
```

**主要メソッド**:
- `translate`: 指定された言語で翻訳を取得
- `loadTranslations`: 翻訳ファイルを読み込む
- `isLanguageSupported`: サポートされている言語かどうかを確認

### 5.2 テンプレートレンダラー（TemplateRenderer）

**責務**:
- JSONテンプレートをMarkdownに変換
- 翻訳テキストの適用
- 変数置換
- フォーマット処理

**主要メソッド**:
- `renderToMarkdown`: テンプレートをMarkdownに変換

### 5.3 テンプレートローダー（JsonTemplateLoader）

**責務**:
- JSONテンプレートファイルの読み込み
- テンプレートのバリデーション
- テンプレートのレンダリング
- 後方互換性の提供

**インターフェース**:
```typescript
// src/infrastructure/templates/interfaces/ITemplateLoader.ts

export interface ITemplateLoader {
  loadJsonTemplate(templateId: string): Promise<BaseTemplate>;
  getMarkdownTemplate(templateId: string, language: Language, variables?: Record<string, string>): Promise<string>;
  loadLegacyTemplate(templateName: string, language: Language): Promise<string>;
}
```

**主要メソッド**:
- `loadJsonTemplate`: JSONテンプレートを読み込む
- `getMarkdownTemplate`: テンプレートをMarkdownとして取得
- `loadLegacyTemplate`: 既存のMarkdownテンプレートを読み込む

## 6. ファイル形式

### 6.1 翻訳ファイル（例: en.json）

```json
{
  "language": "en",
  "translations": {
    "template.title.pull_request": "Pull Request",
    "template.description.pull_request": "Standard pull request template",
    "template.section.overview": "Overview",
    "template.section.changes": "Changes",
    "template.section.technical_decisions": "Technical Decisions",
    "template.section.implemented_features": "Implemented Features",
    "template.section.known_issues": "Known Issues",
    "template.section.considerations": "Considerations",
    "template.footer.pull_request": "_This PR was automatically generated based on information from the memory bank_",

    "template.title.branch_context": "Branch Context",
    "template.section.purpose": "Purpose of this Branch",
    "template.section.user_stories": "User Stories",
    "template.content.user_stories": "### Problem to Solve\n\n{{PROBLEM}}\n\n### Required Features\n\n{{FEATURES}}\n\n### Expected Behavior\n\n{{BEHAVIOR}}",
    "template.section.related_issues": "Related Issues",

    "template.title.active_context": "Active Context",
    "template.section.current_work": "Current Work",
    "template.section.recent_changes": "Recent Changes",
    "template.section.active_decisions": "Active Decisions",
    "template.section.active_considerations": "Active Considerations",
    "template.section.next_steps": "Next Steps",

    "template.title.system_patterns": "System Patterns",
    "template.section.major_technical_decisions": "Major Technical Decisions",
    "template.section.file_structure": "Related Files and Directory Structure",
    "template.section.design_patterns": "Design Patterns",
    "template.section.architecture": "Architecture",

    "template.title.progress": "Progress",
    "template.section.working_features": "Currently Working Parts",
    "template.section.unimplemented_features": "Unimplemented Features and Remaining Work",
    "template.section.current_status": "Current Status",
    "template.section.known_issues": "Known Issues",
    "template.section.completion_criteria": "Completion Criteria",

    "template.footer.branch_memory": "_This document is part of the branch memory bank_"
  },
  "metadata": {
    "version": "1.0.0",
    "updatedAt": "2025-03-17T00:00:00Z"
  }
}
```

### 6.2 テンプレートファイル（例: pull-request.json）

```json
{
  "id": "pull-request",
  "type": "pull-request",
  "version": "2.0.0",
  "titleKey": "template.title.pull_request",
  "descriptionKey": "template.description.pull_request",
  "sections": [
    {
      "id": "overview",
      "titleKey": "template.section.overview",
      "placeholder": "{{CURRENT_WORK}}"
    },
    {
      "id": "changes",
      "titleKey": "template.section.changes",
      "placeholder": "{{RECENT_CHANGES}}"
    },
    {
      "id": "technical_decisions",
      "titleKey": "template.section.technical_decisions",
      "placeholder": "{{ACTIVE_DECISIONS}}"
    },
    {
      "id": "implemented_features",
      "titleKey": "template.section.implemented_features",
      "placeholder": "{{WORKING_FEATURES}}"
    },
    {
      "id": "known_issues",
      "titleKey": "template.section.known_issues",
      "placeholder": "{{KNOWN_ISSUES}}"
    },
    {
      "id": "considerations",
      "titleKey": "template.section.considerations",
      "placeholder": "{{CONSIDERATIONS}}"
    }
  ],
  "createdAt": "2025-03-17T00:00:00Z",
  "updatedAt": "2025-03-17T00:00:00Z"
}
```

## 7. 処理フロー

### 7.1 テンプレート読み込みとレンダリング

1. `JsonTemplateLoader.getMarkdownTemplate()`が呼び出される
2. 指定された言語の翻訳ファイルが読み込まれる
3. JSONテンプレートファイルが読み込まれる
4. テンプレートがバリデーションされる
5. `TemplateRenderer.renderToMarkdown()`が呼び出される
6. 各セクションのタイトルと内容が翻訳される
7. 変数が置換される
8. Markdown形式の文字列が返される

### 7.2 既存テンプレートからの移行

1. `MigrateTemplatesCommand.execute()`が呼び出される
2. 既存のMarkdownテンプレートファイルが読み込まれる
3. Markdownがパースされ、セクションに分割される
4. 各セクションから翻訳キーが生成される
5. 翻訳テキストが翻訳ファイルに追加される
6. JSONテンプレート構造が生成される
7. JSONテンプレートファイルが保存される

## 8. 後方互換性

既存のMarkdownテンプレートとの後方互換性を確保するため、以下の戦略を採用します：

1. 既存のテンプレートパスをサポート
2. `loadLegacyTemplate()`メソッドの提供
3. 既存のテンプレート参照コードの段階的な移行
4. 移行期間中の両方のフォーマットのサポート

## 9. 拡張性

この設計は以下の拡張に対応できます：

1. **新しい言語の追加**:
   - 新しい翻訳ファイルの追加のみで対応可能
   - テンプレート自体の変更は不要

2. **新しいテンプレートタイプの追加**:
   - 新しいJSONテンプレートファイルの追加
   - 必要な翻訳キーの追加

3. **テンプレート形式の拡張**:
   - 新しいセクションタイプの追加
   - 条件付きセクションの実装
   - ネストされたセクションの対応

## 10. 実装計画

### 10.1 フェーズ分割

1. **基盤の整備** (1日目):
   - スキーマ定義
   - インターフェース設計
   - ディレクトリ構造の作成

2. **コア機能の実装** (1日目):
   - I18nProvider
   - TemplateRenderer
   - JsonTemplateLoader

3. **テンプレートとリソースの作成** (2日目):
   - 翻訳ファイル
   - JSONテンプレート
   - マイグレーションツール

4. **統合とテスト** (2日目):
   - CLIコマンド
   - DIコンテナ登録
   - テスト実装

### 10.2 依存関係

- フェーズ7（CLIコマンド）の後に実装
- フェーズ8（マイグレーションツール）の前に実装
- 多言語対応計画と連携

## 11. テスト戦略

1. **単体テスト**:
   - I18nProviderのテスト
   - TemplateRendererのテスト
   - JsonTemplateLoaderのテスト

2. **統合テスト**:
   - テンプレート読み込みからレンダリングまでの統合テスト
   - CLIコマンドの統合テスト

3. **マイグレーションテスト**:
   - 既存テンプレートからの移行テスト
   - 生成されたJSONの検証

## 12. 結論

この設計により、Memory Bank 2.0のテンプレートシステムは以下の利点を得ることができます：

1. **保守性の向上**:
   - テンプレート構造とコンテンツの分離
   - 翻訳の一元管理

2. **多言語対応の強化**:
   - 効率的な翻訳管理
   - 言語追加の容易化

3. **拡張性の向上**:
   - 新しいテンプレートタイプの追加が容易
   - 将来的な機能拡張に対応

4. **クリーンアーキテクチャとの整合性**:
   - 明確な責務分離
   - インターフェースによる依存関係の逆転

この設計は、v2実装計画のフェーズ7.5として位置づけられ、JSONベースのアーキテクチャへの移行を促進するものです。
