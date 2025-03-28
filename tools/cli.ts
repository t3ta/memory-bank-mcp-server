#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import { PackageStructureTool } from './index';

const program = new Command();
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json'), 'utf8'));

program
  .name('package-analyzer')
  .description('TypeScriptプロジェクトのパッケージ構造を解析し、ダイアグラムを生成するツール')
  .version(packageJson.version);

program
  .command('analyze')
  .description('プロジェクトを解析してダイアグラムを生成')
  .argument('[projectPath]', 'プロジェクトのパス (デフォルト: カレントディレクトリ)')
  .option('-c, --config <path>', '設定ファイルのパス')
  .option('-t, --type <type>', 'ダイアグラムのタイプ (directory, class, dependency)', 'directory')
  .option('-o, --output <path>', '出力ファイルのパス')
  .option('-f, --format <format>', '出力フォーマット (mermaid, json, html)', 'mermaid')
  .option('-j, --json', 'プロジェクト構造をJSONとして出力')
  .action((projectPath, options) => {
    try {
      // プロジェクトパスのデフォルト値を設定
      const targetPath = projectPath || process.cwd();
      
      // ツールを初期化
      const tool = new PackageStructureTool(options.config);
      
      // 出力フォーマットを設定
      if (options.format) {
        tool.updateConfig({
          output: {
            format: options.format
          }
        });
      }
      
      // プロジェクトを解析
      console.log(`プロジェクトを解析中: ${targetPath}`);
      const structure = tool.analyze(targetPath);
      console.log(`解析完了: ${structure.rootDirectories.length} ディレクトリ, ${structure.packagePaths.size} パッケージ`);
      
      // ダイアグラムを生成
      if (!options.json) {
        const diagramType = options.type as 'directory' | 'class' | 'dependency';
        console.log(`${diagramType}ダイアグラムを生成中...`);
        const diagram = tool.generateDiagram(diagramType);
        
        // 出力ファイル名を決定
        const outputFilename = options.output ? path.basename(options.output) : undefined;
        const outputPath = tool.outputDiagram(diagram, outputFilename);
        console.log(`ダイアグラムを保存しました: ${outputPath}`);
      }
      
      // JSON出力オプションがあればJSON形式で出力
      if (options.json) {
        const outputFilename = options.output ? path.basename(options.output) : undefined;
        const outputPath = tool.outputStructureJson(outputFilename);
        console.log(`プロジェクト構造を保存しました: ${outputPath}`);
      }
    } catch (error) {
      console.error('エラー:', error.message);
      process.exit(1);
    }
  });

program
  .command('init')
  .description('設定ファイルを初期化')
  .option('-p, --path <path>', '設定ファイルの保存先パス')
  .action((options) => {
    try {
      const configPath = options.path;
      const tool = new PackageStructureTool(configPath);
      
      // デフォルト設定を保存
      tool.saveConfig();
      console.log('設定ファイルを初期化しました！');
    } catch (error) {
      console.error('エラー:', error.message);
      process.exit(1);
    }
  });

program.parse(process.argv);

// コマンドが指定されていない場合はヘルプを表示
if (!process.argv.slice(2).length) {
  program.outputHelp();
}