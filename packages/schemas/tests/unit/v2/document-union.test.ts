import { z } from 'zod';
import {
  JsonDocumentV2Schema,
  JsonDocumentV2,
} from '../../../src/v2/document-union'; // Adjust path as needed
import { SCHEMA_VERSION } from '../../../src/v2/json-document'; // Import constant

// Helper to create minimal valid metadata for testing
// documentType はメタデータから削除されたため、引数と戻り値から削除
const createTestMetadata = (type: string, overrides = {}) => ({
  title: `Test ${type}`,
  // documentType: type, // Removed
  id: '333e4567-e89b-12d3-a456-426614174000', // Use a fixed valid UUID
  path: `test/${type}.json`, // Keep path generation based on type
  tags: ['test'], // Remove type from tags to avoid invalid characters like '_'
  lastModified: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  version: 1,
  ...overrides,
});

describe('JsonDocumentV2Schema (Union)', () => {
  // --- Test Data for Each Document Type ---
  // documentType をトップレベルに移動し、metadata から documentType を削除
  const validBranchContext = {
    schema: SCHEMA_VERSION,
    documentType: 'branch_context', // Discriminator at top level
    metadata: createTestMetadata('branch_context'), // metadata に documentType は不要
    content: { // Correct content for BranchContext
      purpose: 'Test purpose', // Required
      // background: 'Optional background',
      userStories: [], // Required (defaults to [])
    },
  };

  // documentType をトップレベルに移動し、metadata から documentType を削除
  const validActiveContext = {
    schema: SCHEMA_VERSION,
    documentType: 'active_context', // Discriminator at top level
    metadata: createTestMetadata('active_context'), // metadata に documentType は不要
    content: { // Minimal valid content for ActiveContext
      currentWork: 'Testing active context',
      recentChanges: [],
      activeDecisions: [],
      considerations: [],
      nextSteps: [],
    },
  };

   // documentType をトップレベルに移動し、metadata から documentType を削除
   const validProgress = {
    schema: SCHEMA_VERSION,
    documentType: 'progress', // Discriminator at top level
    metadata: createTestMetadata('progress'), // metadata に documentType は不要
    content: { // Minimal valid content for Progress
      status: 'In progress',
      completionPercentage: 50, // Add required completionPercentage
      workingFeatures: [],
      pendingImplementation: [],
      knownIssues: [],
    },
  };

   // documentType をトップレベルに移動し、metadata から documentType を削除
   const validSystemPatterns = {
    schema: SCHEMA_VERSION,
    documentType: 'system_patterns', // Discriminator at top level
    metadata: createTestMetadata('system_patterns'), // metadata に documentType は不要
    content: { // Minimal valid content for SystemPatterns
      technicalDecisions: [],
      implementationPatterns: [], // Add required implementationPatterns
    },
  };

  // --- Tests ---

  it('should validate a correct BranchContext document', () => {
    const result = JsonDocumentV2Schema.safeParse(validBranchContext);
    // if (!result.success) console.error('BranchContext Error:', result.error?.errors); // Remove console log
    expect(result.success).toBe(true);
  });

  it('should validate a correct ActiveContext document', () => {
    const result = JsonDocumentV2Schema.safeParse(validActiveContext);
    // if (!result.success) console.error('ActiveContext Error:', result.error?.errors); // Remove console log
    expect(result.success).toBe(true);
  });

   it('should validate a correct Progress document', () => {
    const result = JsonDocumentV2Schema.safeParse(validProgress);
    expect(result.success).toBe(true);
  });

   it('should validate a correct SystemPatterns document', () => {
    const result = JsonDocumentV2Schema.safeParse(validSystemPatterns);
    expect(result.success).toBe(true);
  });

  it('should fail if the discriminator "documentType" is missing', () => {
    // Use the updated validBranchContext structure
    const invalidDoc = { ...validBranchContext };
    delete (invalidDoc as any).documentType; // Remove top-level documentType
    const result = JsonDocumentV2Schema.safeParse(invalidDoc);
    expect(result.success).toBe(false);
    // Zod's error message for missing discriminator might be generic
    // console.error(result.error?.errors);
  });

  it('should fail if the discriminator "documentType" does not match content/metadata', () => {
    // Use the updated validBranchContext structure
    const invalidDoc = {
      ...validBranchContext,
      documentType: 'active_context', // Change top-level documentType
    };
    // console.log('Invalid Doc Data for mismatch test:', JSON.stringify(invalidDoc, null, 2)); // Remove console log
    const result = JsonDocumentV2Schema.safeParse(invalidDoc);
    // if (result.success) console.error('Mismatch test unexpectedly succeeded!'); // Remove console log
    // else console.error('Mismatch test failed as expected:', result.error?.errors); // Remove console log
    expect(result.success).toBe(false);
    // console.error(result.error?.errors);
  });

  it('should fail if the schema version is incorrect', () => {
    // Use the updated validActiveContext structure
    const invalidDoc = { ...validActiveContext, schema: 'memory_document_v1' };
    const result = JsonDocumentV2Schema.safeParse(invalidDoc);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Check path points to the schema field within the specific object type
      expect(result.error.errors[0].path).toEqual(['schema']);
    }
  });

  it('should fail if metadata is invalid for the specific document type', () => {
    // Use the updated validActiveContext structure
   const invalidDoc = {
     ...validActiveContext,
     metadata: { ...validActiveContext.metadata, title: '' }, // Modify metadata
    };
    const result = JsonDocumentV2Schema.safeParse(invalidDoc);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0].path).toEqual(['metadata', 'title']);
    }
  });

  it('should fail if content is invalid for the specific document type', () => {
    // Use Progress data but make its content invalid (e.g., missing status)
    const invalidContent = { ...validProgress.content };
    delete (invalidContent as any).status;
    // Use the updated validProgress structure
    const invalidDoc = {
      ...validProgress,
      content: invalidContent,
    };
    const result = JsonDocumentV2Schema.safeParse(invalidDoc);
    expect(result.success).toBe(false);
    if (!result.success) {
      // Check path points to the missing content field
      expect(result.error.errors[0].path).toEqual(['content', 'status']);
    }
  });

  it('should not validate a document with an unknown documentType', () => {
   // Use the updated createTestMetadata structure and add documentType at top level
   const unknownDoc = {
     schema: SCHEMA_VERSION,
     documentType: 'unknown_type', // Discriminator at top level
     metadata: createTestMetadata('unknown_type'), // metadata doesn't have documentType
     content: { data: 'some data' },
   };
    const result = JsonDocumentV2Schema.safeParse(unknownDoc);
    expect(result.success).toBe(false);
    // console.error(result.error?.errors);
  });

  // --- Boundary and Optional Field Tests ---

  it('should validate Progress with completionPercentage at boundary values (0 and 100)', () => {
    // Use the updated validProgress structure
    const progressAt0 = { ...validProgress, content: { ...validProgress.content, completionPercentage: 0 } };
    const progressAt100 = { ...validProgress, content: { ...validProgress.content, completionPercentage: 100 } };
    expect(JsonDocumentV2Schema.safeParse(progressAt0).success).toBe(true);
    expect(JsonDocumentV2Schema.safeParse(progressAt100).success).toBe(true);
  });

  it('should fail Progress if completionPercentage is outside the 0-100 range', () => {
    // Use the updated validProgress structure
    const progressBelow0 = { ...validProgress, content: { ...validProgress.content, completionPercentage: -1 } };
    const progressAbove100 = { ...validProgress, content: { ...validProgress.content, completionPercentage: 101 } };
    const resultBelow = JsonDocumentV2Schema.safeParse(progressBelow0);
    const resultAbove = JsonDocumentV2Schema.safeParse(progressAbove100);
    expect(resultBelow.success).toBe(false);
    expect(resultAbove.success).toBe(false);
    if (!resultBelow.success) {
        expect(resultBelow.error.errors[0].path).toEqual(['content', 'completionPercentage']);
        expect(resultBelow.error.errors[0].message).toContain('greater than or equal to 0'); // Adjust expected error message
    }
     if (!resultAbove.success) {
        expect(resultAbove.error.errors[0].path).toEqual(['content', 'completionPercentage']);
        expect(resultAbove.error.errors[0].message).toContain('less than or equal to 100'); // Adjust expected error message
    }
  });

   it('should validate BranchContext with optional background field present', () => {
    // Use the updated validBranchContext structure
    const branchContextWithBg = {
      ...validBranchContext,
      content: { ...validBranchContext.content, background: 'Detailed background info' },
    };
    const result = JsonDocumentV2Schema.safeParse(branchContextWithBg);
    // if (!result.success) console.error('BranchContext Optional BG Error:', result.error?.errors); // Remove console log
    expect(result.success).toBe(true);
  });

   it('should validate BranchContext with optional background field explicitly undefined', () => {
     // Use the updated validBranchContext structure
    const branchContextUndefinedBg = {
      ...validBranchContext,
      content: { ...validBranchContext.content, background: undefined },
    };
    const result = JsonDocumentV2Schema.safeParse(branchContextUndefinedBg);
    // if (!result.success) console.error('BranchContext Undefined BG Error:', result.error?.errors); // Remove console log
    expect(result.success).toBe(true); // Optional fields allow undefined
  });


  // Note: Testing 'generic' type is not possible with this union schema directly.
});
