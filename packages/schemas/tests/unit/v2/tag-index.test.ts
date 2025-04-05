/**
 * Tests for v2 tag index schemas
 */
import {
  DocumentReferenceSchema,
  TagEntrySchema,
  BaseTagIndexSchema,
  BranchTagIndexSchema,
  GlobalTagIndexSchema,
  TAG_INDEX_VERSION
} from '../../src/v2/tag-index.js';

describe('DocumentReferenceSchema', () => {
  it('should validate a correct document reference', () => {
    const validReference = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      path: 'test/document.json',
      title: 'Test Document',
      lastModified: new Date()
    };
    
    const result = DocumentReferenceSchema.safeParse(validReference);
    expect(result.success).toBe(true);
  });
  
  it('should accept ISO date string for lastModified', () => {
    const validReference = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      path: 'test/document.json',
      title: 'Test Document',
      lastModified: '2025-03-27T12:00:00Z'
    };
    
    const result = DocumentReferenceSchema.safeParse(validReference);
    expect(result.success).toBe(true);
  });
  
  it('should reject document reference with invalid UUID', () => {
    const invalidReference = {
      id: 'not-a-uuid',
      path: 'test/document.json',
      title: 'Test Document',
      lastModified: new Date()
    };
    
    const result = DocumentReferenceSchema.safeParse(invalidReference);
    expect(result.success).toBe(false);
  });
  
  it('should reject document reference with empty path', () => {
    const invalidReference = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      path: '', // Empty path
      title: 'Test Document',
      lastModified: new Date()
    };
    
    const result = DocumentReferenceSchema.safeParse(invalidReference);
    expect(result.success).toBe(false);
  });
  
  it('should reject document reference with empty title', () => {
    const invalidReference = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      path: 'test/document.json',
      title: '', // Empty title
      lastModified: new Date()
    };
    
    const result = DocumentReferenceSchema.safeParse(invalidReference);
    expect(result.success).toBe(false);
  });
});

describe('TagEntrySchema', () => {
  it('should validate a correct tag entry', () => {
    const validTagEntry = {
      tag: 'test-tag',
      documents: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          path: 'test/document.json',
          title: 'Test Document',
          lastModified: new Date()
        }
      ]
    };
    
    const result = TagEntrySchema.safeParse(validTagEntry);
    expect(result.success).toBe(true);
  });
  
  it('should validate tag entry with multiple documents', () => {
    const validTagEntry = {
      tag: 'test-tag',
      documents: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          path: 'test/document1.json',
          title: 'Test Document 1',
          lastModified: new Date()
        },
        {
          id: '234f5678-f90a-23e4-b567-537725285001',
          path: 'test/document2.json',
          title: 'Test Document 2',
          lastModified: new Date()
        }
      ]
    };
    
    const result = TagEntrySchema.safeParse(validTagEntry);
    expect(result.success).toBe(true);
  });
  
  it('should reject tag entry with invalid tag', () => {
    const invalidTagEntry = {
      tag: 'Invalid Tag', // Invalid tag with uppercase and space
      documents: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          path: 'test/document.json',
          title: 'Test Document',
          lastModified: new Date()
        }
      ]
    };
    
    const result = TagEntrySchema.safeParse(invalidTagEntry);
    expect(result.success).toBe(false);
  });
});

describe('BaseTagIndexSchema', () => {
  it('should validate a correct base tag index', () => {
    const validTagIndex = {
      schema: TAG_INDEX_VERSION,
      metadata: {
        indexType: 'branch',
        branchName: 'feature/test',
        lastUpdated: new Date(),
        documentCount: 2,
        tagCount: 1
      },
      index: [
        {
          tag: 'test-tag',
          documents: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              path: 'test/document1.json',
              title: 'Test Document 1',
              lastModified: new Date()
            },
            {
              id: '234f5678-f90a-23e4-b567-537725285001',
              path: 'test/document2.json',
              title: 'Test Document 2',
              lastModified: new Date()
            }
          ]
        }
      ]
    };
    
    const result = BaseTagIndexSchema.safeParse(validTagIndex);
    expect(result.success).toBe(true);
  });
  
  it('should reject tag index with wrong schema version', () => {
    const invalidTagIndex = {
      schema: 'wrong_version',
      metadata: {
        indexType: 'branch',
        branchName: 'feature/test',
        lastUpdated: new Date(),
        documentCount: 1,
        tagCount: 1
      },
      index: []
    };
    
    const result = BaseTagIndexSchema.safeParse(invalidTagIndex);
    expect(result.success).toBe(false);
  });
  
  it('should reject tag index with negative document count', () => {
    const invalidTagIndex = {
      schema: TAG_INDEX_VERSION,
      metadata: {
        indexType: 'branch',
        branchName: 'feature/test',
        lastUpdated: new Date(),
        documentCount: -1, // Negative count
        tagCount: 1
      },
      index: []
    };
    
    const result = BaseTagIndexSchema.safeParse(invalidTagIndex);
    expect(result.success).toBe(false);
  });
});

describe('BranchTagIndexSchema', () => {
  it('should validate a correct branch tag index', () => {
    const validBranchIndex = {
      schema: TAG_INDEX_VERSION,
      metadata: {
        indexType: 'branch',
        branchName: 'feature/test',
        lastUpdated: new Date(),
        documentCount: 1,
        tagCount: 1
      },
      index: [
        {
          tag: 'test-tag',
          documents: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              path: 'test/document.json',
              title: 'Test Document',
              lastModified: new Date()
            }
          ]
        }
      ]
    };
    
    const result = BranchTagIndexSchema.safeParse(validBranchIndex);
    expect(result.success).toBe(true);
  });
  
  it('should reject branch tag index without branch name', () => {
    const invalidBranchIndex = {
      schema: TAG_INDEX_VERSION,
      metadata: {
        indexType: 'branch',
        // Missing branchName
        lastUpdated: new Date(),
        documentCount: 1,
        tagCount: 1
      },
      index: []
    };
    
    const result = BranchTagIndexSchema.safeParse(invalidBranchIndex);
    expect(result.success).toBe(false);
  });
  
  it('should reject branch tag index with wrong index type', () => {
    const invalidBranchIndex = {
      schema: TAG_INDEX_VERSION,
      metadata: {
        indexType: 'global', // Should be 'branch'
        branchName: 'feature/test',
        lastUpdated: new Date(),
        documentCount: 1,
        tagCount: 1
      },
      index: []
    };
    
    const result = BranchTagIndexSchema.safeParse(invalidBranchIndex);
    expect(result.success).toBe(false);
  });
});

describe('GlobalTagIndexSchema', () => {
  it('should validate a correct global tag index', () => {
    const validGlobalIndex = {
      schema: TAG_INDEX_VERSION,
      metadata: {
        indexType: 'global',
        lastUpdated: new Date(),
        documentCount: 2,
        tagCount: 1
      },
      index: [
        {
          tag: 'global-tag',
          documents: [
            {
              id: '123e4567-e89b-12d3-a456-426614174000',
              path: 'global/document1.json',
              title: 'Global Document 1',
              lastModified: new Date()
            },
            {
              id: '234f5678-f90a-23e4-b567-537725285001',
              path: 'global/document2.json',
              title: 'Global Document 2',
              lastModified: new Date()
            }
          ]
        }
      ]
    };
    
    const result = GlobalTagIndexSchema.safeParse(validGlobalIndex);
    expect(result.success).toBe(true);
  });
  
  it('should ignore branch name in global tag index', () => {
    const globalIndexWithBranchName = {
      schema: TAG_INDEX_VERSION,
      metadata: {
        indexType: 'global',
        branchName: 'feature/test', // This should be ignored, not rejected
        lastUpdated: new Date(),
        documentCount: 1,
        tagCount: 1
      },
      index: []
    };
    
    const result = GlobalTagIndexSchema.safeParse(globalIndexWithBranchName);
    // Schema should still validate because it will just ignore branchName
    expect(result.success).toBe(true);
    // if successful, the parsed data should not contain branchName
    if (result.success) {
      // @ts-ignore - testing internal structure
      expect(result.data.metadata.branchName).toBeUndefined();
    }
  });
  
  it('should reject global tag index with wrong index type', () => {
    const invalidGlobalIndex = {
      schema: TAG_INDEX_VERSION,
      metadata: {
        indexType: 'branch', // Should be 'global'
        lastUpdated: new Date(),
        documentCount: 1,
        tagCount: 1
      },
      index: []
    };
    
    const result = GlobalTagIndexSchema.safeParse(invalidGlobalIndex);
    expect(result.success).toBe(false);
  });
});
