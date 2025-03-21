import fs from 'fs-extra';
import path from 'path';
import { Logger } from './logger';

/**
 * FileScannerの設定オプション
 */
export interface FileScannerOptions {
  rootDir: string;
  excludeDirs?: string[];
  fileExtensions?: string[];
}

/**
 * ファイルシステムを再帰的にスキャンするクラス
 */
export class FileScanner {
  /**
   * FileScannerのコンストラクタ
   * @param options - スキャンオプション
   * @param logger - ロガーインスタンス
   */
  constructor(
    private options: FileScannerOptions,
    private logger: Logger
  ) {
    // デフォルト値の設定
    this.options.excludeDirs = this.options.excludeDirs || [];
    this.options.fileExtensions = this.options.fileExtensions || ['.json'];
  }
  
  /**
   * ディレクトリを再帰的にスキャンし、条件に合うファイルのパスリストを返す
   * @returns ファイルパスのリスト
   */
  async scanFiles(): Promise<string[]> {
    try {
      this.logger.info(`ディレクトリのスキャンを開始: ${this.options.rootDir}`);
      
      // ルートディレクトリが存在するか確認
      if (!await fs.pathExists(this.options.rootDir)) {
        throw new Error(`スキャン対象のディレクトリが存在しません: ${this.options.rootDir}`);
      }
      
      // 再帰的にスキャン
      const files = await this.scanDir(this.options.rootDir);
      
      this.logger.info(`スキャン完了: ${files.length}ファイルが見つかりました`);
      return files;
    } catch (error) {
      this.logger.error(`ファイルスキャンに失敗しました: ${error}`);
      throw error;
    }
  }
  
  /**
   * ディレクトリを再帰的にスキャン
   * @param currentDir - 現在のディレクトリパス
   * @returns ファイルパスのリスト
   */
  private async scanDir(currentDir: string): Promise<string[]> {
    // このディレクトリが除外リストに含まれているか確認
    if (this.shouldExcludeDir(currentDir)) {
      this.logger.debug(`ディレクトリをスキップ: ${currentDir}`);
      return [];
    }
    
    try {
      // ディレクトリ内のエントリを取得
      const entries = await fs.readdir(currentDir, { withFileTypes: true });
      
      let files: string[] = [];
      
      // 各エントリを処理
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        
        if (entry.isDirectory()) {
          // サブディレクトリの場合は再帰的にスキャン
          const subDirFiles = await this.scanDir(fullPath);
          files = files.concat(subDirFiles);
        } else if (entry.isFile() && this.isTargetFile(fullPath)) {
          // ファイルの場合は条件に合えばリストに追加
          files.push(fullPath);
          this.logger.debug(`ファイルを追加: ${fullPath}`);
        }
      }
      
      return files;
    } catch (error) {
      this.logger.warning(`ディレクトリのスキャンに失敗: ${currentDir} - ${error}`);
      return [];
    }
  }
  
  /**
   * ディレクトリが除外対象かどうかを判定
   * @param dirPath - ディレクトリパス
   * @returns 除外対象ならtrue
   */
  private shouldExcludeDir(dirPath: string): boolean {
    // ルートディレクトリは除外しない
    if (dirPath === this.options.rootDir) {
      return false;
    }
    
    // ディレクトリ名のみを取得
    const dirName = path.basename(dirPath);
    
    // 除外ディレクトリのリストと比較
    return this.options.excludeDirs!.some(excludeDir => {
      // 完全一致する場合
      if (dirName === excludeDir) {
        return true;
      }
      
      // パターンマッチング（glob書式のワイルドカードなど）が必要な場合はここで実装
      
      return false;
    });
  }
  
  /**
   * 対象とするファイルかどうかを判定
   * @param filePath - ファイルパス
   * @returns 対象ファイルならtrue
   */
  private isTargetFile(filePath: string): boolean {
    // ファイル名と拡張子を取得
    const ext = path.extname(filePath).toLowerCase();
    
    // 拡張子が指定リストに含まれているかチェック
    return this.options.fileExtensions!.includes(ext);
  }
  
  /**
   * スキャンオプションを取得
   * @returns 現在のスキャンオプション
   */
  getOptions(): FileScannerOptions {
    return { ...this.options };
  }
  
  /**
   * スキャンオプションを更新
   * @param options - 新しいオプション（部分的）
   */
  updateOptions(options: Partial<FileScannerOptions>): void {
    this.options = { ...this.options, ...options };
  }
}
