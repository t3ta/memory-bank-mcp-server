import fs from 'fs-extra';
import path from 'path';
import { LogLevel } from './logger';

/**
 * スクリプトの設定インターフェース
 */
export interface ScriptConfig {
  rootDir: string;
  backupDir: string;
  excludeDirs: string[];
  tagCategorizationPath: string;
  tagsIndexPath: string; // Path for the new tags index
  documentsMetaPath: string; // Path for the new documents metadata index
  legacyIndexPath: string;
  logLevel: LogLevel;
  dryRun: boolean;
}

/**
 * スクリプトの設定を管理するクラス
 */
export class Config {
  private config: ScriptConfig;

  /**
   * Configのコンストラクタ
   * @param configPath - 設定ファイルのパス（省略可）
   */
  constructor(configPath?: string) {
    // デフォルト設定を読み込む
    this.config = this.loadDefaultConfig();

    // 設定ファイルが指定されていれば読み込む
    if (configPath) {
      this.loadFromFile(configPath);
    }
  }

  /**
   * デフォルトの設定を読み込む
   * @returns デフォルト設定
   */
  private loadDefaultConfig(): ScriptConfig {
    // プロジェクトのルートディレクトリを推定
    // scripts/tag-update から実行されることを想定して、2レベル上のディレクトリをプロジェクトルートとする
    const projectRoot = path.resolve(process.cwd(), '../..');

    return {
      rootDir: path.join(projectRoot, 'docs/global-memory-bank'),
      backupDir: path.join(projectRoot, 'docs/global-memory-bank/backups'),
      excludeDirs: ['backups'],
      tagCategorizationPath: path.join(projectRoot, 'docs/global-memory-bank/tags/tag_categorization.json'),
      // Define paths for the new index files in the .index directory
      tagsIndexPath: path.join(projectRoot, 'docs/global-memory-bank/.index/tags_index.json'),
      documentsMetaPath: path.join(projectRoot, 'docs/global-memory-bank/.index/documents_meta.json'),
      legacyIndexPath: path.join(projectRoot, 'docs/global-memory-bank/_global_index.json'),
      logLevel: LogLevel.INFO,
      dryRun: false
    };
  }

  /**
   * 設定ファイルから設定を読み込む
   * @param configPath - 設定ファイルのパス
   */
  private loadFromFile(configPath: string): void {
    try {
      // ファイルが存在するか確認
      if (!fs.existsSync(configPath)) {
        throw new Error(`設定ファイルが見つかりません: ${configPath}`);
      }

      // JSONファイルを読み込む
      const fileConfig = fs.readJSONSync(configPath) as Partial<ScriptConfig>;

      // 設定をマージする
      this.config = { ...this.config, ...fileConfig };

    } catch (error) {
      throw new Error(`設定ファイルの読み込みに失敗しました: ${error}`);
    }
  }

  /**
   * 現在の設定を取得
   * @returns 現在の設定
   */
  getConfig(): ScriptConfig {
    return { ...this.config };
  }

  /**
   * 設定を部分的に更新
   * @param partialConfig - 更新する設定の一部
   */
  updateConfig(partialConfig: Partial<ScriptConfig>): void {
    this.config = { ...this.config, ...partialConfig };
  }

  /**
   * 特定の設定項目を取得
   * @param key - 設定項目のキー
   * @returns 設定値
   */
  get<K extends keyof ScriptConfig>(key: K): ScriptConfig[K] {
    return this.config[key];
  }

  /**
   * 設定をJSONファイルに保存
   * @param filePath - 保存先のファイルパス
   */
  async saveToFile(filePath: string): Promise<void> {
    try {
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeJSON(filePath, this.config, { spaces: 2 });
    } catch (error) {
      throw new Error(`設定の保存に失敗しました: ${error}`);
    }
  }
}
