import {
  // from common (assuming some common exports exist, adjust if needed)
  // Example: TagSchema, FlexibleDateSchema - Add actual exports if they exist in common/index.js

  // from v2
  JsonDocumentV2Schema,
  BranchContextJsonV2Schema, // Example specific document schema
  SCHEMA_VERSION as SCHEMA_VERSION_V2, // Alias to avoid conflict if common has one
  DocumentMetadataV2Schema,
  isValidLanguage, // from v2/i18n-schema

  // from types (assuming some type exports exist, adjust if needed)
  // Example: DocumentType - Add actual exports if they exist in types/index.js

  // from validation-helpers
  commonValidators,
  createErrorMessage,

  // from versioning
  SCHEMA_VERSIONS,
  LATEST_SCHEMA_VERSION,
  isKnownSchemaVersion,
  migrateDocumentToLatest,

} from '@memory-bank/schemas'; // Import using package path defined in exports

describe('Main Index Exports (src/index.ts)', () => {

  it('should export items from v2', () => {
    expect(JsonDocumentV2Schema).toBeDefined();
    expect(BranchContextJsonV2Schema).toBeDefined();
    expect(SCHEMA_VERSION_V2).toBeDefined();
    expect(DocumentMetadataV2Schema).toBeDefined();
    expect(isValidLanguage).toBeDefined();
  });

  // Add similar tests for common and types if they have exports
  // it('should export items from common', () => {
  //   expect(TagSchema).toBeDefined(); // Example
  // });

  // it('should export items from types', () => {
  //   expect(DocumentType).toBeDefined(); // Example
  // });

  it('should export items from validation-helpers', () => {
    expect(commonValidators).toBeDefined();
    expect(createErrorMessage).toBeDefined();
  });

  it('should export items from versioning', () => {
    expect(SCHEMA_VERSIONS).toBeDefined();
    expect(LATEST_SCHEMA_VERSION).toBeDefined();
    expect(isKnownSchemaVersion).toBeDefined();
    expect(migrateDocumentToLatest).toBeDefined();
  });

});
