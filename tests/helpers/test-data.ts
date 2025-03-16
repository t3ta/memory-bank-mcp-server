import { MemoryDocument } from '../../src/domain/entities/MemoryDocument.js';
import { DocumentPath } from '../../src/domain/entities/DocumentPath.js';
import { Tag } from '../../src/domain/entities/Tag.js';
import { BranchInfo } from '../../src/domain/entities/BranchInfo.js';
import { TagIndex } from '../../src/schemas/tag-index/tag-index-schema.js';
import { JsonDocument, DocumentType } from '../../src/domain/entities/JsonDocument.js';
import { DocumentId } from '../../src/domain/entities/DocumentId.js';

/**
 * Helper function to create a test document
 * @param path Document path
 * @param tags Array of tags
 * @param content Document content (optional)
 * @param lastModified Last modified date (optional)
 * @returns Created MemoryDocument object
 */
export const createTestDocument = (
  path: string,
  tags: string[],
  content: string = `# Test Document\n\nContent for ${path}`,
  lastModified: Date = new Date('2023-01-01T00:00:00.000Z')
): MemoryDocument => {
  return MemoryDocument.create({
    path: DocumentPath.create(path),
    content,
    tags: tags.map((t) => Tag.create(t)),
    lastModified,
  });
};

/**
 * Helper function to create a test JSON document
 * @param path Document path
 * @param documentType Document type
 * @param tags Array of tags
 * @param content Document content object
 * @param lastModified Last modified date (optional)
 * @param createdAt Creation date (optional)
 * @returns Created JsonDocument object
 */
export const createTestJsonDocument = <T extends Record<string, unknown>>(
  path: string,
  documentType: DocumentType,
  tags: string[],
  content: T,
  lastModified: Date = new Date('2023-01-01T00:00:00.000Z'),
  createdAt: Date = new Date('2023-01-01T00:00:00.000Z')
): JsonDocument<T> => {
  return JsonDocument.create({
    id: DocumentId.generate(),
    path: DocumentPath.create(path),
    title: `Test ${documentType.charAt(0).toUpperCase() + documentType.slice(1)}`,
    documentType,
    tags: tags.map((t) => Tag.create(t)),
    content,
    lastModified,
    createdAt,
    version: 1,
  });
};

/**
 * Helper function to create test branch information
 * @param name Branch name
 * @returns Created BranchInfo object
 */
export const createTestBranch = (name: string): BranchInfo => {
  return BranchInfo.create(name);
};

/**
 * Helper function to create test tags
 * @param values Array of tag values
 * @returns Array of created Tag objects
 */
export const createTestTags = (values: string[]): Tag[] => {
  return values.map((value) => Tag.create(value));
};

/**
 * Helper function to create a test tag index
 * @param context Context (branch name or 'global')
 * @param tagMap Tag map (tag name -> array of document paths)
 * @param fullRebuild Full rebuild flag (optional)
 * @returns Created TagIndex object
 */
export const createTestTagIndex = (
  context: string,
  tagMap: Record<string, string[]>,
  fullRebuild: boolean = false
): TagIndex => {
  return {
    schema: 'tag_index_v1',
    metadata: {
      updatedAt: new Date().toISOString(),
      documentCount: Object.values(tagMap).reduce((acc, paths) => acc + paths.length, 0),
      fullRebuild,
      context,
    },
    index: tagMap,
  };
};

/**
 * Helper function to create JSON content for active context
 * @returns Content object for active context
 */
export const createTestActiveContextContent = (): Record<string, unknown> => {
  return {
    currentWork: 'Testing functionality',
    recentChanges: ['Added new tests', 'Fixed bugs'],
    activeDecisions: ['Use Jest for testing'],
    considerations: ['Test coverage thresholds'],
    nextSteps: ['Implement more features', 'Set up CI'],
  };
};

/**
 * Helper function to create JSON content for progress
 * @returns Content object for progress
 */
export const createTestProgressContent = (): Record<string, unknown> => {
  return {
    workingFeatures: ['Basic functionality'],
    pendingImplementation: ['Advanced features'],
    status: 'In progress',
    knownIssues: ['Performance issue'],
  };
};

/**
 * Helper function to create JSON content for system patterns
 * @returns Content object for system patterns
 */
export const createTestSystemPatternsContent = (): Record<string, unknown> => {
  return {
    technicalDecisions: [
      {
        title: 'Test Framework',
        context: 'We need to choose a test framework',
        decision: 'We will use Jest',
        consequences: ['Better integration with TypeScript', 'Good mocking capabilities'],
      },
    ],
  };
};

/**
 * Helper function to create JSON content for branch context
 * @returns Content object for branch context
 */
export const createTestBranchContextContent = (): Record<string, unknown> => {
  return {
    purpose: 'This is a test branch for testing purposes',
    userStories: [
      {
        description: 'As a user, I want to test functionality',
        completed: false,
      },
      {
        description: 'As a developer, I want to write tests',
        completed: true,
      },
    ],
  };
};
