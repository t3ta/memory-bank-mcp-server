import { JsonDocument } from '../../../../../domain/entities/JsonDocument';
import { DocumentPath } from '../../../../../domain/entities/DocumentPath';
import { DocumentId } from '../../../../../domain/entities/DocumentId';
import { BranchContextConverter } from '../../../json-to-markdown/converters/BranchContextConverter';
import { Tag } from '../../../../../domain/entities/Tag';

// テスト用のドキュメント生成関数
function createBranchContextDocument(
  content: any = { purpose: 'ダミーの目的です。' }
): JsonDocument {
  const path = DocumentPath.create('feature/test-branch/branchContext.json');
  const id = DocumentId.generate();
  const tags = [Tag.create('core'), Tag.create('branch-context')];

  return JsonDocument.create({
    id,
    path,
    title: 'ブランチコンテキスト',
    documentType: 'branch_context',
    tags,
    content,
    lastModified: new Date(),
    createdAt: new Date(),
    version: 1,
  });
}

describe('BranchContextConverter', () => {
  let converter: BranchContextConverter;

  beforeEach(() => {
    converter = new BranchContextConverter();
  });

  test('should check if it can convert a document', () => {
    const document = createBranchContextDocument();
    expect(converter.canConvert(document)).toBe(true);

    const otherDocument = JsonDocument.create({
      id: DocumentId.generate(),
      path: DocumentPath.create('test.json'),
      title: 'テスト',
      documentType: 'wrong_type' as any,
      tags: [],
      content: { dummy: 'content' },
    });
    expect(converter.canConvert(otherDocument)).toBe(false);
  });

  test('should convert basic branch context document', () => {
    const document = createBranchContextDocument({
      purpose: 'このブランチは機能Aを実装するためのものです。',
      createdAt: '2025-03-16T10:00:00.000Z',
    });

    const markdown = converter.convert(document);

    // 必要なセクションが含まれているか確認
    expect(markdown).toContain('# ブランチコンテキスト');
    expect(markdown).toContain('## 目的');
    expect(markdown).toContain('このブランチは機能Aを実装するためのものです。');
    expect(markdown).toContain('ブランチ: feature/test-branch');
    expect(markdown).toContain('作成日時: 2025-03-16T10:00:00.000Z');

    // タグが含まれているか確認
    expect(markdown).toContain('tags: #core #branch-context');
  });

  test('should handle user stories in branch context document', () => {
    const document = createBranchContextDocument({
      purpose: 'このブランチの目的はテストです。',
      userStories: [
        { type: 'challenge', description: '課題1を解決する' },
        { type: 'challenge', description: '課題2を解決する' },
        { type: 'feature', description: '機能1を実装する' },
        { type: 'feature', description: '機能2を実装する' },
        { type: 'expectation', description: '期待される動作1' },
        { type: 'expectation', description: '期待される動作2' },
      ],
    });

    const markdown = converter.convert(document);

    // ユーザーストーリーセクションが含まれているか確認
    expect(markdown).toContain('## ユーザーストーリー');

    // 課題セクションが含まれているか確認
    expect(markdown).toContain('### 解決する課題');
    expect(markdown).toContain('- 課題1を解決する');
    expect(markdown).toContain('- 課題2を解決する');

    // 機能セクションが含まれているか確認
    expect(markdown).toContain('### 必要な機能');
    expect(markdown).toContain('- 機能1を実装する');
    expect(markdown).toContain('- 機能2を実装する');

    // 期待される動作セクションが含まれているか確認
    expect(markdown).toContain('### 期待される動作');
    expect(markdown).toContain('- 期待される動作1');
    expect(markdown).toContain('- 期待される動作2');
  });

  test('should handle empty user stories sections', () => {
    const document = createBranchContextDocument({
      purpose: 'このブランチの目的はテストです。',
      userStories: [],
    });

    const markdown = converter.convert(document);

    // 目的セクションは存在するが、ユーザーストーリーセクションは含まれていないことを確認
    expect(markdown).toContain('## 目的');
    expect(markdown).not.toContain('## ユーザーストーリー');
  });

  test('should handle untyped user stories as challenges', () => {
    const document = createBranchContextDocument({
      purpose: 'このブランチの目的はテストです。',
      userStories: [
        { description: 'タイプなしのストーリー1' },
        { description: 'タイプなしのストーリー2' },
      ],
    });

    const markdown = converter.convert(document);

    // タイプなしのストーリーは課題として扱われることを確認
    expect(markdown).toContain('### 解決する課題');
    expect(markdown).toContain('- タイプなしのストーリー1');
    expect(markdown).toContain('- タイプなしのストーリー2');
  });

  test('should handle missing sections gracefully', () => {
    // 最小限のコンテンツを持つドキュメント
    const document = createBranchContextDocument({
      purpose: '最小限の内容です。',
    });

    const markdown = converter.convert(document);

    // 基本的なタイトルとタグは含まれるが、他のセクションは含まれないことを確認
    expect(markdown).toContain('# ブランチコンテキスト');
    expect(markdown).toContain('tags: #core #branch-context');
    expect(markdown).toContain('## 目的');
    expect(markdown).toContain('最小限の内容です。');
    expect(markdown).not.toContain('## ユーザーストーリー');
  });
});
