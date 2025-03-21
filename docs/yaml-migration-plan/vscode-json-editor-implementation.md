# VSCode JSON エディタ拡張機能の実装計画

## 概要

このドキュメントでは、メモリバンクプロジェクトのJSONファイルを人間にとって見やすく表示・編集するためのVSCode拡張機能の実装計画について詳細に説明します。この拡張機能は、将来的にウェブアプリケーションとしても展開することを前提としていますが、まずはVSCode拡張機能として実装します。

## 目標

- メモリバンクのJSONファイルを人間にとって読みやすく表示する
- 構造化されたエディタでJSONファイルの編集を容易にする
- JSONスキーマに基づいた検証と自動補完を提供する
- 将来的なウェブ展開を見据えた設計を行う

## 拡張機能の基本構造

```
memory-bank-json-editor/
├── .vscode/                  # VSCode設定
├── src/
│   ├── extension.ts          # 拡張機能のエントリーポイント
│   ├── editor/
│   │   ├── jsonEditor.ts     # カスタムエディタの実装
│   │   ├── editorProvider.ts # エディタプロバイダー
│   │   └── webview.ts        # Webviewの管理
│   ├── schema/
│   │   ├── schemaLoader.ts   # JSONスキーマのロード
│   │   └── validator.ts      # スキーマ検証
│   ├── utils/
│   │   ├── formatter.ts      # JSONフォーマッター
│   │   └── parser.ts         # JSONパーサー
│   └── views/
│       ├── components/       # UIコンポーネント
│       └── webview.html      # Webviewのテンプレート
├── media/                    # アイコンなどの静的ファイル
├── package.json              # 拡張機能のマニフェスト
└── tsconfig.json             # TypeScript設定
```

## 主要機能と実装方法

### 1. カスタムエディタの実装

VSCodeのカスタムエディタAPIを使用して、JSONファイル用のカスタムエディタを実装します。

```typescript
// src/editor/editorProvider.ts
import * as vscode from 'vscode';
import { JsonEditorDocument } from './jsonEditor';

export class JsonEditorProvider implements vscode.CustomEditorProvider {
  private static readonly viewType = 'memoryBank.jsonEditor';

  constructor(private readonly context: vscode.ExtensionContext) {}

  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new JsonEditorProvider(context);
    return vscode.window.registerCustomEditorProvider(
      JsonEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      }
    );
  }

  // カスタムエディタの実装
  async resolveCustomEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    token: vscode.CancellationToken
  ): Promise<void> {
    // Webviewの設定
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'media'),
        vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
      ],
    };

    // Webviewの内容を設定
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

    // JSONドキュメントの解析
    const jsonDocument = new JsonEditorDocument(document);

    // Webviewとの通信を設定
    this.setupWebviewCommunication(webviewPanel, jsonDocument);
  }

  // その他の必要なメソッド...
}
```

### 2. JSONスキーマの統合

メモリバンクのJSONスキーマを読み込み、エディタに統合します。

```typescript
// src/schema/schemaLoader.ts
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export class SchemaLoader {
  private schemas: Map<string, any> = new Map();

  constructor() {
    this.loadSchemas();
  }

  private async loadSchemas() {
    // メモリバンクのスキーマファイルを検索
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) return;

    const schemaFiles = await vscode.workspace.findFiles('**/schemas/**/*.ts');

    for (const file of schemaFiles) {
      try {
        // TypeScriptファイルからスキーマ定義を抽出
        const content = await fs.promises.readFile(file.fsPath, 'utf-8');
        const schemaName = path.basename(file.fsPath, '.ts');

        // スキーマ定義を解析（実際の実装ではより複雑になる）
        const schema = this.extractSchemaFromTypeScript(content);
        if (schema) {
          this.schemas.set(schemaName, schema);
        }
      } catch (error) {
        console.error(`Failed to load schema from ${file.fsPath}:`, error);
      }
    }
  }

  // TypeScriptファイルからスキーマ定義を抽出するヘルパーメソッド
  private extractSchemaFromTypeScript(content: string): any {
    // 実際の実装では、TypeScriptのパーサーを使用して
    // Zodスキーマ定義を抽出し、JSON Schemaに変換する
    // ここでは簡略化のため、実装は省略
    return null;
  }

  // ドキュメントタイプに基づいてスキーマを取得
  public getSchemaForDocumentType(documentType: string): any {
    return this.schemas.get(documentType) || null;
  }
}
```

### 3. 構造化エディタのUI

Webviewを使用して、構造化エディタのUIを実装します。

```html
<!-- src/views/webview.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Memory Bank JSON Editor</title>
  <style>
    /* スタイルの定義 */
    body {
      padding: 0;
      margin: 0;
      font-family: var(--vscode-font-family);
      background-color: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }

    .editor-container {
      display: flex;
      height: 100vh;
    }

    .form-view {
      flex: 1;
      padding: 20px;
      overflow: auto;
    }

    .json-view {
      flex: 1;
      padding: 20px;
      overflow: auto;
      border-left: 1px solid var(--vscode-panel-border);
    }

    .form-group {
      margin-bottom: 15px;
    }

    .form-label {
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
    }

    .form-input {
      width: 100%;
      padding: 5px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
    }

    .form-textarea {
      width: 100%;
      min-height: 100px;
      padding: 5px;
      background-color: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border);
    }

    .array-item {
      margin-bottom: 10px;
      padding: 10px;
      border: 1px solid var(--vscode-panel-border);
      background-color: var(--vscode-editor-background);
    }

    .array-controls {
      margin-top: 10px;
    }

    button {
      padding: 5px 10px;
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      cursor: pointer;
    }

    button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }
  </style>
</head>
<body>
  <div class="editor-container">
    <div class="form-view" id="form-container">
      <!-- フォームはJavaScriptで動的に生成 -->
    </div>
    <div class="json-view">
      <pre id="json-preview"></pre>
    </div>
  </div>

  <script>
    // Webviewのスクリプト
    // 実際の実装では、webpackでバンドルされたJSファイルを読み込む
  </script>
</body>
</html>
```

### 4. Webviewとの通信

拡張機能とWebview間の通信を設定します。

```typescript
// src/editor/webview.ts
import * as vscode from 'vscode';
import { JsonEditorDocument } from './jsonEditor';

export function setupWebviewCommunication(
  webviewPanel: vscode.WebviewPanel,
  document: JsonEditorDocument
) {
  // 初期データをWebviewに送信
  webviewPanel.webview.postMessage({
    type: 'init',
    content: document.getData(),
    schema: document.getSchema(),
  });

  // Webviewからのメッセージを処理
  webviewPanel.webview.onDidReceiveMessage(
    async (message) => {
      switch (message.type) {
        case 'update':
          // ドキュメントを更新
          await document.update(message.content);
          break;

        case 'validate':
          // スキーマ検証を実行
          const validationResult = document.validate(message.content);
          webviewPanel.webview.postMessage({
            type: 'validation-result',
            result: validationResult,
          });
          break;

        case 'format':
          // JSONをフォーマット
          const formatted = document.format();
          webviewPanel.webview.postMessage({
            type: 'formatted',
            content: formatted,
          });
          break;
      }
    },
    undefined,
    document.disposables
  );

  // ドキュメントの変更をWebviewに通知
  document.onDidChange((data) => {
    webviewPanel.webview.postMessage({
      type: 'update',
      content: data,
    });
  });
}
```

### 5. JSONドキュメントの管理

JSONドキュメントの読み込み、解析、更新を管理します。

```typescript
// src/editor/jsonEditor.ts
import * as vscode from 'vscode';
import { SchemaLoader } from '../schema/schemaLoader';
import { JsonValidator } from '../schema/validator';
import { formatJson } from '../utils/formatter';

export class JsonEditorDocument {
  private readonly disposables: vscode.Disposable[] = [];
  private content: any;
  private readonly schemaLoader = new SchemaLoader();
  private readonly validator = new JsonValidator();
  private readonly onDidChangeEmitter = new vscode.EventEmitter<any>();

  constructor(private readonly document: vscode.TextDocument) {
    // ドキュメントの内容を解析
    this.content = this.parseDocument();

    // ドキュメントの変更を監視
    this.disposables.push(
      vscode.workspace.onDidChangeTextDocument((e) => {
        if (e.document.uri.toString() === this.document.uri.toString()) {
          this.content = this.parseDocument();
          this.onDidChangeEmitter.fire(this.content);
        }
      })
    );
  }

  // ドキュメントの内容を解析
  private parseDocument(): any {
    try {
      return JSON.parse(this.document.getText());
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to parse JSON: ${error}`);
      return null;
    }
  }

  // ドキュメントの内容を取得
  public getData(): any {
    return this.content;
  }

  // ドキュメントのスキーマを取得
  public getSchema(): any {
    if (!this.content || !this.content.metadata || !this.content.metadata.documentType) {
      return null;
    }

    return this.schemaLoader.getSchemaForDocumentType(this.content.metadata.documentType);
  }

  // ドキュメントを更新
  public async update(newContent: any): Promise<void> {
    // 内容が変更されていない場合は何もしない
    if (JSON.stringify(this.content) === JSON.stringify(newContent)) {
      return;
    }

    // 新しい内容をフォーマット
    const formatted = JSON.stringify(newContent, null, 2);

    // ドキュメントを編集
    const edit = new vscode.WorkspaceEdit();
    edit.replace(
      this.document.uri,
      new vscode.Range(0, 0, this.document.lineCount, 0),
      formatted
    );

    // 編集を適用
    await vscode.workspace.applyEdit(edit);
  }

  // ドキュメントを検証
  public validate(content: any = this.content): any {
    const schema = this.getSchema();
    if (!schema) {
      return { valid: true }; // スキーマがない場合は検証をスキップ
    }

    return this.validator.validate(content, schema);
  }

  // ドキュメントをフォーマット
  public format(): string {
    return formatJson(this.content);
  }

  // 変更イベント
  public get onDidChange(): vscode.Event<any> {
    return this.onDidChangeEmitter.event;
  }

  // リソースの解放
  public dispose(): void {
    this.disposables.forEach((d) => d.dispose());
  }

  // 破棄可能なリソースのリスト
  public get disposables(): vscode.Disposable[] {
    return this.disposables;
  }
}
```

## 開発環境のセットアップ

### 必要な依存関係

```json
{
  "name": "memory-bank-json-editor",
  "displayName": "Memory Bank JSON Editor",
  "description": "A structured editor for Memory Bank JSON files",
  "version": "0.1.0",
  "engines": {
    "vscode": "^1.60.0"
  },
  "categories": [
    "Other"
  ],
  "activationEvents": [
    "onCustomEditor:memoryBank.jsonEditor"
  ],
  "main": "./dist/extension.js",
  "contributes": {
    "customEditors": [
      {
        "viewType": "memoryBank.jsonEditor",
        "displayName": "Memory Bank JSON Editor",
        "selector": [
          {
            "filenamePattern": "*.json"
          }
        ],
        "priority": "default"
      }
    ],
    "commands": [
      {
        "command": "memoryBank.jsonEditor.format",
        "title": "Format JSON",
        "category": "Memory Bank"
      }
    ]
  },
  "scripts": {
    "vscode:prepublish": "npm run package",
    "compile": "webpack",
    "watch": "webpack --watch",
    "package": "webpack --mode production --devtool hidden-source-map",
    "test-compile": "tsc -p ./",
    "test-watch": "tsc -watch -p ./",
    "pretest": "npm run test-compile && npm run lint",
    "lint": "eslint src --ext ts",
    "test": "node ./out/test/runTest.js"
  },
  "devDependencies": {
    "@types/glob": "^7.1.3",
    "@types/mocha": "^8.2.2",
    "@types/node": "14.x",
    "@types/vscode": "^1.60.0",
    "@typescript-eslint/eslint-plugin": "^4.26.0",
    "@typescript-eslint/parser": "^4.26.0",
    "eslint": "^7.27.0",
    "glob": "^7.1.7",
    "mocha": "^8.4.0",
    "ts-loader": "^9.2.2",
    "typescript": "^4.3.2",
    "vscode-test": "^1.5.2",
    "webpack": "^5.38.1",
    "webpack-cli": "^4.7.0"
  },
  "dependencies": {
    "ajv": "^8.6.0",
    "jsonc-parser": "^3.0.0"
  }
}
```

### webpack設定

```javascript
// webpack.config.js
const path = require('path');

const config = {
  target: 'node',
  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  devtool: 'source-map',
  externals: {
    vscode: 'commonjs vscode'
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  }
};

// Webview用の設定
const webviewConfig = {
  target: 'web',
  entry: './src/webview/index.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'webview.js'
  },
  devtool: 'source-map',
  resolve: {
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  }
};

module.exports = [config, webviewConfig];
```

## 実装ステップ

### フェーズ1: 基本機能の実装（2週間）

1. **プロジェクトのセットアップ**:
   - VSCode拡張機能の基本構造を作成
   - 必要な依存関係をインストール
   - 開発環境の設定

2. **カスタムエディタの基本実装**:
   - カスタムエディタプロバイダーの実装
   - JSONファイルの読み込みと表示
   - 基本的な編集機能の実装

3. **Webviewの実装**:
   - Webviewのテンプレート作成
   - 基本的なUIコンポーネントの実装
   - 拡張機能とWebview間の通信設定

### フェーズ2: 高度な機能の実装（2週間）

1. **JSONスキーマの統合**:
   - スキーマローダーの実装
   - スキーマに基づいた検証機能の実装
   - エラー表示の実装

2. **構造化エディタの拡張**:
   - フォームベースの編集インターフェースの実装
   - ドキュメントタイプに応じたフォームの動的生成
   - 配列やネストされたオブジェクトの編集サポート

3. **フォーマットと検証**:
   - JSONフォーマッターの実装
   - リアルタイム検証の実装
   - エラーと警告の表示

### フェーズ3: ユーザー体験の向上（1週間）

1. **UIの改善**:
   - テーマサポートの追加
   - アクセシビリティの向上
   - キーボードショートカットの実装

2. **パフォーマンスの最適化**:
   - 大きなJSONファイルの処理の最適化
   - メモリ使用量の最適化
   - レンダリングパフォーマンスの向上

3. **ドキュメントとテスト**:
   - ユーザードキュメントの作成
   - 単体テストの実装
   - 統合テストの実装

### フェーズ4: 展開と将来の拡張（1週間）

1. **パッケージングと展開**:
   - 拡張機能のパッケージング
   - VSCode Marketplaceへの公開準備
   - インストールと使用方法のドキュメント作成

2. **将来のウェブ展開の準備**:
   - コードの再利用可能な部分の特定
   - ウェブアプリケーションへの移行計画の作成
   - 共通コンポーネントのライブラリ化

## テストと展開

### テスト戦略

1. **単体テスト**:
   - JSONパーサーとフォーマッターのテスト
   - スキーマ検証のテスト
   - ユーティリティ関数のテスト

2. **統合テスト**:
   - カスタムエディタの機能テスト
   - Webviewとの通信テスト
   - ドキュメントの読み込みと保存のテスト

3. **エンドツーエンドテスト**:
   - 実際のJSONファイルを使用したテスト
   - ユーザーワークフローのテスト
   - エラー処理のテスト

### 展開プロセス

1. **VSCode Marketplaceへの公開**:
   - 拡張機能のパッケージング
   - Marketplaceへの公開
   - バージョン管理とリリースノートの作成

2. **ユーザーフィードバックの収集**:
   - フィードバックチャネルの設定
   - バグ報告と機能リクエストの追跡
   - ユーザーテストの実施

## 将来的なウェブ展開への移行計画

### 共通コンポーネントの特定

1. **再利用可能なコンポーネント**:
   - JSONパーサーとフォーマッター
   - スキーマ検証ロジック
   - UIコンポーネント

2. **プラットフォーム固有のコンポーネント**:
   - VSCode API統合
   - ファイルシステムアクセス
   - Webviewの管理

### ウェブアプリケーションへの移行

1. **フロントエンドフレームワークの選定**:
   - React、Vue、Angularなどの評価
   - TypeScriptサポートの確認
   - コンポーネントライブラリの評価

2. **バックエンドの実装**:
   - APIの設計
   - ファイル管理システムの実装
   - 認証と認可の実装

3. **デプロイメント戦略**:
   - コンテナ化（Docker）
   - CI/CDパイプラインの設定
   - クラウドプラットフォームの選定

## 結論

VSCode拡張機能としてのJSONエディタの実装は、メモリバンクプロジェクトのJSONファイルを人間にとって見やすく表示・編集するための重要なステップです。この計画に従って実装を進めることで、ユーザーフレンドリーなエディタを提供し、将来的なウェブ展開への道筋を立てることができます。

フェーズごとの実装を進めることで、基本機能から高度な機能まで段階的に開発し、ユーザーフィードバックを取り入れながら改善を続けることができます。また、将来的なウェブ展開を見据えた設計を行うことで、コードの再利用性を高め、スムーズな移行を実現することができます。
