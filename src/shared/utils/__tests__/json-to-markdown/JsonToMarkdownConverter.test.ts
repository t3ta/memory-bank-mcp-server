import { JsonDocument } from '../../../../domain/entities/JsonDocument.js';
import { DocumentPath } from '../../../../domain/entities/DocumentPath.js';
import { DocumentId } from '../../../../domain/entities/DocumentId.js';
import { JsonToMarkdownConverter } from '../../json-to-markdown/JsonToMarkdownConverter.js';
import { IDocumentTypeConverter } from '../../json-to-markdown/DocumentTypeConverter.js';
import { SharedUtilsError, SharedUtilsErrorCodes } from '../../../errors/SharedUtilsError.js';
import { Tag } from '../../../../domain/entities/Tag.js';

// モックコンバーター
class MockConverter implements IDocumentTypeConverter {
  private readonly supportedType: string;

  constructor(documentType: string = 'mock_type') {
    this.supportedType = documentType;
  }

  canConvert(document: JsonDocument): boolean {
    return document.documentType === this.supportedType;
  }

  convert(document: JsonDocument): string {
    return `Converted ${this.supportedType} document: ${document.title}`;
  }
}

// テスト用のドキュメント生成関数
function createMockDocument(
  docType: string = 'mock_type',
  title: string = 'Test Document'
): JsonDocument {
  const path = DocumentPath.create('test/path.json');
  const id = DocumentId.generate();
  const tags = [Tag.create('test')];

  return JsonDocument.create({
    id,
    path,
    title,
    documentType: docType as any,
    tags,
    content: { test: 'content' },
    lastModified: new Date(),
    createdAt: new Date(),
    version: 1,
  });
}

describe('JsonToMarkdownConverter', () => {
  let converter: JsonToMarkdownConverter;
  let mockTypeConverter: IDocumentTypeConverter;

  beforeEach(() => {
    mockTypeConverter = new MockConverter();
    converter = new JsonToMarkdownConverter([mockTypeConverter]);
  });

  test('should register a converter', () => {
    const newConverter = new JsonToMarkdownConverter();
    expect(newConverter.getConverterCount()).toBe(0);

    newConverter.registerConverter(mockTypeConverter);
    expect(newConverter.getConverterCount()).toBe(1);
  });

  test('should convert document using appropriate converter', () => {
    const document = createMockDocument();
    const result = converter.convert(document);

    expect(result).toBe('Converted mock_type document: Test Document');
  });

  test('should throw error when no converter found for document type', () => {
    const document = createMockDocument('unknown_type');

    expect(() => {
      converter.convert(document);
    }).toThrow(SharedUtilsError);

    try {
      converter.convert(document);
    } catch (error) {
      const typedError = error as SharedUtilsError;
      expect(typedError.code).toBe(SharedUtilsErrorCodes.CONVERSION_ERROR);
      expect(typedError.message).toContain('No converter found for document type');
    }
  });

  test('should use cache for repeated conversions', () => {
    const document = createMockDocument();

    // First conversion should cache the result
    const result1 = converter.convert(document, { useCache: true });
    expect(result1).toBe('Converted mock_type document: Test Document');

    // Create a spy for the mock converter
    const spy = jest.spyOn(mockTypeConverter, 'convert');

    // Second conversion should use cache
    const result2 = converter.convert(document, { useCache: true });
    expect(result2).toBe('Converted mock_type document: Test Document');

    // Converter's convert method should not be called
    expect(spy).not.toHaveBeenCalled();
  });

  test('should not use cache when disabled', () => {
    const document = createMockDocument();

    // First conversion
    const result1 = converter.convert(document, { useCache: false });
    expect(result1).toBe('Converted mock_type document: Test Document');

    // Create a spy for the mock converter
    const spy = jest.spyOn(mockTypeConverter, 'convert');

    // Second conversion should not use cache
    const result2 = converter.convert(document, { useCache: false });
    expect(result2).toBe('Converted mock_type document: Test Document');

    // Converter's convert method should be called
    expect(spy).toHaveBeenCalled();
  });

  test('should clear cache', () => {
    const document = createMockDocument();

    // First conversion should cache the result
    converter.convert(document, { useCache: true });

    // Create a spy for the mock converter
    const spy = jest.spyOn(mockTypeConverter, 'convert');

    // Clear the cache
    converter.clearCache();

    // Next conversion should not use cache
    converter.convert(document, { useCache: true });

    // Converter's convert method should be called
    expect(spy).toHaveBeenCalled();
  });

  test('should use default options when not specified', () => {
    const document = createMockDocument();

    // First conversion with default options (cache enabled)
    converter.convert(document);

    // Create a spy for the mock converter
    const spy = jest.spyOn(mockTypeConverter, 'convert');

    // Second conversion should use cache by default
    converter.convert(document);

    // Converter's convert method should not be called
    expect(spy).not.toHaveBeenCalled();
  });
});
