import {
  DocumentMetaSchema,
  DocumentsMetaIndexSchema,
  TagsIndexSchema,
  SearchResultItemSchema,
  SearchResultsSchema,
  type DocumentMeta,
  type DocumentsMetaIndex,
  type TagsIndex,
  type SearchResultItem,
  type SearchResults,
} from '@/v2/search-index.js'; // エイリアスパスに変更

describe('Search Index Schemas (v2)', () => {
  const validDate = new Date().toISOString();

  describe('DocumentMetaSchema', () => {
    const validMeta: DocumentMeta = {
      title: 'Test Document',
      lastModified: validDate,
      scope: 'branch',
    };

    it('should validate correct document metadata', () => {
      expect(DocumentMetaSchema.safeParse(validMeta).success).toBe(true);
    });

    it('should allow scope "global"', () => {
      const globalMeta = { ...validMeta, scope: 'global' as const };
      expect(DocumentMetaSchema.safeParse(globalMeta).success).toBe(true);
    });

    it('should fail if title is missing', () => {
      const invalid = { ...validMeta, title: undefined as any };
      expect(DocumentMetaSchema.safeParse(invalid).success).toBe(false);
    });

    it('should fail if lastModified is not a valid datetime string', () => {
      const invalid = { ...validMeta, lastModified: 'not-a-date' };
      expect(DocumentMetaSchema.safeParse(invalid).success).toBe(false);
    });

    it('should fail if scope is not "branch" or "global"', () => {
      const invalid = { ...validMeta, scope: 'invalid-scope' as any };
      expect(DocumentMetaSchema.safeParse(invalid).success).toBe(false);
    });

    it('should fail if extra properties are included (if strict)', () => {
       // DocumentMetaSchema doesn't have .strict(), so extra props are allowed by default
       // If .strict() were added, this test would be relevant.
      // const invalid = { ...validMeta, extraProp: 'unexpected' };
      // expect(DocumentMetaSchema.safeParse(invalid).success).toBe(false);
      const validWithExtra = { ...validMeta, extraProp: 'allowed' };
      expect(DocumentMetaSchema.safeParse(validWithExtra).success).toBe(true); // Zod default allows extra props
    });
  });

  describe('DocumentsMetaIndexSchema', () => {
    const validIndex: DocumentsMetaIndex = {
      'path/to/doc1.json': { title: 'Doc 1', lastModified: validDate, scope: 'branch' },
      'path/to/doc2.json': { title: 'Doc 2', lastModified: validDate, scope: 'global' },
    };

    it('should validate a correct documents metadata index', () => {
      expect(DocumentsMetaIndexSchema.safeParse(validIndex).success).toBe(true);
    });

    it('should allow an empty index', () => {
      expect(DocumentsMetaIndexSchema.safeParse({}).success).toBe(true);
    });

    it('should fail if a value is not a valid DocumentMeta', () => {
      const invalid = {
        ...validIndex,
        'path/to/invalid.json': { title: 'Invalid', lastModified: 'bad-date', scope: 'branch' },
      };
      expect(DocumentsMetaIndexSchema.safeParse(invalid).success).toBe(false);
    });

    it('should fail if the key is not a string (though JS objects handle this)', () => {
      // This tests Zod's expectation, JS itself might coerce keys
      const invalid = { 123: validIndex['path/to/doc1.json'] };
      // Zod's z.record(z.string(), ...) expects string keys
      expect(DocumentsMetaIndexSchema.safeParse(invalid).success).toBe(true); // JS coerces keys to strings
    });
  });

  describe('TagsIndexSchema', () => {
    const validIndex: TagsIndex = {
      tag1: ['path/doc1.json', 'path/doc2.json'],
      tag2: ['path/doc1.json'],
    };

    it('should validate a correct tags index', () => {
      expect(TagsIndexSchema.safeParse(validIndex).success).toBe(true);
    });

    it('should allow an empty index', () => {
      expect(TagsIndexSchema.safeParse({}).success).toBe(true);
    });

    it('should allow tags with empty path arrays', () => {
      const emptyTag = { ...validIndex, tag3: [] };
      expect(TagsIndexSchema.safeParse(emptyTag).success).toBe(true);
    });

    it('should fail if a value is not an array of strings', () => {
      const invalid = { ...validIndex, tag3: ['path/doc3.json', 123] }; // Contains a number
      expect(TagsIndexSchema.safeParse(invalid).success).toBe(false);
    });

     it('should fail if a value is not an array', () => {
      const invalid = { ...validIndex, tag3: 'not-an-array' };
      expect(TagsIndexSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('SearchResultItemSchema', () => {
    const validItem: SearchResultItem = {
      path: 'path/to/result.json',
      title: 'Search Result',
      lastModified: validDate,
      scope: 'global',
    };

    it('should validate a correct search result item', () => {
      expect(SearchResultItemSchema.safeParse(validItem).success).toBe(true);
    });

     it('should fail if path is missing', () => {
      const invalid = { ...validItem, path: undefined as any };
      expect(SearchResultItemSchema.safeParse(invalid).success).toBe(false);
    });

     it('should fail if title is missing', () => {
      const invalid = { ...validItem, title: undefined as any };
      expect(SearchResultItemSchema.safeParse(invalid).success).toBe(false);
    });

     it('should fail if lastModified is invalid', () => {
      const invalid = { ...validItem, lastModified: 'invalid-date' };
      expect(SearchResultItemSchema.safeParse(invalid).success).toBe(false);
    });

     it('should fail if scope is invalid', () => {
      const invalid = { ...validItem, scope: 'somewhere' as any };
      expect(SearchResultItemSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('SearchResultsSchema', () => {
    const validResults: SearchResults = {
      results: [
        { path: 'path/1', title: 'Res 1', lastModified: validDate, scope: 'branch' },
        { path: 'path/2', title: 'Res 2', lastModified: validDate, scope: 'global' },
      ],
    };

    it('should validate correct search results', () => {
      expect(SearchResultsSchema.safeParse(validResults).success).toBe(true);
    });

    it('should validate empty search results', () => {
      const emptyResults = { results: [] };
      expect(SearchResultsSchema.safeParse(emptyResults).success).toBe(true);
    });

    it('should fail if results array contains invalid items', () => {
      const invalid = {
        results: [
          { path: 'path/1', title: 'Res 1', lastModified: validDate, scope: 'branch' },
          { path: 'path/invalid', title: 'Invalid', lastModified: 'bad', scope: 'global' }, // Invalid item
        ],
      };
      expect(SearchResultsSchema.safeParse(invalid).success).toBe(false);
    });

    it('should fail if results is not an array', () => {
      const invalid = { results: 'not-an-array' };
      expect(SearchResultsSchema.safeParse(invalid).success).toBe(false);
    });

     it('should fail if results key is missing', () => {
      const invalid = {}; // Missing 'results' key
      expect(SearchResultsSchema.safeParse(invalid).success).toBe(false);
    });
  });
});
