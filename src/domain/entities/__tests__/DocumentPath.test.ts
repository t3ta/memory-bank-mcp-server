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

  describe('basename', () => {
    it('should return filename without extension', () => {
      // Arrange
      const path = DocumentPath.create('test/file.md');

      // Act
      const basename = path.basename;

      // Assert
      expect(basename).toBe('file');
    });

    it('should return filename for files without extension', () => {
      // Arrange
      const path = DocumentPath.create('test/file');

      // Act
      const basename = path.basename;

      // Assert
      expect(basename).toBe('file');
    });

    it('should return correct basename for filenames with multiple dots', () => {
      // Arrange
      const path = DocumentPath.create('test/file.config.json');

      // Act
      const basename = path.basename;

      // Assert
      expect(basename).toBe('file.config');
    });
  });

  describe('inferDocumentType', () => {
    it('should infer branch_context type', () => {
      // Arrange
      const paths = [
        DocumentPath.create('branchContext.md'),
        DocumentPath.create('branch-context.json'),
        DocumentPath.create('test/branchcontext.md')
      ];

      // Act & Assert
      paths.forEach(path => {
        expect(path.inferDocumentType()).toBe('branch_context');
      });
    });

    it('should infer active_context type', () => {
      // Arrange
      const paths = [
        DocumentPath.create('activeContext.md'),
        DocumentPath.create('active-context.json'),
        DocumentPath.create('test/activecontext.md')
      ];

      // Act & Assert
      paths.forEach(path => {
        expect(path.inferDocumentType()).toBe('active_context');
      });
    });

    it('should infer progress type', () => {
      // Arrange
      const paths = [
        DocumentPath.create('progress.md'),
        DocumentPath.create('test/progress.json')
      ];

      // Act & Assert
      paths.forEach(path => {
        expect(path.inferDocumentType()).toBe('progress');
      });
    });

    it('should infer system_patterns type', () => {
      // Arrange
      const paths = [
        DocumentPath.create('systemPatterns.md'),
        DocumentPath.create('system-patterns.json'),
        DocumentPath.create('test/systempatterns.md')
      ];

      // Act & Assert
      paths.forEach(path => {
        expect(path.inferDocumentType()).toBe('system_patterns');
      });
    });

    it('should default to generic type', () => {
      // Arrange
      const paths = [
        DocumentPath.create('unknown.md'),
        DocumentPath.create('test/random.json'),
        DocumentPath.create('notes.txt')
      ];

      // Act & Assert
      paths.forEach(path => {
        expect(path.inferDocumentType()).toBe('generic');
      });
    });
  });

  describe('withExtension', () => {
    it('should create a new path with different extension', () => {
      // Arrange
      const path = DocumentPath.create('test/file.md');

      // Act
      const newPath = path.withExtension('json');

      // Assert
      expect(newPath.value).toBe('test/file.json');
      expect(newPath.extension).toBe('json');
      // Original should be unchanged
      expect(path.extension).toBe('md');
    });

    it('should work with paths without extension', () => {
      // Arrange
      const path = DocumentPath.create('test/file');

      // Act
      const newPath = path.withExtension('md');

      // Assert
      expect(newPath.value).toBe('test/file.md');
    });

    it('should throw error for empty extension', () => {
      // Arrange
      const path = DocumentPath.create('test/file.md');

      // Act & Assert
      expect(() => path.withExtension('')).toThrow(DomainError);
      expect(() => path.withExtension('')).toThrow('Extension cannot be empty');
    });
  });

  describe('toAlternateFormat', () => {
    it('should convert markdown to JSON', () => {
      // Arrange
      const path = DocumentPath.create('test/file.md');

      // Act
      const jsonPath = path.toAlternateFormat();

      // Assert
      expect(jsonPath.value).toBe('test/file.json');
      expect(jsonPath.isJSON).toBe(true);
    });

    it('should convert JSON to markdown', () => {
      // Arrange
      const path = DocumentPath.create('test/file.json');

      // Act
      const mdPath = path.toAlternateFormat();

      // Assert
      expect(mdPath.value).toBe('test/file.md');
      expect(mdPath.isMarkdown).toBe(true);
    });

    it('should return the same path for other formats', () => {
      // Arrange
      const path = DocumentPath.create('test/file.txt');

      // Act
      const result = path.toAlternateFormat();

      // Assert
      expect(result).toBe(path);
      expect(result.value).toBe('test/file.txt');
    });
  });
});
