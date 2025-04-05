import { z } from 'zod';
import { JsonDocumentV2Schema, type JsonDocumentV2 } from '../../src/v2/document-union';
import { SCHEMA_VERSION } from '../../src/v2/json-document'; // Import SCHEMA_VERSION

// Helper function to create minimal valid metadata (documentType removed)
const createMinimalMetadata = (docType: string, path: string) => ({
  id: `test-${docType}-id`,
  title: `Test ${docType}`,
  // documentType is now at the top level of the document object
  path: path,
  tags: [],
  lastModified: new Date().toISOString(),
  createdAt: new Date().toISOString(),
  version: 1,
});

describe('JsonDocumentV2Schema (Discriminated Union)', () => {
  // --- Test Valid Documents ---

  it('should successfully parse a valid BranchContext document', () => {
    // Define the object structure matching the schema
    const validBranchContext = {
      schema: SCHEMA_VERSION,
      documentType: 'branch_context' as const, // Add documentType at top level
      metadata: createMinimalMetadata('branch_context', 'branchContext.json'),
      content: {
        // branchName is not part of BranchContextContentV2Schema, removed
        purpose: 'Test purpose',
        // createdAt is not part of BranchContextContentV2Schema, removed
        userStories: [],
        // additionalNotes is not part of BranchContextContentV2Schema, removed
        // additionalNotes: '',
        // background is optional
      },
    };
    // Let Zod infer the type for validation, or use the specific type if needed
    const result = JsonDocumentV2Schema.safeParse(validBranchContext);
    expect(result.success).toBe(true);
    if (result.success) {
      // Check documentType at the top level
      expect(result.data.documentType).toBe('branch_context');
    } else {
      // Log error if parsing fails unexpectedly
      console.error("BranchContext parsing failed:", result.error?.errors);
      fail("BranchContext parsing failed");
    }
  });

  it('should successfully parse a valid ActiveContext document', () => {
    const validActiveContext = {
      schema: SCHEMA_VERSION,
      documentType: 'active_context' as const, // Add documentType at top level
      metadata: createMinimalMetadata('active_context', 'activeContext.json'),
      content: {
        currentWork: 'Testing active context',
        recentChanges: [],
        activeDecisions: [],
        considerations: [],
        nextSteps: [],
      },
    };
    const result = JsonDocumentV2Schema.safeParse(validActiveContext);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documentType).toBe('active_context'); // Check top level
    } else {
      console.error("ActiveContext parsing failed:", result.error?.errors);
      fail("ActiveContext parsing failed");
    }
  });

  it('should successfully parse a valid Progress document', () => {
    const validProgress = {
      schema: SCHEMA_VERSION,
      documentType: 'progress' as const, // Add documentType at top level
      metadata: createMinimalMetadata('progress', 'progress.json'),
      content: {
        workingFeatures: [],
        pendingImplementation: [],
        status: 'In progress',
        completionPercentage: 50,
        knownIssues: [],
      },
    };
    const result = JsonDocumentV2Schema.safeParse(validProgress);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documentType).toBe('progress'); // Check top level
    } else {
      console.error("Progress parsing failed:", result.error?.errors);
      fail("Progress parsing failed");
    }
  });

  it('should successfully parse a valid SystemPatterns document', () => {
    const validSystemPatterns = {
      schema: SCHEMA_VERSION,
      documentType: 'system_patterns' as const, // Add documentType at top level
      metadata: createMinimalMetadata('system_patterns', 'systemPatterns.json'),
      content: {
        technicalDecisions: [],
        implementationPatterns: [],
      },
    };
    const result = JsonDocumentV2Schema.safeParse(validSystemPatterns);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.documentType).toBe('system_patterns'); // Check top level
    } else {
      console.error("SystemPatterns parsing failed:", result.error?.errors);
      fail("SystemPatterns parsing failed");
    }
  });

  // --- Test Invalid Documents ---

  it('should fail parsing if documentType does not match content structure', () => {
    const invalidDoc = {
      schema: SCHEMA_VERSION,
      documentType: 'branch_context' as const, // Correct documentType
      // Metadata is now generic
      metadata: createMinimalMetadata('branch_context', 'branchContext.json'),
      // But content is from ActiveContext
      content: {
        currentWork: 'Mismatched content',
        recentChanges: [],
        activeDecisions: [],
        considerations: [],
        nextSteps: [], // This content doesn't match BranchContextContentV2Schema
      },
    };
    const result = JsonDocumentV2Schema.safeParse(invalidDoc);
    expect(result.success).toBe(false);
    // console.error(JSON.stringify(result.error?.errors, null, 2)); // Optional: Log errors for debugging
  });

  it('should fail parsing if required fields are missing (e.g., metadata)', () => {
    const missingMetadata = {
      // documentType is required at top level
      schema: SCHEMA_VERSION,
      documentType: 'branch_context' as const, // Need a valid type for Zod to try parsing
      // metadata is missing
      content: {
        purpose: 'Test purpose', // branchName removed
        userStories: [],
        // additionalNotes: '', // Removed as it's not in the schema
      },
    };
    // Need to cast because TS knows properties are missing, but we test runtime validation
    const result = JsonDocumentV2Schema.safeParse(missingMetadata as any);
    expect(result.success).toBe(false);
    // Expect errors related to missing 'metadata'
    // documentType check might pass initially if provided at top level, but metadata is still required by the base schema
    expect(result.error?.errors.some(e => e.path.includes('metadata'))).toBe(true);
  });

   it('should fail parsing if required content fields are missing', () => {
    const missingContentField = {
      schema: SCHEMA_VERSION,
      documentType: 'branch_context' as const, // Add documentType
      metadata: createMinimalMetadata('branch_context', 'branchContext.json'),
      content: {
        // purpose is required in BranchContextContentV2Schema, let's remove it
        // purpose: 'Test purpose',
        userStories: [],
        // additionalNotes: '', // Removed as it's not in the schema
      }, // Missing 'purpose'
    };
    const result = JsonDocumentV2Schema.safeParse(missingContentField);
    expect(result.success).toBe(false);
    // Expect error related to missing 'purpose' in content
    expect(result.error?.errors.some(e => e.path.includes('content') && e.path.includes('purpose'))).toBe(true);
  });

  it('should fail parsing if documentType is not one of the discriminated union keys', () => {
    const unknownDocType = {
      schema: SCHEMA_VERSION,
      documentType: 'unknown_type', // Not a valid literal type in the union
      metadata: createMinimalMetadata('unknown_type', 'unknown.json'),
      content: { someData: 'value' },
    };
    const result = JsonDocumentV2Schema.safeParse(unknownDocType);
    expect(result.success).toBe(false);
    // Zod error for discriminated union should mention the discriminator key ('documentType')
    expect(result.error?.errors.some(e => e.message.includes('Invalid discriminator value'))).toBe(true);
  });

   it('should fail parsing if documentType is missing at top level', () => {
    const missingDocType = { // Missing documentType at top level
      schema: SCHEMA_VERSION,
      metadata: {
        id: 'test-id',
        title: 'Test Missing Type',
        path: 'missing.json',
        tags: [],
        lastModified: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        version: 1,
      },
      content: { data: 'value' },
    };
    const result = JsonDocumentV2Schema.safeParse(missingDocType as any); // Cast needed
    expect(result.success).toBe(false);
    // Expect error related to missing 'documentType' at the top level
    expect(result.error?.errors.some(e => e.path.includes('documentType'))).toBe(true);
  });

  it('should fail parsing if schema version is incorrect', () => {
    const wrongSchema = {
      schema: 'memory_document_v1', // Incorrect version literal
      documentType: 'branch_context' as const, // Add documentType
      metadata: createMinimalMetadata('branch_context', 'branchContext.json'),
      content: {
        purpose: 'Test purpose', // branchName removed
        userStories: [],
        // additionalNotes: '', // Removed as it's not in the schema
      },
    };
    const result = JsonDocumentV2Schema.safeParse(wrongSchema);
    expect(result.success).toBe(false);
    expect(result.error?.errors.some(e => e.path.includes('schema'))).toBe(true);
  });

  it('should fail parsing plain objects without required structure', () => {
    const plainObject = { just: 'a plain object' };
    const result = JsonDocumentV2Schema.safeParse(plainObject);
    expect(result.success).toBe(false);
  });

  it('should fail parsing null or undefined', () => {
    expect(JsonDocumentV2Schema.safeParse(null).success).toBe(false);
    expect(JsonDocumentV2Schema.safeParse(undefined).success).toBe(false);
  });
});
