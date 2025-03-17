import { JsonDocument, DocumentType } from '../JsonDocument.js';
import { DocumentId } from '../DocumentId.js';
import { DocumentPath } from '../DocumentPath.js';
import { Tag } from '../Tag.js';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';
import { SCHEMA_VERSION } from '../../../schemas/v2/json-document.js';

describe('JsonDocument', () => {
  // Setup common test data
  const validId = DocumentId.generate();
  const validPath = DocumentPath.create('test/document.json');
  const validTitle = 'Test Document';
  const validTags = [Tag.create('test'), Tag.create('document')];

  // Type-specific content examples
  const branchContextContent = {
    purpose: 'Test purpose',
    userStories: [{ description: 'Test story', completed: false }],
  };

  const activeContextContent = {
    currentWork: 'Test work',
    recentChanges: ['Change 1', 'Change 2'],
    activeDecisions: ['Decision 1'],
    considerations: ['Consideration 1'],
    nextSteps: ['Step 1', 'Step 2'],
  };

  const progressContent = {
    workingFeatures: ['Feature 1'],
    pendingImplementation: ['Feature 2'],
    status: 'In progress',
    knownIssues: ['Issue 1'],
  };

  const systemPatternsContent = {
    technicalDecisions: [
      {
        title: 'Test Decision',
        context: 'Test context',
        decision: 'Test decision details',
        consequences: ['Consequence 1', 'Consequence 2'],
      },
    ],
  };

  // Sample valid document JSON strings for each type
  const createValidJsonString = (
    documentType: DocumentType,
    content: Record<string, unknown>
  ): string => {
    return JSON.stringify({
      schema: SCHEMA_VERSION,
      metadata: {
        id: validId.value,
        title: validTitle,
        documentType,
        path: validPath.value,
        tags: validTags.map((t) => t.value),
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1,
      },
      content,
    });
  };

  describe('create', () => {
    it('should create a branch context document', () => {
      // Act
      const document = JsonDocument.create({
        id: validId,
        path: validPath,
        title: validTitle,
        documentType: 'branch_context',
        tags: validTags,
        content: branchContextContent,
      });

      // Assert
      expect(document).toBeInstanceOf(JsonDocument);
      expect(document.id).toBe(validId);
      expect(document.path).toBe(validPath);
      expect(document.title).toBe(validTitle);
      expect(document.documentType).toBe('branch_context');
      expect(document.tags).toHaveLength(validTags.length);
      expect(document.content).toEqual(branchContextContent);
      expect(document.version).toBe(1);
    });

    it('should create an active context document', () => {
      // Act
      const document = JsonDocument.create({
        id: validId,
        path: validPath,
        title: validTitle,
        documentType: 'active_context',
        tags: validTags,
        content: activeContextContent,
      });

      // Assert
      expect(document).toBeInstanceOf(JsonDocument);
      expect(document.documentType).toBe('active_context');
      expect(document.content).toEqual(activeContextContent);
    });

    it('should create a progress document', () => {
      // Act
      const document = JsonDocument.create({
        id: validId,
        path: validPath,
        title: validTitle,
        documentType: 'progress',
        tags: validTags,
        content: progressContent,
      });

      // Assert
      expect(document).toBeInstanceOf(JsonDocument);
      expect(document.documentType).toBe('progress');
      expect(document.content).toEqual(progressContent);
    });

    it('should create a system patterns document', () => {
      // Act
      const document = JsonDocument.create({
        id: validId,
        path: validPath,
        title: validTitle,
        documentType: 'system_patterns',
        tags: validTags,
        content: systemPatternsContent,
      });

      // Assert
      expect(document).toBeInstanceOf(JsonDocument);
      expect(document.documentType).toBe('system_patterns');
      expect(document.content).toEqual(systemPatternsContent);
    });

    it('should generate an ID if not provided', () => {
      // Act
      const document = JsonDocument.create({
        path: validPath,
        title: validTitle,
        documentType: 'generic',
        content: { key: 'value' },
      });

      // Assert
      expect(document.id).toBeInstanceOf(DocumentId);
      expect(document.id.value).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      );
    });

    it('should throw error when content is invalid for document type', () => {
      // Act & Assert
      expect(() =>
        JsonDocument.create({
          path: validPath,
          title: validTitle,
          documentType: 'branch_context',
          content: { invalidField: 'value' }, // Missing required "purpose" field
        })
      ).toThrow(DomainError);
    });
  });

  describe('fromString', () => {
    it('should create a document from valid JSON string', () => {
      // Arrange
      const jsonString = createValidJsonString('branch_context', branchContextContent);

      // Act
      const document = JsonDocument.fromString(jsonString, validPath);

      // Assert
      expect(document).toBeInstanceOf(JsonDocument);
      expect(document.id.value).toBe(validId.value);
      expect(document.documentType).toBe('branch_context');
    });

    it('should throw error for invalid JSON string', () => {
      // Act & Assert
      expect(() => JsonDocument.fromString('invalid json', validPath)).toThrow(DomainError);
    });

    it('should throw error for valid JSON that does not match schema', () => {
      // Arrange
      const invalidJson = JSON.stringify({
        not_valid_schema: true,
      });

      // Act & Assert
      expect(() => JsonDocument.fromString(invalidJson, validPath)).toThrow(DomainError);
    });
  });

  describe('fromObject', () => {
    it('should create a document from valid object', () => {
      // Arrange
      const jsonObject = JSON.parse(createValidJsonString('active_context', activeContextContent));

      // Act
      const document = JsonDocument.fromObject(jsonObject, validPath);

      // Assert
      expect(document).toBeInstanceOf(JsonDocument);
      expect(document.documentType).toBe('active_context');
    });

    it('should throw error for object that does not match schema', () => {
      // Arrange
      const invalidObject = {
        not_valid_schema: true,
      };

      // Act & Assert
      expect(() => JsonDocument.fromObject(invalidObject, validPath)).toThrow(DomainError);
    });
  });

  describe('modification methods', () => {
    let document: JsonDocument;

    beforeEach(() => {
      document = JsonDocument.create({
        id: validId,
        path: validPath,
        title: validTitle,
        documentType: 'branch_context',
        tags: validTags,
        content: branchContextContent,
      });
    });

    it('should update path', () => {
      // Arrange
      const newPath = DocumentPath.create('new/path.json');

      // Act
      const updatedDocument = document.updatePath(newPath);

      // Assert
      expect(updatedDocument.path).toEqual(newPath);
      expect(updatedDocument.version).toBe(document.version + 1);
      expect(updatedDocument.lastModified.getTime()).toBeGreaterThanOrEqual(
        document.lastModified.getTime()
      );
      // Original should be unchanged
      expect(document.path).toEqual(validPath);
    });

    it('should not create new instance if path is the same', () => {
      // Act
      const updatedDocument = document.updatePath(validPath);

      // Assert
      expect(updatedDocument).toBe(document);
    });

    it('should update title', () => {
      // Arrange
      const newTitle = 'New Title';

      // Act
      const updatedDocument = document.updateTitle(newTitle);

      // Assert
      expect(updatedDocument.title).toBe(newTitle);
      expect(updatedDocument.version).toBe(document.version + 1);
      // Original should be unchanged
      expect(document.title).toBe(validTitle);
    });

    it('should update content', () => {
      // Arrange
      const newContent = {
        purpose: 'Updated purpose',
        userStories: [{ description: 'Updated story', completed: true }],
      };

      // Act
      const updatedDocument = document.updateContent(newContent);

      // Assert
      expect(updatedDocument.content).toEqual(newContent);
      expect(updatedDocument.version).toBe(document.version + 1);
      // Original should be unchanged
      expect(document.content).toEqual(branchContextContent);
    });

    it('should throw when updating with invalid content', () => {
      // Arrange
      const invalidContent = {
        // Missing required "purpose" field
        userStories: [],
      };

      // Act & Assert
      expect(() => document.updateContent(invalidContent)).toThrow(DomainError);
    });

    it('should add tag', () => {
      // Arrange
      const newTag = Tag.create('new-tag');

      // Act
      const updatedDocument = document.addTag(newTag);

      // Assert
      expect(updatedDocument.tags).toHaveLength(document.tags.length + 1);
      expect(updatedDocument.hasTag(newTag)).toBe(true);
      // Original should be unchanged
      expect(document.hasTag(newTag)).toBe(false);
    });

    it('should not create new instance if tag already exists', () => {
      // Arrange
      const existingTag = validTags[0];

      // Act
      const updatedDocument = document.addTag(existingTag);

      // Assert
      expect(updatedDocument).toBe(document);
    });

    it('should remove tag', () => {
      // Arrange
      const tagToRemove = validTags[0];

      // Act
      const updatedDocument = document.removeTag(tagToRemove);

      // Assert
      expect(updatedDocument.tags).toHaveLength(document.tags.length - 1);
      expect(updatedDocument.hasTag(tagToRemove)).toBe(false);
      // Original should be unchanged
      expect(document.hasTag(tagToRemove)).toBe(true);
    });

    it('should not create new instance if tag does not exist', () => {
      // Arrange
      const nonExistentTag = Tag.create('non-existent');

      // Act
      const updatedDocument = document.removeTag(nonExistentTag);

      // Assert
      expect(updatedDocument).toBe(document);
    });

    it('should update tags', () => {
      // Arrange
      const newTags = [Tag.create('tag1'), Tag.create('tag2'), Tag.create('tag3')];

      // Act
      const updatedDocument = document.updateTags(newTags);

      // Assert
      expect(updatedDocument.tags).toHaveLength(newTags.length);
      newTags.forEach((tag) => {
        expect(updatedDocument.hasTag(tag)).toBe(true);
      });
      // Original should be unchanged
      expect(document.tags).toHaveLength(validTags.length);
    });
  });

  describe('serialization', () => {
    it('should serialize to object', () => {
      // Arrange
      const document = JsonDocument.create({
        id: validId,
        path: validPath,
        title: validTitle,
        documentType: 'branch_context',
        tags: validTags,
        content: branchContextContent,
      });

      // Act
      const obj = document.toObject();

      // Assert
      expect(obj.schema).toBe(SCHEMA_VERSION);
      expect(obj.metadata.id).toBe(validId.value);
      expect(obj.metadata.title).toBe(validTitle);
      expect(obj.metadata.path).toBe(validPath.value);
      expect(obj.metadata.tags).toEqual(validTags.map((t) => t.value));
      expect(obj.content).toEqual(branchContextContent);
    });

    it('should serialize to JSON string', () => {
      // Arrange
      const document = JsonDocument.create({
        id: validId,
        path: validPath,
        title: validTitle,
        documentType: 'branch_context',
        tags: validTags,
        content: branchContextContent,
      });

      // Act
      const jsonString = document.toString();
      const parsed = JSON.parse(jsonString);

      // Assert
      expect(parsed.schema).toBe(SCHEMA_VERSION);
      expect(parsed.metadata.id).toBe(validId.value);
      expect(parsed.content).toEqual(branchContextContent);
    });

    it('should serialize to pretty-printed JSON string', () => {
      // Arrange
      const document = JsonDocument.create({
        id: validId,
        path: validPath,
        title: validTitle,
        documentType: 'branch_context',
        tags: validTags,
        content: branchContextContent,
      });

      // Act
      const jsonString = document.toString(true);

      // Assert
      expect(jsonString).toContain('\n  '); // Check for indentation
    });
  });

  describe('equality', () => {
    it('should consider documents with same ID equal', () => {
      // Arrange
      const document1 = JsonDocument.create({
        id: validId,
        path: validPath,
        title: validTitle,
        documentType: 'branch_context',
        content: branchContextContent,
      });

      const document2 = JsonDocument.create({
        id: validId,
        path: DocumentPath.create('different/path.json'),
        title: 'Different Title',
        documentType: 'branch_context',
        content: {
          purpose: 'Different purpose',
          userStories: [],
        },
      });

      // Act & Assert
      expect(document1.equals(document2)).toBe(true);
    });

    it('should consider documents with different IDs not equal', () => {
      // Arrange
      const document1 = JsonDocument.create({
        id: validId,
        path: validPath,
        title: validTitle,
        documentType: 'branch_context',
        content: branchContextContent,
      });

      const document2 = JsonDocument.create({
        id: DocumentId.generate(), // Different ID
        path: validPath,
        title: validTitle,
        documentType: 'branch_context',
        content: branchContextContent,
      });

      // Act & Assert
      expect(document1.equals(document2)).toBe(false);
    });
  });
});
