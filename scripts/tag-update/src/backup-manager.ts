import fs from 'fs-extra';
import path from 'path';
import { Logger } from './logger';

/**
 * バックアップ作成オプションの型定義
 */
export interface BackupOptions {
  backupDir: string;
  timestamp: string;
  files: string[];
}

/**
 * バックアップ管理を行うクラス
 */
export class BackupManager {
  /**
   * BackupManagerのコンストラクタ
   * @param logger - ロガーインスタンス
   */
  constructor(private logger: Logger) {}
  
  /**
   * バックアップを作成する
   * @param options - バックアップオプション
   * @returns 作成されたバックアップディレクトリのパス
   */
  async createBackup(options: BackupOptions): Promise<string> {
    try {
      // バックアップディレクトリのパスを構築
      const backupSubDir = path.join(options.backupDir, `tag-update-${options.timestamp}`);
      
      // バックアップディレクトリが存在しない場合は作成
      await fs.ensureDir(backupSubDir);
      
      this.logger.info(`バックアップディレクトリを作成しました: ${backupSubDir}`);
      
      // バックアップするファイルのリストとメタ情報を作成
      const backupMeta = {
        createdAt: new Date().toISOString(),
        files: [] as { source: string; destination: string }[]
      };
      
      // 各ファイルをバックアップ
      for (const filePath of options.files) {
        if (await fs.pathExists(filePath)) {
          // 相対パスを抽出（バックアップディレクトリ内での保存先）
          const rootDir = path.dirname(options.backupDir);
          const relativePath = path.relative(rootDir, filePath);
          const destPath = path.join(backupSubDir, relativePath);
          
          // 親ディレクトリを作成
          await fs.ensureDir(path.dirname(destPath));
          
          // ファイルをコピー
          await fs.copy(filePath, destPath);
          
          // メタ情報に追加
          backupMeta.files.push({
            source: filePath,
            destination: destPath
          });
          
          this.logger.debug(`バックアップしました: ${filePath} -> ${destPath}`);
        } else {
          this.logger.warning(`バックアップ対象ファイルが存在しません: ${filePath}`);
        }
      }
      
      // メタ情報をバックアップディレクトリに保存
      await fs.writeJSON(path.join(backupSubDir, 'backup-meta.json'), backupMeta, { spaces: 2 });
      
      this.logger.info(`${backupMeta.files.length}個のファイルをバックアップしました`);
      
      return backupSubDir;
    } catch (error) {
      this.logger.error(`バックアップの作成に失敗しました: ${error}`);
      throw new Error(`バックアップの作成に失敗しました: ${error}`);
    }
  }
  
  /**
   * バックアップから復元する
   * @param backupDir - バックアップディレクトリのパス
   * @returns 復元に成功したかどうか
   */
  async restoreFromBackup(backupDir: string): Promise<boolean> {
    try {
      // バックアップのメタ情報を読み込む
      const metaPath = path.join(backupDir, 'backup-meta.json');
      
      if (!await fs.pathExists(metaPath)) {
        this.logger.error(`バックアップのメタ情報が見つかりません: ${metaPath}`);
        return false;
      }
      
      const backupMeta = await fs.readJSON(metaPath) as {
        createdAt: string;
        files: Array<{ source: string; destination: string }>;
      };
      
      this.logger.info(`バックアップ(${backupMeta.createdAt})から復元を開始します...`);
      
      // 各ファイルを復元
      for (const file of backupMeta.files) {
        if (await fs.pathExists(file.destination)) {
          // 親ディレクトリを作成
          await fs.ensureDir(path.dirname(file.source));
          
          // ファイルを復元
          await fs.copy(file.destination, file.source);
          
          this.logger.debug(`復元しました: ${file.destination} -> ${file.source}`);
        } else {
          this.logger.warning(`バックアップファイルが見つかりません: ${file.destination}`);
        }
      }
      
      this.logger.info(`${backupMeta.files.length}個のファイルを復元しました`);
      
      return true;
    } catch (error) {
      this.logger.error(`バックアップからの復元に失敗しました: ${error}`);
      return false;
    }
  }
  
  /**
   * 利用可能なバックアップのリストを取得
   * @param backupDir - バックアップ親ディレクトリ
   * @returns バックアップディレクトリのリスト
   */
  async listBackups(backupDir: string): Promise<string[]> {
    try {
      if (!await fs.pathExists(backupDir)) {
        return [];
      }
      
      // タグ更新のバックアップディレクトリのみをフィルタリング
      const allDirs = await fs.readdir(backupDir);
      const tagUpdateDirs = allDirs.filter(dir => dir.startsWith('tag-update-'));
      
      // 完全パスに変換
      return tagUpdateDirs.map(dir => path.join(backupDir, dir));
    } catch (error) {
      this.logger.error(`バックアップリストの取得に失敗しました: ${error}`);
      return [];
    }
  }
  
  /**
   * 最新のバックアップディレクトリを取得
   * @param backupDir - バックアップ親ディレクトリ
   * @returns 最新のバックアップディレクトリパス、またはnull
   */
  async getLatestBackup(backupDir: string): Promise<string | null> {
    const backups = await this.listBackups(backupDir);
    
    if (backups.length === 0) {
      return null;
    }
    
    // タイムスタンプで降順にソート
    backups.sort((a, b) => {
      const aTimestamp = a.split('tag-update-')[1];
      const bTimestamp = b.split('tag-update-')[1];
      return bTimestamp.localeCompare(aTimestamp);
    });
    
    return backups[0];
  }
}
