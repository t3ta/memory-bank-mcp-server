import * as path from 'path';
import * as fs from 'fs';
import { PackageAnalyzer } from './package-analyzer';
import { MermaidGenerator } from './mermaid-generator';

// コマンドライン実行用のmain関数
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
    
    console.log(`Analyzing project: ${projectPath}`);
    
    // プロジェクト解析
    const analyzer = new PackageAnalyzer();
    const structure = analyzer.analyzeProject(projectPath, analyzeOptions);
    
    // ディレクトリ構造図生成
    const generator = new MermaidGenerator();
    const diagramOptions = {
      type: 'directory' as 'directory',
      detailLevel: 'standard' as 'standard',
      title: 'Directory Structure',
      direction: 'TB' as 'TB'
    };
    
    const diagram = generator.generateDirectoryDiagram(structure, diagramOptions);
    
    // 出力ファイル保存
    const outputPath = path.join(projectPath, 'schema-structure-diagram.md');
    const content = `# Schema Package Structure\n\n\`\`\`mermaid\n${diagram}\n\`\`\`\n`;
    
    fs.writeFileSync(outputPath, content);
    console.log(`Diagram generated at: ${outputPath}`);
    
    // 画面にも出力
    console.log('\nGenerated Diagram:');
    console.log('\n```mermaid');
    console.log(diagram);
    console.log('```');
    
  } catch (error) {
    console.error('Error occurred:', error);
  }
}

// 実行
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
