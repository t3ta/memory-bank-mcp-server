import { MemoryDocument } from '../../../../src/domain/entities/MemoryDocument.js';
import { DocumentPath } from '../../../../src/domain/entities/DocumentPath.js';
import { Tag } from '../../../../src/domain/entities/Tag.js';
import { BaseJsonDocument } from '../../../../src/schemas/json-document.js';

describe('MemoryDocument', () => {
  // Test fixtures
  const createValidDocumentProps = () => {
    return {
      path: DocumentPath.create('test/document.md'),
      content: '# Test Document\n\nThis is a test document.',
      tags: [Tag.create('test'), Tag.create('document')],
      lastModified: new Date('2023-01-01T00:00:00.000Z'),
    };
  };

  describe('create', () => {
    it('should create a valid document', () => {
      // Arrange
      const props = createValidDocumentProps();

      // Act
      const document = MemoryDocument.create(props);

      // Assert
      expect(document).toBeDefined();
      expect(document.path).toBe(props.path);
      expect(document.content).toBe(props.content);
      expect(document.tags).toHaveLength(props.tags.length);
      expect(document.lastModified.getTime()).toBe(props.lastModified.getTime());
    });

    it('should create a defensive copy of props', () => {
      // Arrange
      const props = createValidDocumentProps();
      const originalTags = [...props.tags];

      // Act
      const document = MemoryDocument.create(props);
      props.tags.push(Tag.create('modified'));
      props.lastModified = new Date('2025-01-01');

      // Assert
      expect(document.tags).toHaveLength(originalTags.length);
      expect(document.lastModified.getTime()).toBe(new Date('2023-01-01T00:00:00.000Z').getTime());
    });
  });

  describe('getters', () => {
    it('should return path', () => {
      // Arrange
      const props = createValidDocumentProps();
      const document = MemoryDocument.create(props);

      // Act
      const path = document.path;

      // Assert
      expect(path).toBe(props.path);
    });

    it('should return content', () => {
      // Arrange
      const props = createValidDocumentProps();
      const document = MemoryDocument.create(props);

      // Act
      const content = document.content;

      // Assert
      expect(content).toBe(props.content);
    });

    it('should return tags (copy)', () => {
      // Arrange
      const props = createValidDocumentProps();
      const document = MemoryDocument.create(props);

      // Act
      const tags = document.tags;

      // Assert
      expect(tags).toEqual(props.tags);
      expect(tags).not.toBe(props.tags); // Should be a different array instance
    });

    it('should return lastModified (copy)', () => {
      // Arrange
      const props = createValidDocumentProps();
      const document = MemoryDocument.create(props);

      // Act
      const lastModified = document.lastModified;

      // Assert
      expect(lastModified.getTime()).toBe(props.lastModified.getTime());
      expect(lastModified).not.toBe(props.lastModified); // Should be a different Date instance
    });
  });

  describe('hasTag', () => {
    it('should return true if document has the tag', () => {
      // Arrange
      const props = createValidDocumentProps();
      const document = MemoryDocument.create(props);

      // Act
      const result = document.hasTag(Tag.create('test'));

      // Assert
      expect(result).toBe(true);
    });

    it('should return false if document does not have the tag', () => {
      // Arrange
      const props = createValidDocumentProps();
      const document = MemoryDocument.create(props);

      // Act
      const result = document.hasTag(Tag.create('missing'));

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('updateContent', () => {
    it('should return a new document with updated content', () => {
      // Arrange
      const props = createValidDocumentProps();
      const document = MemoryDocument.create(props);
      const newContent = '# Updated Document\n\nThis is an updated document.';

      // Act
      const updatedDocument = document.updateContent(newContent);

      // Assert
      expect(updatedDocument).not.toBe(document); // Should be a new instance
      expect(updatedDocument.content).toBe(newContent);
      expect(updatedDocument.path).toBe(document.path);
      expect(updatedDocument.tags).toEqual(document.tags);
      expect(updatedDocument.lastModified.getTime()).toBeGreaterThan(
        document.lastModified.getTime()
      );
    });

    it('should return the same document if content is unchanged', () => {
      // Arrange
      const props = createValidDocumentProps();
      const document = MemoryDocument.create(props);

      // Act
      const updatedDocument = document.updateContent(props.content);

      // Assert
      expect(updatedDocument).toBe(document); // Should be the same instance
    });
  });

  describe('addTag', () => {
    it('should return a new document with added tag', () => {
      // Arrange
      const props = createValidDocumentProps();
      const document = MemoryDocument.create(props);
      const newTag = Tag.create('newtag');

      // Act
      const updatedDocument = document.addTag(newTag);

      // Assert
      expect(updatedDocument).not.toBe(document); // Should be a new instance
      expect(updatedDocument.tags).toHaveLength(document.tags.length + 1);
      expect(updatedDocument.hasTag(newTag)).toBe(true);
      expect(updatedDocument.path).toBe(document.path);
      expect(updatedDocument.content).toBe(document.content);
      expect(updatedDocument.lastModified.getTime()).toBeGreaterThan(
        document.lastModified.getTime()
      );
    });

    it('should return the same document if tag already exists', () => {
      // Arrange
      const props = createValidDocumentProps();
      const document = MemoryDocument.create(props);
      const existingTag = Tag.create('test');

      // Act
      const updatedDocument = document.addTag(existingTag);

      // Assert
      expect(updatedDocument).toBe(document); // Should be the same instance
    });
  });

  describe('removeTag', () => {
    it('should return a new document with removed tag', () => {
      // Arrange
      const props = createValidDocumentProps();
      const document = MemoryDocument.create(props);
      const tagToRemove = Tag.create('test');

      // Act
      const updatedDocument = document.removeTag(tagToRemove);

      // Assert
      expect(updatedDocument).not.toBe(document); // Should be a new instance
      expect(updatedDocument.tags).toHaveLength(document.tags.length - 1);
      expect(updatedDocument.hasTag(tagToRemove)).toBe(false);
      expect(updatedDocument.path).toBe(document.path);
      expect(updatedDocument.content).toBe(document.content);
      expect(updatedDocument.lastModified.getTime()).toBeGreaterThan(
        document.lastModified.getTime()
      );
    });

    it('should return the same document if tag does not exist', () => {
      // Arrange
      const props = createValidDocumentProps();
      const document = MemoryDocument.create(props);
      const nonExistingTag = Tag.create('nonexistent');

      // Act
      const updatedDocument = document.removeTag(nonExistingTag);

      // Assert
      expect(updatedDocument).toBe(document); // Should be the same instance
    });
  });

  describe('updateTags', () => {
    it('should return a new document with updated tags', () => {
      // Arrange
      const props = createValidDocumentProps();
      const document = MemoryDocument.create(props);
      const newTags = [Tag.create('new'), Tag.create('tags')];

      // Act
      const updatedDocument = document.updateTags(newTags);

      // Assert
      expect(updatedDocument).not.toBe(document); // Should be a new instance
      expect(updatedDocument.tags).toHaveLength(newTags.length);
      expect(updatedDocument.hasTag(newTags[0])).toBe(true);
      expect(updatedDocument.hasTag(newTags[1])).toBe(true);
      expect(updatedDocument.path).toBe(document.path);
      expect(updatedDocument.content).toBe(document.content);
      expect(updatedDocument.lastModified.getTime()).toBeGreaterThan(
        document.lastModified.getTime()
      );
    });
  });

  describe('title', () => {
    it('should return title from content with # prefix', () => {
      // Arrange
      const props = createValidDocumentProps();
      const document = MemoryDocument.create(props);

      // Act
      const title = document.title;

      // Assert
      expect(title).toBe('Test Document');
    });

    it('should return undefined if no title found', () => {
      // Arrange
      const props = createValidDocumentProps();
      props.content = 'This is a document without a title.';
      const document = MemoryDocument.create(props);

      // Act
      const title = document.title;

      // Assert
      expect(title).toBeUndefined();
    });

    it('should handle title with extra spaces', () => {
      // Arrange
      const props = createValidDocumentProps();
      props.content = '#   Extra Spaced Title  \n\nContent';
      const document = MemoryDocument.create(props);

      // Act
      const title = document.title;

      // Assert
      expect(title).toBe('Extra Spaced Title');
    });
  });

  describe('isMarkdown', () => {
    it('should return true for md files', () => {
      // Arrange
      const props = createValidDocumentProps();
      const document = MemoryDocument.create(props);

      // Act
      const isMarkdown = document.isMarkdown;

      // Assert
      expect(isMarkdown).toBe(true);
    });

    it('should return false for non-md files', () => {
      // Arrange
      const props = createValidDocumentProps();
      props.path = DocumentPath.create('test/document.txt');
      const document = MemoryDocument.create(props);

      // Act
      const isMarkdown = document.isMarkdown;

      // Assert
      expect(isMarkdown).toBe(false);
    });
  });

  describe('isJSON', () => {
    it('should return true for json files', () => {
      // Arrange
      const props = createValidDocumentProps();
      props.path = DocumentPath.create('test/document.json');
      const document = MemoryDocument.create(props);

      // Act
      const isJSON = document.isJSON;

      // Assert
      expect(isJSON).toBe(true);
    });

    it('should return false for non-json files', () => {
      // Arrange
      const props = createValidDocumentProps();
      const document = MemoryDocument.create(props);

      // Act
      const isJSON = document.isJSON;

      // Assert
      expect(isJSON).toBe(false);
    });
  });

  describe('toObject', () => {
    it('should convert document to plain object', () => {
      // Arrange
      const props = createValidDocumentProps();
      const document = MemoryDocument.create(props);

      // Act
      const obj = document.toObject();

      // Assert
      expect(obj).toEqual({
        path: props.path.value,
        content: props.content,
        tags: props.tags.map((tag) => tag.value),
        lastModified: props.lastModified.toISOString(),
      });
    });
  });

  describe('toJSON', () => {
    it('should convert markdown document to JSON format', () => {
      // Arrange
      const props = createValidDocumentProps();
      const document = MemoryDocument.create(props);

      // Act
      const jsonDoc = document.toJSON();

      // Assert
      expect(jsonDoc).toBeDefined();
      expect(jsonDoc.schema).toBe('memory_document_v1');
      expect(jsonDoc.metadata).toBeDefined();
      expect(jsonDoc.metadata.title).toBe('Test Document');
      expect(jsonDoc.metadata.path).toBe(props.path.value);
      expect(jsonDoc.metadata.tags).toEqual(props.tags.map((tag) => tag.value));
      expect(jsonDoc.content).toBeDefined();
    });

    it('should detect document type based on path filename', () => {
      // Arrange
      const props = createValidDocumentProps();
      props.path = DocumentPath.create('test/branchContext.md');
      const document = MemoryDocument.create(props);

      // Act
      const jsonDoc = document.toJSON();

      // Assert
      expect(jsonDoc.metadata.documentType).toBe('branch_context');
    });

    it('should use generic document type for unknown document types', () => {
      // Arrange
      const props = createValidDocumentProps();
      props.path = DocumentPath.create('test/unknown-document.md');
      const document = MemoryDocument.create(props);

      // Act
      const jsonDoc = document.toJSON();

      // Assert
      expect(jsonDoc.metadata.documentType).toBe('generic');
    });

    it('should parse existing JSON document', () => {
      // Arrange
      const props = createValidDocumentProps();
      props.path = DocumentPath.create('test/document.json');
      props.content = JSON.stringify({
        schema: 'memory_document_v1',
        metadata: {
          title: 'JSON Document',
          documentType: 'active_context',
          path: 'test/document.json',
          tags: ['json', 'test'],
          lastModified: '2023-01-01T00:00:00.000Z',
        },
        content: {
          currentWork: 'Working on tests',
          recentChanges: ['Added JSON support'],
          activeDecisions: ['Use JSON as primary format'],
          considerations: ['Performance implications'],
          nextSteps: ['Implement more tests'],
        },
      });
      const document = MemoryDocument.create(props);

      // Act
      const jsonDoc = document.toJSON();

      // Assert
      expect(jsonDoc).toBeDefined();
      expect(jsonDoc.schema).toBe('memory_document_v1');
      expect(jsonDoc.metadata.title).toBe('JSON Document');
      expect(jsonDoc.metadata.documentType).toBe('active_context');
      expect(jsonDoc.content.currentWork).toBe('Working on tests');
    });
  });

  describe('fromJSON', () => {
    it('should create MemoryDocument from JSON', () => {
      // Arrange
      const documentContent = {
        currentWork: 'Working on tests',
        recentChanges: ['Added JSON support'],
        activeDecisions: ['Use JSON as primary format'],
        considerations: ['Performance implications'],
        nextSteps: ['Implement more tests'],
      };
      const jsonDoc: BaseJsonDocument = {
        schema: 'memory_document_v1',
        metadata: {
          title: 'JSON Document',
          documentType: 'active_context',
          path: 'test/document.json',
          tags: ['json', 'test'],
          lastModified: new Date('2023-01-01T00:00:00.000Z'),
        },
        content: documentContent,
      };
      const path = DocumentPath.create('test/document.json');

      // Act
      const document = MemoryDocument.fromJSON(jsonDoc, path);

      // Assert
      expect(document).toBeDefined();
      expect(document.path).toBe(path);
      expect(document.tags).toHaveLength(2);
      expect(document.tags[0].value).toBe('json');
      expect(document.tags[1].value).toBe('test');
      expect(document.lastModified.toISOString()).toBe('2023-01-01T00:00:00.000Z');
      const parsedContent = JSON.parse(document.content);
      expect(parsedContent.content).toEqual(documentContent);
      expect(parsedContent.schema).toBe('memory_document_v1');
      expect(parsedContent.metadata.title).toBe('JSON Document');
    });

    it('should create MemoryDocument from branch context JSON', () => {
      // Arrange
      const documentContent = {
        purpose: 'Test purpose',
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        userStories: [
          { description: 'Story 1', completed: false },
          { description: 'Story 2', completed: true },
        ],
      };
      const jsonDoc: BaseJsonDocument = {
        schema: 'memory_document_v1',
        metadata: {
          title: 'Branch Context',
          documentType: 'branch_context',
          path: 'test/branchContext.json',
          tags: ['branch', 'context'],
          lastModified: new Date('2023-01-01T00:00:00.000Z'),
        },
        content: documentContent,
      };
      const path = DocumentPath.create('test/branchContext.json');

      // Act
      const document = MemoryDocument.fromJSON(jsonDoc, path);

      // Assert
      expect(document).toBeDefined();
      const parsedContent = JSON.parse(document.content);
      expect(parsedContent.schema).toBe('memory_document_v1');
      expect(parsedContent.metadata.title).toBe('Branch Context');
      expect(parsedContent.content).toEqual({
        ...documentContent,
        createdAt: documentContent.createdAt.toISOString(),
      });
    });
  });
});
