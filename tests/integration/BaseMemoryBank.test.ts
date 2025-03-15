// @ts-nocheck
import { promises as fs } from 'fs';
import * as path from 'path';
import { BaseMemoryBank } from '../../src/managers/BaseMemoryBank';
import { ValidationResult } from '../../src/models/types';

// 非同期操作のユーティリティ関数
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// テスト用のBaseMemoryBankの実装クラス
class TestMemoryBank extends BaseMemoryBank {
  constructor(basePath: string) {
    super(basePath);
  }

  // 抽象メソッドの実装
  async validateStructure(): Promise<ValidationResult> {
    return {
      isValid: true,
      missingFiles: [],
      errors: []
    };
  }
}

// モックではなく実際のファイルシステムを使用
describe('BaseMemoryBank Integration Test', () => {
  const testDir = path.join(process.cwd(), 'temp-test-dir');
  let memoryBank: TestMemoryBank;

  // 各テスト前にテストディレクトリを作成
  beforeEach(async () => {
    // テストディレクトリが存在する場合は削除
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // ディレクトリが存在しない場合はエラーを無視
    }
    
    // テストディレクトリを作成
    await fs.mkdir(testDir, { recursive: true });
    memoryBank = new TestMemoryBank(testDir);
  });

  // 各テスト後にテストディレクトリを削除
  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      console.error('Failed to clean up test directory:', error);
    }
  });

  describe('Document Operations', () => {
    test('should write and read a document', async () => {
      const testContent = '# Test Document\n\nThis is a test content.';
      const testTags = ['test', 'document'];
      
      // ドキュメントを書き込む
      await memoryBank.writeDocument('test.md', testContent, testTags);
      
      // ドキュメントを読み込む
      const doc = await memoryBank.readDocument('test.md');
      
      // 検証
      expect(doc.content).toContain('# Test Document');
      expect(doc.content).toContain('tags: #test #document');
      expect(doc.tags).toEqual(testTags);
      expect(doc.path).toBe('test.md');
    });

    test('should list documents', async () => {
      // 複数のドキュメントを作成
      await memoryBank.writeDocument('doc1.md', '# Document 1', ['doc1']);
      await memoryBank.writeDocument('doc2.md', '# Document 2', ['doc2']);
      await memoryBank.writeDocument('subdirectory/doc3.md', '# Document 3', ['doc3']);
      
      // サブディレクトリを作成
      await fs.mkdir(path.join(testDir, 'subdirectory'), { recursive: true });
      
      // ドキュメント一覧を取得
      const documents = await memoryBank.listDocuments();
      
      // 検証
      expect(documents).toContain('doc1.md');
      expect(documents).toContain('doc2.md');
      expect(documents).toContain('subdirectory/doc3.md');
    });

    test('should delete a document', async () => {
      // ドキュメントを作成
      await memoryBank.writeDocument('to-delete.md', '# To be deleted', []);
      
      // ドキュメントが存在することを確認
      const exists = await fs.access(path.join(testDir, 'to-delete.md'))
        .then(() => true)
        .catch(() => false);
      expect(exists).toBe(true);
      
      // ドキュメントを削除
      await memoryBank.deleteDocument('to-delete.md');
      
      // ドキュメントが削除されたことを確認
      const existsAfterDelete = await fs.access(path.join(testDir, 'to-delete.md'))
        .then(() => true)
        .catch(() => false);
      expect(existsAfterDelete).toBe(false);
    });
  });

  describe('Section Operations', () => {
    test('should update sections in a document', async () => {
      // 初期ドキュメントを作成
      const initialContent = `# Test Document

## Section 1
Initial content for section 1.

## Section 2
Initial content for section 2.
`;
      await memoryBank.writeDocument('sections.md', initialContent);
      
      // セクションを更新
      await memoryBank.updateSections('sections.md', {
        'section1': {
          header: '## Section 1',
          content: 'Updated content for section 1.'
        },
        'newSection': {
          header: '## New Section',
          content: 'Content for a new section.'
        }
      });
      
      // 更新後のドキュメントを読み込む
      const updatedDoc = await memoryBank.readDocument('sections.md');
      
      // 検証
      expect(updatedDoc.content).toContain('Updated content for section 1.');
      expect(updatedDoc.content).toContain('## New Section');
      expect(updatedDoc.content).toContain('Content for a new section.');
      expect(updatedDoc.content).toContain('Initial content for section 2.'); // 未変更のセクション
    });

    test('should append content to a section', async () => {
      // 初期ドキュメントを作成
      const initialContent = `# Test Document

## Section List
- Item 1
- Item 2
`;
      await memoryBank.writeDocument('append.md', initialContent);
      
      // セクションに追加
      await memoryBank.updateSections('append.md', {
        'sectionList': {
          header: '## Section List',
          content: ['Item 3', 'Item 4'],
          append: true
        }
      });
      
      // 更新後のドキュメントを読み込む
      const updatedDoc = await memoryBank.readDocument('append.md');
      
      // 検証
      const content = updatedDoc.content;
      expect(content).toContain('- Item 1');
      expect(content).toContain('- Item 2');
      expect(content).toContain('- Item 3');
      expect(content).toContain('- Item 4');
      
      // 順序の検証（重要: 追加項目が既存項目の後に追加されていること）
      const itemPositions = {
        item1: content.indexOf('- Item 1'),
        item2: content.indexOf('- Item 2'),
        item3: content.indexOf('- Item 3'),
        item4: content.indexOf('- Item 4')
      };
      
      expect(itemPositions.item1).toBeLessThan(itemPositions.item3);
      expect(itemPositions.item2).toBeLessThan(itemPositions.item3);
    });
  });

  describe('Tag Operations', () => {
    test('should search documents by tags', async () => {
      // 異なるタグを持つドキュメントを作成
      await memoryBank.writeDocument('tagged1.md', '# Tagged Document 1', ['common', 'tag1']);
      await memoryBank.writeDocument('tagged2.md', '# Tagged Document 2', ['common', 'tag2']);
      await memoryBank.writeDocument('tagged3.md', '# Tagged Document 3', ['tag3']);
      
      // 'common'タグを持つドキュメントを検索
      const commonTagged = await memoryBank.searchByTags(['common']);
      expect(commonTagged.length).toBe(2);
      expect(commonTagged.some(doc => doc.path === 'tagged1.md')).toBe(true);
      expect(commonTagged.some(doc => doc.path === 'tagged2.md')).toBe(true);
      
      // 'tag1'タグを持つドキュメントを検索
      const tag1Docs = await memoryBank.searchByTags(['tag1']);
      expect(tag1Docs.length).toBe(1);
      expect(tag1Docs[0].path).toBe('tagged1.md');
      
      // 存在しないタグでの検索
      const nonExistentTagDocs = await memoryBank.searchByTags(['nonexistent']);
      expect(nonExistentTagDocs.length).toBe(0);
    });
  });

  describe('Internal Methods', () => {
    test('updateSection should handle non-existent sections', async () => {
      // プライベートメソッドをテストするためのhack
      const updateSection = (memoryBank as any).updateSection.bind(memoryBank);
      
      // 初期コンテンツ
      const initialContent = `# Test Document

## Existing Section
Existing content.
`;
      
      // 新しいセクションを追加
      const updatedContent = updateSection(
        initialContent,
        '## New Section',
        'New section content.'
      );
      
      // 検証
      expect(updatedContent).toContain('# Test Document');
      expect(updatedContent).toContain('## Existing Section');
      expect(updatedContent).toContain('Existing content.');
      expect(updatedContent).toContain('## New Section');
      expect(updatedContent).toContain('New section content.');
      
      // 適切なフォーマットの検証
      const newSectionIndex = updatedContent.indexOf('## New Section');
      const beforeNewSection = updatedContent.substring(0, newSectionIndex).trim();
      expect(beforeNewSection.endsWith('Existing content.')).toBe(true);
      
      // 適切な空行の検証
      const lines = updatedContent.split('\n');
      const newSectionLineIndex = lines.findIndex(line => line === '## New Section');
      expect(lines[newSectionLineIndex - 1]).toBe('');
      expect(lines[newSectionLineIndex + 1]).toBe('');
    });

    test('updateSection should handle append mode correctly', async () => {
      // プライベートメソッドをテストするためのhack
      const updateSection = (memoryBank as any).updateSection.bind(memoryBank);
      
      // 初期コンテンツ
      const initialContent = `# Test Document

## List Section
- Item 1
- Item 2
`;
      
      // コンテンツを追加モードで更新
      const updatedContent = updateSection(
        initialContent,
        '## List Section',
        '- Item 3\n- Item 4',
        true // append mode
      );
      
      // 検証
      expect(updatedContent).toContain('- Item 1');
      expect(updatedContent).toContain('- Item 2');
      expect(updatedContent).toContain('- Item 3');
      expect(updatedContent).toContain('- Item 4');
      
      // 順序の検証
      const item2Index = updatedContent.indexOf('- Item 2');
      const item3Index = updatedContent.indexOf('- Item 3');
      expect(item2Index).toBeLessThan(item3Index);
      
      // 空行の検証
      expect(updatedContent).toMatch(/Item 2(\r?\n){2,}- Item 3/);
    });

    test('extractTags should parse tags correctly', async () => {
      // プライベートメソッドをテストするためのhack
      const extractTags = (memoryBank as any).extractTags.bind(memoryBank);
      
      // タグを含むコンテンツ
      const contentWithTags = `# Document Title

tags: #tag1 #tag2 #complex-tag

Content starts here.`;
      
      // タグを抽出
      const tags = extractTags(contentWithTags);
      
      // 検証
      expect(tags).toEqual(['tag1', 'tag2', 'complex-tag']);
    });

    test('addTagsToContent should add tags correctly', async () => {
      // プライベートメソッドをテストするためのhack
      const addTagsToContent = (memoryBank as any).addTagsToContent.bind(memoryBank);
      
      // タグのないコンテンツ
      const contentWithoutTags = `# Document Title

Content starts here.`;
      
      // タグを追加
      const contentWithTags = addTagsToContent(contentWithoutTags, ['new', 'tags']);
      
      // 検証
      expect(contentWithTags).toContain('tags: #new #tags');
      expect(contentWithTags).toMatch(/^# Document Title\n\ntags: #new #tags\n\nContent starts here./);
    });

    test('addTagsToContent should replace existing tags', async () => {
      // プライベートメソッドをテストするためのhack
      const addTagsToContent = (memoryBank as any).addTagsToContent.bind(memoryBank);
      
      // 既存のタグを持つコンテンツ
      const contentWithExistingTags = `# Document Title

tags: #old #tags

Content starts here.`;
      
      // タグを置換
      const contentWithNewTags = addTagsToContent(contentWithExistingTags, ['replaced', 'new']);
      
      // 検証
      expect(contentWithNewTags).toContain('tags: #replaced #new');
      expect(contentWithNewTags).not.toContain('#old');
      expect(contentWithNewTags).toMatch(/^# Document Title\n\ntags: #replaced #new\n\nContent starts here./);
    });
  });
});
