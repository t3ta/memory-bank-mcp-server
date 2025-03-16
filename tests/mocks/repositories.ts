import { mock, instance, when, anyString, anything, deepEqual } from 'ts-mockito';
import { IBranchMemoryBankRepository, RecentBranch } from '../../src/domain/repositories/IBranchMemoryBankRepository.js';
import { IGlobalMemoryBankRepository } from '../../src/domain/repositories/IGlobalMemoryBankRepository.js';
import { BranchInfo } from '../../src/domain/entities/BranchInfo.js';
import { DocumentPath } from '../../src/domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../src/domain/entities/MemoryDocument.js';
import { Tag } from '../../src/domain/entities/Tag.js';
import { TagIndex } from '../../src/schemas/tag-index/tag-index-schema.js';

/**
 * リポジトリのモッククラス
 * ts-mockitoはインターフェースを直接モックできないため、
 * インターフェースを実装する具体的なクラスを作成します
 */
/**
 * ts-mockitoでモックするためのクラス
 * 実際の実装は必要ないため、メソッドの宣言のみを行う
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

  findDocumentPathsByTagsUsingIndex(branchInfo: BranchInfo, tags: Tag[], matchAll?: boolean): Promise<DocumentPath[]> {
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

/**
 * ブランチリポジトリのモックを作成するファクトリ関数
 * @returns モックとそのインスタンス
 */
export const createMockBranchRepository = () => {
  const mockRepo = mock(MockBranchRepository);

  // デフォルトの振る舞いを設定（必要に応じて）
  when(mockRepo.exists(anyString())).thenResolve(true);

  return {
    mock: mockRepo,
    instance: instance(mockRepo)
  };
};

/**
 * グローバルリポジトリのモックを作成するファクトリ関数
 * @returns モックとそのインスタンス
 */
export const createMockGlobalRepository = () => {
  const mockRepo = mock(MockGlobalRepository);

  // デフォルトの振る舞いを設定（必要に応じて）

  return {
    mock: mockRepo,
    instance: instance(mockRepo)
  };
};
