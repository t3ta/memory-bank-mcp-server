import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';

/**
 * コンテキスト操作の統合テスト
 */
describe('Context Repository Integration Tests', () => {
  // テスト用ディレクトリ
  let testDir: string;
  let branchDir: string;
  let globalDir: string;
  let rulesDir: string;
  let testBranch: string;

  beforeAll(async () => {
    // テスト環境のセットアップ
    const testId = uuidv4();
    testDir = path.join(process.cwd(), 'tests', '.temp', `integration-context-${testId}`);
    branchDir = path.join(testDir, 'branch-memory-bank');
    globalDir = path.join(testDir, 'global-memory-bank');
    rulesDir = path.join(testDir, 'rules');
    testBranch = `test-branch-${testId}`;
    
    // ディレクトリ作成
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(branchDir, { recursive: true });
    await fs.mkdir(globalDir, { recursive: true });
    await fs.mkdir(rulesDir, { recursive: true });
    await fs.mkdir(path.join(branchDir, testBranch), { recursive: true });
    
    // ルールファイル作成
    await fs.writeFile(
      path.join(rulesDir, 'rules-en.md'),
      '# Rules\n\nThese are the English rules.',
      'utf-8'
    );
    await fs.writeFile(
      path.join(rulesDir, 'rules-ja.md'),
      '# ルール\n\nこれは日本語のルールです。',
      'utf-8'
    );
    
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

  it('ルールファイルが読み込めること', async () => {
    // 英語ルール
    const enRulePath = path.join(rulesDir, 'rules-en.md');
    const enRuleExists = await fileExistsAsync(enRulePath);
    expect(enRuleExists).toBe(true);
    
    const enRuleContent = await fs.readFile(enRulePath, 'utf-8');
    expect(enRuleContent).toContain('English rules');
    
    // 日本語ルール
    const jaRulePath = path.join(rulesDir, 'rules-ja.md');
    const jaRuleExists = await fileExistsAsync(jaRulePath);
    expect(jaRuleExists).toBe(true);
    
    const jaRuleContent = await fs.readFile(jaRulePath, 'utf-8');
    expect(jaRuleContent).toContain('日本語のルール');
  });

  it('コアファイルの作成と読み込みができること', async () => {
    // コアファイル作成
    const branchContext = '# ブランチコンテキスト\n\n## 目的\n\nテスト用ブランチです。';
    const activeContext = '# アクティブコンテキスト\n\n## 現在の作業\n\n統合テストの実装中。';
    const systemPatterns = '# システムパターン\n\n## パターン\n\nテストパターン。';
    const progress = '# 進捗\n\n## 完了した作業\n\n- テスト環境セットアップ\n\n## 未完了の作業\n\n- テスト実行';
    
    // ファイルパス
    const branchContextPath = path.join(branchDir, testBranch, 'branchContext.md');
    const activeContextPath = path.join(branchDir, testBranch, 'activeContext.md');
    const systemPatternsPath = path.join(branchDir, testBranch, 'systemPatterns.md');
    const progressPath = path.join(branchDir, testBranch, 'progress.md');
    
    // ファイル書き込み
    await fs.writeFile(branchContextPath, branchContext, 'utf-8');
    await fs.writeFile(activeContextPath, activeContext, 'utf-8');
    await fs.writeFile(systemPatternsPath, systemPatterns, 'utf-8');
    await fs.writeFile(progressPath, progress, 'utf-8');
    
    // ファイル存在確認
    expect(await fileExistsAsync(branchContextPath)).toBe(true);
    expect(await fileExistsAsync(activeContextPath)).toBe(true);
    expect(await fileExistsAsync(systemPatternsPath)).toBe(true);
    expect(await fileExistsAsync(progressPath)).toBe(true);
    
    // ファイル内容確認
    expect(await fs.readFile(branchContextPath, 'utf-8')).toEqual(branchContext);
    expect(await fs.readFile(activeContextPath, 'utf-8')).toEqual(activeContext);
    expect(await fs.readFile(systemPatternsPath, 'utf-8')).toEqual(systemPatterns);
    expect(await fs.readFile(progressPath, 'utf-8')).toEqual(progress);
  });
  
  it('グローバルメモリとブランチメモリを両方持つフルコンテキストが作成できること', async () => {
    // ブランチメモリ
    const branchFiles = [
      {
        path: 'branchContext.md',
        content: '# ブランチコンテキスト\n\nテスト用ブランチです。'
      },
      {
        path: 'activeContext.md',
        content: '# アクティブコンテキスト\n\n現在のコンテキストです。'
      }
    ];
    
    // グローバルメモリ
    const globalFiles = [
      {
        path: 'architecture.md',
        content: '# アーキテクチャ\n\nシステムアーキテクチャの説明です。'
      },
      {
        path: 'glossary.md',
        content: '# 用語集\n\n重要な用語の説明です。'
      }
    ];
    
    // ファイル作成
    for (const file of branchFiles) {
      await fs.writeFile(
        path.join(branchDir, testBranch, file.path),
        file.content,
        'utf-8'
      );
    }
    
    for (const file of globalFiles) {
      await fs.writeFile(
        path.join(globalDir, file.path),
        file.content,
        'utf-8'
      );
    }
    
    // ファイル存在確認
    for (const file of branchFiles) {
      const filePath = path.join(branchDir, testBranch, file.path);
      expect(await fileExistsAsync(filePath)).toBe(true);
    }
    
    for (const file of globalFiles) {
      const filePath = path.join(globalDir, file.path);
      expect(await fileExistsAsync(filePath)).toBe(true);
    }
    
    // 全てのコンテキストを集約したJSONを作成
    const context = {
      rules: {
        content: await fs.readFile(path.join(rulesDir, 'rules-ja.md'), 'utf-8')
      },
      branchMemory: {},
      globalMemory: {}
    };
    
    // ブランチメモリ追加
    for (const file of branchFiles) {
      context.branchMemory[file.path] = {
        path: file.path,
        content: await fs.readFile(path.join(branchDir, testBranch, file.path), 'utf-8'),
        tags: [],
        lastModified: new Date().toISOString()
      };
    }
    
    // グローバルメモリ追加
    for (const file of globalFiles) {
      context.globalMemory[file.path] = {
        path: file.path,
        content: await fs.readFile(path.join(globalDir, file.path), 'utf-8'),
        tags: [],
        lastModified: new Date().toISOString()
      };
    }
    
    // JSONとして書き出し
    const contextPath = path.join(testDir, 'context.json');
    await fs.writeFile(contextPath, JSON.stringify(context, null, 2), 'utf-8');
    
    // ファイル存在確認
    expect(await fileExistsAsync(contextPath)).toBe(true);
    
    // JSONとして読み込み
    const readContext = JSON.parse(await fs.readFile(contextPath, 'utf-8'));
    
    // 内容確認
    expect(readContext.rules.content).toContain('日本語のルール');
    expect(Object.keys(readContext.branchMemory).length).toBe(2);
    expect(Object.keys(readContext.globalMemory).length).toBe(2);
  });
});

/**
 * 最近のブランチ情報の統合テスト
 */
describe('Recent Branches Repository Integration Tests', () => {
  // テスト用ディレクトリ
  let testDir: string;
  let branchDir: string;
  let branchNames: string[] = [];

  beforeAll(async () => {
    // テスト環境のセットアップ
    const testId = uuidv4();
    testDir = path.join(process.cwd(), 'tests', '.temp', `integration-branches-${testId}`);
    branchDir = path.join(testDir, 'branch-memory-bank');
    
    // ディレクトリ作成
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(branchDir, { recursive: true });
    
    // 複数のブランチディレクトリを作成
    for (let i = 0; i < 5; i++) {
      const branchName = `feature-test-${i}`;  // ブランチ名形式：feature-XXX
      const dirPath = path.join(branchDir, branchName);
      
      await fs.mkdir(dirPath, { recursive: true });
      branchNames.push(branchName);
      
      // アクティブコンテキストファイル作成（最終更新日時が異なるように時間差を付ける）
      const activeContext = `# アクティブコンテキスト\n\n## 現在の作業内容\n\nブランチ${i}のテスト中。\n\n## 最近の変更点\n\n- 変更${i}-1\n- 変更${i}-2\n`;
      
      await fs.writeFile(path.join(dirPath, 'activeContext.md'), activeContext, 'utf-8');
      
      // 少し待機して最終更新日時に差をつける
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
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

  it('すべてのブランチディレクトリが正しく作成されていること', async () => {
    for (const branchName of branchNames) {
      const dirPath = path.join(branchDir, branchName);
      const exists = await fileExistsAsync(dirPath);
      expect(exists).toBe(true);
    }
  });

  it('各ブランチにアクティブコンテキストファイルが存在すること', async () => {
    for (const branchName of branchNames) {
      const filePath = path.join(branchDir, branchName, 'activeContext.md');
      const exists = await fileExistsAsync(filePath);
      expect(exists).toBe(true);
    }
  });

  it('ブランチ情報を集約したJSONが作成できること', async () => {
    // ブランチ情報の収集
    const branchInfos = [];
    
    for (const branchName of branchNames) {
      const branchPath = path.join(branchDir, branchName);
      const activeContextPath = path.join(branchPath, 'activeContext.md');
      
      // ファイル情報を取得
      const stats = await fs.stat(activeContextPath);
      
      // アクティブコンテキストの内容を読み込み
      const content = await fs.readFile(activeContextPath, 'utf-8');
      
      // 現在の作業内容と最近の変更点を抽出（簡易的なパース）
      const currentWorkMatch = content.match(/## 現在の作業内容\n\n(.*?)(?=\n\n##|$)/s);
      const currentWork = currentWorkMatch ? currentWorkMatch[1].trim() : '';
      
      const recentChanges = content
        .split('\n')
        .filter(line => line.trim().startsWith('- '))
        .map(line => line.replace(/^-\s*/, '').trim());
      
      branchInfos.push({
        branchName: branchName.replace('feature-', 'feature/'),
        lastModified: stats.mtime,
        summary: {
          currentWork,
          recentChanges
        }
      });
    }
    
    // 最終更新日時でソート
    branchInfos.sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime());
    
    // JSONとして書き出し
    const branchesPath = path.join(testDir, 'recent-branches.json');
    await fs.writeFile(branchesPath, JSON.stringify(branchInfos, null, 2), 'utf-8');
    
    // ファイル存在確認
    expect(await fileExistsAsync(branchesPath)).toBe(true);
    
    // JSONとして読み込み
    const readBranches = JSON.parse(await fs.readFile(branchesPath, 'utf-8'));
    
    // 内容確認
    expect(readBranches.length).toBe(5);
    expect(readBranches[0].branchName).toContain('feature/');
    expect(readBranches[0].summary.currentWork).toBeDefined();
    expect(readBranches[0].summary.recentChanges.length).toBeGreaterThan(0);
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
