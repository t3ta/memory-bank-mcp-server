/**
 * JSON Document Schema v2 Tests
 *
 * These tests validate the v2 JSON document schemas, ensuring they:
 * - Properly validate expected formats
 * - Reject invalid documents with appropriate errors
 * - Correctly infer TypeScript types
 */

import { v4 as uuidv4 } from 'uuid';
import {
  SCHEMA_VERSION,
  BaseJsonDocumentV2Schema,
  BranchContextJsonV2Schema,
  ActiveContextJsonV2Schema,
  ProgressJsonV2Schema,
  SystemPatternsJsonV2Schema,
  JsonDocumentV2Schema,
} from '../../../src/schemas/v2/json-document.js';

describe('JSON Document Schema v2', () => {
  // Common test data
  const now = new Date();
  const validUuid = uuidv4();

  const validBaseMetadata = {
    title: 'Test Document',
    documentType: 'test_type',
    id: validUuid,
    path: 'test/path',
    tags: ['test', 'document'],
    lastModified: now,
    createdAt: now,
    version: 1,
  };

  describe('BaseJsonDocumentV2Schema', () => {
    it('should validate a valid base document', () => {
      const validBaseDocument = {
        schema: SCHEMA_VERSION,
        metadata: validBaseMetadata,
        content: {
          test: 'value',
        },
      };

      const result = BaseJsonDocumentV2Schema.safeParse(validBaseDocument);
      expect(result.success).toBe(true);
    });

    it('should reject document with invalid schema version', () => {
      const invalidVersionDoc = {
        schema: 'wrong_version',
        metadata: validBaseMetadata,
        content: { test: 'value' },
      };

      const result = BaseJsonDocumentV2Schema.safeParse(invalidVersionDoc);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('schema');
      }
    });

    it('should reject document with empty content', () => {
      const emptyContentDoc = {
        schema: SCHEMA_VERSION,
        metadata: validBaseMetadata,
        content: {},
      };

      const result = BaseJsonDocumentV2Schema.safeParse(emptyContentDoc);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('content');
      }
    });

    it('should reject document with invalid UUID', () => {
      const invalidUuidDoc = {
        schema: SCHEMA_VERSION,
        metadata: {
          ...validBaseMetadata,
          id: 'not-a-uuid',
        },
        content: { test: 'value' },
      };

      const result = BaseJsonDocumentV2Schema.safeParse(invalidUuidDoc);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('id');
      }
    });
  });

  describe('BranchContextJsonV2Schema', () => {
    it('should validate a valid branch context document', () => {
      const validBranchContext = {
        schema: SCHEMA_VERSION,
        metadata: {
          ...validBaseMetadata,
          documentType: 'branch_context',
        },
        content: {
          purpose: 'This is a test branch',
          userStories: [
            {
              description: 'As a user, I want to test this schema',
              completed: false,
            },
          ],
        },
      };

      const result = BranchContextJsonV2Schema.safeParse(validBranchContext);
      expect(result.success).toBe(true);
    });

    it('should reject branch context with empty purpose', () => {
      const invalidBranchContext = {
        schema: SCHEMA_VERSION,
        metadata: {
          ...validBaseMetadata,
          documentType: 'branch_context',
        },
        content: {
          purpose: '',
          userStories: [],
        },
      };

      const result = BranchContextJsonV2Schema.safeParse(invalidBranchContext);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('purpose');
      }
    });
  });

  describe('ActiveContextJsonV2Schema', () => {
    it('should validate a valid active context document', () => {
      const validActiveContext = {
        schema: SCHEMA_VERSION,
        metadata: {
          ...validBaseMetadata,
          documentType: 'active_context',
        },
        content: {
          currentWork: 'Working on tests',
          recentChanges: ['Added new tests'],
          activeDecisions: ['Use Jest for testing'],
          considerations: ['Should add more test cases'],
          nextSteps: ['Complete test suite'],
        },
      };

      const result = ActiveContextJsonV2Schema.safeParse(validActiveContext);
      expect(result.success).toBe(true);
    });

    it('should accept active context with optional fields omitted', () => {
      const minimalActiveContext = {
        schema: SCHEMA_VERSION,
        metadata: {
          ...validBaseMetadata,
          documentType: 'active_context',
        },
        content: {
          // currentWork is optional
          recentChanges: [],
          activeDecisions: [],
          considerations: [],
          nextSteps: [],
        },
      };

      const result = ActiveContextJsonV2Schema.safeParse(minimalActiveContext);
      expect(result.success).toBe(true);
    });
  });

  describe('ProgressJsonV2Schema', () => {
    it('should validate a valid progress document', () => {
      const validProgress = {
        schema: SCHEMA_VERSION,
        metadata: {
          ...validBaseMetadata,
          documentType: 'progress',
        },
        content: {
          workingFeatures: ['Feature A', 'Feature B'],
          pendingImplementation: ['Feature C'],
          status: 'In progress',
          knownIssues: ['Issue X'],
        },
      };

      const result = ProgressJsonV2Schema.safeParse(validProgress);
      expect(result.success).toBe(true);
    });

    it('should accept progress with optional fields omitted', () => {
      const minimalProgress = {
        schema: SCHEMA_VERSION,
        metadata: {
          ...validBaseMetadata,
          documentType: 'progress',
        },
        content: {
          workingFeatures: [],
          pendingImplementation: [],
          // status is optional
          knownIssues: [],
        },
      };

      const result = ProgressJsonV2Schema.safeParse(minimalProgress);
      expect(result.success).toBe(true);
    });
  });

  describe('SystemPatternsJsonV2Schema', () => {
    it('should validate a valid system patterns document', () => {
      const validSystemPatterns = {
        schema: SCHEMA_VERSION,
        metadata: {
          ...validBaseMetadata,
          documentType: 'system_patterns',
        },
        content: {
          technicalDecisions: [
            {
              title: 'Use TypeScript',
              context: 'Need strong typing',
              decision: 'We will use TypeScript',
              consequences: ['Better type safety', 'Enhanced IDE support'],
            },
          ],
        },
      };

      const result = SystemPatternsJsonV2Schema.safeParse(validSystemPatterns);
      expect(result.success).toBe(true);
    });

    it('should reject technical decision without consequences', () => {
      const invalidSystemPatterns = {
        schema: SCHEMA_VERSION,
        metadata: {
          ...validBaseMetadata,
          documentType: 'system_patterns',
        },
        content: {
          technicalDecisions: [
            {
              title: 'Use TypeScript',
              context: 'Need strong typing',
              decision: 'We will use TypeScript',
              consequences: [], // Empty consequences
            },
          ],
        },
      };

      const result = SystemPatternsJsonV2Schema.safeParse(invalidSystemPatterns);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('consequences');
      }
    });
  });

  describe('JsonDocumentV2Schema (Union)', () => {
    it('should correctly validate branch context through union schema', () => {
      const branchContext = {
        schema: SCHEMA_VERSION,
        documentType: 'branch_context',
        title: 'Test Branch Context',
        id: validUuid,
        path: 'test/branch-context.json',
        tags: ['test'],
        lastModified: now.toISOString(),
        createdAt: now.toISOString(),
        version: 1,
        purpose: 'Testing the union schema',
        userStories: [],
      };

      const result = JsonDocumentV2Schema.safeParse(branchContext);
      expect(result.success).toBe(true);
    });

    it('should correctly validate active context through union schema', () => {
      const activeContext = {
        schema: SCHEMA_VERSION,
        documentType: 'active_context',
        title: 'Test Active Context',
        id: validUuid,
        path: 'test/active-context.json',
        tags: ['test'],
        lastModified: now.toISOString(),
        createdAt: now.toISOString(),
        version: 1,
        currentWork: 'Testing the union schema',
        recentChanges: [],
        activeDecisions: [],
        considerations: [],
        nextSteps: [],
      };

      const result = JsonDocumentV2Schema.safeParse(activeContext);
      expect(result.success).toBe(true);
    });

    it('should correctly validate progress through union schema', () => {
      const progress = {
        schema: SCHEMA_VERSION,
        documentType: 'progress',
        title: 'Test Progress',
        id: validUuid,
        path: 'test/progress.json',
        tags: ['test'],
        lastModified: now.toISOString(),
        createdAt: now.toISOString(),
        version: 1,
        workingFeatures: ['Feature A'],
        pendingImplementation: ['Feature B'],
        status: 'In Progress',
        knownIssues: [],
      };

      const result = JsonDocumentV2Schema.safeParse(progress);
      expect(result.success).toBe(true);
    });

    it('should correctly validate system patterns through union schema', () => {
      const systemPatterns = {
        schema: SCHEMA_VERSION,
        documentType: 'system_patterns',
        title: 'Test System Patterns',
        id: validUuid,
        path: 'test/system-patterns.json',
        tags: ['test'],
        lastModified: now.toISOString(),
        createdAt: now.toISOString(),
        version: 1,
        technicalDecisions: [
          {
            title: 'Use TypeScript',
            context: 'Need strong typing',
            decision: 'We will use TypeScript',
            consequences: ['Better type safety'],
          },
        ],
      };

      const result = JsonDocumentV2Schema.safeParse(systemPatterns);
      expect(result.success).toBe(true);
    });

    it('should reject document with unknown document type', () => {
      const unknownType = {
        schema: SCHEMA_VERSION,
        documentType: 'unknown_type',
        title: 'Unknown Type',
        id: validUuid,
        path: 'test/unknown.json',
        tags: [],
        lastModified: now.toISOString(),
        createdAt: now.toISOString(),
        version: 1,
        // Some arbitrary content
        someField: 'value',
      };

      const result = JsonDocumentV2Schema.safeParse(unknownType);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid enum value');
      }
    });
  });
});
