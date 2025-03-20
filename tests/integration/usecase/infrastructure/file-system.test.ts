import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

/**
 * 基本的なファイルシステム操作のテスト
 * 実際のシステムコンポーネントを使わない最小限の統合テスト
 */
describe('Basic File System Integration Test', () => {
  // テスト用ディレクトリ
  let testDir: string;

  beforeAll(async () => {
    // テスト環境のセットアップ
    const testId = uuidv4();
    testDir = path.join(process.cwd(), 'tests', '.temp', `integration-simple-${testId}`);
    
    // ディレクトリ作成
    await fs.mkdir(testDir, { recursive: true });
    
    console.log(`シンプルテスト環境セットアップ完了: ${testDir}`);
  }, 10000);

  afterAll(async () => {
    // テスト環境のクリーンアップ
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log(`テスト環境削除: ${testDir}`);
    } catch (error) {
      console.error('クリーンアップ失敗:', error);
    }
  });

  it('ファイルの作成と読み込みができること', async () => {
    // テストデータ
    const filePath = path.join(testDir, 'test.txt');
    const content = `テスト内容\n作成時刻: ${new Date().toISOString()}`;
    
    // ファイル書き込み
    await fs.writeFile(filePath, content, 'utf-8');
    
    // ファイルが存在するか確認
    const fileExists = await fileExistsAsync(filePath);
    expect(fileExists).toBe(true);
    
    // ファイル内容の確認
    const readContent = await fs.readFile(filePath, 'utf-8');
    expect(readContent).toEqual(content);
  });

  it('ディレクトリの作成と削除ができること', async () => {
    // テストデータ
    const dirPath = path.join(testDir, 'test-dir');
    
    // ディレクトリ作成
    await fs.mkdir(dirPath, { recursive: true });
    
    // ディレクトリが存在するか確認
    const dirExists = await fileExistsAsync(dirPath);
    expect(dirExists).toBe(true);
    
    // ディレクトリ削除
    await fs.rm(dirPath, { recursive: true, force: true });
    
    // ディレクトリが削除されたか確認
    const dirStillExists = await fileExistsAsync(dirPath);
    expect(dirStillExists).toBe(false);
  });
});

// ヘルパー関数
async function fileExistsAsync(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
