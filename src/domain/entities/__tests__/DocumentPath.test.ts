import { DocumentPath } from '../DocumentPath.js';
import { DomainError, DomainErrorCodes } from '../../../shared/errors/DomainError.js';

describe('DocumentPath', () => {
  describe('create', () => {
    it('should create a valid document path', () => {
      // Arrange & Act
      const path = DocumentPath.create('test/file.md');

      // Assert
      expect(path).toBeDefined();
      expect(path.value).toBe('test/file.md');
    });

    it('should normalize backslashes to forward slashes', () => {
      // Arrange & Act
      const path = DocumentPath.create('test\\file.md');

      // Assert
      expect(path.value).toBe('test/file.md');
    });

    it('should throw an error for empty path', () => {
      // Arrange & Act & Assert
      expect(() => DocumentPath.create('')).toThrow(DomainError);
      expect(() => DocumentPath.create('')).toThrow('Document path cannot be empty');
    });

    it('should throw an error for path containing ..', () => {
      // Arrange & Act & Assert
      expect(() => DocumentPath.create('test/../file.md')).toThrow(DomainError);
      expect(() => DocumentPath.create('test/../file.md')).toThrow(
        'Document path cannot contain ".."'
      );
    });

    it('should throw an error for absolute path starting with /', () => {
      // Arrange & Act & Assert
      expect(() => DocumentPath.create('/test/file.md')).toThrow(DomainError);
      expect(() => DocumentPath.create('/test/file.md')).toThrow(
        'Document path cannot be absolute'
      );
    });

    it('should throw an error for absolute path with drive letter', () => {
      // Arrange & Act & Assert
      expect(() => DocumentPath.create('C:/test/file.md')).toThrow(DomainError);
      expect(() => DocumentPath.create('C:/test/file.md')).toThrow(
        'Document path cannot be absolute'
      );
    });

    it('should throw DomainError with correct error code', () => {
      // Arrange & Act & Assert
      try {
        DocumentPath.create('');
        // If we get here, it means the expected error wasn't thrown
        expect('No error was thrown').toBe('Error should have been thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(DomainError);
        expect((error as DomainError).code).toBe(
          `DOMAIN_ERROR.${DomainErrorCodes.INVALID_DOCUMENT_PATH}`
        );
      }
    });
  });

  describe('directory', () => {
    it('should return directory part of the path', () => {
      // Arrange
      const path = DocumentPath.create('test/nested/file.md');

      // Act
      const directory = path.directory;

      // Assert
      expect(directory).toBe('test/nested');
    });

    it('should return empty string for path without directory', () => {
      // Arrange
      const path = DocumentPath.create('file.md');

      // Act
      const directory = path.directory;

      // Assert
      expect(directory).toBe('');
    });
  });

  describe('filename', () => {
    it('should return filename part of the path', () => {
      // Arrange
      const path = DocumentPath.create('test/nested/file.md');

      // Act
      const filename = path.filename;

      // Assert
      expect(filename).toBe('file.md');
    });

    it('should return the whole path for path without directory', () => {
      // Arrange
      const path = DocumentPath.create('file.md');

      // Act
      const filename = path.filename;

      // Assert
      expect(filename).toBe('file.md');
    });
  });

  describe('extension', () => {
    it('should return extension part of the path', () => {
      // Arrange
      const path = DocumentPath.create('test/file.md');

      // Act
      const extension = path.extension;

      // Assert
      expect(extension).toBe('md');
    });

    it('should return empty string for path without extension', () => {
      // Arrange
      const path = DocumentPath.create('test/file');

      // Act
      const extension = path.extension;

      // Assert
      expect(extension).toBe('');
    });

    it('should return extension for filename with multiple dots', () => {
      // Arrange
      const path = DocumentPath.create('test/file.config.json');

      // Act
      const extension = path.extension;

      // Assert
      expect(extension).toBe('json');
    });
  });

  describe('isMarkdown', () => {
    it('should return true for md files', () => {
      // Arrange
      const path = DocumentPath.create('test/file.md');

      // Act
      const isMarkdown = path.isMarkdown;

      // Assert
      expect(isMarkdown).toBe(true);
    });

    it('should return false for non-md files', () => {
      // Arrange
      const path = DocumentPath.create('test/file.txt');

      // Act
      const isMarkdown = path.isMarkdown;

      // Assert
      expect(isMarkdown).toBe(false);
    });

    it('should return false for files without extension', () => {
      // Arrange
      const path = DocumentPath.create('test/file');

      // Act
      const isMarkdown = path.isMarkdown;

      // Assert
      expect(isMarkdown).toBe(false);
    });

    it('should be case insensitive', () => {
      // Arrange
      const path = DocumentPath.create('test/file.MD');

      // Act
      const isMarkdown = path.isMarkdown;

      // Assert
      expect(isMarkdown).toBe(true);
    });
  });

  describe('isJSON', () => {
    it('should return true for json files', () => {
      // Arrange
      const path = DocumentPath.create('test/file.json');

      // Act
      const isJSON = path.isJSON;

      // Assert
      expect(isJSON).toBe(true);
    });

    it('should return false for non-json files', () => {
      // Arrange
      const path = DocumentPath.create('test/file.md');

      // Act
      const isJSON = path.isJSON;

      // Assert
      expect(isJSON).toBe(false);
    });

    it('should return false for files without extension', () => {
      // Arrange
      const path = DocumentPath.create('test/file');

      // Act
      const isJSON = path.isJSON;

      // Assert
      expect(isJSON).toBe(false);
    });

    it('should be case insensitive', () => {
      // Arrange
      const path = DocumentPath.create('test/file.JSON');

      // Act
      const isJSON = path.isJSON;

      // Assert
      expect(isJSON).toBe(true);
    });
  });

  describe('equals', () => {
    it('should return true for paths with same value', () => {
      // Arrange
      const path1 = DocumentPath.create('test/file.md');
      const path2 = DocumentPath.create('test/file.md');

      // Act
      const result = path1.equals(path2);

      // Assert
      expect(result).toBe(true);
    });

    it('should return false for paths with different values', () => {
      // Arrange
      const path1 = DocumentPath.create('test/file1.md');
      const path2 = DocumentPath.create('test/file2.md');

      // Act
      const result = path1.equals(path2);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('toString', () => {
    it('should return path value as string', () => {
      // Arrange
      const path = DocumentPath.create('test/file.md');

      // Act
      const result = path.toString();

      // Assert
      expect(result).toBe('test/file.md');
    });
  });
});
