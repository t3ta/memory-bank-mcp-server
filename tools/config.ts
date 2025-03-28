import * as fs from 'fs';
import * as path from 'path';
import { AnalyzeOptions, DiagramOptions, ToolConfig } from './types';

/**
 * 設定管理クラス
 */
export class ConfigManager {
  private configPath: string;
  private config: ToolConfig;
  
  /**
   * デフォルト設定
   */
  private defaultConfig: ToolConfig = {
    analyze: {
      depth: 'basic',
      exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/*.d.ts'],
      include: ['**/*.ts', '**/*.tsx']
    },
    diagram: {
      type: 'directory',
      detailLevel: 'standard',
      direction: 'TB'
    },
    output: {
      directory: './diagrams',
      format: 'mermaid'
    }
  };
  
  constructor(configPath?: string) {
    this.configPath = configPath || path.join(process.cwd(), 'package-analyzer.config.json');
    this.config = this.loadConfig();
  }
  
  /**
   * 設定をロード
   */
  private loadConfig(): ToolConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const configData = fs.readFileSync(this.configPath, 'utf8');
        const loadedConfig = JSON.parse(configData);
        
        // 深い統合
        return this.deepMerge(this.defaultConfig, loadedConfig);
      }
    } catch (error) {
      console.warn(`設定ファイルの読み込みに失敗しました: ${error.message}`);
      console.warn('デフォルト設定を使用します。');
    }
    
    return { ...this.defaultConfig };
  }
  
  /**
   * 設定を取得
   */
  public getConfig(): ToolConfig {
    return this.config;
  }
  
  /**
   * 解析設定を取得
   */
  public getAnalyzeOptions(): AnalyzeOptions {
    return this.config.analyze;
  }
  
  /**
   * ダイアグラム設定を取得
   */
  public getDiagramOptions(): DiagramOptions {
    return this.config.diagram;
  }
  
  /**
   * 出力設定を取得
   */
  public getOutputOptions() {
    return this.config.output;
  }
  
  /**
   * 設定を保存
   */
  public saveConfig(): void {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf8');
      console.log(`設定を保存しました: ${this.configPath}`);
    } catch (error) {
      console.error(`設定の保存に失敗しました: ${error.message}`);
    }
  }
  
  /**
   * 設定を更新
   */
  public updateConfig(newConfig: Partial<ToolConfig>): void {
    this.config = this.deepMerge(this.config, newConfig);
  }
  
  /**
   * オブジェクトを深い統合
   */
  private deepMerge<T>(target: T, source: Partial<T>): T {
    const output = { ...target };
    
    if (this.isObject(target) && this.isObject(source)) {
      Object.keys(source).forEach(key => {
        if (this.isObject(source[key])) {
          if (!(key in target)) {
            Object.assign(output, { [key]: source[key] });
          } else {
            output[key] = this.deepMerge(target[key], source[key]);
          }
        } else {
          Object.assign(output, { [key]: source[key] });
        }
      });
    }
    
    return output;
  }
  
  /**
   * オブジェクトかどうかを判定
   */
  private isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
  }
}