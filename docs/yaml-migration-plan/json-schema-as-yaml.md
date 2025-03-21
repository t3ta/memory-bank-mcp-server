# JSONスキーマのYAML表現

このドキュメントでは、現在のJSONスキーマをYAML形式で表現した例を示します。

## YAMLの基本構造

YAMLはJSONのスーパーセットであり、同じデータ構造をより読みやすい形式で表現できます。YAMLの主な特徴は以下の通りです：

- 中括弧 `{}` の代わりにインデントを使用
- 角括弧 `[]` は保持されるが、要素はインデントで表現することも可能
- コロン `:` の後にスペースが必要
- カンマ `,` は不要
- 引用符 `"` は多くの場合省略可能
- コメントをサポート（`#` で始まる行）

## メモリバンクドキュメントのYAML表現

### 基本構造

```yaml
schema: memory_document_v2
metadata:
  id: document-id
  title: ドキュメントタイトル
  documentType: ドキュメントタイプ
  path: ドキュメントパス
  tags:
    - タグ1
    - タグ2
  lastModified: 2025-03-21T14:30:00Z
  createdAt: 2025-03-21T14:30:00Z
  version: 1
content:
  # ドキュメントタイプに応じた内容
```

### ブランチコンテキストの例

```yaml
schema: memory_document_v2
metadata:
  id: feature-yaml-migration
  title: YAMLへの移行機能
  documentType: branch_context
  path: branchContext.yaml
  tags:
    - yaml
    - migration
    - feature
  lastModified: 2025-03-21T14:30:00Z
  createdAt: 2025-03-21T14:30:00Z
  version: 1
content:
  purpose: JSONからYAMLへの移行機能を実装する
  createdAt: 2025-03-21T14:30:00Z
  userStories:
    - description: ユーザーはJSONファイルをYAMLに変換できる
      completed: false
    - description: システムはYAMLファイルを読み込んで処理できる
      completed: false
```

### アクティブコンテキストの例

```yaml
schema: memory_document_v2
metadata:
  id: active-context-yaml
  title: YAML移行の現在の作業
  documentType: active_context
  path: activeContext.yaml
  tags:
    - yaml
    - active
    - work
  lastModified: 2025-03-21T14:35:00Z
  createdAt: 2025-03-21T14:30:00Z
  version: 1
content:
  currentWork: YAMLパーサーの実装
  recentChanges:
    - js-yamlパッケージの追加
    - 基本的なYAML読み込み機能の実装
  activeDecisions:
    - YAMLファイルの拡張子は.yamlを使用する
  considerations:
    - YAMLとJSONの互換性をどう維持するか
  nextSteps:
    - YAMLへの書き込み機能の実装
    - 変換ユーティリティの作成
```

### 進捗状況の例

```yaml
schema: memory_document_v2
metadata:
  id: progress-yaml-migration
  title: YAML移行の進捗状況
  documentType: progress
  path: progress.yaml
  tags:
    - yaml
    - progress
    - migration
  lastModified: 2025-03-21T15:00:00Z
  createdAt: 2025-03-21T14:30:00Z
  version: 1
content:
  workingFeatures:
    - YAMLファイルの読み込み
    - 基本的なスキーマ検証
  pendingImplementation:
    - YAMLファイルの書き込み
    - JSONからYAMLへの変換ユーティリティ
    - YAMLエディタの統合
  status: 進行中
  knownIssues:
    - 複雑なネストされた構造の検証が未実装
    - 大きなファイルのパフォーマンス最適化が必要
```

### システムパターンの例

```yaml
schema: memory_document_v2
metadata:
  id: system-patterns-yaml
  title: YAML実装のシステムパターン
  documentType: system_patterns
  path: systemPatterns.yaml
  tags:
    - yaml
    - patterns
    - architecture
  lastModified: 2025-03-21T15:30:00Z
  createdAt: 2025-03-21T14:30:00Z
  version: 1
content:
  technicalDecisions:
    - title: YAMLライブラリの選定
      context: |
        YAMLの解析と生成のためのライブラリを選定する必要がある。
        候補として、js-yaml、yaml.js、yaml-ast-parser などがある。
      decision: |
        js-yaml を採用する。理由は以下の通り：
        - 広く使用されており、安定している
        - TypeScriptの型定義が利用可能
        - パフォーマンスが良好
        - アクティブにメンテナンスされている
      consequences:
        - 依存関係が1つ増える
        - YAMLの高度な機能（タグ、アンカー、エイリアス）も利用可能になる
        - 将来的なアップグレードパスが確保される
    - title: ファイル拡張子の標準化
      context: |
        YAMLファイルの拡張子として、.yaml と .yml の両方が一般的に使用されている。
        プロジェクト内で統一する必要がある。
      decision: |
        .yaml を標準拡張子として採用する。理由は以下の通り：
        - より明示的で自己説明的
        - 多くのプロジェクトで採用されている
        - エディタのシンタックスハイライトが確実に機能する
      consequences:
        - 既存の .yml ファイルがある場合は変換が必要
        - ファイル名の長さが若干増加する
        - 標準化により混乱を防止できる
```

## YAMLの利点

JSONと比較したYAMLの主な利点は以下の通りです：

1. **可読性の向上**：
   - インデントベースの構造により、ネストされたデータが視覚的に理解しやすい
   - 引用符や中括弧が少なく、視覚的なノイズが減少
   - 複数行の文字列を自然に表現できる

2. **コメントのサポート**：
   - `#` で始まる行をコメントとして使用可能
   - ドキュメント内に説明や注釈を追加できる

3. **複雑なデータ構造の簡潔な表現**：
   - アンカー (`&`) とエイリアス (`*`) による参照と再利用
   - 複数行の文字列を `|` (改行を保持) や `>` (折り返し) で表現
   - 複雑なネストを視覚的に整理しやすい

4. **エラーの少ない編集**：
   - カンマの欠落によるエラーがない
   - 引用符の不一致によるエラーが少ない
   - インデントの視覚的な一貫性により構造が明確

## 注意点

YAMLを使用する際の注意点：

1. **インデントに敏感**：
   - スペースの数が重要で、タブとスペースの混在は避ける
   - 一貫したインデントスタイルを維持する（通常は2スペース）

2. **特殊文字の扱い**：
   - `:`, `{`, `}`, `[`, `]`, `,`, `&`, `*`, `#`, `?`, `|`, `>`, `!`, `%`, `@`, `` ` `` などの文字を値として使用する場合は引用符で囲む

3. **数値の自動変換**：
   - `yes`, `no`, `true`, `false` などは自動的にブール値に変換される
   - 数値のように見える文字列は自動的に数値に変換される可能性がある
   - 明示的に文字列として扱いたい場合は引用符で囲む

4. **日付の扱い**：
   - ISO 8601形式の日付文字列は自動的に日付オブジェクトに変換される可能性がある
   - 文字列として扱いたい場合は引用符で囲む

## YAMLへの移行手順

JSONからYAMLへの移行は以下の手順で行うことができます：

1. **ライブラリの導入**：
   ```bash
   npm install js-yaml @types/js-yaml
   ```

2. **変換ユーティリティの実装**：
   ```typescript
   import fs from 'fs/promises';
   import yaml from 'js-yaml';
   import path from 'path';

   async function convertJsonToYaml(jsonFilePath: string): Promise<void> {
     // JSONファイルを読み込む
     const jsonContent = await fs.readFile(jsonFilePath, 'utf-8');
     const jsonData = JSON.parse(jsonContent);

     // YAMLに変換
     const yamlContent = yaml.dump(jsonData, {
       indent: 2,
       lineWidth: 100,
       noRefs: true,
     });

     // 拡張子を.yamlに変更して保存
     const yamlFilePath = jsonFilePath.replace(/\.json$/, '.yaml');
     await fs.writeFile(yamlFilePath, yamlContent, 'utf-8');

     console.log(`Converted ${jsonFilePath} to ${yamlFilePath}`);
   }
   ```

3. **読み込み機能の実装**：
   ```typescript
   async function readYamlFile<T>(filePath: string): Promise<T> {
     const content = await fs.readFile(filePath, 'utf-8');
     return yaml.load(content) as T;
   }
   ```

4. **書き込み機能の実装**：
   ```typescript
   async function writeYamlFile<T>(filePath: string, data: T): Promise<void> {
     const yamlContent = yaml.dump(data, {
       indent: 2,
       lineWidth: 100,
       noRefs: true,
     });

     await fs.writeFile(filePath, yamlContent, 'utf-8');
   }
   ```

5. **リポジトリの拡張**：
   ```typescript
   class YamlMemoryDocumentRepository implements IMemoryDocumentRepository {
     constructor(
       private readonly basePath: string,
       private readonly fileSystemService: IFileSystemService
     ) {}

     async findByPath(path: DocumentPath): Promise<MemoryDocument | null> {
       const filePath = this.resolvePath(path.value);

       if (!await this.fileSystemService.fileExists(filePath)) {
         return null;
       }

       const content = await this.fileSystemService.readFile(filePath);
       const data = yaml.load(content) as any;

       // データからMemoryDocumentを構築
       return MemoryDocument.create({
         path,
         content: JSON.stringify(data.content),
         tags: (data.metadata.tags || []).map(tag => Tag.create(tag)),
         lastModified: new Date(data.metadata.lastModified),
       });
     }

     async save(document: MemoryDocument): Promise<void> {
       const filePath = this.resolvePath(document.path.value);

       // YAMLデータを構築
       const data = {
         schema: "memory_document_v2",
         metadata: {
           id: document.id,
           title: document.title,
           documentType: document.documentType,
           path: document.path.value,
           tags: document.tags.map(tag => tag.value),
           lastModified: document.lastModified.toISOString(),
           createdAt: document.createdAt.toISOString(),
           version: document.version
         },
         content: JSON.parse(document.content)
       };

       // YAMLに変換して保存
       const yamlContent = yaml.dump(data, {
         indent: 2,
         lineWidth: 100,
         noRefs: true,
       });

       await this.fileSystemService.writeFile(filePath, yamlContent);
     }

     // その他のメソッド...
   }
   ```

## 結論

YAMLはJSONの代替として、より人間にとって読みやすく編集しやすいフォーマットを提供します。メモリバンクプロジェクトでは、YAMLを採用することで、特に複雑なネストされた構造や長いテキストを含むドキュメントの可読性が向上します。

また、YAMLはコメントをサポートしているため、ドキュメント内に説明や注釈を追加できるという大きな利点があります。これにより、ドキュメントの意図や背景情報を直接ファイル内に記録することができます。

JSONからYAMLへの移行は比較的単純であり、既存のスキーマをそのまま活用できます。段階的な移行アプローチを採用することで、リスクを最小限に抑えながら、より良いデータフォーマットへの移行を実現できます。
