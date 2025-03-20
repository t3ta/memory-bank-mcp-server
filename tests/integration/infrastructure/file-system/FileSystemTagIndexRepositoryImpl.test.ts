/**
 * @jest-environment node
 */

import { jest } from '@jest/globals';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { BranchInfo } from '../../../../src/domain/entities/BranchInfo.js';
import { DocumentPath } from '../../../../src/domain/entities/DocumentPath.js';
import { MemoryDocument } from '../../../../src/domain/entities/MemoryDocument.js';
import { Tag } from '../../../../src/domain/entities/Tag.js';
import { FileSystemBranchMemoryBankRepository } from '../../../../src/infrastructure/repositories/file-system/FileSystemBranchMemoryBankRepository.js';
import { FileSystemGlobalMemoryBankRepository } from '../../../../src/infrastructure/repositories/file-system/FileSystemGlobalMemoryBankRepository.js';
import { FileSystemTagIndexRepositoryImpl } from '../../../../src/infrastructure/repositories/file-system/FileSystemTagIndexRepositoryImpl.js';
import { FileSystemService } from '../../../../src/infrastructure/storage/FileSystemService.js';
import {
  TestEnvironment,
  createTestEnvironment,
  createTestBranch,
  createTestFiles,
  readAllFiles
} from './FileSystemTestHelper.js';
import type { ConfigProvider } from '../../../../src/infrastructure/config/ConfigProvider.js';

// タイムアウトを延長（ファイルシステム操作のため）
jest.setTimeout(10000);

describe('FileSystemTagIndexRepositoryImpl Integration Tests', () => {
  let testEnv: TestEnvironment;
  let fileSystemService: FileSystemService;
  let branchRepository: FileSystemBranchMemoryBankRepository;
  let globalRepository: FileSystemGlobalMemoryBankRepository;
  let tagIndexRepository: FileSystemTagIndexRepositoryImpl;

  beforeEach(async () => {
    // テスト環境のセットアップ
    testEnv = await createTestEnvironment();

    // 実際のファイルシステムサービスとリポジトリを作成
    fileSystemService = new FileSystemService();
    // モックのコンフィグプロバイダーを作成
    const mockConfigProvider = {
      getConfig: () => ({ memoryBankRoot: testEnv.branchRoot }),
      getBranchMemoryPath: (branchName: string) => {
        const branchDir = branchName.replace('/', '-');
        return path.join(testEnv.branchRoot, branchDir);
      }
    };

    branchRepository = new FileSystemBranchMemoryBankRepository(fileSystemService, mockConfigProvider as ConfigProvider);
    const mockGlobalConfigProvider = {
      getConfig: () => ({ memoryBankRoot: testEnv.globalRoot }),
      getGlobalMemoryPath: () => {
        return path.join(testEnv.globalRoot, 'global-memory-bank');
      }
    };

    globalRepository = new FileSystemGlobalMemoryBankRepository(fileSystemService, mockGlobalConfigProvider as ConfigProvider);

    // タグインデックスリポジトリを作成
    tagIndexRepository = new FileSystemTagIndexRepositoryImpl(
      fileSystemService,
      testEnv.branchRoot,
      testEnv.globalRoot,
      branchRepository,
      globalRepository
    );
  });

  afterEach(async () => {
    // テスト環境のクリーンアップ
    await testEnv.cleanup();
  });

  describe('Branch Tag Index Operations', () => {
    const BRANCH_NAME = 'feature/tag-test';
    const BRANCH_INFO = BranchInfo.create(BRANCH_NAME);

    it('should build branch tag index from existing documents', async () => {
      // テスト用の文書を作成
      const branchDir = await createTestBranch(testEnv.branchRoot, BRANCH_NAME, {
        'doc1.md': '# Document 1\n\ntags: #tag1 #tag2\n\nContent 1',
        'doc2.md': '# Document 2\n\ntags: #tag2 #tag3\n\nContent 2',
        'doc3.md': '# Document 3\n\ntags: #tag1 #tag3 #tag4\n\nContent 3',
        'no-tags.md': '# Document with no tags\n\nNo tags here'
      });

      // タグインデックスを更新
      const result = await tagIndexRepository.updateBranchTagIndex(BRANCH_INFO);

      // 結果を検証
      expect(result.documentCount).toBe(4); // タグなしの文書も含む
      expect(result.tags.sort()).toEqual(['tag1', 'tag2', 'tag3', 'tag4'].sort());

      // インデックスファイルが作成されたことを確認
      const indexPath = path.join(branchDir, 'tag-index.json');
      const exists = await fileSystemService.fileExists(indexPath);
      expect(exists).toBe(true);

      // インデックスの内容を確認
      const indexContent = await fileSystemService.readFile(indexPath);
      const index = JSON.parse(indexContent);

      expect(index.schema).toBe('tag-index-v2');
      expect(index.metadata.branchName).toBe(BRANCH_NAME);
      expect(index.metadata.documentCount).toBe(4);
      expect(index.metadata.tagCount).toBe(4);

      // 各タグのドキュメント数を確認
      const tag1Entry = index.index.find((e: any) => e.tag === 'tag1');
      const tag2Entry = index.index.find((e: any) => e.tag === 'tag2');
      const tag3Entry = index.index.find((e: any) => e.tag === 'tag3');
      const tag4Entry = index.index.find((e: any) => e.tag === 'tag4');

      expect(tag1Entry.documents).toHaveLength(2);
      expect(tag2Entry.documents).toHaveLength(2);
      expect(tag3Entry.documents).toHaveLength(2);
      expect(tag4Entry.documents).toHaveLength(1);
    });

    it('should find documents by tags using OR logic', async () => {
      // テスト用の文書を作成
      await createTestBranch(testEnv.branchRoot, BRANCH_NAME, {
        'doc1.md': '# Document 1\n\ntags: #tag1 #tag2\n\nContent 1',
        'doc2.md': '# Document 2\n\ntags: #tag2 #tag3\n\nContent 2',
        'doc3.md': '# Document 3\n\ntags: #tag1 #tag3 #tag4\n\nContent 3',
        'no-tags.md': '# Document with no tags\n\nNo tags here'
      });

      // タグインデックスを更新
      await tagIndexRepository.updateBranchTagIndex(BRANCH_INFO);

      // tag1またはtag3を持つドキュメントを検索
      const results = await tagIndexRepository.findBranchDocumentsByTags(
        BRANCH_INFO,
        [Tag.create('tag1'), Tag.create('tag3')],
        false // OR検索
      );

      // 結果を検証 - doc1, doc2, doc3が該当するはず
      expect(results).toHaveLength(3);

      const paths = results.map(p => p.value).sort();
      expect(paths).toEqual(['doc1.md', 'doc2.md', 'doc3.md'].sort());
    });

    it('should find documents by tags using AND logic', async () => {
      // テスト用の文書を作成
      await createTestBranch(testEnv.branchRoot, BRANCH_NAME, {
        'doc1.md': '# Document 1\n\ntags: #tag1 #tag2\n\nContent 1',
        'doc2.md': '# Document 2\n\ntags: #tag2 #tag3\n\nContent 2',
        'doc3.md': '# Document 3\n\ntags: #tag1 #tag3 #tag4\n\nContent 3',
        'no-tags.md': '# Document with no tags\n\nNo tags here'
      });

      // タグインデックスを更新
      await tagIndexRepository.updateBranchTagIndex(BRANCH_INFO);

      // tag1とtag3を両方持つドキュメントを検索
      const results = await tagIndexRepository.findBranchDocumentsByTags(
        BRANCH_INFO,
        [Tag.create('tag1'), Tag.create('tag3')],
        true // AND検索
      );

      // 結果を検証 - doc3のみが該当するはず
      expect(results).toHaveLength(1);
      expect(results[0].value).toBe('doc3.md');
    });

    it('should use cache for repeated tag searches', async () => {
      // テスト用の文書を作成
      await createTestBranch(testEnv.branchRoot, BRANCH_NAME, {
        'doc1.md': '# Document 1\n\ntags: #tag1 #tag2\n\nContent 1',
        'doc2.md': '# Document 2\n\ntags: #tag2 #tag3\n\nContent 2'
      });

      // タグインデックスを更新
      await tagIndexRepository.updateBranchTagIndex(BRANCH_INFO);

      // ファイルの読み込み関数をスパイする
      const readFileSpy = jest.spyOn(fileSystemService, 'readFile');

      // 一回目の検索（キャッシュなし）
      await tagIndexRepository.findBranchDocumentsByTags(
        BRANCH_INFO,
        [Tag.create('tag2')],
        false
      );

      // readFileが呼ばれることを確認
      expect(readFileSpy).toHaveBeenCalled();
      readFileSpy.mockClear();

      // 二回目の検索（キャッシュあり）
      await tagIndexRepository.findBranchDocumentsByTags(
        BRANCH_INFO,
        [Tag.create('tag1')],
        false
      );

      // キャッシュを使うのでreadFileは呼ばれないはず
      expect(readFileSpy).not.toHaveBeenCalled();
    });

    it('should add document to branch index', async () => {
      // テスト用の文書を作成
      const branchDir = await createTestBranch(testEnv.branchRoot, BRANCH_NAME, {
        'doc1.md': '# Document 1\n\ntags: #tag1 #tag2\n\nContent 1'
      });

      // 初期タグインデックスを更新
      await tagIndexRepository.updateBranchTagIndex(BRANCH_INFO);

      // 新しいドキュメントを追加
      const docPath = DocumentPath.create('doc2.md');
      const document = MemoryDocument.create({
        path: docPath,
        content: '# Document 2\n\ntags: #tag2 #tag3\n\nContent 2',
        tags: [Tag.create('tag2'), Tag.create('tag3')],
        lastModified: new Date()
      });

      await tagIndexRepository.updateBranchTagIndex(BRANCH_INFO);

      // インデックスの内容を確認
      const indexPath = path.join(branchDir, 'tag-index.json');
      const indexContent = await fileSystemService.readFile(indexPath);
      const index = JSON.parse(indexContent);

      // 検証 - tag1, tag2, tag3の3つのタグがあるはず
      expect(index.metadata.tagCount).toBe(3);
      expect(index.metadata.documentCount).toBe(2);

      // tag3が追加されていることを確認
      const tag3Entry = index.index.find((e: any) => e.tag === 'tag3');
      expect(tag3Entry).toBeDefined();
      expect(tag3Entry.documents).toHaveLength(1);
      expect(tag3Entry.documents[0].path).toBe('doc2.md');
    });

    it('should remove document from branch index', async () => {
      // テスト用の文書を作成
      const branchDir = await createTestBranch(testEnv.branchRoot, BRANCH_NAME, {
        'doc1.md': '# Document 1\n\ntags: #tag1 #tag2\n\nContent 1',
        'doc2.md': '# Document 2\n\ntags: #tag2 #tag3\n\nContent 2'
      });

      // 初期タグインデックスを更新
      await tagIndexRepository.updateBranchTagIndex(BRANCH_INFO);

      // ドキュメントを削除
      const docPath = DocumentPath.create('doc1.md');
      // ファイルを削除
      // ブランチパスを直接指定
      const branchPath = path.join(testEnv.branchRoot, branchDir);
      const fullPath = path.join(branchPath, docPath.value);
      await fs.unlink(fullPath);

      // インデックスを更新
      await tagIndexRepository.updateBranchTagIndex(BRANCH_INFO);

      // インデックスの内容を確認
      const indexPath = path.join(branchDir, 'tag-index.json');
      const indexContent = await fileSystemService.readFile(indexPath);
      const index = JSON.parse(indexContent);

      // 検証 - tag1は削除され、tag2とtag3だけが残っているはず
      expect(index.metadata.documentCount).toBe(1);

      // tag1がなくなっていることを確認
      const tag1Entry = index.index.find((e: any) => e.tag === 'tag1');
      expect(tag1Entry).toBeUndefined();

      // tag2のドキュメントが減っていることを確認
      const tag2Entry = index.index.find((e: any) => e.tag === 'tag2');
      expect(tag2Entry.documents).toHaveLength(1);
      expect(tag2Entry.documents[0].path).toBe('doc2.md');
    });
  });

  describe('Global Tag Index Operations', () => {
    it('should build global tag index from existing documents', async () => {
      // テスト用のグローバル文書を作成
      await createTestFiles(testEnv.globalRoot, {
        'global1.md': '# Global 1\n\ntags: #global-tag1 #global-tag2\n\nGlobal content 1',
        'global2.md': '# Global 2\n\ntags: #global-tag2 #global-tag3\n\nGlobal content 2',
        'global3.md': '# Global 3\n\ntags: #global-tag1 #global-tag3 #global-tag4\n\nGlobal content 3'
      });

      // タグインデックスを更新
      const result = await tagIndexRepository.updateGlobalTagIndex();

      // 結果を検証
      expect(result.documentCount).toBe(3);
      expect(result.tags.sort()).toEqual(['global-tag1', 'global-tag2', 'global-tag3', 'global-tag4'].sort());

      // インデックスファイルが作成されたことを確認
      const indexPath = path.join(testEnv.globalRoot, 'tag-index.json');
      const exists = await fileSystemService.fileExists(indexPath);
      expect(exists).toBe(true);

      // インデックスの内容を確認
      const indexContent = await fileSystemService.readFile(indexPath);
      const index = JSON.parse(indexContent);

      expect(index.schema).toBe('tag-index-v2');
      expect(index.metadata.indexType).toBe('global');
      expect(index.metadata.documentCount).toBe(3);
      expect(index.metadata.tagCount).toBe(4);
    });

    it('should find global documents by tags', async () => {
      // テスト用のグローバル文書を作成
      await createTestFiles(testEnv.globalRoot, {
        'global1.md': '# Global 1\n\ntags: #global-tag1 #global-tag2\n\nGlobal content 1',
        'global2.md': '# Global 2\n\ntags: #global-tag2 #global-tag3\n\nGlobal content 2',
        'global3.md': '# Global 3\n\ntags: #global-tag1 #global-tag3 #global-tag4\n\nGlobal content 3'
      });

      // タグインデックスを更新
      await tagIndexRepository.updateGlobalTagIndex();

      // global-tag1を持つドキュメントを検索
      const results = await tagIndexRepository.findGlobalDocumentsByTags(
        [Tag.create('global-tag1')],
        false
      );

      // 結果を検証 - global1とglobal3が該当するはず
      expect(results).toHaveLength(2);

      const paths = results.map(p => p.value).sort();
      expect(paths).toEqual(['global1.md', 'global3.md'].sort());
    });
  });

  describe('Performance Tests', () => {
    const BRANCH_NAME = 'feature/performance-test';
    const BRANCH_INFO = BranchInfo.create(BRANCH_NAME);

    it('should handle large number of documents efficiently', async () => {
      // たくさんのテスト文書を作成
      const branchDir = await createTestBranch(testEnv.branchRoot, BRANCH_NAME, {});

      // 生成する文書の数
      const NUM_DOCS = 50;
      // タグの数
      const NUM_TAGS = 10;

      // 複数の文書とタグを生成
      for (let i = 0; i < NUM_DOCS; i++) {
        // 各文書に2-4個のランダムなタグを割り当て
        const numTags = 2 + Math.floor(Math.random() * 3);
        const docTags: string[] = [];

        for (let j = 0; j < numTags; j++) {
          const tagNum = Math.floor(Math.random() * NUM_TAGS);
          const tagName = `tag${tagNum}`;
          if (!docTags.includes(tagName)) {
            docTags.push(tagName);
          }
        }

        const tagsStr = docTags.map(t => `#${t}`).join(' ');
        const content = `# Document ${i}\n\ntags: ${tagsStr}\n\nContent for document ${i}`;
        const filePath = path.join(branchDir, `doc${i}.md`);

        await fs.writeFile(filePath, content, 'utf-8');
      }

      // パフォーマンスを測定
      const startTime = Date.now();
      const result = await tagIndexRepository.updateBranchTagIndex(BRANCH_INFO);
      const endTime = Date.now();
      const executionTime = endTime - startTime;

      // 結果を検証
      console.log(`Index update took ${executionTime}ms for ${NUM_DOCS} documents`);
      expect(result.documentCount).toBe(NUM_DOCS);

      // 平均的に各タグは複数の文書を持つはず
      for (let i = 0; i < NUM_TAGS; i++) {
        const tagResults = await tagIndexRepository.findBranchDocumentsByTags(
          BRANCH_INFO,
          [Tag.create(`tag${i}`)],
          false
        );

        console.log(`tag${i} has ${tagResults.length} documents`);
        // 少なくとも1つの文書があるはず
        expect(tagResults.length).toBeGreaterThan(0);
      }

      // キャッシュによる高速化をテスト
      const cacheStartTime = Date.now();
      await tagIndexRepository.findBranchDocumentsByTags(
        BRANCH_INFO,
        [Tag.create('tag0'), Tag.create('tag1')],
        false
      );
      const cacheEndTime = Date.now();
      const cacheExecutionTime = cacheEndTime - cacheStartTime;

      console.log(`Cache query took ${cacheExecutionTime}ms`);
      // キャッシュクエリは非常に高速なはず
      expect(cacheExecutionTime).toBeLessThan(50);
    });
  });
});
