#!/usr/bin/env ts-node

import * as path from 'path';
import * as fs from 'fs';
import { PackageAnalyzer } from '../package-analyzer';
import { MermaidGenerator } from '../mermaid-generator';

/**
 * AIプロンプト用のモノレポ構造埋め込みツール
 * スキーマパッケージの構造を解析し、AIプロンプト用の埋め込みテキストを生成する
 */
async function main() {
  try {
    // プロジェクトパス（カレントディレクトリ）
    const projectPath = process.cwd();
    
    // 解析オプション設定
    const analyzeOptions = {
      depth: 'basic' as 'basic',
      exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.d.ts'],
      include: ['**/*.ts', '**/*.tsx']
    };
    
    console.log(`🔍 プロジェクト解析開始: ${projectPath}`);
    
    // プロジェクト解析
    const analyzer = new PackageAnalyzer();
    const structure = analyzer.analyzeProject(projectPath, analyzeOptions);
    
    // ディレクトリ構造図生成
    const generator = new MermaidGenerator();
    const diagramOptions = {
      type: 'directory' as 'directory',
      detailLevel: 'standard' as 'standard',
      title: 'モノレポパッケージ構造',
      direction: 'TB' as 'TB'
    };
    
    const diagram = generator.generateDirectoryDiagram(structure, diagramOptions);
    
    // AIプロンプト用の埋め込みテキスト生成
    const aiEmbedding = generateAIEmbedding(structure, diagram);
    
    // 出力ファイル保存
    const outputPath = path.join(projectPath, 'ai-embedding.md');
    fs.writeFileSync(outputPath, aiEmbedding);
    console.log(`✨ AI埋め込みファイル生成完了: ${outputPath}`);
    
    // クリップボードにコピー（コマンドによって異なる）
    try {
      fs.writeFileSync('/tmp/ai-embedding.txt', aiEmbedding);
      console.log('📋 クリップボードにコピーするには:');
      console.log('  cat /tmp/ai-embedding.txt | pbcopy    # macOS');
      console.log('  cat /tmp/ai-embedding.txt | xclip -selection clipboard    # Linux');
    } catch (error) {
      console.error('一時ファイル作成に失敗しました', error);
    }
    
  } catch (error) {
    console.error('❌ エラー発生:', error);
  }
}

/**
 * AIプロンプト用の埋め込みテキストを生成
 */
function generateAIEmbedding(structure: any, diagram: string): string {
  const packageInfo = extractPackageInfo(structure);
  
  return `
# モノレポ構造情報

このプロジェクトは以下のパッケージ構造を持つモノレポです。この情報を参考に、質問に対して正確な回答をしてください。

## パッケージ概要

${packageInfo.map(pkg => `- **${pkg.name}**: ${pkg.description || 'パッケージの説明なし'}`).join('\n')}

## ディレクトリ構造

\`\`\`mermaid
${diagram}
\`\`\`

## ファイル構成の特徴

- モノレポ構造を採用し、複数のパッケージを管理しています
- 各パッケージは独立したpackage.jsonを持ち、依存関係を管理しています
- テストは各パッケージの tests/ ディレクトリ内に配置されています

## 重要なファイル

${packageInfo.flatMap(pkg => 
  pkg.importantFiles.map(file => `- \`${pkg.name}/${file.path}\`: ${file.description || 'ファイルの説明なし'}`)
).join('\n')}

## 依存関係

${packageInfo.map(pkg => 
  `- ${pkg.name}: ${Object.keys(pkg.dependencies || {}).length > 0 ? 
    Object.entries(pkg.dependencies || {}).map(([dep, ver]) => `${dep}@${ver}`).join(', ') : 
    '外部依存なし'}`
).join('\n')}

## 開発時の注意点

- パッケージ間の依存関係に注意して開発を進めてください
- モジュールのインポートには相対パスではなく、パッケージ名を使用してください
- テストは対応するコードと同じディレクトリ構造で配置してください
`;
}

/**
 * パッケージ情報を抽出
 */
function extractPackageInfo(structure: any): any[] {
  const packages: any[] = [];
  
  // パッケージパスを使用
  structure.packagePaths.forEach((packagePath: string, packageName: string) => {
    const packageJsonPath = path.join(packagePath, 'package.json');
    let packageJson = {};
    
    try {
      if (fs.existsSync(packageJsonPath)) {
        packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      }
    } catch (error) {
      console.error(`パッケージJSONの読み込みに失敗: ${packageJsonPath}`, error);
    }
    
    // 重要なファイルを特定（ここではシンプルに例示）
    const importantFiles = [
      { path: 'src/index.ts', description: 'パッケージのメインエントリポイント' },
      { path: 'package.json', description: 'パッケージの設定と依存関係' }
    ];
    
    packages.push({
      name: packageName,
      description: (packageJson as any).description || `${packageName} パッケージ`,
      dependencies: (packageJson as any).dependencies || {},
      importantFiles
    });
  });
  
  return packages;
}

// 実行
main().catch(err => {
  console.error('💥 致命的エラー:', err);
  process.exit(1);
});
