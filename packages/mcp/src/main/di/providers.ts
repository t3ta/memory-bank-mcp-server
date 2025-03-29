import { DIContainer } from './DIContainer.js';
import { MCPResponsePresenter } from '@/interface/presenters/MCPResponsePresenter.js';
import { ReadGlobalDocumentUseCase } from '@/application/usecases/global/ReadGlobalDocumentUseCase.js';
import { WriteGlobalDocumentUseCase } from '@/application/usecases/global/WriteGlobalDocumentUseCase.js'; // ★ インポートを追加
import path from 'node:path';
import { IndexService } from '@/infrastructure/index/IndexService.js';
import { IIndexService } from '@/infrastructure/index/interfaces/IIndexService.js';
import { FileSystemJsonDocumentRepository } from '@/infrastructure/repositories/file-system/FileSystemJsonDocumentRepository.js';
import { IJsonDocumentRepository } from '@/domain/repositories/IJsonDocumentRepository.js';
import { II18nRepository } from '@/domain/i18n/II18nRepository.js';
import { ReadRulesUseCase } from '@/application/usecases/common/ReadRulesUseCase.js';
import { ReadContextUseCase } from '@/application/usecases/common/ReadContextUseCase.js';
import { ReadBranchDocumentUseCase } from '@/application/usecases/branch/ReadBranchDocumentUseCase.js';
import { WriteBranchDocumentUseCase } from '@/application/usecases/branch/WriteBranchDocumentUseCase.js';
import { SearchDocumentsByTagsUseCase } from '@/application/usecases/common/SearchDocumentsByTagsUseCase.js';
import { UpdateTagIndexUseCase } from '@/application/usecases/common/UpdateTagIndexUseCase.js';
import { UpdateTagIndexUseCaseV2 } from '@/application/usecases/common/UpdateTagIndexUseCaseV2.js';
import { GetRecentBranchesUseCase } from '@/application/usecases/common/GetRecentBranchesUseCase.js';
import { CreateBranchCoreFilesUseCase } from '@/application/usecases/common/CreateBranchCoreFilesUseCase.js';
import { ReadJsonDocumentUseCase } from '@/application/usecases/json/ReadJsonDocumentUseCase.js';
import { WriteJsonDocumentUseCase } from '@/application/usecases/json/WriteJsonDocumentUseCase.js';
import { DeleteJsonDocumentUseCase } from '@/application/usecases/json/DeleteJsonDocumentUseCase.js';
import { SearchJsonDocumentsUseCase } from '@/application/usecases/json/SearchJsonDocumentsUseCase.js';
import { UpdateJsonIndexUseCase } from '@/application/usecases/json/UpdateJsonIndexUseCase.js';

// Infrastructure layer
import { IFileSystemService } from '@/infrastructure/storage/interfaces/IFileSystemService.js';
import { FileSystemService } from '@/infrastructure/storage/FileSystemService.js';
import { IConfigProvider } from '@/infrastructure/config/interfaces/IConfigProvider.js';
import { ConfigProvider } from '@/infrastructure/config/ConfigProvider.js';
import { FileSystemGlobalMemoryBankRepository } from '@/infrastructure/repositories/file-system/FileSystemGlobalMemoryBankRepository.js';
import { FileSystemBranchMemoryBankRepository } from '@/infrastructure/repositories/file-system/FileSystemBranchMemoryBankRepository.js';
import { FileSystemTagIndexRepositoryV1Bridge } from '@/infrastructure/repositories/file-system/FileSystemTagIndexRepositoryV1Bridge.js';

import { ContextController } from '@/interface/controllers/ContextController.js';
import { JsonResponsePresenter } from '@/interface/presenters/JsonResponsePresenter.js';
import { GlobalController } from '@/interface/controllers/GlobalController.js';
import { BranchController } from '@/interface/controllers/BranchController.js';
import { JsonBranchController } from '@/interface/controllers/json/JsonBranchController.js';

// CLI options type
import { CliOptions } from '@/infrastructure/config/WorkspaceConfig.js';
import { UseCaseFactory } from '@/factory/use-case-factory.js';
import { ReadBranchCoreFilesUseCase } from '@/application/usecases/index.js';
// Unused type imports already removed

/**
 * Register infrastructure services
 * @param container DI Container
 * @param options CLI options
 */
export async function registerInfrastructureServices(
  container: DIContainer,
  options?: CliOptions
): Promise<void> {
  // Register file system service
  container.register<IFileSystemService>('fileSystemService', new FileSystemService());

  // Register config provider
  const configProvider = new ConfigProvider();
  container.register<IConfigProvider>('configProvider', configProvider);

  // Initialize config
  await configProvider.initialize(options);

  // Register repositories
  container.registerFactory('globalMemoryBankRepository', async () => {
    const fileSystemService = await container.get<IFileSystemService>('fileSystemService');
    const configProvider = await container.get<IConfigProvider>('configProvider');

    return new FileSystemGlobalMemoryBankRepository(fileSystemService, configProvider);
  });

  container.registerFactory('branchMemoryBankRepository', async () => {
    const fileSystemService = await container.get<IFileSystemService>('fileSystemService');
    const configProvider = await container.get<IConfigProvider>('configProvider');

    return new FileSystemBranchMemoryBankRepository(fileSystemService, configProvider);
  });

  // Register tag index repository
  container.registerFactory('tagIndexRepository', async () => {
    const configProvider = await container.get<IConfigProvider>('configProvider');
    const globalRepository = await container.get<FileSystemGlobalMemoryBankRepository>('globalMemoryBankRepository');
    const branchRepository = await container.get<FileSystemBranchMemoryBankRepository>('branchMemoryBankRepository');
    // Get the branch memory bank root directory without using getBranchMemoryPath
    const config = configProvider.getConfig(); // Already removed await
    const branchMemoryBankRoot = path.join(config.docsRoot, 'branch-memory-bank');
    const globalMemoryBankPath = configProvider.getGlobalMemoryPath(); // Already removed await

    return new FileSystemTagIndexRepositoryV1Bridge(
      // fileSystemService as FileSystemService, // Removed unused argument
      branchMemoryBankRoot,
      globalMemoryBankPath,
      branchRepository,
      globalRepository
    );
  });

  // Register index service
  container.registerFactory('indexService', async () => {
    const fileSystemService = await container.get<IFileSystemService>('fileSystemService');
    const configProvider = await container.get<IConfigProvider>('configProvider');
    const config = configProvider.getConfig(); // Already removed await

    // Set up index root path
    const indexRoot = path.join(config.docsRoot, 'indices');

    return new IndexService(fileSystemService, indexRoot);
  });


  // Register i18n repository
  container.registerFactory('i18nRepository', async () => {
    // const fileSystemService = await container.get<IFileSystemService>('fileSystemService'); // Already removed
    const configProvider = await container.get<IConfigProvider>('configProvider');
    const config = configProvider.getConfig(); // Already removed await

    // Set up translations directory path
    const translationsDir = path.join(config.docsRoot, 'translations');

    // Import and instantiate the FileI18nRepository
    const { FileI18nRepository } = await import('../../infrastructure/i18n/FileI18nRepository.js');
    const i18nRepository = new FileI18nRepository(translationsDir);

    // Initialize the repository
    await i18nRepository.initialize().catch(error => {
      console.error('Failed to initialize i18n repository:', error);
    });

    return i18nRepository;
  });

  // Register JSON document repositories
  container.registerFactory('branchJsonDocumentRepository', async () => {
    const fileSystemService = await container.get<IFileSystemService>('fileSystemService');
    const indexService = await container.get<IIndexService>('indexService');
    const configProvider = await container.get<IConfigProvider>('configProvider');
    const config = configProvider.getConfig(); // Removed await

    // Branch JSON document root path
    const branchJsonRoot = path.join(config.docsRoot, 'branch-json');

    return new FileSystemJsonDocumentRepository(fileSystemService, indexService, branchJsonRoot);
  });

  container.registerFactory('globalJsonDocumentRepository', async () => {
    const fileSystemService = await container.get<IFileSystemService>('fileSystemService');
    const indexService = await container.get<IIndexService>('indexService');
    const configProvider = await container.get<IConfigProvider>('configProvider');
    const config = configProvider.getConfig(); // Removed await

    // Global JSON document root path
    const globalJsonRoot = path.join(config.docsRoot, 'global-json');

    return new FileSystemJsonDocumentRepository(fileSystemService, indexService, globalJsonRoot);
  });
}

/**
 * Register application services
 * @param container DI Container
 */
export async function registerApplicationServices(container: DIContainer): Promise<void> {
  // Register use cases
  container.registerFactory('readGlobalDocumentUseCase', async () => {
    // Use explicit type assertion for proper type safety
    const globalRepository = await container.get<FileSystemGlobalMemoryBankRepository>(
      'globalMemoryBankRepository'
    );

    return new ReadGlobalDocumentUseCase(globalRepository);
  });

  // Register mockup for markdown migration service
  container.registerFactory('markdownMigrationService', async () => {
    // Create a mock template repository since we're removing the actual implementation
    const mockTemplateRepository = {
      getTemplate: async () => null,
      getTemplateAsMarkdown: async () => '',
      getTemplatesByType: async () => [],
      saveTemplate: async () => false,
      templateExists: async () => false,
      getAllTemplateIds: async () => [],
      getAllTemplateTypes: async () => []
    };

    const configProvider = await container.get<IConfigProvider>('configProvider');
    const config = configProvider.getConfig();

    // Set up markdown and backup directory paths
    const markdownDir = path.join(config.docsRoot, 'templates', 'markdown');
    const backupDir = path.join(config.docsRoot, 'templates', 'backup');

    // Import and instantiate the MarkdownMigrationService
    const { MarkdownMigrationService } = await import('../../migration/MarkdownMigrationService.js');
    return new MarkdownMigrationService(mockTemplateRepository, markdownDir, backupDir);
  });

  container.registerFactory('writeBranchDocumentUseCase', () => {
    // Use explicit type assertion for proper type safety
    const branchRepository = container.get(
      'branchMemoryBankRepository'
    ) as FileSystemBranchMemoryBankRepository;

    // Use factory to get properly configured WriteBranchDocumentUseCase with migration settings
    return UseCaseFactory.createWriteBranchDocumentUseCase(branchRepository);
  });

  // Register common use cases
  container.registerFactory('readRulesUseCase', async () => {
    const configProvider = await container.get<IConfigProvider>('configProvider');
    const config = configProvider.getConfig(); // Removed await
    const rulesDir = config.docsRoot;

    // 同期的に新しいReadRulesUseCaseを作成 - コンバーターなしで
    return new ReadRulesUseCase(rulesDir);
  });

  container.registerFactory('readContextUseCase', async () => {
    const branchRepository = await container.get<FileSystemBranchMemoryBankRepository>(
      'branchMemoryBankRepository'
    );
    const globalRepository = await container.get<FileSystemGlobalMemoryBankRepository>(
      'globalMemoryBankRepository'
    );

    return new ReadContextUseCase(branchRepository, globalRepository);
  });

  container.registerFactory('searchDocumentsByTagsUseCase', async () => {
    // Use explicit type assertion for proper type safety
    const globalRepository = await container.get<FileSystemGlobalMemoryBankRepository>(
      'globalMemoryBankRepository'
    );
    const branchRepository = await container.get<FileSystemBranchMemoryBankRepository>(
      'branchMemoryBankRepository'
    );

    return new SearchDocumentsByTagsUseCase(globalRepository, branchRepository);
  });

  container.registerFactory('updateTagIndexUseCase', async () => {
    // Use explicit type assertion for proper type safety
    const globalRepository = await container.get<FileSystemGlobalMemoryBankRepository>(
      'globalMemoryBankRepository'
    );
    const branchRepository = await container.get<FileSystemBranchMemoryBankRepository>(
      'branchMemoryBankRepository'
    );

    return new UpdateTagIndexUseCase(globalRepository, branchRepository);
  });

  // Register the V2 version of the UpdateTagIndexUseCase
  container.registerFactory('updateTagIndexUseCaseV2', async () => {
    // Use explicit type assertion for proper type safety
    const globalRepository = await container.get<FileSystemGlobalMemoryBankRepository>(
      'globalMemoryBankRepository'
    );
    const branchRepository = await container.get<FileSystemBranchMemoryBankRepository>(
      'branchMemoryBankRepository'
    );
    const tagIndexRepository = await container.get<FileSystemTagIndexRepositoryV1Bridge>(
      'tagIndexRepository'
    );

    return new UpdateTagIndexUseCaseV2(globalRepository, branchRepository, tagIndexRepository);
  });

  // Register JSON document use cases
  container.registerFactory('readJsonDocumentUseCase', async () => {
    const branchJsonRepo = await container.get<IJsonDocumentRepository>('branchJsonDocumentRepository');
    const globalJsonRepo = await container.get<IJsonDocumentRepository>('globalJsonDocumentRepository');

    return new ReadJsonDocumentUseCase(branchJsonRepo, globalJsonRepo);
  });

  container.registerFactory('writeJsonDocumentUseCase', async () => {
    const branchJsonRepo = await container.get<IJsonDocumentRepository>('branchJsonDocumentRepository');
    const globalJsonRepo = await container.get<IJsonDocumentRepository>('globalJsonDocumentRepository');
    const indexService = await container.get<IIndexService>('indexService');

    return new WriteJsonDocumentUseCase(branchJsonRepo, indexService, globalJsonRepo);
  });

  container.registerFactory('deleteJsonDocumentUseCase', async () => {
    const branchJsonRepo = await container.get<IJsonDocumentRepository>('branchJsonDocumentRepository');
    const globalJsonRepo = await container.get<IJsonDocumentRepository>('globalJsonDocumentRepository');
    const indexService = await container.get<IIndexService>('indexService');

    return new DeleteJsonDocumentUseCase(branchJsonRepo, indexService, globalJsonRepo);
  });

  container.registerFactory('searchJsonDocumentsUseCase', async () => {
    const branchJsonRepo = await container.get<IJsonDocumentRepository>('branchJsonDocumentRepository');
    const globalJsonRepo = await container.get<IJsonDocumentRepository>('globalJsonDocumentRepository');

    return new SearchJsonDocumentsUseCase(branchJsonRepo, globalJsonRepo);
  });

  container.registerFactory('updateJsonIndexUseCase', async () => {
    const branchJsonRepo = await container.get<IJsonDocumentRepository>('branchJsonDocumentRepository');
    const globalJsonRepo = await container.get<IJsonDocumentRepository>('globalJsonDocumentRepository');
    const indexService = await container.get<IIndexService>('indexService');

    return new UpdateJsonIndexUseCase(branchJsonRepo, indexService, globalJsonRepo);
  });

  container.registerFactory('getRecentBranchesUseCase', async () => {
    // Use explicit type assertion for proper type safety
    const branchRepository = await container.get<FileSystemBranchMemoryBankRepository>(
      'branchMemoryBankRepository'
    );

    return new GetRecentBranchesUseCase(branchRepository);
  });

  // Register core files use cases
  container.registerFactory('readBranchCoreFilesUseCase', async () => {
    // Use explicit type assertion for proper type safety
    const branchRepository = await container.get<FileSystemBranchMemoryBankRepository>(
      'branchMemoryBankRepository'
    );

    return new ReadBranchCoreFilesUseCase(branchRepository);
  });

  container.registerFactory('createBranchCoreFilesUseCase', async () => {
    // Use explicit type assertion for proper type safety
    const branchRepository = await container.get<FileSystemBranchMemoryBankRepository>(
      'branchMemoryBankRepository'
    );

    return new CreateBranchCoreFilesUseCase(branchRepository);
  });

  // Register i18n service
  container.registerFactory('i18nService', async () => {
    const i18nRepository = container.get('i18nRepository') as II18nRepository;

    // Import and instantiate the I18nService
    const { I18nService } = await import('@/application/i18n/I18nService.js');
    return new I18nService(i18nRepository);
  });
}

/**
 * Register interface services
 * @param container DI Container
 */
export async function registerInterfaceServices(container: DIContainer): Promise<void> {
  // Register presenters
  container.register('mcpResponsePresenter', new MCPResponsePresenter());
  container.register('jsonResponsePresenter', new JsonResponsePresenter());

  // Register ContextController
  container.registerFactory('contextController', async () => {
    const readContextUseCase = await container.get<ReadContextUseCase>('readContextUseCase');
    const readRulesUseCase = await container.get<ReadRulesUseCase>('readRulesUseCase');

    return new ContextController(readContextUseCase, readRulesUseCase);
  });

  // Register JsonBranchController
  container.registerFactory('jsonBranchController', async () => {
    // Get required use cases
    const readJsonDocumentUseCase = await container.get<ReadJsonDocumentUseCase>('readJsonDocumentUseCase');
    const writeJsonDocumentUseCase = await container.get<WriteJsonDocumentUseCase>('writeJsonDocumentUseCase');
    const deleteJsonDocumentUseCase = await container.get<DeleteJsonDocumentUseCase>('deleteJsonDocumentUseCase');
    const searchJsonDocumentsUseCase = await container.get<SearchJsonDocumentsUseCase>('searchJsonDocumentsUseCase');
    const updateJsonIndexUseCase = await container.get<UpdateJsonIndexUseCase>('updateJsonIndexUseCase');
    const getRecentBranchesUseCase = await container.get<GetRecentBranchesUseCase>('getRecentBranchesUseCase');
    // JsonBranchController expects MCPResponsePresenter, not JsonResponsePresenter
    const presenter = await container.get<MCPResponsePresenter>('mcpResponsePresenter');

    return new JsonBranchController(
      readJsonDocumentUseCase,
      writeJsonDocumentUseCase,
      deleteJsonDocumentUseCase,
      searchJsonDocumentsUseCase,
      updateJsonIndexUseCase,
      getRecentBranchesUseCase,
      presenter
    );
  });

  // Register GlobalController
  container.registerFactory('globalController', async () => {
    const readGlobalDocumentUseCase = await container.get<ReadGlobalDocumentUseCase>('readGlobalDocumentUseCase');
    const writeGlobalDocumentUseCase = await container.get<WriteGlobalDocumentUseCase>('writeGlobalDocumentUseCase'); // ★ 型指定を追加
    const searchDocumentsByTagsUseCase = await container.get<SearchDocumentsByTagsUseCase>('searchDocumentsByTagsUseCase');
    const updateTagIndexUseCase = await container.get<UpdateTagIndexUseCase>('updateTagIndexUseCase');
    // Use the interface type for the presenter dependency
    const presenter = await container.get<import('@/interface/presenters/types/MCPResponsePresenter.js').MCPResponsePresenter>('mcpResponsePresenter');

    // Get optional use cases
    const updateTagIndexUseCaseV2 = await container.get<UpdateTagIndexUseCaseV2>('updateTagIndexUseCaseV2');
    const readJsonDocumentUseCase = await container.get<ReadJsonDocumentUseCase>('readJsonDocumentUseCase');
    const writeJsonDocumentUseCase = await container.get<WriteJsonDocumentUseCase>('writeJsonDocumentUseCase');
    const deleteJsonDocumentUseCase = await container.get<DeleteJsonDocumentUseCase>('deleteJsonDocumentUseCase');
    const searchJsonDocumentsUseCase = await container.get<SearchJsonDocumentsUseCase>('searchJsonDocumentsUseCase');
    const updateJsonIndexUseCase = await container.get<UpdateJsonIndexUseCase>('updateJsonIndexUseCase');

    return new GlobalController(
      readGlobalDocumentUseCase,
      writeGlobalDocumentUseCase,
      searchDocumentsByTagsUseCase,
      updateTagIndexUseCase, // Keep V1 for backwards compatibility
      presenter,
      {
        updateTagIndexUseCaseV2,
        readJsonDocumentUseCase,
        writeJsonDocumentUseCase,
        deleteJsonDocumentUseCase,
        searchJsonDocumentsUseCase,
        updateJsonIndexUseCase
      } // Pass optional dependencies
    );
  });

  // Register BranchController
  container.registerFactory('branchController', () => {
    // Use explicit type assertion for proper type safety
    const readBranchDocumentUseCase = container.get(
      'readBranchDocumentUseCase'
    ) as ReadBranchDocumentUseCase;
    const writeBranchDocumentUseCase = container.get(
      'writeBranchDocumentUseCase'
    ) as WriteBranchDocumentUseCase;
    const searchDocumentsByTagsUseCase = container.get(
      'searchDocumentsByTagsUseCase'
    ) as SearchDocumentsByTagsUseCase;
    const updateTagIndexUseCase = container.get('updateTagIndexUseCase') as UpdateTagIndexUseCase;
    const getRecentBranchesUseCase = container.get(
      'getRecentBranchesUseCase'
    ) as GetRecentBranchesUseCase;
    const readBranchCoreFilesUseCase = container.get(
      'readBranchCoreFilesUseCase'
    ) as ReadBranchCoreFilesUseCase;
    const createBranchCoreFilesUseCase = container.get(
      'createBranchCoreFilesUseCase'
    ) as CreateBranchCoreFilesUseCase;
    const presenter = container.get('mcpResponsePresenter') as MCPResponsePresenter;

    // Get optional use cases
    const updateTagIndexUseCaseV2 = container.get(
      'updateTagIndexUseCaseV2'
    ) as UpdateTagIndexUseCaseV2;
    const readJsonDocumentUseCase = container.get('readJsonDocumentUseCase') as ReadJsonDocumentUseCase;
    const writeJsonDocumentUseCase = container.get('writeJsonDocumentUseCase') as WriteJsonDocumentUseCase;
    const deleteJsonDocumentUseCase = container.get('deleteJsonDocumentUseCase') as DeleteJsonDocumentUseCase;
    const searchJsonDocumentsUseCase = container.get('searchJsonDocumentsUseCase') as SearchJsonDocumentsUseCase;
    const updateJsonIndexUseCase = container.get('updateJsonIndexUseCase') as UpdateJsonIndexUseCase;

    return new BranchController(
      readBranchDocumentUseCase,
      writeBranchDocumentUseCase,
      searchDocumentsByTagsUseCase,
      updateTagIndexUseCase, // Keep V1 for backwards compatibility
      getRecentBranchesUseCase,
      readBranchCoreFilesUseCase,
      createBranchCoreFilesUseCase,
      presenter,
      {
        updateTagIndexUseCaseV2,
        readJsonDocumentUseCase,
        writeJsonDocumentUseCase,
        deleteJsonDocumentUseCase,
        searchJsonDocumentsUseCase,
        updateJsonIndexUseCase,
      } // Pass optional dependencies
    );
  });
}

/**
 * Initialize repositories
 * @param container DI Container
 */
export async function initializeRepositories(container: DIContainer): Promise<void> {
  // Initialize global memory bank
  const globalRepository = await container.get<FileSystemGlobalMemoryBankRepository>(
    'globalMemoryBankRepository'
  );
  await globalRepository.initialize();

  // Note: Branch repositories are initialized on-demand when a branch is accessed
}

/**
 * Setup DI container and register all services
 * @param options CLI options
 * @returns Configured DI container
 */
export async function setupContainer(options?: CliOptions): Promise<DIContainer> {
  const container = new DIContainer();

  // Register services
  await registerInfrastructureServices(container, options);
  registerApplicationServices(container);
  registerInterfaceServices(container);

  // Initialize repositories
  await initializeRepositories(container);

  return container;
}
