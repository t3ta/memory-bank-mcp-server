import { MemoryDocument } from '../MemoryDocument.js';
import { DocumentPath } from '../DocumentPath.js';
import { Tag } from '../Tag.js';

describe('MemoryDocument', () => {
  // Test fixtures
  const createValidDocumentProps = () => {
    return {
      path: DocumentPath.create('test/document.md'),
      content: '# Test Document\n\nThis is a test document.',
      tags: [Tag.create('test'), Tag.create('document')],
      lastModified: new Date('2023-01-01T00:00:00.000Z')
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
      expect(updatedDocument.lastModified.getTime()).toBeGreaterThan(document.lastModified.getTime());
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
      expect(updatedDocument.lastModified.getTime()).toBeGreaterThan(document.lastModified.getTime());
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
      expect(updatedDocument.lastModified.getTime()).toBeGreaterThan(document.lastModified.getTime());
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
      expect(updatedDocument.lastModified.getTime()).toBeGreaterThan(document.lastModified.getTime());
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
        tags: props.tags.map(tag => tag.value),
        lastModified: props.lastModified.toISOString()
      });
    });
  });
});
