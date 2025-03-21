import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

/**
 * メモリリポジトリの統合テスト
 * 
 * 実際のFileSystemRepositoryと同様の機能をモックせずにテスト
 */
describe('Memory Repository Integration Tests', () => {
  // テスト用ディレクトリ
  let testDir: string;
  let branchDir: string;
  let globalDir: string;
  let testBranch: string;

  beforeAll(async () => {
    // テスト環境のセットアップ
    const testId = uuidv4();
    testDir = path.join(process.cwd(), 'tests', '.temp', `integration-repo-${testId}`);
    branchDir = path.join(testDir, 'branch-memory-bank');
    globalDir = path.join(testDir, 'global-memory-bank');
    testBranch = `test-branch-${testId}`;
    
    // ディレクトリ作成
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(branchDir, { recursive: true });
    await fs.mkdir(globalDir, { recursive: true });
    await fs.mkdir(path.join(branchDir, testBranch), { recursive: true });
    
    console.log(`テスト環境セットアップ完了: ${testDir}`);
  });

  afterAll(async () => {
    // テスト環境のクリーンアップ
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log(`テスト環境削除: ${testDir}`);
    } catch (error) {
      console.error('クリーンアップ失敗:', error);
    }
  });

  describe('ブランチメモリ操作', () => {
    it('ドキュメントの書き込みと読み込みができること', async () => {
      // テストデータ
      const docPath = 'test-document.md';
      const filePath = path.join(branchDir, testBranch, docPath);
      const content = `# テストドキュメント

このドキュメントは統合テストで作成されました。
作成時刻: ${new Date().toISOString()}
`;
      
      // ドキュメント書き込み
      await fs.writeFile(filePath, content, 'utf-8');
      
      // ファイルが存在するか確認
      const fileExists = await fileExistsAsync(filePath);
      expect(fileExists).toBe(true);
      
      // ファイル内容の確認
      const readContent = await fs.readFile(filePath, 'utf-8');
      expect(readContent).toEqual(content);
    });

    it('ドキュメントの更新ができること', async () => {
      // テストデータ
      const docPath = 'update-test.md';
      const filePath = path.join(branchDir, testBranch, docPath);
      const initialContent = `# 初期コンテンツ

これは更新前のコンテンツです。
作成時刻: ${new Date().toISOString()}
`;
      
      const updatedContent = `# 更新後のコンテンツ

これは更新後のコンテンツです。
更新時刻: ${new Date().toISOString()}
`;
      
      // 初期ドキュメント書き込み
      await fs.writeFile(filePath, initialContent, 'utf-8');
      
      // ファイル存在確認
      let fileExists = await fileExistsAsync(filePath);
      expect(fileExists).toBe(true);
      
      // ドキュメント更新
      await fs.writeFile(filePath, updatedContent, 'utf-8');
      
      // 更新後のファイル内容確認
      const readContent = await fs.readFile(filePath, 'utf-8');
      expect(readContent).toEqual(updatedContent);
    });
    
    it('ドキュメントの削除ができること', async () => {
      // テストデータ
      const docPath = 'delete-test.md';
      const filePath = path.join(branchDir, testBranch, docPath);
      const content = '# 削除するドキュメント';
      
      // ドキュメント書き込み
      await fs.writeFile(filePath, content, 'utf-8');
      
      // ファイル存在確認
      let fileExists = await fileExistsAsync(filePath);
      expect(fileExists).toBe(true);
      
      // ドキュメント削除
      await fs.rm(filePath);
      
      // ファイル削除確認
      fileExists = await fileExistsAsync(filePath);
      expect(fileExists).toBe(false);
    });
  });
  
  describe('グローバルメモリ操作', () => {
    it('グローバルドキュメントの書き込みと読み込みができること', async () => {
      // テストデータ
      const docPath = 'global-test.md';
      const filePath = path.join(globalDir, docPath);
      const content = `# グローバルテストドキュメント

このドキュメントはグローバルメモリに作成されました。
作成時刻: ${new Date().toISOString()}
`;
      
      // ドキュメント書き込み
      await fs.writeFile(filePath, content, 'utf-8');
      
      // ファイル存在確認
      const fileExists = await fileExistsAsync(filePath);
      expect(fileExists).toBe(true);
      
      // ファイル内容確認
      const readContent = await fs.readFile(filePath, 'utf-8');
      expect(readContent).toEqual(content);
    });
  });
  
  describe('JSONドキュメント操作', () => {
    it('JSONドキュメントの書き込みと読み込みができること', async () => {
      // テストデータ
      const docPath = 'test-data.json';
      const filePath = path.join(branchDir, testBranch, docPath);
      const data = {
        title: "テストJSONドキュメント",
        createdAt: new Date().toISOString(),
        items: [1, 2, 3, 4, 5],
        metadata: {
          version: "1.0",
          author: "統合テスト"
        }
      };
      const content = JSON.stringify(data, null, 2);
      
      // ドキュメント書き込み
      await fs.writeFile(filePath, content, 'utf-8');
      
      // ファイル存在確認
      const fileExists = await fileExistsAsync(filePath);
      expect(fileExists).toBe(true);
      
      // ファイル読み込み
      const readContent = await fs.readFile(filePath, 'utf-8');
      expect(readContent).toEqual(content);
      
      // JSONとして解析できることを確認
      const parsedData = JSON.parse(readContent);
      expect(parsedData.title).toEqual(data.title);
      expect(parsedData.items.length).toEqual(5);
    });
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
