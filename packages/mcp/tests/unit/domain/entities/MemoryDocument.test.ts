import { vi } from 'vitest'; // vi をインポート
import { MemoryDocument, setDocumentLogger } from '../../../../src/domain/entities/MemoryDocument.js'; // .js 追加
import { DocumentPath } from '../../../../src/domain/entities/DocumentPath.js'; // .js 追加
import { Tag } from '../../../../src/domain/entities/Tag.js'; // .js 追加
// import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError.js'; // 未使用なので削除
import { IDocumentLogger } from '../../../../src/domain/logger/IDocumentLogger.js'; // .js 追加
import { JsonDocumentV2 } from '@memory-bank/schemas'; // スキーマ定義をインポート
import { DocumentId } from '../../../../src/domain/entities/DocumentId.js'; // .js 追加

// モックロガー
const mockLogger: IDocumentLogger = {
  debug: vi.fn(), // jest -> vi
  info: vi.fn(), // jest -> vi
  warn: vi.fn(), // jest -> vi
  error: vi.fn(), // jest -> vi
};

describe('MemoryDocument Unit Tests', () => {
  // --- Test Setup ---
  const validPath = DocumentPath.create('test/document.json');
  const validTags = [Tag.create('test'), Tag.create('unit')];
  const validContent = '# Test Title\n\nThis is the content.';
  const lastModified = new Date();
  const docProps = { path: validPath, content: validContent, tags: validTags, lastModified };

  // Helper to create a valid JsonDocumentV2 object for testing fromJSON
  const createValidJsonDocV2 = (overrides: { metadata?: Partial<JsonDocumentV2['metadata']>, content?: any } = {}): JsonDocumentV2 => {
    // JsonDocumentV2['metadata'] の型から documentType を除外する必要がある
    // Use 'any' for now or define a more precise type
    const baseMetadata: Omit<JsonDocumentV2['metadata'], 'documentType'> & { documentType?: string } = {
      id: DocumentId.generate().value,
      title: 'Test Title from JSON',
      // documentType: 'branch_context',
      path: validPath.value,
      tags: validTags.map(t => t.value),
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      version: 1,
      ...(overrides.metadata || {}),
    };
    const baseContent = overrides.content || { text: 'Content from JSON' };

    // documentType might be overridden in overrides.metadata, so retrieve it here
    // Get documentType from overrides.metadata or default, not from baseMetadata
    // TODO: Modify to get documentType from the top level of overrides if needed
    const finalDocumentType = 'branch_context'; // Fixed to default for now

    // Use type assertion as required properties of JsonDocumentV2 change based on documentType
    // (For stricter typing, branch based on documentType to construct the type)
    return {
      schema: 'memory_document_v2',
      documentType: finalDocumentType,
      metadata: baseMetadata,
      content: baseContent,
    } as JsonDocumentV2;
  };


  beforeAll(() => {
    // Set mock logger for all tests
    setDocumentLogger(mockLogger);
  });

  beforeEach(() => {
    // Reset mock call history before each test
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('should create an instance with valid properties', () => {
      const doc = MemoryDocument.create(docProps);
      expect(doc).toBeInstanceOf(MemoryDocument);
      expect(doc.path).toBe(validPath);
      expect(doc.content).toBe(validContent);
      expect(doc.tags).toEqual(validTags);
      expect(doc.tags).not.toBe(docProps.tags); // Check if tag array is copied
      expect(doc.lastModified).toEqual(lastModified);
      expect(doc.lastModified).not.toBe(lastModified); // Check if Date object is copied
    });

    // 必須プロパティ不足はTypeScriptの型チェックで防がれるため、
    // ランタイムエラーのテストはここでは省略（もしJSで使うなら必要）
  });

  describe('hasTag', () => {
    const doc = MemoryDocument.create(docProps);
    const existingTag = validTags[0];
    const nonExistentTag = Tag.create('non-existent');

    it('should return true if the specified tag exists', () => {
      expect(doc.hasTag(existingTag)).toBe(true);
      // Optionally check if logger was called
      expect(mockLogger.debug).toHaveBeenCalled();
    });

    it('should return false if the specified tag does not exist', () => {
      expect(doc.hasTag(nonExistentTag)).toBe(false);
    });
  });

  describe('updateContent', () => {
    const doc = MemoryDocument.create(docProps);
    const newContent = 'Updated content';

    it('should update the content correctly and return a new instance', () => {
      const updatedDoc = doc.updateContent(newContent);
      expect(updatedDoc).not.toBe(doc); // Immutability check
      expect(updatedDoc.content).toBe(newContent);
      expect(updatedDoc.path).toBe(doc.path); // Other properties should remain unchanged
      expect(updatedDoc.tags).toEqual(doc.tags);
      expect(updatedDoc.lastModified.getTime()).toBeGreaterThan(doc.lastModified.getTime()); // lastModified should be updated
    });

    it('should return the same instance if updated with the same content', () => {
      const updatedDoc = doc.updateContent(validContent);
      expect(updatedDoc).toBe(doc);
      expect(updatedDoc.lastModified).toEqual(doc.lastModified);
    });
  });

  describe('addTag', () => {
    const doc = MemoryDocument.create(docProps);
    const newTag = Tag.create('new-tag');
    const existingTag = validTags[0];

    it('should add a tag correctly and return a new instance', () => {
      const updatedDoc = doc.addTag(newTag);
      expect(updatedDoc).not.toBe(doc);
      expect(updatedDoc.tags).toContainEqual(newTag);
      expect(updatedDoc.tags.length).toBe(validTags.length + 1);
      expect(updatedDoc.lastModified.getTime()).toBeGreaterThan(doc.lastModified.getTime());
    });

    it('should return the same instance if adding an existing tag', () => {
      const updatedDoc = doc.addTag(existingTag);
      expect(updatedDoc).toBe(doc);
      expect(updatedDoc.tags.length).toBe(validTags.length);
      expect(updatedDoc.lastModified).toEqual(doc.lastModified);
    });
  });

  describe('removeTag', () => {
    const doc = MemoryDocument.create(docProps);
    const tagToRemove = validTags[0];
    const nonExistentTag = Tag.create('non-existent');

    it('should remove an existing tag correctly and return a new instance', () => {
      const updatedDoc = doc.removeTag(tagToRemove);
      expect(updatedDoc).not.toBe(doc);
      expect(updatedDoc.tags).not.toContainEqual(tagToRemove);
      expect(updatedDoc.tags.length).toBe(validTags.length - 1);
      expect(updatedDoc.lastModified.getTime()).toBeGreaterThan(doc.lastModified.getTime());
    });

    it('should return the same instance if trying to remove a non-existent tag', () => {
      const updatedDoc = doc.removeTag(nonExistentTag);
      expect(updatedDoc).toBe(doc);
      expect(updatedDoc.tags.length).toBe(validTags.length);
      expect(updatedDoc.lastModified).toEqual(doc.lastModified);
    });
  });

  describe('updateTags', () => {
    const doc = MemoryDocument.create(docProps);
    const newTags = [Tag.create('brand-new'), Tag.create('tags')];

    it('should update the tag list correctly and return a new instance', () => {
      const updatedDoc = doc.updateTags(newTags);
      expect(updatedDoc).not.toBe(doc);
      expect(updatedDoc.tags).toEqual(newTags);
      expect(updatedDoc.lastModified.getTime()).toBeGreaterThan(doc.lastModified.getTime());
    });
  });

  describe('title getter', () => {
    it('should correctly get the title from the first H1 heading in the content', () => {
      const contentWithTitle = '# Actual Title\nContent here.';
      const doc = MemoryDocument.create({ ...docProps, content: contentWithTitle });
      expect(doc.title).toBe('Actual Title');
    });

    it('should return undefined if there is no H1 heading', () => {
      const contentWithoutTitle = 'Just content, no title.';
      const doc = MemoryDocument.create({ ...docProps, content: contentWithoutTitle });
      expect(doc.title).toBeUndefined();
    });

     it('should only get the first H1 heading if multiple exist', () => {
       const contentWithMultipleTitles = '# First Title\n# Second Title\nContent.';
       const doc = MemoryDocument.create({ ...docProps, content: contentWithMultipleTitles });
       expect(doc.title).toBe('First Title');
     });

     it('should get the title correctly even with spaces around the H1 heading', () => {
       const contentWithSpaces = '  # Spaced Title \nContent.';
       const doc = MemoryDocument.create({ ...docProps, content: contentWithSpaces });
       expect(doc.title).toBe('Spaced Title');
     });
  });

  describe('toObject', () => {
    it('should return the correct plain object structure', () => {
      const doc = MemoryDocument.create(docProps);
      const obj = doc.toObject();
      expect(obj).toEqual({
        path: validPath.value,
        content: validContent,
        tags: validTags.map(t => t.value),
        lastModified: lastModified.toISOString(), // Converted to ISO string
      });
    });
  });

  describe('toJSON', () => {
    it('should parse and return the content directly for JSON files with new format', () => {
      // 新形式（documentTypeがトップレベル）
      const jsonDoc = createValidJsonDocV2();
      const jsonContent = JSON.stringify(jsonDoc);
      const jsonPath = DocumentPath.create('data.json');
      const doc = MemoryDocument.create({ ...docProps, path: jsonPath, content: jsonContent });
      const jsonObj = doc.toJSON();
      expect(jsonObj).toEqual(JSON.parse(jsonContent));
    });

    it('should convert from old format to new format when documentType is in metadata', () => {
      // 古い形式（documentTypeがmetadata内）のJSONドキュメント
      const oldFormatDoc = {
        schema: 'memory_document_v2',
        metadata: {
          id: DocumentId.generate().value,
          title: 'Old Format Document',
          documentType: 'branch_context', // メタデータ内のdocumentType
          path: 'old-format.json',
          tags: ['old', 'format'],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: {
          purpose: 'Testing old format conversion'
        }
      };

      const jsonPath = DocumentPath.create('old-format.json');
      const doc = MemoryDocument.create({ ...docProps, path: jsonPath, content: JSON.stringify(oldFormatDoc) });
      const jsonObj = doc.toJSON();

      // 新形式に変換されていることを確認：
      // 1. トップレベルにdocumentTypeがある
      expect(jsonObj.documentType).toBe('branch_context');
      // 2. メタデータ内のプロパティが保持されている
      expect(jsonObj.metadata.id).toBe(oldFormatDoc.metadata.id);
      expect(jsonObj.metadata.title).toBe(oldFormatDoc.metadata.title);
      // 3. コンテンツが保持されている
      expect(jsonObj.content).toEqual(oldFormatDoc.content);
      // 4. ログが出力されている
      expect(mockLogger.info).toHaveBeenCalledWith(expect.stringContaining('Converting legacy document format to new format'), expect.anything());
    });

    it('should log an error and return an inferred structure for invalid JSON files', () => {
      const invalidJsonContent = '{"invalid": json}';
      const jsonPath = DocumentPath.create('invalid.json');
      const doc = MemoryDocument.create({ ...docProps, path: jsonPath, content: invalidJsonContent });
      const jsonObj = doc.toJSON();

      expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to parse JSON document'), expect.anything());
      // Check that the inferred structure is returned (generic type here)
      expect(jsonObj.schema).toBe('memory_document_v2');
      expect(jsonObj.documentType).toBe('branch_context'); // Check top-level after removing metadata
      // Since determineDocumentType returns 'branch_context', adjust expectation
      // Fallback logic changed to return content as { text: ... }, so adjust expectation
      expect(jsonObj.content).toEqual({ text: invalidJsonContent });
    });

    it('should infer type from path and convert to JsonDocumentV2 format for non-JSON files (generic)', () => {
      const doc = MemoryDocument.create({ ...docProps, path: DocumentPath.create('notes.txt') });
      const jsonObj = doc.toJSON();
      expect(jsonObj.schema).toBe('memory_document_v2');
      expect(jsonObj.metadata.title).toBe('Test Title'); // content から取得
      expect(jsonObj.documentType).toBe('branch_context'); // Check top-level after removing metadata
      expect(jsonObj.metadata.path).toBe('notes.txt');
      expect(jsonObj.metadata.tags).toEqual(validTags.map(t => t.value));
      expect(jsonObj.metadata.lastModified).toBe(lastModified.toISOString());
      expect(jsonObj.metadata.createdAt).toBeDefined();
      expect(jsonObj.metadata.version).toBe(1); // Default version
      expect(jsonObj.metadata.id).toBeDefined(); // UUID is generated
      // Since determineDocumentType returns 'branch_context', adjust expectation
      // Fallback logic changed to return content as { text: ... }, so adjust expectation
      expect(jsonObj.content).toEqual({ text: validContent });
    });

    it('should correctly infer progress type based on path', () => {
      const doc = MemoryDocument.create({ ...docProps, path: DocumentPath.create('progress.md') });
      const jsonObj = doc.toJSON();
      expect(jsonObj.documentType).toBe('progress'); // Check top-level after removing metadata
      // Also check content structure (simply)
      // Fallback logic returns content as { text: ... }, so check for 'text' property
      expect(jsonObj.content).toHaveProperty('text');
    });

    // Test other document types (branch_context, active_context, system_patterns) similarly
    it('should correctly infer branch_context type based on path', () => {
      const doc = MemoryDocument.create({ ...docProps, path: DocumentPath.create('branchContext.txt') });
      const jsonObj = doc.toJSON();
      expect(jsonObj.documentType).toBe('branch_context'); // Check top-level after removing metadata
      // Fallback logic returns content as { text: ... }, so check for 'text' property
      expect(jsonObj.content).toHaveProperty('text');
    });
  });

  describe('fromJSON', () => {
    it('should create an instance from a valid JsonDocumentV2 with new format', () => {
      const jsonObj = createValidJsonDocV2();
      const doc = MemoryDocument.fromJSON(jsonObj, validPath);

      expect(doc).toBeInstanceOf(MemoryDocument);
      expect(doc.path).toBe(validPath);
      expect(doc.content).toBe(JSON.stringify(jsonObj, null, 2)); // content becomes a JSON string
      expect(doc.tags).toEqual(validTags);
      expect(doc.lastModified).toEqual(new Date(jsonObj.metadata.lastModified));
      expect(mockLogger.debug).toHaveBeenCalled(); // Check logger call
    });

    it('should handle and convert from old format when documentType is in metadata', () => {
      // 古い形式（documentTypeがmetadata内）のJSONドキュメント
      const oldFormatDoc = {
        schema: 'memory_document_v2',
        metadata: {
          id: DocumentId.generate().value,
          title: 'Old Format Document',
          documentType: 'branch_context', // メタデータ内のdocumentType
          path: 'old-format.json',
          tags: ['old', 'format'],
          lastModified: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          version: 1
        },
        content: {
          purpose: 'Testing old format conversion'
        }
      };

      const doc = MemoryDocument.fromJSON(oldFormatDoc as any, validPath);

      // 文字列化されたJSONからdocumentTypeの位置を確認
      const contentObj = JSON.parse(doc.content);

      // 新形式に変換されていることを確認
      expect(contentObj.documentType).toBe('branch_context');
      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('Detected legacy document format with documentType in metadata'),
        expect.anything()
      );
    });

    it('should handle cases with no tags correctly', () => {
       const jsonObj = createValidJsonDocV2({ metadata: { tags: undefined } });
       const doc = MemoryDocument.fromJSON(jsonObj, validPath);
       expect(doc.tags).toEqual([]);
    });

    it('should sanitize and create instance when invalid tag formats are included', () => {
       const invalidTag = 'Invalid Tag';
       const sanitizedTag = 'invalid-tag';
       const jsonObj = createValidJsonDocV2({ metadata: { tags: [validTags[0].value, invalidTag] } });
       const doc = MemoryDocument.fromJSON(jsonObj, validPath);

       expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining(`Sanitized tag '${invalidTag}' to '${sanitizedTag}'`));
       expect(doc.tags).toContainEqual(validTags[0]);
       expect(doc.tags).toContainEqual(Tag.create(sanitizedTag));
       expect(doc.tags.length).toBe(2);
    });
  });

  // determineDocumentType は private なので toJSON のテストで間接的に検証済み
});
