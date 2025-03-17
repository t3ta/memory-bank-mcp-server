import { JsonDocument } from '../../../../../domain/entities/JsonDocument.js';
import { DocumentPath } from '../../../../../domain/entities/DocumentPath.js';
import { DocumentId } from '../../../../../domain/entities/DocumentId.js';
import { GenericConverter } from '../../../json-to-markdown/converters/GenericConverter.js';
import { Tag } from '../../../../../domain/entities/Tag.js';

// テスト用のドキュメント生成関数
function createGenericDocument(
  documentType: string = 'generic',
  content: any = { dummyContent: 'dummy' }
): JsonDocument {
  const path = DocumentPath.create('feature/test-branch/testDocument.json');
  const id = DocumentId.generate();
  const tags = [Tag.create('test')];

  return JsonDocument.create({
    id,
    path,
    title: 'テストドキュメント',
    documentType: documentType as any,
    tags,
    content,
    lastModified: new Date(),
    createdAt: new Date(),
    version: 1,
  });
}

describe('GenericConverter', () => {
  let converter: GenericConverter;

  beforeEach(() => {
    converter = new GenericConverter();
  });

  test('should handle any document type', () => {
    const genericDoc = createGenericDocument('generic');
    const customDoc = createGenericDocument('custom_type');
    const anotherDoc = createGenericDocument('another_type');

    // GenericConverterはどんなドキュメントタイプでも処理できるはず
    expect(converter.canConvert(genericDoc)).toBe(true);
    expect(converter.canConvert(customDoc)).toBe(true);
    expect(converter.canConvert(anotherDoc)).toBe(true);
  });

  test('should convert simple properties', () => {
    const document = createGenericDocument('generic', {
      simpleText: '単純なテキスト',
      numberValue: 42,
      booleanValue: true,
    });

    const markdown = converter.convert(document);

    // 基本構造の確認
    expect(markdown).toContain('# テストドキュメント');
    expect(markdown).toContain('tags: #test');

    // 単純なプロパティの変換をチェック
    expect(markdown).toContain('## Simple Text');
    expect(markdown).toContain('単純なテキスト');
    expect(markdown).toContain('## Number Value');
    expect(markdown).toContain('42');
    expect(markdown).toContain('## Boolean Value');
    expect(markdown).toContain('true');
  });

  test('should convert arrays as lists', () => {
    const document = createGenericDocument('generic', {
      stringArray: ['項目1', '項目2', '項目3'],
      numberArray: [1, 2, 3],
      mixedArray: ['テキスト', 42, true],
    });

    const markdown = converter.convert(document);

    // 配列がリストとして変換されているか確認
    expect(markdown).toContain('## String Array');
    expect(markdown).toContain('- 項目1');
    expect(markdown).toContain('- 項目2');
    expect(markdown).toContain('- 項目3');

    expect(markdown).toContain('## Number Array');
    expect(markdown).toContain('- 1');
    expect(markdown).toContain('- 2');
    expect(markdown).toContain('- 3');

    expect(markdown).toContain('## Mixed Array');
    expect(markdown).toContain('- テキスト');
    expect(markdown).toContain('- 42');
    expect(markdown).toContain('- true');
  });

  test('should convert nested objects', () => {
    const document = createGenericDocument('generic', {
      nestedObject: {
        property1: 'プロパティ1',
        property2: 'プロパティ2',
        deepNested: {
          deepProperty: 'ディーププロパティ',
        },
      },
    });

    const markdown = converter.convert(document);

    // ネストされたオブジェクトの変換をチェック
    expect(markdown).toContain('## Nested Object');
    expect(markdown).toContain('#### Property1');
    expect(markdown).toContain('プロパティ1');
    expect(markdown).toContain('#### Property2');
    expect(markdown).toContain('プロパティ2');
    expect(markdown).toContain('#### Deep Nested');
    expect(markdown).toContain('#### Deep Property');
    expect(markdown).toContain('ディーププロパティ');
  });

  test('should convert array of objects', () => {
    const document = createGenericDocument('generic', {
      objectArray: [
        { title: 'オブジェクト1', value: '値1', tags: ['タグ1', 'タグ2'] },
        { title: 'オブジェクト2', value: '値2', tags: ['タグ3', 'タグ4'] },
      ],
    });

    const markdown = converter.convert(document);

    // オブジェクト配列の変換をチェック
    expect(markdown).toContain('## Object Array');
    expect(markdown).toContain('### オブジェクト1');
    expect(markdown).toContain('#### Value');
    expect(markdown).toContain('値1');
    expect(markdown).toContain('#### Tags');
    expect(markdown).toContain('- タグ1');
    expect(markdown).toContain('- タグ2');

    expect(markdown).toContain('### オブジェクト2');
    expect(markdown).toContain('#### Value');
    expect(markdown).toContain('値2');
    expect(markdown).toContain('#### Tags');
    expect(markdown).toContain('- タグ3');
    expect(markdown).toContain('- タグ4');
  });

  test('should handle objects without title using index as title', () => {
    const document = createGenericDocument('generic', {
      noTitleArray: [
        { value: '値A', description: '説明A' },
        { value: '値B', description: '説明B' },
      ],
    });

    const markdown = converter.convert(document);

    // タイトルなしオブジェクトの変換をチェック
    expect(markdown).toContain('## No Title Array');
    expect(markdown).toContain('### Item 1');
    expect(markdown).toContain('#### Value');
    expect(markdown).toContain('値A');
    expect(markdown).toContain('#### Description');
    expect(markdown).toContain('説明A');

    expect(markdown).toContain('### Item 2');
    expect(markdown).toContain('#### Value');
    expect(markdown).toContain('値B');
    expect(markdown).toContain('#### Description');
    expect(markdown).toContain('説明B');
  });

  test('should handle objects with name property as title alternative', () => {
    const document = createGenericDocument('generic', {
      namedItems: [
        { name: '名前付き項目1', value: '値X' },
        { name: '名前付き項目2', value: '値Y' },
      ],
    });

    const markdown = converter.convert(document);

    // name属性をタイトルとして使用するケースのチェック
    expect(markdown).toContain('## Named Items');
    expect(markdown).toContain('### 名前付き項目1');
    expect(markdown).toContain('#### Value');
    expect(markdown).toContain('値X');

    expect(markdown).toContain('### 名前付き項目2');
    expect(markdown).toContain('#### Value');
    expect(markdown).toContain('値Y');
  });

  test('should handle empty and null values gracefully', () => {
    const document = createGenericDocument('generic', {
      emptyArray: [],
      nullValue: null,
      undefinedValue: undefined,
      validValue: 'これは有効な値',
    });

    const markdown = converter.convert(document);

    // 空の配列やnull値の扱いをチェック
    expect(markdown).toContain('## Empty Array');
    expect(markdown).not.toContain('## Null Value');
    expect(markdown).not.toContain('## Undefined Value');
    expect(markdown).toContain('## Valid Value');
    expect(markdown).toContain('これは有効な値');
  });

  test('should format keys from different cases', () => {
    const document = createGenericDocument('generic', {
      snake_case_property: '値1',
      camelCaseProperty: '値2',
      PascalCaseProperty: '値3',
      UPPER_CASE_PROPERTY: '値4',
      'kebab-case-property': '値5',
    });

    const markdown = converter.convert(document);

    // 様々なケースのキーのフォーマットをチェック
    expect(markdown).toContain('## Snake Case Property');
    expect(markdown).toContain('## Camel Case Property');
    expect(markdown).toContain('## Pascal Case Property');
    expect(markdown).toContain('## Upper Case Property');
    expect(markdown).toContain('## Kebab-case-property'); // kebab-caseは単語分割されない
  });
});
