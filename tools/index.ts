import * as fs from 'fs';
import * as path from 'path';
import { PackageAnalyzer } from './package-analyzer';
import { MermaidGenerator } from './mermaid-generator';
import { ConfigManager } from './config';
import { ProjectStructure, ToolConfig, DiagramOptions } from './types';

/**
 * パッケージ構造解析ツール
 */
export class PackageStructureTool {
  private analyzer: PackageAnalyzer;
  private mermaidGenerator: MermaidGenerator;
  private configManager: ConfigManager;
  private projectStructure: ProjectStructure | null = null;
  
  constructor(configPath?: string) {
    this.analyzer = new PackageAnalyzer();
    this.mermaidGenerator = new MermaidGenerator();
    this.configManager = new ConfigManager(configPath);
  }
  
  /**
   * プロジェクトを解析
   */
  public analyze(projectPath: string): ProjectStructure {
    const analyzeOptions = this.configManager.getAnalyzeOptions();
    this.projectStructure = this.analyzer.analyzeProject(projectPath, analyzeOptions);
    return this.projectStructure;
  }
  
  /**
   * ダイアグラムを生成
   */
  public generateDiagram(type?: 'class' | 'directory' | 'dependency'): string {
    if (!this.projectStructure) {
      throw new Error('プロジェクトが解析されていません。まず analyze() を呼び出してください。');
    }
    
    const diagramOptions = this.configManager.getDiagramOptions();
    // 指定されたタイプがある場合は、それを使用
    const options: DiagramOptions = {
      ...diagramOptions,
      type: type || diagramOptions.type
    };
    
    switch (options.type) {
      case 'class':
        return this.mermaidGenerator.generateClassDiagram(this.projectStructure, options);
      case 'dependency':
        return this.mermaidGenerator.generateDependencyDiagram(this.projectStructure, options);
      case 'directory':
      default:
        return this.mermaidGenerator.generateDirectoryDiagram(this.projectStructure, options);
    }
  }
  
  /**
   * ダイアグラムを出力
   */
  public outputDiagram(diagram: string, filename?: string): string {
    const outputOptions = this.configManager.getOutputOptions();
    const outputDir = outputOptions.directory;
    
    // 出力ディレクトリがなければ作成
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // ファイル名が指定されていない場合は、デフォルト名を生成
    const outputFilename = filename || `diagram-${Date.now()}.${outputOptions.format}`;
    const outputPath = path.join(outputDir, outputFilename);
    
    fs.writeFileSync(outputPath, diagram, 'utf8');
    console.log(`ダイアグラムを出力しました: ${outputPath}`);
    
    return outputPath;
  }
  
  /**
   * プロジェクト構造をJSON形式で出力
   */
  public outputStructureJson(filename?: string): string {
    if (!this.projectStructure) {
      throw new Error('プロジェクトが解析されていません。まず analyze() を呼び出してください。');
    }
    
    const outputOptions = this.configManager.getOutputOptions();
    const outputDir = outputOptions.directory;
    
    // 出力ディレクトリがなければ作成
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // ファイル名が指定されていない場合は、デフォルト名を生成
    const outputFilename = filename || `structure-${Date.now()}.json`;
    const outputPath = path.join(outputDir, outputFilename);
    
    // Map型はJSONに直接変換できないので、通常のオブジェクトに変換
    const packagePathsObj = {};
    this.projectStructure.packagePaths.forEach((value, key) => {
      packagePathsObj[key] = value;
    });
    
    const serializableStructure = {
      ...this.projectStructure,
      packagePaths: packagePathsObj
    };
    
    fs.writeFileSync(outputPath, JSON.stringify(serializableStructure, null, 2), 'utf8');
    console.log(`構造情報を出力しました: ${outputPath}`);
    
    return outputPath;
  }
  
  /**
   * 設定を取得
   */
  public getConfig(): ToolConfig {
    return this.configManager.getConfig();
  }
  
  /**
   * 設定を更新
   */
  public updateConfig(newConfig: Partial<ToolConfig>): void {
    this.configManager.updateConfig(newConfig);
  }
  
  /**
   * 設定を保存
   */
  public saveConfig(): void {
    this.configManager.saveConfig();
  }
}

// エクスポート
export * from './types';
export * from './package-analyzer';
export * from './mermaid-generator';
export * from './config';