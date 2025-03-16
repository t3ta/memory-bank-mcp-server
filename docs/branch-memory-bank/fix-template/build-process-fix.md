# templates ディレクトリが dist に含まれるようにするビルドプロセスの修正

## 問題概要
テンプレートファイル（特に `rules-en.md` および `rules-ja.md`）が実行時に参照できず、以下のエラーが発生していた。

```
Error executing code: MCP error -32603: ENOENT: no such file or directory, open '/Users/tmita/.npm/_npx/ab7f7c50e30c1e37/node_modules/memory-bank-mcp-server/dist/templates/rules-en.md'
```

## 根本原因
TypeScript のコンパイルプロセスでは、`.ts` ファイルは JavaScript に変換されるが、非 TypeScript ファイル（.md などのテキストファイル）は自動的に出力ディレクトリにコピーされない。そのため、`src/templates` 内のファイルが `dist/templates` に複製されず、実行時にファイルが見つからないエラーが発生していた。

## 実装した解決策

### 1. package.json に修正を追加
`copy-templates` スクリプトを追加し、ビルドプロセスの一部として実行されるようにした。

```diff
  "scripts": {
-    "build": "tsc && chmod +x dist/index.js",
+    "build": "tsc && chmod +x dist/index.js && npm run copy-templates",
     "clean": "rm -rf dist",
     "prepare": "npm run clean && npm run build",
+    "copy-templates": "mkdir -p dist/templates && cp -r src/templates/* dist/templates/",
```

### 2. ビルドの実行
修正後にビルドを実行し、`dist/templates` ディレクトリが正しく作成され、その中に必要なファイルがコピーされていることを確認した。

## 技術的考察
- TypeScript プロジェクトでは静的アセット（設定ファイル、テンプレート、静的ファイルなど）の処理に明示的な対応が必要
- npm パッケージとして配布する際に、ランタイムに必要なすべてのファイルが含まれているかの確認が重要
- 一般的な解決策としては:
  1. npm スクリプトを使用して必要なファイルをコピー（今回の採用方法）
  2. webpack などのバンドラーで静的ファイルをプロセスに組み込む
  3. tsconfig.json の `copyFiles` プラグインを使用（ts-node の場合）

## ベストプラクティス
- ビルドプロセスでは常に非ソースコードファイルの扱いを考慮する
- npm パッケージ公開前に、`npm pack` でパッケージ内容を確認する
- CI/CD パイプラインに、このようなエラーを早期に検出するテストを組み込む

## コミット情報
- コミットメッセージ: `Fix: Add copy-templates script to ensure template files are included in dist directory`
- コミットハッシュ: 6733c47619215e4e02c68b05463cfc388746864d