/**
 * Schema Versioning Constants and Utilities
 */

// Define known schema versions
export const SCHEMA_VERSIONS = {
  v2: 'memory_document_v2',
  // Add future versions here, e.g., v3: 'memory_document_v3'
} as const;

// Define the latest stable schema version
export const LATEST_SCHEMA_VERSION = SCHEMA_VERSIONS.v2;

// Type representing known schema versions
export type SchemaVersion = typeof SCHEMA_VERSIONS[keyof typeof SCHEMA_VERSIONS];

/**
 * Checks if a given schema version string is a known version.
 * @param version The schema version string to check.
 * @returns True if the version is known, false otherwise.
 */
export function isKnownSchemaVersion(version: string): version is SchemaVersion {
  return Object.values(SCHEMA_VERSIONS).includes(version as SchemaVersion);
}

/**
 * Placeholder for document migration logic.
 * In a real implementation, this would contain logic to convert older schema versions
 * to the latest version.
 *
 * @param doc The document object (potentially an older version).
 * @returns The document potentially migrated to the latest schema version.
 *          Currently returns the input document as migration logic is not implemented.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateDocumentToLatest(doc: any): any {
  // TODO: Implement actual migration logic from older versions to LATEST_SCHEMA_VERSION
  // Example:
  // if (doc.schema === 'memory_document_v1') {
  //   // Perform v1 to v2 migration
  //   const migratedDoc = { ... }; // Transform doc structure
  //   migratedDoc.schema = SCHEMA_VERSIONS.v2;
  //   return migratedDoc;
  // }

  if (!doc.schema || !isKnownSchemaVersion(doc.schema)) {
    // Handle documents with unknown or missing schema versions (e.g., log warning, attempt default migration)
    console.warn(`Document has unknown or missing schema version: ${doc.schema}. Attempting to treat as latest.`);
    // Optionally, try to apply default values or basic structure if possible
  }

  // For now, return the document as is if it's already the latest or unknown
  // In a full implementation, you might throw an error for unsupported versions
  // or attempt a best-effort migration.
  return doc;
}
