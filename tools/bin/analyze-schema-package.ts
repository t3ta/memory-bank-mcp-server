#!/usr/bin/env ts-node

import * as fs from 'fs';
import * as path from 'path';
import { PackageAnalyzer } from '../package-analyzer';
import { MermaidGenerator } from '../mermaid-generator';
import { AnalyzeOptions, DiagramOptions } from '../types';

// コマンドライン引数の処理
const args = process.argv.slice(2);
const helpText = `
使用方法: analyze-schema-package [オプション]

オプション:
  --project, -p     解析対象のプロジェクトパス（デフォルト: 現在のディレクトリ）
  --output, -o      出力ファイルパス（デフォルト: schema-packages-diagram.md）
  --type, -t        ダイアグラムタイプ: directory, class, dependency（デフォルト: directory）
  --level, -l       詳細レベル: minimum, standard, full（デフォルト: standard）
  --direction, -d   表示方向: TB, LR, BT, RL（デフォルト: TB）
  --depth, -e       最大解析深度 (デフォルト: 5)
  --help, -h        ヘルプを表示
`;

let projectPath = path.resolve(process.cwd(), '..');
let outputPath = 'schema-packages-diagram.md';
let diagramType: 'directory' | 'class' | 'dependency' = 'directory';
let detailLevel: 'minimum' | 'standard' | 'full' = 'standard';
let direction: 'TB' | 'LR' | 'BT' | 'RL' = 'TB';
let maxDepth = 5;

// コマンドライン引数の解析
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--help' || arg === '-h') {
    console.log(helpText);
    process.exit(0);
  } else if (arg === '--project' || arg === '-p') {
    projectPath = args[++i] || projectPath;
  } else if (arg === '--output' || arg === '-o') {
    outputPath = args[++i] || outputPath;
  } else if (arg === '--type' || arg === '-t') {
    const type = args[++i];
    if (type === 'directory' || type === 'class' || type === 'dependency') {
      diagramType = type;
    } else {
      console.error(`無効なダイアグラムタイプ: ${type}. 'directory', 'class', 'dependency' から選択してください。`);
      process.exit(1);
    }
  } else if (arg === '--level' || arg === '-l') {
    const level = args[++i];
    if (level === 'minimum' || level === 'standard' || level === 'full') {
      detailLevel = level;
    } else {
      console.error(`無効な詳細レベル: ${level}. 'minimum', 'standard', 'full' から選択してください。`);
      process.exit(1);
    }
  } else if (arg === '--direction' || arg === '-d') {
    const dir = args[++i];
    if (dir === 'TB' || dir === 'LR' || dir === 'BT' || dir === 'RL') {
      direction = dir;
    } else {
      console.error(`無効な方向: ${dir}. 'TB', 'LR', 'BT', 'RL' から選択してください。`);
      process.exit(1);
    }
  } else if (arg === '--depth' || arg === '-e') {
    maxDepth = parseInt(args[++i], 10) || maxDepth;
  }
}

// プロジェクトを解析
console.log(`プロジェクト '${projectPath}' を解析中...`);
const analyzer = new PackageAnalyzer();
const analyzeOptions: AnalyzeOptions = {
  depth: 'standard',
  exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.d.ts', '**/*.js.map'],
  include: ['**/*.ts', '**/*.tsx']
};

const structure = analyzer.analyzeProject(projectPath, analyzeOptions);
console.log(`${structure.rootDirectories.length} パッケージと ${structure.packagePaths.size} npmパッケージが見つかりました。`);

// ダイアグラムオプションの設定
const diagramOptions: DiagramOptions = {
  type: diagramType,
  detailLevel: detailLevel,
  title: `Schema Package Structure (${diagramType})`,
  direction: direction
};

// ダイアグラムを生成
const generator = new MermaidGenerator();
let diagram = '';

console.log(`${diagramType} ダイアグラムを生成中...`);
if (diagramType === 'directory') {
  diagram = generator.generateDirectoryDiagram(structure, diagramOptions);
} else if (diagramType === 'class') {
  diagram = generator.generateClassDiagram(structure, diagramOptions);
} else if (diagramType === 'dependency') {
  diagram = generator.generateDependencyDiagram(structure, diagramOptions);
}

// 出力ファイルを作成
const output = `# Schema Package Structure

Generated on: ${new Date().toISOString()}

## ${diagramOptions.title}

\`\`\`mermaid
${diagram}
\`\`\`
`;

fs.writeFileSync(outputPath, output);
console.log(`ダイアグラムが ${outputPath} に生成されました。`);
