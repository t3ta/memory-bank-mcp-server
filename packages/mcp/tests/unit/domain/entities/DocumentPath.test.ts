import { DocumentPath } from '../../../../src/domain/entities/DocumentPath';
import { DomainError, DomainErrorCodes } from '../../../../src/shared/errors/DomainError';

describe('DocumentPath', () => {
  describe('create', () => {
    it('有効なパス文字列でインスタンスを作成できること', () => {
      const validPath = 'core/document.json';
      const docPath = DocumentPath.create(validPath);
      expect(docPath).toBeInstanceOf(DocumentPath);
      expect(docPath.value).toBe(validPath);
    });

    it('空のパス文字列でエラーが発生すること', () => {
      expect(() => DocumentPath.create('')).toThrow(
        new DomainError(DomainErrorCodes.INVALID_DOCUMENT_PATH, 'Document path cannot be empty') // ピリオド削除
      );
    });

    // 無効文字チェックのテストを有効化し、実際のエラーメッセージに合わせる
    it('無効な文字 (*, ?, <, >, |, :) を含むパス文字列でエラーが発生すること', () => {
      const invalidChars = ['*', '?', '<', '>', '|', ':'];
      for (const char of invalidChars) {
        const invalidPath = `core/docu${char}ment.json`;
        expect(() => DocumentPath.create(invalidPath)).toThrow(
          new DomainError(
            DomainErrorCodes.INVALID_DOCUMENT_PATH,
            'Document path contains invalid characters (<, >, :, ", |, ?, *)' // 実際のエラーメッセージ
          )
        );
      }
      // ダブルクォーテーション " もチェック
       expect(() => DocumentPath.create('core/"doc".json')).toThrow(
          new DomainError(
            DomainErrorCodes.INVALID_DOCUMENT_PATH,
            'Document path contains invalid characters (<, >, :, ", |, ?, *)'
          )
        );
    });

     // パス区切り文字チェックのテストを有効化し、実際のエラーメッセージに合わせる
     it('バックスラッシュを含むパス文字列でエラーが発生すること', () => {
      const invalidPath = 'core\\document.json'; // Windows style separator
       expect(() => DocumentPath.create(invalidPath)).toThrow(
         new DomainError(
            DomainErrorCodes.INVALID_DOCUMENT_PATH,
            'Document path cannot contain backslashes (\\). Use forward slashes (/) instead.' // 実際のエラーメッセージ
          )
       );
     });

     it('先頭がスラッシュの場合にエラーが発生すること', () => {
       const invalidPath = '/core/document.json';
       expect(() => DocumentPath.create(invalidPath)).toThrow(
         new DomainError(DomainErrorCodes.INVALID_DOCUMENT_PATH, 'Document path cannot be absolute') // 実際のエラーメッセージに合わせる
       );
     });

     // 末尾スラッシュチェックのテストを有効化し、実際のエラーメッセージに合わせる
     it('末尾がスラッシュの場合にエラーが発生すること', () => {
       const invalidPath = 'core/document.json/';
       expect(() => DocumentPath.create(invalidPath)).toThrow(
         new DomainError(
            DomainErrorCodes.INVALID_DOCUMENT_PATH,
            'Document path cannot end with a slash' // 実際のエラーメッセージ
          )
       );
     });
  });

  describe('getters', () => {
    const path = 'dir1/dir2/file.ext';
    const docPath = DocumentPath.create(path);

    it('directory プロパティが正しいディレクトリ名を返すこと', () => {
      expect(docPath.directory).toBe('dir1/dir2');
    });

    it('filename プロパティが正しいファイル名を返すこと', () => {
      expect(docPath.filename).toBe('file.ext');
    });

    it('extension プロパティが正しい拡張子を返すこと', () => {
      expect(docPath.extension).toBe('ext'); // ピリオドなしの拡張子を期待
    });

    it('basename プロパティが正しいベース名を返すこと', () => {
      expect(docPath.basename).toBe('file');
    });

     it('ディレクトリがない場合に directory が空文字列を返すこと', () => {
       const rootPath = DocumentPath.create('file.ext');
       expect(rootPath.directory).toBe('');
     });

     it('拡張子がない場合に extension が空文字列を返すこと', () => {
       const noExtPath = DocumentPath.create('dir/file');
       expect(noExtPath.extension).toBe('');
       expect(noExtPath.basename).toBe('file');
     });
  });

  describe('inferDocumentType', () => {
    it('ファイル名に基づいて正しいドキュメントタイプを推測すること', () => {
      expect(DocumentPath.create('branchContext.json').inferDocumentType()).toBe('branch_context');
      expect(DocumentPath.create('feature/branch-context.json').inferDocumentType()).toBe('branch_context');
      expect(DocumentPath.create('activeContext.json').inferDocumentType()).toBe('active_context');
      expect(DocumentPath.create('data/active-context.json').inferDocumentType()).toBe('active_context');
      expect(DocumentPath.create('progress.json').inferDocumentType()).toBe('progress');
      expect(DocumentPath.create('logs/progress-report.json').inferDocumentType()).toBe('progress');
      expect(DocumentPath.create('systemPatterns.json').inferDocumentType()).toBe('system_patterns');
      expect(DocumentPath.create('design/system-patterns-v2.json').inferDocumentType()).toBe('system_patterns');
      expect(DocumentPath.create('generic-doc.json').inferDocumentType()).toBe('generic');
      expect(DocumentPath.create('other/file.txt').inferDocumentType()).toBe('generic'); // JSON以外もgeneric
      expect(DocumentPath.create('no-extension').inferDocumentType()).toBe('generic');
    });

    it('大文字小文字を区別せずに推測すること', () => {
      expect(DocumentPath.create('BRANCHCONTEXT.JSON').inferDocumentType()).toBe('branch_context');
      expect(DocumentPath.create('Active-Context.json').inferDocumentType()).toBe('active_context');
    });
  });

  describe('withExtension', () => {
    const docPath = DocumentPath.create('dir/file.txt');

    it('指定された拡張子で新しい DocumentPath インスタンスを作成すること', () => {
      const newPath = docPath.withExtension('json');
      expect(newPath).toBeInstanceOf(DocumentPath);
      expect(newPath.value).toBe('dir/file.json');
      expect(newPath.extension).toBe('json');
      expect(newPath).not.toBe(docPath); // Should be a new instance
    });

    it('拡張子がないパスでも正しく動作すること', () => {
      const noExtPath = DocumentPath.create('dir/anotherfile');
      const newPath = noExtPath.withExtension('md');
      expect(newPath.value).toBe('dir/anotherfile.md');
      expect(newPath.extension).toBe('md');
    });

     it('ルートレベルのパスでも正しく動作すること', () => {
      const rootPath = DocumentPath.create('rootfile.log');
      const newPath = rootPath.withExtension('txt');
      expect(newPath.value).toBe('rootfile.txt');
      expect(newPath.extension).toBe('txt');
    });

    it('空の拡張子を指定するとエラーが発生すること', () => {
      expect(() => docPath.withExtension('')).toThrow(
        new DomainError(DomainErrorCodes.INVALID_DOCUMENT_PATH, 'Extension cannot be empty')
      );
    });

     it('拡張子にドットが含まれていてもそのまま使用されること', () => {
       // This might be unexpected, but based on current implementation, it seems dots are allowed.
       const newPath = docPath.withExtension('tar.gz');
       expect(newPath.value).toBe('dir/file.tar.gz');
       expect(newPath.extension).toBe('gz'); // extension getter returns only the part after the last dot
     });
  });

  describe('toAlternateFormat', () => {
    it('.md パスを .json パスに変換すること', () => {
      const mdPath = DocumentPath.create('docs/guide.md');
      const jsonPath = mdPath.toAlternateFormat();
      expect(jsonPath).toBeInstanceOf(DocumentPath);
      expect(jsonPath.value).toBe('docs/guide.json');
      expect(jsonPath).not.toBe(mdPath); // Should be a new instance
    });

    it('.json パスを .md パスに変換すること', () => {
      const jsonPath = DocumentPath.create('data/config.json');
      const mdPath = jsonPath.toAlternateFormat();
      expect(mdPath).toBeInstanceOf(DocumentPath);
      expect(mdPath.value).toBe('data/config.md');
      expect(mdPath).not.toBe(jsonPath);
    });

    it('大文字の拡張子でも正しく変換すること', () => {
      const mdPathUpper = DocumentPath.create('README.MD');
      const jsonPath = mdPathUpper.toAlternateFormat();
      expect(jsonPath.value).toBe('README.json');

      const jsonPathUpper = DocumentPath.create('SETTINGS.JSON');
      const mdPath = jsonPathUpper.toAlternateFormat();
      expect(mdPath.value).toBe('SETTINGS.md');
    });

    it('.md または .json 以外の拡張子の場合は同じパスを返すこと', () => {
      const txtPath = DocumentPath.create('notes.txt');
      const altPath = txtPath.toAlternateFormat();
      expect(altPath).toBeInstanceOf(DocumentPath);
      expect(altPath.value).toBe('notes.txt');
      // It should return a new instance even if the path is the same
      expect(altPath).not.toBe(txtPath);
    });

     it('拡張子がない場合は同じパスを返すこと', () => {
      const noExtPath = DocumentPath.create('dir/file');
      const altPath = noExtPath.toAlternateFormat();
      expect(altPath).toBeInstanceOf(DocumentPath);
      expect(altPath.value).toBe('dir/file');
      expect(altPath).not.toBe(noExtPath);
    });
  });

  // Add tests for equals and clone
  describe('equals', () => {
    const path1 = DocumentPath.create('a/b/c.txt');
    const path2 = DocumentPath.create('a/b/c.txt');
    const path3 = DocumentPath.create('a/b/d.txt');

    it('同じ値を持つインスタンスに対して true を返すこと', () => {
      expect(path1.equals(path2)).toBe(true);
    });

    it('異なる値を持つインスタンスに対して false を返すこと', () => {
      expect(path1.equals(path3)).toBe(false);
    });

     it('null や undefined と比較した場合に false を返すこと', () => {
       expect(path1.equals(null!)).toBe(false);
       expect(path1.equals(undefined!)).toBe(false);
     });
  });

  describe('clone', () => {
     it('同じ値を持つ新しいインスタンスを作成すること', () => {
       const originalPath = DocumentPath.create('original/path.doc');
       const clonedPath = originalPath.clone();

       expect(clonedPath).toBeInstanceOf(DocumentPath);
       expect(clonedPath.value).toBe(originalPath.value);
       expect(clonedPath).not.toBe(originalPath); // Should be a different instance
       expect(clonedPath.equals(originalPath)).toBe(true);
     });
  });
});
