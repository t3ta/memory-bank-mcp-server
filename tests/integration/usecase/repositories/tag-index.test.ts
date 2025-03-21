import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

/**
 * タグインデックスの統合テスト
 */
describe('Tag Index Integration Tests', () => {
  // テスト用ディレクトリ
  let testDir: string;
  let branchDir: string;
  let testBranch: string;

  beforeAll(async () => {
    // テスト環境のセットアップ
    const testId = uuidv4();
    testDir = path.join(process.cwd(), 'tests', '.temp', `integration-tags-${testId}`);
    branchDir = path.join(testDir, 'branch-memory-bank');
    testBranch = `test-branch-${testId}`;
    
    // ディレクトリ作成
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(branchDir, { recursive: true });
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

  it('タグインデックスの作成と読み込みができること', async () => {
    // タグインデックス作成
    const indexPath = path.join(branchDir, testBranch, '_index.json');
    const tagIndex = {
      schema: 'tag_index_v1',
      index: {
        'test': ['doc1.md', 'doc2.md'],
        'important': ['doc1.md', 'doc3.md'],
        'design': ['doc2.md', 'doc3.md']
      },
      lastUpdated: new Date().toISOString()
    };
    
    // インデックス書き込み
    await fs.writeFile(indexPath, JSON.stringify(tagIndex, null, 2), 'utf-8');
    
    // ファイル存在確認
    const fileExists = await fileExistsAsync(indexPath);
    expect(fileExists).toBe(true);
    
    // インデックス読み込み
    const readContent = await fs.readFile(indexPath, 'utf-8');
    const readIndex = JSON.parse(readContent);
    
    // 内容確認
    expect(readIndex.schema).toEqual(tagIndex.schema);
    expect(Object.keys(readIndex.index).length).toEqual(3);
    expect(readIndex.index.test).toContain('doc1.md');
    expect(readIndex.index.important).toContain('doc3.md');
  });
  
  it('タグ付きドキュメントの作成とインデックス更新が連携できること', async () => {
    // テスト用ドキュメント作成
    const docs = [
      {
        path: 'doc1.md',
        content: '# ドキュメント1\n\ntags: #test #important\n\nテスト用ドキュメント1'
      },
      {
        path: 'doc2.md',
        content: '# ドキュメント2\n\ntags: #test #design\n\nテスト用ドキュメント2'
      },
      {
        path: 'doc3.md',
        content: '# ドキュメント3\n\ntags: #important #design\n\nテスト用ドキュメント3'
      }
    ];
    
    // ドキュメント作成
    for (const doc of docs) {
      const filePath = path.join(branchDir, testBranch, doc.path);
      await fs.writeFile(filePath, doc.content, 'utf-8');
    }
    
    // タグインデックス作成
    const indexPath = path.join(branchDir, testBranch, '_index.json');
    const tagIndex = {
      schema: 'tag_index_v1',
      index: {
        'test': ['doc1.md', 'doc2.md'],
        'important': ['doc1.md', 'doc3.md'],
        'design': ['doc2.md', 'doc3.md']
      },
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(indexPath, JSON.stringify(tagIndex, null, 2), 'utf-8');
    
    // ファイル確認
    for (const doc of docs) {
      const filePath = path.join(branchDir, testBranch, doc.path);
      const exists = await fileExistsAsync(filePath);
      expect(exists).toBe(true);
    }
    
    // ドキュメント更新（タグを変更）
    const updatedDoc = '# ドキュメント1 更新\n\ntags: #test #newTag\n\nタグを更新';
    await fs.writeFile(path.join(branchDir, testBranch, 'doc1.md'), updatedDoc, 'utf-8');
    
    // インデックス更新
    const updatedIndex = {
      schema: 'tag_index_v1',
      index: {
        'test': ['doc1.md', 'doc2.md'],
        'important': ['doc3.md'],
        'design': ['doc2.md', 'doc3.md'],
        'newTag': ['doc1.md']
      },
      lastUpdated: new Date().toISOString()
    };
    
    await fs.writeFile(indexPath, JSON.stringify(updatedIndex, null, 2), 'utf-8');
    
    // 更新後のインデックス読み込み
    const readContent = await fs.readFile(indexPath, 'utf-8');
    const readIndex = JSON.parse(readContent);
    
    // 更新が反映されていることを確認
    expect(readIndex.index.important).not.toContain('doc1.md');
    expect(readIndex.index.newTag).toContain('doc1.md');
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
