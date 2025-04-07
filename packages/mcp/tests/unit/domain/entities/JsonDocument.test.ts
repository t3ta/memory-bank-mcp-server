import { vi } from 'vitest'; // vi をインポート
import type { Mock } from 'vitest'; // Mock 型をインポート
import { JsonDocument, SCHEMA_VERSION, DocumentType } from '../../../../src/domain/entities/JsonDocument.js'; // .js 追加
import { DocumentPath } from '../../../../src/domain/entities/DocumentPath.js'; // .js 追加
import { Tag } from '../../../../src/domain/entities/Tag.js'; // .js 追加
import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError.js'; // .js 追加
import { IDocumentValidator } from '../../../../src/domain/validation/IDocumentValidator.js'; // .js 追加
import { DocumentId } from '../../../../src/domain/entities/DocumentId.js'; // .js 追加
import { DocumentVersionInfo } from '../../../../src/domain/entities/DocumentVersionInfo.js'; // .js 追加

// Mock validator
const mockValidator: IDocumentValidator = {
  validateDocument: vi.fn(), // jest -> vi
  validateMetadata: vi.fn(), // jest -> vi
  validateContent: vi.fn(), // jest -> vi
};

describe('JsonDocument', () => {
  // --- Test Setup ---
  const validPath = DocumentPath.create('test/document.json');
  const docId = DocumentId.generate();
  const title = 'Test Document';
  const documentType: DocumentType = 'generic';
  const tags = [Tag.create('test'), Tag.create('json')];
  const content = { key: 'value', nested: { num: 1 } };
  const branch = 'feature/test-branch';
  const versionInfo = new DocumentVersionInfo({ version: 1 });

  // beforeAll(() => { // Moved validator setup to beforeEach
  // });

  beforeEach(() => {
    // Reset validator and mock history before each test
    JsonDocument.setValidator(mockValidator);
    vi.clearAllMocks(); // jest -> vi
  });

  // --- Static Factory Methods ---

  describe('fromString', () => {
    // Define a common valid JSON string within the describe block
    // Moved documentType to top level according to schema changes
    const validJsonString = JSON.stringify({
      schema: SCHEMA_VERSION,
      documentType: documentType, // documentType at top level
      metadata: {
        id: docId.value,
        title: title,
        // documentType: documentType, // Removed from metadata
        path: validPath.value,
        tags: tags.map(t => t.value),
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1,
        branch: branch,
      },
      content: content,
    });

    it('should create an instance from a valid JSON string', () => {
      const doc = JsonDocument.fromString(validJsonString, validPath);
      expect(doc).toBeInstanceOf(JsonDocument);
      expect(doc.id.equals(docId)).toBe(true);
      expect(doc.path.equals(validPath)).toBe(true);
      expect(doc.title).toBe(title);
      expect(doc.documentType).toBe(documentType);
      expect(doc.tags).toEqual(tags);
      expect(doc.content).toEqual(content);
      expect(doc.branch).toBe(branch);
      expect(doc.version).toBe(1);
      // Check if validator was called
      expect(mockValidator.validateDocument).toHaveBeenCalledTimes(1);
    });

    it('should throw an error for invalid JSON string', () => {
      const invalidJsonString = '{"invalid json';
      // Check for DomainError with partial message match (using regex)
      expect(() => JsonDocument.fromString(invalidJsonString, validPath)).toThrow(DomainError);
      expect(() => JsonDocument.fromString(invalidJsonString, validPath)).toThrow(/Failed to parse JSON document/);
      expect(mockValidator.validateDocument).not.toHaveBeenCalled();
    });

    it('should throw a validation error for invalid schema version', () => {
       // Mock validator to throw an error
       (mockValidator.validateDocument as Mock).mockImplementationOnce(() => { // as Mock に修正
         throw new DomainError(DomainErrorCodes.VALIDATION_ERROR, 'Invalid schema version');
       });
       // Moved documentType to top level according to schema changes
       const jsonWithInvalidSchema = JSON.stringify({
         schema: 'invalid_version',
         documentType: documentType, // documentType をトップレベルに
         metadata: { id: docId.value, title, path: validPath.value, tags: [], lastModified: new Date(), createdAt: new Date(), version: 1 }, // Removed documentType from metadata
         content: {},
       });
       // Check for exact error class and message (since it's thrown by the mock)
       expect(() => JsonDocument.fromString(jsonWithInvalidSchema, validPath)).toThrow(
         new DomainError(DomainErrorCodes.VALIDATION_ERROR, 'Invalid schema version')
       );
       expect(mockValidator.validateDocument).toHaveBeenCalledTimes(1);
    });
  });

  describe('fromObject', () => {
     // Moved documentType to top level according to schema changes
     const validObject = {
       schema: SCHEMA_VERSION,
       documentType: documentType, // documentType at top level
       metadata: {
         id: docId.value,
         title: title,
         // documentType: documentType, // Removed from metadata
         path: validPath.value,
         tags: tags.map(t => t.value),
         lastModified: new Date().toISOString(),
         createdAt: new Date().toISOString(),
         version: 1,
         branch: branch,
       },
       content: content,
     };

    it('should create an instance from a valid object', () => {
      const doc = JsonDocument.fromObject(validObject, validPath);
      expect(doc).toBeInstanceOf(JsonDocument);
      expect(doc.id.equals(docId)).toBe(true);
      // ... check other properties similarly ...
      expect(mockValidator.validateDocument).toHaveBeenCalledWith(validObject);
      expect(mockValidator.validateDocument).toHaveBeenCalledTimes(1);
    });

    it('should throw a validation error for invalid object structure', () => {
      const invalidObject = { invalid: 'structure' };
      // Mock validator to throw an error
      (mockValidator.validateDocument as Mock).mockImplementationOnce(() => { // as Mock に修正
        throw new DomainError(DomainErrorCodes.VALIDATION_ERROR, 'Invalid structure');
      });
      // Check for exact error class and message (since it's thrown by the mock)
      expect(() => JsonDocument.fromObject(invalidObject, validPath)).toThrow(
         new DomainError(DomainErrorCodes.VALIDATION_ERROR, 'Invalid structure')
      );
      expect(mockValidator.validateDocument).toHaveBeenCalledWith(invalidObject);
      expect(mockValidator.validateDocument).toHaveBeenCalledTimes(1);
    });
  });

  describe('create', () => {
    it('should create a new instance with specified properties', () => {
      const doc = JsonDocument.create({
        id: docId,
        path: validPath,
        title: title,
        documentType: documentType,
        tags: tags,
        content: content,
        branch: branch,
        versionInfo: versionInfo,
      });

      expect(doc).toBeInstanceOf(JsonDocument);
      expect(doc.id).toBe(docId);
      expect(doc.path).toBe(validPath);
      expect(doc.title).toBe(title);
      expect(doc.documentType).toBe(documentType);
      expect(doc.tags).toEqual(tags); // Use toEqual for arrays
      expect(doc.content).toEqual(content); // Use toEqual for objects
      expect(doc.branch).toBe(branch);
      expect(doc.versionInfo).toBe(versionInfo);
      expect(doc.version).toBe(1);
      expect(doc.lastModified).toEqual(versionInfo.lastModified); // Use toEqual for Dates
      // Check if content validation was called
      expect(mockValidator.validateContent).toHaveBeenCalledWith(documentType, content);
      expect(mockValidator.validateContent).toHaveBeenCalledTimes(1);
    });

     it('should create with default values if ID, tags, branch, versionInfo are omitted', () => {
       const doc = JsonDocument.create({
         path: validPath,
         title: title,
         documentType: documentType,
         content: content,
       });
       expect(doc.id).toBeInstanceOf(DocumentId);
       expect(doc.tags).toEqual([]);
       expect(doc.branch).toBeUndefined();
       expect(doc.versionInfo).toBeInstanceOf(DocumentVersionInfo);
       expect(doc.version).toBe(1); // Default version
       expect(mockValidator.validateContent).toHaveBeenCalledWith(documentType, content);
     });

    it('should throw a validation error for invalid content', () => {
      const invalidContent = { wrong: 'structure' };
      // Mock validator to throw an error
      (mockValidator.validateContent as Mock).mockImplementationOnce(() => { // as Mock に修正
        throw new DomainError(DomainErrorCodes.VALIDATION_ERROR, 'Invalid content');
      });

      expect(() => JsonDocument.create({
        path: validPath,
        title: title,
        documentType: documentType,
        content: invalidContent,
      // Check for exact error class and message (since it's thrown by the mock)
      // Check only for error code and message, ignore timestamp differences
      })).toThrow(expect.objectContaining({
        code: DomainErrorCodes.VALIDATION_ERROR,
        message: 'Invalid content',
      }));
      expect(mockValidator.validateContent).toHaveBeenCalledWith(documentType, invalidContent);
      expect(mockValidator.validateContent).toHaveBeenCalledTimes(1);
    });

    // Tests for missing required properties (path, title, documentType, content)
    // rely on TypeScript type checking and would result in compile errors rather than runtime errors.
    // Therefore, we primarily test validation errors here.
  });

  // --- Instance Methods ---

  describe('updatePath', () => {
    let doc: JsonDocument;
    beforeEach(() => {
      doc = JsonDocument.create({ path: validPath, title, documentType, content });
    });

    it('should update the path correctly and return a new instance', () => {
      const newPath = DocumentPath.create('new/path.json');
      const updatedDoc = doc.updatePath(newPath);

      expect(updatedDoc).not.toBe(doc); // Check for immutability
      expect(updatedDoc.path).toBe(newPath);
      expect(updatedDoc.id.equals(doc.id)).toBe(true); // ID should not change
      expect(updatedDoc.title).toBe(doc.title); // Other properties should not change
      expect(updatedDoc.version).toBe(doc.version + 1); // Version should increment
      expect(updatedDoc.lastModified.getTime()).toBeGreaterThanOrEqual(doc.lastModified.getTime()); // lastModified should be updated or stay the same
    });

    it('should return the same instance if updated with the same path', () => {
      const updatedDoc = doc.updatePath(validPath);
      expect(updatedDoc).toBe(doc); // Should return the same instance
      expect(updatedDoc.version).toBe(doc.version);
    });
  });

  describe('updateTitle', () => {
    let doc: JsonDocument;
    beforeEach(() => {
      doc = JsonDocument.create({ path: validPath, title, documentType, content });
    });

    it('should update the title correctly and return a new instance', () => {
      const newTitle = 'New Title';
      const updatedDoc = doc.updateTitle(newTitle);

      expect(updatedDoc).not.toBe(doc);
      expect(updatedDoc.title).toBe(newTitle);
      expect(updatedDoc.path.equals(doc.path)).toBe(true);
      expect(updatedDoc.version).toBe(doc.version + 1);
      expect(updatedDoc.lastModified.getTime()).toBeGreaterThanOrEqual(doc.lastModified.getTime()); // lastModified should be updated or stay the same
    });

     it('should return the same instance if updated with the same title', () => {
       const updatedDoc = doc.updateTitle(title);
       expect(updatedDoc).toBe(doc);
       expect(updatedDoc.version).toBe(doc.version);
     });
  });

  describe('updateContent', () => {
    let doc: JsonDocument<typeof content>;
    beforeEach(() => {
      doc = JsonDocument.create({ path: validPath, title, documentType, content });
    });

    it('should update the content correctly and return a new instance', () => {
      const newContent = { newKey: 'newValue' };

      vi.clearAllMocks(); // Clear mock history before calling updateContent
      const updatedDoc = doc.updateContent(newContent);

      // Check if content validation was called
      expect(mockValidator.validateContent).toHaveBeenCalledWith(documentType, newContent); // Check arguments
      expect(mockValidator.validateContent).toHaveBeenCalledTimes(1); // Check call count

      // Check other properties
      expect(updatedDoc).not.toBe(doc); // Check for immutability
      expect(updatedDoc.content).toEqual(newContent);
      expect(updatedDoc.title).toBe(doc.title);
      expect(updatedDoc.version).toBe(doc.version + 1);
      expect(updatedDoc.lastModified.getTime()).toBeGreaterThanOrEqual(doc.lastModified.getTime()); // lastModified should be updated or stay the same
    });

    it('should throw an error when updating with invalid content', () => {
       const invalidContent = { wrong: 'structure' };
       // Mock validator to throw an error
       (mockValidator.validateContent as Mock).mockImplementationOnce(() => { // as Mock に修正
         throw new DomainError(DomainErrorCodes.VALIDATION_ERROR, 'Invalid content');
       });

       vi.clearAllMocks(); // Clear mock history
       // updateContent should throw within expect
       expect(() => doc.updateContent(invalidContent)).toThrow(
         new DomainError(DomainErrorCodes.VALIDATION_ERROR, 'Invalid content')
       );
     });
   });

  describe('addTag', () => {
    let doc: JsonDocument;
    const newTag = Tag.create('new-tag');
    beforeEach(() => {
      // Reset all validator mocks to return true just in case
      (mockValidator.validateDocument as Mock).mockReturnValue(true);
      (mockValidator.validateMetadata as Mock).mockReturnValue(true);
      (mockValidator.validateContent as Mock).mockReturnValue(true);
      doc = JsonDocument.create({ path: validPath, title, documentType, content, tags });
    });

    it('should add a tag correctly and return a new instance', () => {
      const updatedDoc = doc.addTag(newTag);
      expect(updatedDoc).not.toBe(doc);
      expect(updatedDoc.tags).toContainEqual(newTag);
      expect(updatedDoc.tags.length).toBe(tags.length + 1);
      expect(updatedDoc.version).toBe(doc.version + 1);
      expect(updatedDoc.lastModified.getTime()).toBeGreaterThanOrEqual(doc.lastModified.getTime()); // lastModified should be updated or stay the same
    });

    it('should return the same instance if adding an existing tag', () => {
      const existingTag = tags[0];
      const updatedDoc = doc.addTag(existingTag);
      expect(updatedDoc).toBe(doc);
      expect(updatedDoc.tags.length).toBe(tags.length);
      expect(updatedDoc.version).toBe(doc.version);
    });
  });

  describe('removeTag', () => {
    let doc: JsonDocument;
    const tagToRemove = tags[0];
    const nonExistentTag = Tag.create('non-existent');
    beforeEach(() => {
      doc = JsonDocument.create({ path: validPath, title, documentType, content, tags });
    });

    it('should remove an existing tag correctly and return a new instance', () => {
      const updatedDoc = doc.removeTag(tagToRemove);
      expect(updatedDoc).not.toBe(doc);
      expect(updatedDoc.tags).not.toContainEqual(tagToRemove);
      expect(updatedDoc.tags.length).toBe(tags.length - 1);
      expect(updatedDoc.version).toBe(doc.version + 1);
      expect(updatedDoc.lastModified.getTime()).toBeGreaterThanOrEqual(doc.lastModified.getTime()); // lastModified should be updated or stay the same
    });

    it('should return the same instance if trying to remove a non-existent tag', () => {
      const updatedDoc = doc.removeTag(nonExistentTag);
      expect(updatedDoc).toBe(doc);
      expect(updatedDoc.tags.length).toBe(tags.length);
      expect(updatedDoc.version).toBe(doc.version);
    });
  });

  describe('updateTags', () => {
     let doc: JsonDocument;
     const newTags = [Tag.create('new1'), Tag.create('new2')];
     beforeEach(() => {
       doc = JsonDocument.create({ path: validPath, title, documentType, content, tags });
     });

    it('should update the tag list correctly and return a new instance', () => {
      const updatedDoc = doc.updateTags(newTags);
      expect(updatedDoc).not.toBe(doc);
      expect(updatedDoc.tags).toEqual(newTags);
      expect(updatedDoc.version).toBe(doc.version + 1);
      expect(updatedDoc.lastModified.getTime()).toBeGreaterThanOrEqual(doc.lastModified.getTime()); // lastModified should be updated or stay the same
    });
  });

  describe('toObject', () => {
    it('should return an object with the correct BaseJsonDocumentV2 structure', () => {
      const doc = JsonDocument.create({ id: docId, path: validPath, title, documentType, content, tags, branch, versionInfo });
      const obj = doc.toObject();

      // Adjust expectations according to schema changes
      expect(obj.schema).toBe(SCHEMA_VERSION);
      expect(obj.documentType).toBe(documentType); // Check documentType is at top level
      expect(obj.metadata.id).toBe(docId.value);
      expect(obj.metadata.title).toBe(title);
      // expect(obj.metadata.documentType).toBe(documentType); // Not in metadata
      expect(obj.metadata.path).toBe(validPath.value);
      expect(obj.metadata.tags).toEqual(tags.map(t => t.value));
      expect(obj.metadata.lastModified).toEqual(versionInfo.lastModified.toISOString()); // Compare as ISO strings
      expect(obj.metadata.version).toBe(versionInfo.version);
      expect(obj.metadata.branch).toBe(branch);
      expect(obj.metadata.createdAt).toBeDefined(); // Check createdAt exists
      expect(obj.content).toEqual(content);
    });

     it('should not include branch in metadata if branch is undefined', () => {
       const doc = JsonDocument.create({ path: validPath, title, documentType, content });
       const obj = doc.toObject();
       expect(obj.metadata.branch).toBeUndefined();
     });
  });

  describe('toString', () => {
    it('should return a correct JSON string', () => {
       const doc = JsonDocument.create({ id: docId, path: validPath, title, documentType, content, tags, branch, versionInfo });
       const jsonString = doc.toString();
       const parsed = JSON.parse(jsonString); // Parse back to verify

       expect(parsed.schema).toBe(SCHEMA_VERSION);
       expect(parsed.metadata.id).toBe(docId.value);
       // ... similar checks as toObject ...
       expect(parsed.content).toEqual(content);
    });

    it('should return a formatted JSON string when pretty=true', () => {
      const doc = JsonDocument.create({ path: validPath, title, documentType, content });
      const prettyJsonString = doc.toString(true);
      // Simple check for formatting (presence of newline and indentation)
      expect(prettyJsonString).toContain('\n');
      expect(prettyJsonString).toContain('  '); // Indentation (two spaces)
    });
  });

  describe('equals', () => {
    let doc1: JsonDocument;
    let doc2: JsonDocument;
    let doc3: JsonDocument;

    beforeEach(() => {
      // Create instances before each test (validator is set at this point)
      doc1 = JsonDocument.create({ id: docId, path: validPath, title, documentType, content });
      doc2 = JsonDocument.create({ id: docId, path: DocumentPath.create('other.json'), title: 'Other', documentType, content }); // 同じID、違う内容
      doc3 = JsonDocument.create({ path: validPath, title, documentType, content }); // Different ID
    });

    it('should return true for instances with the same ID', () => {
      expect(doc1.equals(doc2)).toBe(true);
    });

    it('should return false for instances with different IDs', () => {
      expect(doc1.equals(doc3)).toBe(false);
    });
  });

   describe('hasTag', () => {
     let doc: JsonDocument;
     let existingTag: Tag;
     let nonExistentTag: Tag;
     beforeEach(() => {
       // Create instance and tags before each test
       doc = JsonDocument.create({ path: validPath, title, documentType, content, tags });
       existingTag = tags[0];
       nonExistentTag = Tag.create('non-existent');
     });

     it('should return true for an existing tag', () => {
       expect(doc.hasTag(existingTag)).toBe(true);
     });

     it('should return false for a non-existent tag', () => {
       expect(doc.hasTag(nonExistentTag)).toBe(false);
     });
   });

   describe('getters', () => {
      let doc: JsonDocument;
      beforeEach(() => {
        // Create instance before each test
        doc = JsonDocument.create({ id: docId, path: validPath, title, documentType, content, tags, branch, versionInfo });
      });

      it('should return correct values from getters', () => {
        expect(doc.id).toBe(docId);
        expect(doc.path).toBe(validPath);
        expect(doc.title).toBe(title);
        expect(doc.documentType).toBe(documentType);
        expect(doc.tags).toEqual(tags);
        expect(doc.content).toEqual(content);
        expect(doc.branch).toBe(branch);
        expect(doc.versionInfo).toBe(versionInfo);
        expect(doc.lastModified).toEqual(versionInfo.lastModified); // Use toEqual for Dates
        expect(doc.version).toBe(versionInfo.version);
      });
   });

   // describe('Validator Handling', () => {
   //   it('バリデーターが設定されていない場合に getValidator がエラーを投げること', () => {
   //     // 一時的にバリデーターを未設定状態にする（@ts-ignore を使用）
   //     // @ts-ignore - private static プロパティへのアクセス
   //     const originalValidator = JsonDocument.validator;
   //     // @ts-ignore
   //     JsonDocument.validator = undefined;
   //
   //     expect(() => {
   //       // getValidator を内部的に呼び出すメソッドを実行
   //       JsonDocument.create({ path: validPath, title, documentType, content });
   //     }).toThrow(new DomainError(DomainErrorCodes.INITIALIZATION_ERROR, expect.stringContaining('Document validator not set')));
   //
   //     // バリデーターを元に戻す -> finally ブロックや afterEach でやるべき
   //     // @ts-ignore
   //     JsonDocument.validator = originalValidator;
   //   });
   // });

});
