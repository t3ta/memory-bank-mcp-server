// @ts-nocheck
import { promises as fs } from 'fs';
import * as path from 'path';
import { BranchMemoryBank } from '../../src/managers/BranchMemoryBank';

describe('BranchMemoryBank Integration Test', () => {
  const testDir = path.join(process.cwd(), 'temp-test-branch');
  let branchMemoryBank: BranchMemoryBank;
  const branchName = 'feature/test-branch';

  // 各テスト前の設定
  beforeEach(async () => {
    // テストディレクトリが存在する場合は削除
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // ディレクトリが存在しない場合はエラーを無視
    }

    // テストディレクトリを作成
    await fs.mkdir(testDir, { recursive: true });

    // BranchMemoryBankのインスタンスを作成
    branchMemoryBank = new BranchMemoryBank(testDir, branchName, {
      workspaceRoot: testDir,
      memoryBankRoot: testDir,
      verbose: false,
      language: 'ja'
    });
  });

  // 各テスト後のクリーンアップ
  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up test directory:', error);
    }
  });

  describe('Initialization', () => {
    test('should initialize branch memory bank with core files', async () => {
      // メモリバンクを初期化
      await branchMemoryBank.initialize();

      // コアファイルが作成されたことを確認
      const coreFiles = ['branchContext.md', 'activeContext.md', 'systemPatterns.md', 'progress.md'];

      for (const file of coreFiles) {
        const filePath = path.join(testDir, file);
        const exists = await fs.access(filePath)
          .then(() => true)
          .catch(() => false);

        expect(exists).toBe(true);

        // ファイルの内容を確認
        const content = await fs.readFile(filePath, 'utf-8');
        expect(content).not.toBe('');

        // ブランチ名と言語に応じた適切なコンテンツであることを確認
        if (file === 'branchContext.md') {
          expect(content).toContain('feature-test-branch');
        }

        // 日本語のテンプレートが使用されていることを確認
        if (file === 'activeContext.md') {
          expect(content).toContain('アクティブコンテキスト');
          expect(content).toContain('現在の作業内容');
        }
      }
    });

    test('should validate structure correctly', async () => {
      // 初期化
      await branchMemoryBank.initialize();

      // 構造を検証
      const validationResult = await branchMemoryBank.validateStructure();

      // 検証
      expect(validationResult.isValid).toBe(true);
      expect(validationResult.missingFiles).toHaveLength(0);
      expect(validationResult.errors).toHaveLength(0);

      // 1つのファイルを削除してバリデーションを再実行
      await fs.unlink(path.join(testDir, 'activeContext.md'));

      const invalidResult = await branchMemoryBank.validateStructure();
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.missingFiles).toContain('activeContext.md');
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Core File Operations', () => {
    test('should update activeContext', async () => {
      // 初期化
      await branchMemoryBank.initialize();

      // activeContextを更新
      const updates = {
        currentWork: 'テスト作業中',
        recentChanges: ['変更1', '変更2'],
        activeDecisions: ['決定1'],
        considerations: ['検討1', '検討2'],
        nextSteps: ['次のステップ1']
      };

      await branchMemoryBank.updateActiveContext(updates);

      // 更新されたファイルを読み取り
      const filePath = path.join(testDir, 'activeContext.md');
      const content = await fs.readFile(filePath, 'utf-8');

      // 内容の検証
      expect(content).toContain('テスト作業中');
      expect(content).toContain('- 変更1');
      expect(content).toContain('- 変更2');
      expect(content).toContain('- 決定1');
      expect(content).toContain('- 検討1');
      expect(content).toContain('- 検討2');
      expect(content).toContain('- 次のステップ1');
    });

    test('should update progress', async () => {
      // 初期化
      await branchMemoryBank.initialize();

      // progressを更新
      const updates = {
        workingFeatures: ['機能1', '機能2'],
        pendingImplementation: ['未実装1'],
        status: '開発中',
        knownIssues: ['問題1', '問題2']
      };

      await branchMemoryBank.updateProgress(updates);

      // 更新されたファイルを読み取り
      const filePath = path.join(testDir, 'progress.md');
      const content = await fs.readFile(filePath, 'utf-8');

      // 内容の検証
      expect(content).toContain('- 機能1');
      expect(content).toContain('- 機能2');
      expect(content).toContain('- 未実装1');
      expect(content).toContain('開発中');
      expect(content).toContain('- 問題1');
      expect(content).toContain('- 問題2');
    });

    test('should add technical decision', async () => {
      // 初期化
      await branchMemoryBank.initialize();

      // 技術的決定を追加
      const decision = {
        title: 'テスト決定',
        context: 'テストのコンテキスト',
        decision: 'テストの決定内容',
        consequences: ['影響1', '影響2']
      };

      await branchMemoryBank.addTechnicalDecision(decision);

      // 更新されたファイルを読み取り
      const filePath = path.join(testDir, 'systemPatterns.md');
      const content = await fs.readFile(filePath, 'utf-8');

      // 内容の検証
      expect(content).toContain('### テスト決定');
      expect(content).toContain('テストのコンテキスト');
      expect(content).toContain('テストの決定内容');
      expect(content).toContain('- 影響1');
      expect(content).toContain('- 影響2');
    });

    test('should initialize only when files do not exist', async () => {
      // 最初の呼び出し - ファイルが存在しないので初期化される
      await branchMemoryBank.writeCoreFiles({
        branch: branchName,
        files: {
          activeContext: {
            currentWork: 'テスト1',
            recentChanges: ['変更1']
          }
        }
      });

      // ファイルの内容を確認
      const content1 = await fs.readFile(path.join(testDir, 'activeContext.md'), 'utf-8');
      expect(content1).toContain('テスト1');
      expect(content1).toContain('- 変更1');

      // 2回目の呼び出し - ファイルが存在するので初期化されない
      await branchMemoryBank.writeCoreFiles({
        branch: branchName,
        files: {
          activeContext: {
            currentWork: 'テスト2',
            recentChanges: ['変更2']
          }
        }
      });

      // ファイルの内容を確認 - 新しい内容で更新されている
      const content2 = await fs.readFile(path.join(testDir, 'activeContext.md'), 'utf-8');
      expect(content2).toContain('テスト2');
      expect(content2).toContain('- 変更2');
    });

    test('should write core files at once', async () => {
      // 初期化（ファイルが存在しない場合のみ）
      await branchMemoryBank.initialize();

      // コアファイルを一括更新
      const coreFiles = {
        branch: branchName,
        files: {
          branchContext: {
            content: '# ブランチコンテキスト\n\n## 目的\n\nテスト目的\n\n## ユーザーストーリー\n\nテストストーリー'
          },
          activeContext: {
            currentWork: '一括更新テスト',
            recentChanges: ['一括変更1'],
            activeDecisions: ['一括決定1'],
            considerations: [],
            nextSteps: ['一括ステップ1']
          },
          progress: {
            workingFeatures: ['一括機能1'],
            pendingImplementation: [],
            status: '一括ステータス',
            knownIssues: []
          },
          systemPatterns: {
            technicalDecisions: [
              {
                title: '一括決定タイトル',
                context: '一括コンテキスト',
                decision: '一括決定内容',
                consequences: ['一括影響1']
              }
            ]
          }
        }
      };

      await branchMemoryBank.writeCoreFiles(coreFiles);

      // 更新されたファイルを読み取り
      const branchContextContent = await fs.readFile(path.join(testDir, 'branchContext.md'), 'utf-8');
      const activeContextContent = await fs.readFile(path.join(testDir, 'activeContext.md'), 'utf-8');
      const progressContent = await fs.readFile(path.join(testDir, 'progress.md'), 'utf-8');
      const systemPatternsContent = await fs.readFile(path.join(testDir, 'systemPatterns.md'), 'utf-8');

      // 内容の検証
      expect(branchContextContent).toContain('テスト目的');
      expect(branchContextContent).toContain('テストストーリー');

      expect(activeContextContent).toContain('一括更新テスト');
      expect(activeContextContent).toContain('- 一括変更1');
      expect(activeContextContent).toContain('- 一括決定1');
      expect(activeContextContent).toContain('- 一括ステップ1');

      expect(progressContent).toContain('- 一括機能1');
      expect(progressContent).toContain('一括ステータス');

      expect(systemPatternsContent).toContain('### 一括決定タイトル');
      expect(systemPatternsContent).toContain('一括コンテキスト');
      expect(systemPatternsContent).toContain('一括決定内容');
      expect(systemPatternsContent).toContain('- 一括影響1');
    });
  });

  describe('Update Sections With Options', () => {
    test('should handle different edit modes correctly', async () => {
      // 初期化
      await branchMemoryBank.initialize();

      // 初期コンテンツの書き込み
      const initialContent = `# テストドキュメント

## テストセクション
- 元の項目1
- 元の項目2

## 別のセクション
別のコンテンツ
`;
      await fs.writeFile(path.join(testDir, 'test-edit.md'), initialContent);

      // replace モードでの更新
      await branchMemoryBank.updateSectionsWithOptions('test-edit.md', {
        'replace': {
          header: '## テストセクション',
          content: ['置換項目1', '置換項目2']
        }
      }, { mode: 'replace' });

      // ファイルを読み取り
      let content = await fs.readFile(path.join(testDir, 'test-edit.md'), 'utf-8');

      // 検証
      expect(content).toContain('- 置換項目1');
      expect(content).toContain('- 置換項目2');
      expect(content).not.toContain('- 元の項目1');

      // append モードでの更新
      await branchMemoryBank.updateSectionsWithOptions('test-edit.md', {
        'append': {
          header: '## テストセクション',
          content: ['追加項目1', '追加項目2']
        }
      }, { mode: 'append' });

      // ファイルを読み取り
      content = await fs.readFile(path.join(testDir, 'test-edit.md'), 'utf-8');

      // 検証
      expect(content).toContain('- 置換項目1');
      expect(content).toContain('- 置換項目2');
      expect(content).toContain('- 追加項目1');
      expect(content).toContain('- 追加項目2');

      // prepend モードでの更新
      await branchMemoryBank.updateSectionsWithOptions('test-edit.md', {
        'prepend': {
          header: '## テストセクション',
          content: ['先頭項目1', '先頭項目2']
        }
      }, { mode: 'prepend' });

      // ファイルを読み取り
      content = await fs.readFile(path.join(testDir, 'test-edit.md'), 'utf-8');

      // 検証
      expect(content).toContain('- 先頭項目1');
      expect(content).toContain('- 先頭項目2');
      expect(content).toContain('- 置換項目1');

      // 文字列の出現順序を確認
      const pos1 = content.indexOf('- 先頭項目1');
      const pos2 = content.indexOf('- 置換項目1');
      const pos3 = content.indexOf('- 追加項目1');

      expect(pos1).toBeLessThan(pos2);
      expect(pos2).toBeLessThan(pos3);
    });

    test('should create new section if not exists', async () => {
      // 初期化
      await branchMemoryBank.initialize();

      // 初期コンテンツの書き込み
      const initialContent = `# テストドキュメント

## 既存セクション
既存コンテンツ
`;
      await fs.writeFile(path.join(testDir, 'new-section.md'), initialContent);

      // 新しいセクションを追加
      await branchMemoryBank.updateSectionsWithOptions('new-section.md', {
        'newSection': {
          header: '## 新しいセクション',
          content: ['新しい項目1', '新しい項目2']
        }
      }, { mode: 'replace' });

      // ファイルを読み取り
      const content = await fs.readFile(path.join(testDir, 'new-section.md'), 'utf-8');

      // 検証
      expect(content).toContain('## 既存セクション');
      expect(content).toContain('既存コンテンツ');
      expect(content).toContain('## 新しいセクション');
      expect(content).toContain('- 新しい項目1');
      expect(content).toContain('- 新しい項目2');
    });

    test('should handle empty lists correctly', async () => {
      // 初期化
      await branchMemoryBank.initialize();

      // activeContextを更新（空リストあり）
      const updates = {
        currentWork: 'テスト作業中',
        recentChanges: ['変更1'],
        activeDecisions: [], // 空リスト
        considerations: ['検討1'],
        nextSteps: [] // 空リスト
      };

      await branchMemoryBank.updateActiveContext(updates);

      // 更新されたファイルを読み取り
      const filePath = path.join(testDir, 'activeContext.md');
      const content = await fs.readFile(filePath, 'utf-8');

      // 内容の検証
      expect(content).toContain('テスト作業中');
      expect(content).toContain('- 変更1');
      expect(content).toContain('## アクティブな決定事項');
      expect(content).toContain('- 検討1');
      expect(content).toContain('## 次のステップ');

      // 空のリストに対するマークダウン項目が生成されていないことを確認
      expect(content.match(/アクティブな決定事項\n-/g)).toBeNull();
      expect(content.match(/次のステップ\n-/g)).toBeNull();
    });

    test('should handle line endings correctly', async () => {
      // 初期化
      await branchMemoryBank.initialize();

      // 異なる行末を持つコンテンツを作成
      const mixedLineEndingsContent = "# テスト\r\n\r\n## セクション1\r\nコンテンツ1\n\n## セクション2\nコンテンツ2";
      await fs.writeFile(path.join(testDir, 'line-endings.md'), mixedLineEndingsContent);

      // 更新
      await branchMemoryBank.updateSectionsWithOptions('line-endings.md', {
        'section1': {
          header: '## セクション1',
          content: '更新コンテンツ'
        }
      }, { mode: 'replace' });

      // ファイルを読み取り
      const doc = await branchMemoryBank.readDocument('line-endings.md');
      const content = doc.content;

      // 行末の正規化を検証
      const hasInconsistentLineEndings = /\r\n/.test(content) && /[^\r]\n/.test(content);
      expect(hasInconsistentLineEndings).toBe(false);

      // 更新内容の検証
      expect(content).toContain('更新コンテンツ');
      expect(content).toContain('コンテンツ2');
    });
  });

  describe('Error Handling', () => {
    test('should throw error for invalid branch name', async () => {
      try {
        // 無効なブランチ名
        new BranchMemoryBank(testDir, 'invalid-branch', {
          workspaceRoot: testDir,
          memoryBankRoot: testDir,
          verbose: false,
          language: 'ja'
        });
        fail('Expected error was not thrown');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toContain('branch');
      }
    });

    test('should validate update inputs', async () => {
      // 初期化
      await branchMemoryBank.initialize();

      try {
        // 無効なデータで更新
        await branchMemoryBank.updateActiveContext({
          currentWork: 123 // 文字列ではなく数値
        } as any);
        fail('Expected error was not thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }

      try {
        // 無効な技術的決定
        await branchMemoryBank.addTechnicalDecision({
          // titleが欠けている
          context: 'コンテキスト',
          decision: '決定'
        } as any);
        fail('Expected error was not thrown');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    test('should handle non-existent document gracefully', async () => {
      // 初期化
      await branchMemoryBank.initialize();

      try {
        // 存在しないドキュメントを読み取り
        await branchMemoryBank.readDocument('non-existent.md');
        fail('Expected error was not thrown');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.code).toBeDefined();
      }
    });
  });

  describe('Edge Cases', () => {
    test('should handle very large documents', async () => {
      // 初期化
      await branchMemoryBank.initialize();

      // 非常に大きなドキュメントを作成
      let largeContent = '# Large Document\n\n## Section\n';
      for (let i = 0; i < 2000; i++) {
        largeContent += `Item ${i}\n`;
      }

      await fs.writeFile(path.join(testDir, 'large.md'), largeContent);

      // ドキュメントを読み取り
      const doc = await branchMemoryBank.readDocument('large.md');

      // 検証
      expect(doc.content).toContain('# Large Document');
      expect(doc.content).toContain('Item 999');
      expect(doc.content.length).toBeGreaterThan(10000);

      // セクションを更新
      await branchMemoryBank.updateSectionsWithOptions('large.md', {
        'updated': {
          header: '## Updated Section',
          content: 'Updated content'
        }
      }, { mode: 'replace' });

      // 更新後のドキュメントを読み取り
      const updatedDoc = await branchMemoryBank.readDocument('large.md');

      // 検証
      expect(updatedDoc.content).toContain('Updated content');
      expect(updatedDoc.content).toContain('# Large Document');
    });

    test('should handle documents with special characters', async () => {
      // 初期化
      await branchMemoryBank.initialize();

      // 特殊文字を含むドキュメントを作成
      const specialContent = `# 特殊文字テスト

## セクション１
* 日本語を含む
* Emojis: 😀 🚀 🔥
* Special: & < > " ' \\ / @ # $ % ^ & *
* Multiple   spaces   and   tabs		here
`;

      await fs.writeFile(path.join(testDir, 'special.md'), specialContent);

      // ドキュメントを読み取り
      const doc = await branchMemoryBank.readDocument('special.md');

      // 検証
      expect(doc.content).toContain('日本語');
      expect(doc.content).toContain('😀');
      expect(doc.content).toContain('Special: &');

      // セクションを更新
      await branchMemoryBank.updateSectionsWithOptions('special.md', {
        'specialSection': {
          header: '## 特殊セクション',
          content: '更新：😎 < > & テスト'
        }
      }, { mode: 'replace' });

      // 更新後のドキュメントを読み取り
      const updatedDoc = await branchMemoryBank.readDocument('special.md');

      // 検証
      expect(updatedDoc.content).toContain('更新：😎');
      expect(updatedDoc.content).toContain('< > &');
    });

    test('should handle multiple section updates at once', async () => {
      // 初期化
      await branchMemoryBank.initialize();

      // 初期コンテンツの書き込み
      const initialContent = `# マルチセクションテスト

## セクション1
セクション1のコンテンツ

## セクション2
セクション2のコンテンツ

## セクション3
セクション3のコンテンツ
`;

      await fs.writeFile(path.join(testDir, 'multi-section.md'), initialContent);

      // 複数のセクションを一度に更新
      await branchMemoryBank.updateSectionsWithOptions('multi-section.md', {
        'section1': {
          header: '## セクション1',
          content: '更新セクション1'
        },
        'section3': {
          header: '## セクション3',
          content: '更新セクション3'
        },
        'section4': {
          header: '## セクション4',
          content: '新規セクション4'
        }
      }, { mode: 'replace' });

      // 更新後のドキュメントを読み取り
      const doc = await branchMemoryBank.readDocument('multi-section.md');
      const content = doc.content;

      // 検証
      expect(content).toContain('更新セクション1');
      expect(content).toContain('セクション2のコンテンツ'); // 未変更
      expect(content).toContain('更新セクション3');
      expect(content).toContain('## セクション4');
      expect(content).toContain('新規セクション4');

      // セクションの順序が維持されていることを確認
      const pos1 = content.indexOf('## セクション1');
      const pos2 = content.indexOf('## セクション2');
      const pos3 = content.indexOf('## セクション3');
      const pos4 = content.indexOf('## セクション4');

      expect(pos1).toBeLessThan(pos2);
      expect(pos2).toBeLessThan(pos3);
      expect(pos3).toBeLessThan(pos4);
    });
  });
});
