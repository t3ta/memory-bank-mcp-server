import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import { WorkspaceConfig } from '../../../src/infrastructure/config/WorkspaceConfig';
import { IConfigProvider } from '../../../src/infrastructure/config/interfaces/IConfigProvider';
import { IBranchMemoryBankRepository } from '../../../src/domain/repositories/IBranchMemoryBankRepository';
import { IGlobalMemoryBankRepository } from '../../../src/domain/repositories/IGlobalMemoryBankRepository';
import { ITagIndexRepository } from '../../../src/domain/repositories/ITagIndexRepository';
import { IFileSystemService } from '../../../src/infrastructure/storage/interfaces/IFileSystemService';
import { FileSystemService } from '../../../src/infrastructure/storage/FileSystemService';
import { BranchController } from '../../../src/interface/controllers/BranchController';
import { FileSystemBranchMemoryBankRepository } from '../../../src/infrastructure/repositories/file-system/FileSystemBranchMemoryBankRepository';
import { WriteBranchDocumentUseCase } from '../../../src/application/usecases/branch/WriteBranchDocumentUseCase';
import { ReadBranchDocumentUseCase } from '../../../src/application/usecases/branch/ReadBranchDocumentUseCase';
import { SearchDocumentsByTagsUseCase } from '../../../src/application/usecases/common/SearchDocumentsByTagsUseCase';
import { UpdateTagIndexUseCase } from '../../../src/application/usecases/common/UpdateTagIndexUseCase';
import { GetRecentBranchesUseCase } from '../../../../src/application/usecases/common/GetRecentBranchesUseCase';
import { ReadBranchCoreFilesUseCase } from '../../../../src/application/usecases/common/ReadBranchCoreFilesUseCase';
import { CreateBranchCoreFilesUseCase } from '../../../../src/application/usecases/common/CreateBranchCoreFilesUseCase';
import { MCPResponsePresenter } from '../../../../src/interface/presenters/MCPResponsePresenter';
import { FileSystemTagIndexRepository } from '../../../../src/infrastructure/repositories/file-system/index';
import { MarkdownToJsonMigrator } from '../../../../src/migration/MarkdownToJsonMigrator';
import { MigrationBackup } from '../../../../src/migration/MigrationBackup';
import { MigrationValidator } from '../../../../src/migration/MigrationValidator';
import { ConverterFactory } from '../../../../src/migration/converters/ConverterFactory';
import { logger } from '../../../../src/shared/utils/logger';

/**
 * Integration Test: Markdown-to-JSON Migration
 *
 * Testing migration from Markdown file format to JSON
 */
describe('Markdown to JSON Migration Integration Tests', () => {
  // Test directories
  let testDir: string;
  let branchDir: string;
  let testBranch: string;

  // Test target instances
  let repository: FileSystemBranchMemoryBankRepository;
  let writeUseCase: WriteBranchDocumentUseCase;
  let normalController: BranchController;
  let migrator: MarkdownToJsonMigrator;

  beforeAll(async () => {
    // テスト環境のセットアップ
    const testId = uuidv4();
    testDir = path.join(process.cwd(), 'tests', '.temp', `migration-${testId}`);
    branchDir = path.join(testDir, 'branch-memory-bank');
    testBranch = `feature/test-branch-${testId}`;

    // ディレクトリ作成
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(branchDir, { recursive: true });

    // Create 'feature' directory to support 'feature/test-branch-xxx' format
    const featureDir = path.join(branchDir, 'feature');
    await fs.mkdir(featureDir, { recursive: true });

    // Create 'test-branch-xxx' directory
    const branchNameWithoutNamespace = testBranch.split('/')[1];
    await fs.mkdir(path.join(featureDir, branchNameWithoutNamespace), { recursive: true });

    // Initialize components
    // Create objects implementing FileSystemService and ConfigProvider
    const fileSystemService: IFileSystemService = {
      createDirectory: async (directory: string) => {
        await fs.mkdir(directory, { recursive: true });
      },
      directoryExists: async (directory: string) => {
        try {
          const stats = await fs.stat(directory);
          return stats.isDirectory();
        } catch {
          return false;
        }
      },
      fileExists: async (filePath: string) => {
        try {
          const stats = await fs.stat(filePath);
          return stats.isFile();
        } catch {
          return false;
        }
      },
      readFile: async (filePath: string) => {
        return await fs.readFile(filePath, 'utf-8');
      },
      writeFile: async (filePath: string, content: string) => {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, content, 'utf-8');
      },
      listFiles: async (directory: string) => {
        return (await fs.readdir(directory)).map(file => path.join(directory, file));
      },
      getFileStats: async (filePath: string) => {
        const stats = await fs.stat(filePath);
        return {
          size: stats.size,
          isDirectory: stats.isDirectory(),
          isFile: stats.isFile(),
          lastModified: stats.mtime,
          createdAt: stats.birthtime,
        };
      },
      deleteFile: async (filePath: string) => {
        try {
          await fs.unlink(filePath);
          return true;
        } catch {
          return false;
        }
      },
      getBranchMemoryPath: (branchName: string) => path.join(testDir, 'branch-memory-bank', branchName),
      getConfig: () => ({
        memoryBankRoot: testDir,
        workspaceRoot: testDir,
        verbose: false,
        language: 'en',
      }),
    };

    // Create ConfigProvider object conforming to the interface
    const configProvider: IConfigProvider = {
      initialize: async () => ({
        workspaceRoot: testDir,
        memoryBankRoot: testDir,
        verbose: false,
        language: 'en'
      }),
      getConfig: () => ({
        memoryBankRoot: testDir,
        workspaceRoot: testDir,
        verbose: false,
        language: 'en',
      }),
      getBranchMemoryPath: (branchName: string) => path.join(testDir, 'branch-memory-bank', branchName),
      getGlobalMemoryPath: () => path.join(testDir, 'global-memory-bank'),
      getLanguage: () => 'en',
    };

    repository = new FileSystemBranchMemoryBankRepository(fileSystemService, configProvider);

    // Create mock implementing IGlobalMemoryBankRepository interface
    const globalRepository: IGlobalMemoryBankRepository = {
      initialize: async () => { },
      validateStructure: async () => true,
      getDocument: async () => null,
      saveDocument: async () => { },
      deleteDocument: async () => true,
      findDocumentsByTags: async () => [],
      updateTagsIndex: async () => { },
      getTagIndex: async () => null,
      saveTagIndex: async () => { },
      findDocumentPathsByTagsUsingIndex: async () => [],
      listDocuments: async () => []
    };
    // Create FileSystemService instance
    const fsService = new FileSystemService();

    // Create TagIndexRepository mock
    const tagRepository: ITagIndexRepository = {
      updateBranchTagIndex: async () => ({ tags: [], documentCount: 0, updateInfo: { fullRebuild: false, timestamp: new Date().toISOString() } }),
      updateGlobalTagIndex: async () => ({ tags: [], documentCount: 0, updateInfo: { fullRebuild: false, timestamp: new Date().toISOString() } }),
      findBranchDocumentsByTags: async () => [],
      findGlobalDocumentsByTags: async () => [],
      addDocumentToBranchIndex: async () => { },
      addDocumentToGlobalIndex: async () => { },
      removeDocumentFromBranchIndex: async () => { },
      removeDocumentFromGlobalIndex: async () => { },
      getBranchTags: async () => [],
      getGlobalTags: async () => []
    };

    const readUseCase = new ReadBranchDocumentUseCase(repository);
    writeUseCase = new WriteBranchDocumentUseCase(repository);
    // SearchDocumentsByTagsUseCase and UpdateTagIndexUseCase use globalRepository instead of repository as first argument
    const searchUseCase = new SearchDocumentsByTagsUseCase(globalRepository, repository);
    const updateTagIndexUseCase = new UpdateTagIndexUseCase(globalRepository, repository);
    const getRecentBranchesUseCase = new GetRecentBranchesUseCase(repository);
    const readCoreFilesUseCase = new ReadBranchCoreFilesUseCase(repository);
    const createCoreFilesUseCase = new CreateBranchCoreFilesUseCase(repository);
    const presenter = new MCPResponsePresenter();

    // Normal controller (Markdown writing enabled)
    normalController = new BranchController(
      readUseCase,
      writeUseCase,
      searchUseCase,
      updateTagIndexUseCase,
      getRecentBranchesUseCase,
      readCoreFilesUseCase,
      createCoreFilesUseCase,
      presenter
    );

    // Initialize migrator
    const backupService = new MigrationBackup(logger);
    const validator = new MigrationValidator(logger);
    const converterFactory = new ConverterFactory();

    migrator = new MarkdownToJsonMigrator(
      backupService,
      validator,
      converterFactory,
      logger
    );

    // Test environment setup log
    console.log(`Test environment setup completed: ${testDir}`);
  });

  afterAll(async () => {
    // Test environment cleanup
    try {
      await fs.rm(testDir, { recursive: true, force: true });
      console.log(`Test environment deleted: ${testDir}`);
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  });

  it('Markdownファイルが存在する場合にJSONに変換できること', async () => {
    // Prepare test documents
    const files = [
      {
        path: 'branchContext.md',
        content: `# ブランチコンテキスト: ${testBranch}

## 目的

このブランチはテスト用です。

## ユーザーストーリー

1. マイグレーションのテスト
2. JSONへの変換確認

## 実装状況

進行中
`
      },
      {
        path: 'activeContext.md',
        content: `# アクティブコンテキスト

## 現在の作業内容

マイグレーションテストを実施中

## 最近の変更点

- マイグレーターの実装
- テストケースの追加

## アクティブな決定事項

- Markdownから段階的にJSONへ移行する

## 検討事項

- 移行戦略の最適化
- エラー処理の改善

## 次のステップ

- マイグレーション完了
- リリース準備
`
      },
      {
        path: 'systemPatterns.md',
        content: `# システムパターン

## 技術的決定事項

### マイグレーション戦略

#### コンテキスト

ドキュメント形式を更新する必要がある

#### 決定事項

段階的にMarkdownからJSONへ移行する

#### 影響

- 検索機能の改善
- 構造化データの扱いが容易に
- 一時的にシステム複雑性が増加
`
      }
    ];

    // Create Markdown files
    for (const file of files) {
      await normalController.writeDocument(testBranch, file.path, file.content);

      // Verify file creation
      const [ns0, bn0] = testBranch.split('/');
      const filePath = path.join(branchDir, ns0, bn0, file.path);
      console.log(`Created markdown file: ${filePath}`);
      const fileExists = await fileExistsAsync(filePath);
      expect(fileExists).toBe(true);
    }

    // Execute migration
    const [ns, bn] = testBranch.split('/');
    const migrationTargetDir = path.join(branchDir, ns, bn);
    console.log(`Running migration on directory: ${migrationTargetDir}`);
    const result = await migrator.migrateDirectory(migrationTargetDir, {
      createBackup: true,
      overwriteExisting: true,
      validateJson: true,
      deleteOriginals: false
    });
    console.log(`Migration result: ${JSON.stringify(result, null, 2)}`);

    // Check directory contents
    const dirContents = await fs.readdir(migrationTargetDir, { withFileTypes: true });
    console.log(`Directory contents after migration: ${dirContents.map(e => e.name).join(', ')}`);


    // Verify migration results
    expect(result.success).toBe(true);
    expect(result.stats.successCount).toBeGreaterThanOrEqual(files.length);
    expect(result.stats.failureCount).toBe(0);

    // Verify JSON conversion files exist
    for (const file of files) {
      const jsonPath = file.path.replace(/\.md$/, '.json');
      const [ns5, bn5] = testBranch.split('/');
      const filePath = path.join(branchDir, ns5, bn5, jsonPath);
      const fileExists = await fileExistsAsync(filePath);
      expect(fileExists).toBe(true);

      // Verify JSON file content is valid
      const content = await fs.readFile(filePath, 'utf-8');
      expect(() => JSON.parse(content)).not.toThrow();

      // Verify required information is included
      const parsed = JSON.parse(content);
      expect(parsed.schema).toBeDefined();
      expect(parsed.metadata).toBeDefined();
      expect(parsed.content).toBeDefined();
    }

    // Verify backup was created
    expect(result.stats.backupPath).toBeDefined();
    if (result.stats.backupPath) {
      const backupExists = await fileExistsAsync(result.stats.backupPath);
      expect(backupExists).toBe(true);
    }
  });

  it('バックアップからの復元ができること', async () => {
    // Prepare test document
    const docPath = 'restore-test.md';
    const content = `# Restore Test

This file is for testing backup restoration.
`;

    // Create Markdown file
    await normalController.writeDocument(testBranch, docPath, content);

    // Verify file creation
    const [ns1, bn1] = testBranch.split('/');
    const filePath = path.join(branchDir, ns1, bn1, docPath);
    const fileExists = await fileExistsAsync(filePath);
    expect(fileExists).toBe(true);

    // Create backup
    const backupService = new MigrationBackup(logger);
    const backupPath = await backupService.createBackup(path.join(branchDir, testBranch));

    // Verify backup creation
    expect(backupPath).toBeDefined();
    const backupExists = await fileExistsAsync(backupPath);
    expect(backupExists).toBe(true);

    // Delete original file
    await fs.unlink(filePath);
    const originalFileExists = await fileExistsAsync(filePath);
    expect(originalFileExists).toBe(false);

    // Restore from backup
    const [ns2, bn2] = testBranch.split('/');
    await backupService.restoreFromBackup(backupPath, path.join(branchDir, ns2, bn2));

    // Verify restored file
    const restoredFileExists = await fileExistsAsync(filePath);
    expect(restoredFileExists).toBe(true);

    // Verify content
    const restoredContent = await fs.readFile(filePath, 'utf-8');
    expect(restoredContent).toEqual(content);
  });

  it('JSONファイルへの移行後もMarkdownの読み取りは機能すること', async () => {
    // Prepare test document
    const docPath = 'read-after-migration.md';
    const content = `# Read After Migration Test

This file is for testing reading after migration.
`;

    // Create Markdown file
    await normalController.writeDocument(testBranch, docPath, content);

    // Execute migration
    const [ns3, bn3] = testBranch.split('/');
    await migrator.migrateDirectory(path.join(branchDir, ns3, bn3), {
      createBackup: true,
      overwriteExisting: true,
      validateJson: true,
      deleteOriginals: false
    });

    // Verify JSON conversion file creation
    const jsonPath = docPath.replace(/\.md$/, '.json');
    const jsonFilePath = path.join(branchDir, ns3, bn3, jsonPath);
    const jsonFileExists = await fileExistsAsync(jsonFilePath);
    expect(jsonFileExists).toBe(true);

    // Read Markdown file
    const readResult = await normalController.readDocument(testBranch, docPath);

    // Verify read result
    expect(readResult.success).toBe(true);
    if (readResult.success && readResult.data) {
      expect(readResult.data.content).toEqual(content);
    }
  });

  it('既にマイグレーション済みのファイルはスキップされること', async () => {
    // Prepare test document
    const docPath = 'already-migrated.md';
    const content = `# Existing Migration Test

This file is for testing existing migration.
`;

    // Create Markdown file
    await normalController.writeDocument(testBranch, docPath, content);

    // First migration
    const [ns4, bn4] = testBranch.split('/');
    const firstResult = await migrator.migrateDirectory(path.join(branchDir, ns4, bn4), {
      createBackup: true,
      overwriteExisting: false,
      validateJson: true,
      deleteOriginals: false
    });

    expect(firstResult.success).toBe(true);
    expect(firstResult.stats.successCount).toBeGreaterThanOrEqual(1);

    // Check JSON file's last modified time
    const jsonPath = docPath.replace(/\.md$/, '.json');
    const jsonFilePath = path.join(branchDir, ns4, bn4, jsonPath);
    const firstStats = await fs.stat(jsonFilePath);
    const firstMtime = firstStats.mtime.getTime();

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Second migration (skip existing files)
    const secondResult = await migrator.migrateDirectory(path.join(branchDir, ns4, bn4), {
      createBackup: false,
      overwriteExisting: false,
      validateJson: true,
      deleteOriginals: false
    });

    expect(secondResult.success).toBe(true);
    expect(secondResult.stats.skippedCount).toBeGreaterThanOrEqual(1);

    // Verify JSON file's modification time hasn't changed
    const secondStats = await fs.stat(jsonFilePath);
    const secondMtime = secondStats.mtime.getTime();
    expect(secondMtime).toBe(firstMtime);

    // Third migration (overwrite existing files)
    const thirdResult = await migrator.migrateDirectory(path.join(branchDir, ns4, bn4), {
      createBackup: false,
      overwriteExisting: true,  // 上書きオプションを有効に
      validateJson: true,
      deleteOriginals: false
    });

    expect(thirdResult.success).toBe(true);
    expect(thirdResult.stats.successCount).toBeGreaterThanOrEqual(1);

    // Verify JSON file's modification time has changed
    const thirdStats = await fs.stat(jsonFilePath);
    const thirdMtime = thirdStats.mtime.getTime();
    expect(thirdMtime).toBeGreaterThan(secondMtime);
  });
});

// Helper function
async function fileExistsAsync(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}
