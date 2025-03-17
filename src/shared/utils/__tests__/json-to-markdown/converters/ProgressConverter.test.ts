import { JsonDocument } from '../../../../../domain/entities/JsonDocument.js';
import { DocumentPath } from '../../../../../domain/entities/DocumentPath.js';
import { DocumentId } from '../../../../../domain/entities/DocumentId.js';
import { ProgressConverter } from '../../../json-to-markdown/converters/ProgressConverter.js';
import { Tag } from '../../../../../domain/entities/Tag.js';

// テスト用のドキュメント生成関数
function createProgressDocument(
  content: any = { workingFeatures: [], pendingImplementation: [] }
): JsonDocument {
  const path = DocumentPath.create('feature/test-branch/progress.json');
  const id = DocumentId.generate();
  const tags = [Tag.create('core'), Tag.create('progress')];

  return JsonDocument.create({
    id,
    path,
    title: '進捗状況',
    documentType: 'progress',
    tags,
    content,
    lastModified: new Date(),
    createdAt: new Date(),
    version: 1,
  });
}

describe('ProgressConverter', () => {
  let converter: ProgressConverter;

  beforeEach(() => {
    converter = new ProgressConverter();
  });

  test('should check if it can convert a document', () => {
    const document = createProgressDocument();
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

  test('should convert complete progress document', () => {
    const document = createProgressDocument({
      workingFeatures: ['ユーザー認証', 'データ検証', 'ログ機能'],
      pendingImplementation: ['レポート生成', 'メール通知', 'バッチ処理'],
      status: '基本機能は実装済みで、現在は拡張機能の開発に取り組んでいます。',
      knownIssues: ['大量データ処理時のパフォーマンス問題', 'モバイル表示の最適化が未完了'],
    });

    const markdown = converter.convert(document);

    // 必要なセクションが含まれているか確認
    expect(markdown).toContain('# 進捗状況');
    expect(markdown).toContain('tags: #core #progress');

    // 動作している機能セクション
    expect(markdown).toContain('## 動作している機能');
    expect(markdown).toContain('- ユーザー認証');
    expect(markdown).toContain('- データ検証');
    expect(markdown).toContain('- ログ機能');

    // 未実装の機能セクション
    expect(markdown).toContain('## 未実装の機能');
    expect(markdown).toContain('- レポート生成');
    expect(markdown).toContain('- メール通知');
    expect(markdown).toContain('- バッチ処理');

    // 現在の状態セクション
    expect(markdown).toContain('## 現在の状態');
    expect(markdown).toContain('基本機能は実装済みで、現在は拡張機能の開発に取り組んでいます。');

    // 既知の問題セクション
    expect(markdown).toContain('## 既知の問題');
    expect(markdown).toContain('- 大量データ処理時のパフォーマンス問題');
    expect(markdown).toContain('- モバイル表示の最適化が未完了');
  });

  test('should handle empty document with all section headers', () => {
    // 空のコンテンツを持つドキュメント
    const document = createProgressDocument({});

    const markdown = converter.convert(document);

    // 全セクションのヘッダーは含まれるが、内容は空であることを確認
    expect(markdown).toContain('# 進捗状況');
    expect(markdown).toContain('tags: #core #progress');
    expect(markdown).toContain('## 動作している機能');
    expect(markdown).toContain('## 未実装の機能');
    expect(markdown).toContain('## 現在の状態');
    expect(markdown).toContain('## 既知の問題');

    // リストアイテムが含まれないことを確認
    const listItemRegex = /- .+/g;
    const listItemMatches = markdown.match(listItemRegex) || [];
    expect(listItemMatches.length).toBe(0);
  });

  test('should handle partial document with some sections', () => {
    const document = createProgressDocument({
      workingFeatures: ['ログイン機能', 'プロフィール編集'],
      knownIssues: ['セッションタイムアウトの処理が未実装'],
    });

    const markdown = converter.convert(document);

    // 含まれるべきアイテム
    expect(markdown).toContain('## 動作している機能');
    expect(markdown).toContain('- ログイン機能');
    expect(markdown).toContain('- プロフィール編集');
    expect(markdown).toContain('## 既知の問題');
    expect(markdown).toContain('- セッションタイムアウトの処理が未実装');

    // 未実装機能と現在の状態のヘッダーは含まれるが、内容は空
    expect(markdown).toContain('## 未実装の機能');
    expect(markdown).toContain('## 現在の状態');
    expect(markdown).not.toContain('基本機能は実装済み');

    // 未実装機能のリストアイテムが含まれないことを確認
    expect(markdown).not.toMatch(/## 未実装の機能\n- /);
  });

  test('should handle empty arrays in sections', () => {
    const document = createProgressDocument({
      workingFeatures: [],
      pendingImplementation: [],
      status: '開発開始前の段階です。',
      knownIssues: [],
    });

    const markdown = converter.convert(document);

    // すべてのセクションヘッダーは含まれる
    expect(markdown).toContain('## 動作している機能');
    expect(markdown).toContain('## 未実装の機能');
    expect(markdown).toContain('## 現在の状態');
    expect(markdown).toContain('## 既知の問題');

    // 状態テキストは含まれる
    expect(markdown).toContain('開発開始前の段階です。');

    // リストアイテムが含まれないことを確認
    const listItemRegex = /- .+/g;
    const listItemMatches = markdown.match(listItemRegex) || [];
    expect(listItemMatches.length).toBe(0);
  });
});
