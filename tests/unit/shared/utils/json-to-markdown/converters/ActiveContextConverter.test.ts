import { JsonDocument } from '../../../../../domain/entities/JsonDocument';
import { DocumentPath } from '../../../../../domain/entities/DocumentPath';
import { DocumentId } from '../../../../../domain/entities/DocumentId';
import { ActiveContextConverter } from '../../../json-to-markdown/converters/ActiveContextConverter';
import { Tag } from '../../../../../domain/entities/Tag';

// テスト用のドキュメント生成関数
function createActiveContextDocument(
  content: any = { currentWork: 'ダミーコンテンツ' }
): JsonDocument {
  const path = DocumentPath.create('feature/test-branch/activeContext.json');
  const id = DocumentId.generate();
  const tags = [Tag.create('core'), Tag.create('active-context')];

  return JsonDocument.create({
    id,
    path,
    title: 'アクティブコンテキスト',
    documentType: 'active_context',
    tags,
    content,
    lastModified: new Date(),
    createdAt: new Date(),
    version: 1,
  });
}

describe('ActiveContextConverter', () => {
  let converter: ActiveContextConverter;

  beforeEach(() => {
    converter = new ActiveContextConverter();
  });

  test('should check if it can convert a document', () => {
    const document = createActiveContextDocument();
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

  test('should convert complete active context document', () => {
    const document = createActiveContextDocument({
      currentWork: '現在はAPIの実装に取り組んでいます。',
      recentChanges: ['データモデルの更新', 'バリデーションの追加'],
      activeDecisions: ['RESTful APIパターンを採用', 'キャッシュ戦略の実装'],
      considerations: ['認証方式の選定', 'パフォーマンス最適化'],
      nextSteps: ['エンドポイントのテスト作成', 'ドキュメントの更新'],
    });

    const markdown = converter.convert(document);

    // 必要なセクションが含まれているか確認
    expect(markdown).toContain('# アクティブコンテキスト');
    expect(markdown).toContain('tags: #core #active-context');

    // 現在の作業内容セクション
    expect(markdown).toContain('## 現在の作業内容');
    expect(markdown).toContain('現在はAPIの実装に取り組んでいます。');

    // 最近の変更点セクション
    expect(markdown).toContain('## 最近の変更点');
    expect(markdown).toContain('- データモデルの更新');
    expect(markdown).toContain('- バリデーションの追加');

    // アクティブな決定事項セクション
    expect(markdown).toContain('## アクティブな決定事項');
    expect(markdown).toContain('- RESTful APIパターンを採用');
    expect(markdown).toContain('- キャッシュ戦略の実装');

    // 検討事項セクション
    expect(markdown).toContain('## 検討事項');
    expect(markdown).toContain('- 認証方式の選定');
    expect(markdown).toContain('- パフォーマンス最適化');

    // 次のステップセクション
    expect(markdown).toContain('## 次のステップ');
    expect(markdown).toContain('- エンドポイントのテスト作成');
    expect(markdown).toContain('- ドキュメントの更新');
  });

  test('should handle missing sections gracefully', () => {
    // 最小限のコンテンツを持つドキュメント
    const document = createActiveContextDocument({
      currentWork: '最小限の内容',
    });

    const markdown = converter.convert(document);

    // 基本的なタイトルとタグは含まれるが、他のセクションは含まれないことを確認
    expect(markdown).toContain('# アクティブコンテキスト');
    expect(markdown).toContain('tags: #core #active-context');
    expect(markdown).toContain('## 現在の作業内容');
    expect(markdown).toContain('最小限の内容');
    expect(markdown).not.toContain('## 最近の変更点');
    expect(markdown).not.toContain('## アクティブな決定事項');
    expect(markdown).not.toContain('## 検討事項');
    expect(markdown).not.toContain('## 次のステップ');
  });

  test('should handle partial document with only some sections', () => {
    const document = createActiveContextDocument({
      currentWork: '現在はテスト作成に取り組んでいます。',
      nextSteps: ['リファクタリング', 'デプロイ'],
    });

    const markdown = converter.convert(document);

    // 存在するセクションのみが含まれていることを確認
    expect(markdown).toContain('## 現在の作業内容');
    expect(markdown).toContain('現在はテスト作成に取り組んでいます。');
    expect(markdown).not.toContain('## 最近の変更点');
    expect(markdown).not.toContain('## アクティブな決定事項');
    expect(markdown).not.toContain('## 検討事項');
    expect(markdown).toContain('## 次のステップ');
    expect(markdown).toContain('- リファクタリング');
    expect(markdown).toContain('- デプロイ');
  });

  test('should handle empty arrays in sections', () => {
    const document = createActiveContextDocument({
      currentWork: '現在はテスト作成に取り組んでいます。',
      recentChanges: [],
      activeDecisions: [],
      considerations: [],
      nextSteps: [],
    });

    const markdown = converter.convert(document);

    // 現在の作業内容は含まれるが、空の配列を持つセクションは含まれないことを確認
    expect(markdown).toContain('## 現在の作業内容');
    expect(markdown).not.toContain('## 最近の変更点');
    expect(markdown).not.toContain('## アクティブな決定事項');
    expect(markdown).not.toContain('## 検討事項');
    expect(markdown).not.toContain('## 次のステップ');
  });
});
