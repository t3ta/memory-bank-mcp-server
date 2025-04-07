import { DocumentPath } from '../../../../src/domain/entities/DocumentPath.js'; // .js 追加
import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError.js'; // .js 追加

describe('DocumentPath Unit Tests', () => {
  describe('create', () => {
    it('should create an instance with a valid path string', () => {
      const validPath = 'core/document.json';
      const docPath = DocumentPath.create(validPath);
      expect(docPath).toBeInstanceOf(DocumentPath);
      expect(docPath.value).toBe(validPath);
    });

    it('should throw an error for an empty path string', () => {
      // Compare code and message instead of the whole error object
      const expectedError = new DomainError(DomainErrorCodes.INVALID_DOCUMENT_PATH, 'Document path cannot be empty');
      expect(() => DocumentPath.create('')).toThrow(
          expect.objectContaining({ code: expectedError.code, message: expectedError.message })
      );
    });

    // Enable invalid character check test and match the actual error message
    it('should throw an error for path strings containing invalid characters (*, ?, <, >, |, :)', () => {
      const invalidChars = ['*', '?', '<', '>', '|', ':'];
      for (const char of invalidChars) {
        const invalidPath = `core/docu${char}ment.json`;
        // Compare code and message instead of the whole error object
        const expectedError = new DomainError(
            DomainErrorCodes.INVALID_DOCUMENT_PATH,
            'Document path contains invalid characters (<, >, :, ", |, ?, *)'
        );
        expect(() => DocumentPath.create(invalidPath)).toThrow(
            expect.objectContaining({ code: expectedError.code, message: expectedError.message })
        );
      }
      // Also check for double quotes "
       // Compare code and message instead of the whole error object
       const expectedErrorDoubleQuote = new DomainError(
           DomainErrorCodes.INVALID_DOCUMENT_PATH,
           'Document path contains invalid characters (<, >, :, ", |, ?, *)'
       );
       expect(() => DocumentPath.create('core/"doc".json')).toThrow(
           expect.objectContaining({ code: expectedErrorDoubleQuote.code, message: expectedErrorDoubleQuote.message })
       );
    });

     // Enable path separator check test and match the actual error message
     it('should throw an error for path strings containing backslashes', () => {
      const invalidPath = 'core\\document.json';
       // エラーオブジェクト全体ではなく、code と message で比較
       const expectedErrorBackslash = new DomainError(
           DomainErrorCodes.INVALID_DOCUMENT_PATH,
           'Document path cannot contain backslashes (\\). Use forward slashes (/) instead.'
       );
       expect(() => DocumentPath.create(invalidPath)).toThrow(
           expect.objectContaining({ code: expectedErrorBackslash.code, message: expectedErrorBackslash.message })
       );
     });

     it('should throw an error if the path starts with a slash', () => {
       const invalidPath = '/core/document.json';
       // Compare code and message instead of the whole error object
       const expectedErrorAbsolute = new DomainError(DomainErrorCodes.INVALID_DOCUMENT_PATH, 'Document path cannot be absolute');
       expect(() => DocumentPath.create(invalidPath)).toThrow(
           expect.objectContaining({ code: expectedErrorAbsolute.code, message: expectedErrorAbsolute.message })
       );
     });

     // Enable trailing slash check test and match the actual error message
     it('should throw an error if the path ends with a slash', () => {
       const invalidPath = 'core/document.json/';
       // Compare code and message instead of the whole error object
       const expectedErrorTrailingSlash = new DomainError(
           DomainErrorCodes.INVALID_DOCUMENT_PATH,
           'Document path cannot end with a slash'
       );
       expect(() => DocumentPath.create(invalidPath)).toThrow(
           expect.objectContaining({ code: expectedErrorTrailingSlash.code, message: expectedErrorTrailingSlash.message })
       );
     });
  });

  describe('getters', () => {
    const path = 'dir1/dir2/file.ext';
    const docPath = DocumentPath.create(path);

    it('should return the correct directory name for the directory property', () => {
      expect(docPath.directory).toBe('dir1/dir2');
    });

    it('should return the correct filename for the filename property', () => {
      expect(docPath.filename).toBe('file.ext');
    });

    it('should return the correct extension for the extension property', () => {
      expect(docPath.extension).toBe('ext'); // Expect extension without the dot
    });

    it('should return the correct basename for the basename property', () => {
      expect(docPath.basename).toBe('file');
    });

     it('should return an empty string for directory when there is no directory', () => {
       const rootPath = DocumentPath.create('file.ext');
       expect(rootPath.directory).toBe('');
     });

     it('should return an empty string for extension when there is no extension', () => {
       const noExtPath = DocumentPath.create('dir/file');
       expect(noExtPath.extension).toBe('');
       expect(noExtPath.basename).toBe('file');
     });
  });

  describe('inferDocumentType', () => {
    it('should infer the correct document type based on the filename', () => {
      expect(DocumentPath.create('branchContext.json').inferDocumentType()).toBe('branch_context');
      expect(DocumentPath.create('feature/branch-context.json').inferDocumentType()).toBe('branch_context');
      expect(DocumentPath.create('activeContext.json').inferDocumentType()).toBe('active_context');
      expect(DocumentPath.create('data/active-context.json').inferDocumentType()).toBe('active_context');
      expect(DocumentPath.create('progress.json').inferDocumentType()).toBe('progress');
      expect(DocumentPath.create('logs/progress-report.json').inferDocumentType()).toBe('progress');
      expect(DocumentPath.create('systemPatterns.json').inferDocumentType()).toBe('system_patterns');
      expect(DocumentPath.create('design/system-patterns-v2.json').inferDocumentType()).toBe('system_patterns');
      expect(DocumentPath.create('generic-doc.json').inferDocumentType()).toBe('generic');
      expect(DocumentPath.create('other/file.txt').inferDocumentType()).toBe('generic');
      expect(DocumentPath.create('no-extension').inferDocumentType()).toBe('generic');
    });

    it('should infer type case-insensitively', () => {
      expect(DocumentPath.create('BRANCHCONTEXT.JSON').inferDocumentType()).toBe('branch_context');
      expect(DocumentPath.create('Active-Context.json').inferDocumentType()).toBe('active_context');
    });
  });

  describe('withExtension', () => {
    const docPath = DocumentPath.create('dir/file.txt');

    it('should create a new DocumentPath instance with the specified extension', () => {
      const newPath = docPath.withExtension('json');
      expect(newPath).toBeInstanceOf(DocumentPath);
      expect(newPath.value).toBe('dir/file.json');
      expect(newPath.extension).toBe('json');
      expect(newPath).not.toBe(docPath);
    });

    it('should work correctly for paths without an extension', () => {
      const noExtPath = DocumentPath.create('dir/anotherfile');
      const newPath = noExtPath.withExtension('md');
      expect(newPath.value).toBe('dir/anotherfile.md');
      expect(newPath.extension).toBe('md');
    });

     it('should work correctly for root-level paths', () => {
      const rootPath = DocumentPath.create('rootfile.log');
      const newPath = rootPath.withExtension('txt');
      expect(newPath.value).toBe('rootfile.txt');
      expect(newPath.extension).toBe('txt');
    });

    it('should throw an error if an empty extension is provided', () => {
      // エラーオブジェクト全体ではなく、code と message で比較
      const expectedErrorEmptyExt = new DomainError(DomainErrorCodes.INVALID_DOCUMENT_PATH, 'Extension cannot be empty');
      expect(() => docPath.withExtension('')).toThrow(
          expect.objectContaining({ code: expectedErrorEmptyExt.code, message: expectedErrorEmptyExt.message })
      );
    });

     it('should use the extension as is, even if it contains dots', () => {
       // Based on current implementation, it seems dots are allowed.
       const newPath = docPath.withExtension('tar.gz');
       expect(newPath.value).toBe('dir/file.tar.gz');
       expect(newPath.extension).toBe('gz'); // extension getter returns only the part after the last dot.
     });
  });

  describe('toAlternateFormat', () => {
    it('should convert .md path to .json path', () => {
      const mdPath = DocumentPath.create('docs/guide.md');
      const jsonPath = mdPath.toAlternateFormat();
      expect(jsonPath).toBeInstanceOf(DocumentPath);
      expect(jsonPath.value).toBe('docs/guide.json');
      expect(jsonPath).not.toBe(mdPath);
    });

    it('should convert .json path to .md path', () => {
      const jsonPath = DocumentPath.create('data/config.json');
      const mdPath = jsonPath.toAlternateFormat();
      expect(mdPath).toBeInstanceOf(DocumentPath);
      expect(mdPath.value).toBe('data/config.md');
      expect(mdPath).not.toBe(jsonPath);
    });

    it('should convert correctly regardless of extension case', () => {
      const mdPathUpper = DocumentPath.create('README.MD');
      const jsonPath = mdPathUpper.toAlternateFormat();
      expect(jsonPath.value).toBe('README.json');

      const jsonPathUpper = DocumentPath.create('SETTINGS.JSON');
      const mdPath = jsonPathUpper.toAlternateFormat();
      expect(mdPath.value).toBe('SETTINGS.md');
    });

    it('should return the same path for extensions other than .md or .json', () => {
      const txtPath = DocumentPath.create('notes.txt');
      const altPath = txtPath.toAlternateFormat();
      expect(altPath).toBeInstanceOf(DocumentPath);
      expect(altPath.value).toBe('notes.txt');
      // It should return a new instance even if the path is the same
      expect(altPath).not.toBe(txtPath);
    });

     it('should return the same path if there is no extension', () => {
      const noExtPath = DocumentPath.create('dir/file');
      const altPath = noExtPath.toAlternateFormat();
      expect(altPath).toBeInstanceOf(DocumentPath);
      expect(altPath.value).toBe('dir/file');
      expect(altPath).not.toBe(noExtPath);
    });
  });

  describe('equals', () => {
    const path1 = DocumentPath.create('a/b/c.txt');
    const path2 = DocumentPath.create('a/b/c.txt');
    const path3 = DocumentPath.create('a/b/d.txt');

    it('should return true for instances with the same value', () => {
      expect(path1.equals(path2)).toBe(true);
    });

    it('should return false for instances with different values', () => {
      expect(path1.equals(path3)).toBe(false);
    });

     it('should return false when compared with null or undefined', () => {
       expect(path1.equals(null!)).toBe(false);
       expect(path1.equals(undefined!)).toBe(false);
     });
  });

  describe('clone', () => {
     it('should create a new instance with the same value', () => {
       const originalPath = DocumentPath.create('original/path.doc');
       const clonedPath = originalPath.clone();

       expect(clonedPath).toBeInstanceOf(DocumentPath);
       expect(clonedPath.value).toBe(originalPath.value);
       expect(clonedPath).not.toBe(originalPath);
       expect(clonedPath.equals(originalPath)).toBe(true);
     });
  });
});
