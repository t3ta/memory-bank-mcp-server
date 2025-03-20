import { promises as fs } from 'node:fs';
import * as path from 'node:path';

/**
 * 統合テスト用セットアップファイル
 * テスト環境の前処理と後処理を担当
 */

// テスト前の全体セットアップ
async function setupFunction() {
  console.log('統合テスト環境のセットアップを開始..');

  // 一時ディレクトリのクリーンアップ
  const tempDir = path.join(process.cwd(), 'tests', '.temp');

  try {
    // tempディレクトリの存在確認と作成
    try {
      await fs.access(tempDir);
    } catch {
      // ディレクトリが存在しない場合は作成
      await fs.mkdir(tempDir, { recursive: true });
      console.log(`テスト一時ディレクトリを作成: ${tempDir}`);
      return;
    }

    // 1日以上前のテストディレクトリを削除 (古い統合テストの残骸を掃除)
    const entries = await fs.readdir(tempDir, { withFileTypes: true });
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    let cleanedCount = 0;

    for (const entry of entries) {
      if (entry.isDirectory() && entry.name.startsWith('integration-')) {
        const dirPath = path.join(tempDir, entry.name);
        const stats = await fs.stat(dirPath);

        if (stats.mtimeMs < oneDayAgo) {
          await fs.rm(dirPath, { recursive: true, force: true });
          cleanedCount++;
        }
      }
    }

    if (cleanedCount > 0) {
      console.log(`${cleanedCount}個の古いテストディレクトリを削除しました`);
    }
  } catch (error) {
    console.warn('テスト環境セットアップ中にエラーが発生:', error);
  }

  console.log('統合テスト環境のセットアップ完了');
}

// テスト終了後の全体クリーンアップ
async function teardownFunction() {
  console.log('統合テスト環境のクリーンアップを開始..');

  try {
    // テスト中に終了しなかったプロセスがあれば強制終了など、ここに記述

    console.log('統合テスト環境のクリーンアップ完了');
  } catch (error) {
    console.warn('テスト環境クリーンアップ中にエラーが発生:', error);
  }
}

// デフォルトエクスポート
export default setupFunction;

// ティアダウン用エクスポート
export { teardownFunction as teardown };
