import { mock, instance, when, anyString, anything, deepEqual } from 'ts-mockito';
import {
  IBranchMemoryBankRepository,
  RecentBranch,
} from '../../src/domain/repositories/IBranchMemoryBankRepository';
import { IGlobalMemoryBankRepository } from '../../src/domain/repositories/IGlobalMemoryBankRepository';
import { IJsonDocumentRepository } from '../../src/domain/repositories/IJsonDocumentRepository';
import { BranchInfo } from '../../src/domain/entities/BranchInfo';
import { DocumentPath } from '../../src/domain/entities/DocumentPath';
import { MemoryDocument } from '../../src/domain/entities/MemoryDocument';
import { JsonDocument, DocumentType } from '../../src/domain/entities/JsonDocument';
import { DocumentId } from '../../src/domain/entities/DocumentId';
import { Tag } from '../../src/domain/entities/Tag';
import { TagIndex } from '../../src/schemas/tag-index/tag-index-schema';

/**
 * Mock classes for repositories
 * Since ts-mockito cannot directly mock interfaces,
 * we create concrete classes that implement the interfaces
 *
 * Class for mocking with ts-mockito
 * Only method declarations are needed as actual implementation is not required
 */
export class MockBranchRepository implements IBranchMemoryBankRepository {
  exists(branchName: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  initialize(branchInfo: BranchInfo): Promise<void> {
    return Promise.resolve();
  }

  getDocument(branchInfo: BranchInfo, path: DocumentPath): Promise<MemoryDocument | null> {
    return Promise.resolve(null);
  }

  saveDocument(branchInfo: BranchInfo, document: MemoryDocument): Promise<void> {
    return Promise.resolve();
  }

  deleteDocument(branchInfo: BranchInfo, path: DocumentPath): Promise<boolean> {
    return Promise.resolve(false);
  }

  listDocuments(branchInfo: BranchInfo): Promise<DocumentPath[]> {
    return Promise.resolve([]);
  }

  findDocumentsByTags(branchInfo: BranchInfo, tags: Tag[]): Promise<MemoryDocument[]> {
    return Promise.resolve([]);
  }

  getRecentBranches(limit?: number): Promise<RecentBranch[]> {
    return Promise.resolve([]);
  }

  validateStructure(branchInfo: BranchInfo): Promise<boolean> {
    return Promise.resolve(false);
  }

  saveTagIndex(branchInfo: BranchInfo, tagIndex: TagIndex): Promise<void> {
    return Promise.resolve();
  }

  getTagIndex(branchInfo: BranchInfo): Promise<TagIndex | null> {
    return Promise.resolve(null);
  }

  findDocumentPathsByTagsUsingIndex(
    branchInfo: BranchInfo,
    tags: Tag[],
    matchAll?: boolean
  ): Promise<DocumentPath[]> {
    return Promise.resolve([]);
  }
}

export class MockGlobalRepository implements IGlobalMemoryBankRepository {
  initialize(): Promise<void> {
    return Promise.resolve();
  }

  getDocument(path: DocumentPath): Promise<MemoryDocument | null> {
    return Promise.resolve(null);
  }

  saveDocument(document: MemoryDocument): Promise<void> {
    return Promise.resolve();
  }

  deleteDocument(path: DocumentPath): Promise<boolean> {
    return Promise.resolve(false);
  }

  listDocuments(): Promise<DocumentPath[]> {
    return Promise.resolve([]);
  }

  findDocumentsByTags(tags: Tag[]): Promise<MemoryDocument[]> {
    return Promise.resolve([]);
  }

  updateTagsIndex(): Promise<void> {
    return Promise.resolve();
  }

  saveTagIndex(tagIndex: TagIndex): Promise<void> {
    return Promise.resolve();
  }

  getTagIndex(): Promise<TagIndex | null> {
    return Promise.resolve(null);
  }

  findDocumentPathsByTagsUsingIndex(tags: Tag[], matchAll?: boolean): Promise<DocumentPath[]> {
    return Promise.resolve([]);
  }

  validateStructure(): Promise<boolean> {
    return Promise.resolve(false);
  }
}

export class MockJsonDocumentRepository implements IJsonDocumentRepository {
  findById(id: DocumentId): Promise<JsonDocument | null> {
    return Promise.resolve(null);
  }

  findByPath(branchInfo: BranchInfo, path: DocumentPath): Promise<JsonDocument | null> {
    return Promise.resolve(null);
  }

  findByTags(branchInfo: BranchInfo, tags: Tag[], matchAll?: boolean): Promise<JsonDocument[]> {
    return Promise.resolve([]);
  }

  findByType(branchInfo: BranchInfo, documentType: DocumentType): Promise<JsonDocument[]> {
    return Promise.resolve([]);
  }

  save(branchInfo: BranchInfo, document: JsonDocument): Promise<JsonDocument> {
    return Promise.resolve(document);
  }

  delete(
    branchInfo: BranchInfo,
    document: JsonDocument | DocumentId | DocumentPath
  ): Promise<boolean> {
    return Promise.resolve(true);
  }

  listAll(branchInfo: BranchInfo): Promise<JsonDocument[]> {
    return Promise.resolve([]);
  }

  exists(branchInfo: BranchInfo, path: DocumentPath): Promise<boolean> {
    return Promise.resolve(false);
  }
}

/**
 * Factory function to create a mock branch repository
 * @returns The mock and its instance
 */
export const createMockBranchRepository = () => {
  const mockRepo = mock(MockBranchRepository);

  // Set default behavior (as needed)
  when(mockRepo.exists(anyString())).thenResolve(true);

  return {
    mock: mockRepo,
    instance: instance(mockRepo),
  };
};

/**
 * Factory function to create a mock global repository
 * @returns The mock and its instance
 */
export const createMockGlobalRepository = () => {
  const mockRepo = mock(MockGlobalRepository);

  // Set default behavior (as needed)

  return {
    mock: mockRepo,
    instance: instance(mockRepo),
  };
};

/**
 * Factory function to create a mock JSON document repository
 * @returns The mock and its instance
 */
export const createMockJsonDocumentRepository = () => {
  const mockRepo = mock(MockJsonDocumentRepository);

  // Set default behavior (as needed)
  when(mockRepo.exists(anything(), anything())).thenResolve(true);

  return {
    mock: mockRepo,
    instance: instance(mockRepo),
  };
};
