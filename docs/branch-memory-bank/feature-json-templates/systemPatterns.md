# システムパターン: feature/json-templates

tags: #patterns #json #templates #architecture

## ディレクトリ構造

```
src/
├── schemas/
│   └── v2/
│       └── template-schema.ts  # 新規作成: JSONテンプレートのスキーマ定義
│
├── infrastructure/
│   └── templates/              # 新規作成: テンプレート関連の実装
│       ├── JsonTemplateLoader.ts
│       ├── MarkdownToJsonConverter.ts
│       └── interfaces/
│           └── ITemplateLoader.ts
│
└── templates/
    ├── json/                   # 新規作成: JSONテンプレート格納用ディレクトリ
    │   ├── pull-request-template.json
    │   └── rules.json
    │
    ├── pull-request-template.md       # 既存ファイル
    ├── pull-request-template-en.md    # 既存ファイル
    ├── rules-ja.md                    # 既存ファイル
    └── rules-en.md                    # 既存ファイル
```

## 関連するファイル

* `src/application/usecases/pr/CreatePullRequestUseCase.ts` - テンプレートを使用する主要なユースケース
* `src/schemas/v2/json-document.ts` - JSON文書スキーマの定義（参考）

## 技術的決定事項

### JSONテンプレート構造の定義

**コンテキスト**: 
テンプレートをJSON形式で構造化し、多言語対応を容易にする必要がある。

**決定事項**: 
以下の構造を採用する：

```typescript
interface JsonTemplate {
  schema: string; // e.g., "template_v1"
  metadata: {
    id: string;
    name: Record<string, string>; // 多言語対応の名前 { "ja": "日本語名", "en": "English Name" }
    description?: Record<string, string>; // 多言語対応の説明
    type: string; // e.g., "pull-request", "rules"
    lastModified: string; // ISO8601形式
  };
  content: {
    sections: Record<string, JsonTemplateSection>;
    placeholders: Record<string, string>; // プレースホルダーの説明 { "TITLE": "PRのタイトル" }
  };
}

interface JsonTemplateSection {
  title: Record<string, string>; // 多言語対応のセクションタイトル
  content: Record<string, string>; // 多言語対応のセクション内容
  optional?: boolean; // 省略可能なセクションかどうか
}
```

**影響**:
* **メリット**: 
  * 一つのファイルで複数言語をサポートできる
  * セクション単位でのアクセスが容易になる
  * スキーマベースの検証が可能になる
* **デメリット**: 
  * 既存のMarkdownベースの実装からの移行が必要
  * JSONは直接編集が難しい

### テンプレートローダーの実装方針

**コンテキスト**: 
既存のコードは直接ファイルからテンプレートを読み込んでいるが、構造化されたアクセスと多言語対応が必要。

**決定事項**: 
`ITemplateLoader`インターフェースと`JsonTemplateLoader`実装クラスを作成する。

```typescript
interface ITemplateLoader {
  // テンプレートIDと言語を指定してMarkdown形式で取得
  getTemplateContent(templateId: string, language: string): Promise<string>;
  
  // テンプレートIDを指定してJSONオブジェクトで取得
  getTemplateObject(templateId: string): Promise<JsonTemplate>;
  
  // テンプレートIDと言語を指定して特定のセクションを取得
  getTemplateSection(templateId: string, sectionId: string, language: string): Promise<string>;
  
  // サポートされている言語のリストを取得
  getSupportedLanguages(templateId: string): Promise<string[]>;
}
```

**影響**:
* **メリット**: 
  * 統一されたテンプレートアクセス方法の提供
  * 後方互換性のある設計
  * テスト容易性の向上
* **デメリット**: 
  * 既存のユースケースを修正する必要がある

### マイグレーション戦略

**コンテキスト**: 
既存のMarkdownテンプレートをJSON形式に変換する必要がある。

**決定事項**: 
単純なユーティリティクラス`MarkdownToJsonConverter`を実装し、次のプロセスで変換を行う：

1. 複数言語のMarkdownファイルを特定（例：`template.md`と`template-en.md`）
2. 各ファイルからセクションを抽出（`## セクション名`の形式）
3. JSONテンプレート構造に統合
4. 結果を検証して保存

**影響**:
* **メリット**: 
  * 手動変換の労力削減
  * 一貫性のある変換プロセス
* **デメリット**: 
  * Markdownの形式が一貫していない場合の課題
  * カスタムロジックのメンテナンスコスト

### 後方互換性の確保

**コンテキスト**: 
既存のコード（特にCreatePullRequestUseCase）はMarkdownテンプレートに依存している。

**決定事項**: 
テンプレートローダーは既存のファイルパス形式での要求にも対応できるよう、次の2つのモードをサポートする：

1. **レガシーモード**: ファイルパスから直接テンプレートを読み込む（既存の動作）
2. **新モード**: テンプレートIDと言語を指定して読み込む

さらに、JSONテンプレートがない場合は自動的にMarkdownファイルへフォールバックする機能を実装する。

**影響**:
* **メリット**: 
  * 既存コードを大幅に変更せずに移行可能
  * 段階的な移行が可能
* **デメリット**: 
  * コードの複雑性が若干増す
  * 2つのシステムを一時的に維持する必要がある
