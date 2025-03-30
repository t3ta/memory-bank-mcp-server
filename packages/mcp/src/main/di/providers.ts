import { DIContainer } from './DIContainer.js';
import { MCPResponsePresenter } from '@/interface/presenters/MCPResponsePresenter.js';
import { ReadGlobalDocumentUseCase } from '@/application/usecases/global/ReadGlobalDocumentUseCase.js';
import { WriteGlobalDocumentUseCase } from '@/application/usecases/global/WriteGlobalDocumentUseCase.js';
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

import { CliOptions } from '@/infrastructure/config/WorkspaceConfig.js';
import { UseCaseFactory } from '@/factory/use-case-factory.js';
import { ReadBranchCoreFilesUseCase } from '@/application/usecases/index.js';

/**
 * Register infrastructure services
 * @param container DI Container
 * @param options CLI options
 */
export async function registerInfrastructureServices(
  container: DIContainer,
  options?: CliOptions
): Promise<void> {
  container.register<IFileSystemService>('fileSystemService', new FileSystemService());

  const configProvider = new ConfigProvider();
  container.register<IConfigProvider>('configProvider', configProvider);
  await configProvider.initialize(options);

  container.registerFactory('globalMemoryBankRepository', async () => {
    const fileSystemService = await container.get<IFileSystemService>('fileSystemService');
    const configProvider = await container.get<IConfigProvider>('configProvider');
    return new FileSystemGlobalMemoryBankRepository(fileSystemService, configProvider);
  });

  container.registerFactory('branchMemoryBankRepository', async () => {
    const fileSystemService = await container.get<FileSystemService>('fileSystemService');
    return new FileSystemBranchMemoryBankRepository(fileSystemService);
  });

  container.registerFactory('tagIndexRepository', async () => {
    const configProvider = await container.get<IConfigProvider>('configProvider');
    const globalRepository = await container.get<FileSystemGlobalMemoryBankRepository>('globalMemoryBankRepository');
    const branchRepository = await container.get<FileSystemBranchMemoryBankRepository>('branchMemoryBankRepository');
    const config = configProvider.getConfig();
    const branchMemoryBankRoot = path.join(config.docsRoot, 'branch-memory-bank');
    const globalMemoryBankPath = configProvider.getGlobalMemoryPath();

    return new FileSystemTagIndexRepositoryV1Bridge(
      branchMemoryBankRoot,
      globalMemoryBankPath,
      branchRepository,
      globalRepository
    );
  });

  container.registerFactory('indexService', async () => {
    const fileSystemService = await container.get<IFileSystemService>('fileSystemService');
    const configProvider = await container.get<IConfigProvider>('configProvider');
    const config = configProvider.getConfig();
    const indexRoot = path.join(config.docsRoot, 'indices');
    return new IndexService(fileSystemService, indexRoot);
  });


  container.registerFactory('i18nRepository', async () => {
    const configProvider = await container.get<IConfigProvider>('configProvider');
    const config = configProvider.getConfig();
    const translationsDir = path.join(config.docsRoot, 'translations');
    const { FileI18nRepository } = await import('../../infrastructure/i18n/FileI18nRepository.js');
    const i18nRepository = new FileI18nRepository(translationsDir);
    await i18nRepository.initialize().catch(error => {
      console.error('Failed to initialize i18n repository:', error);
    });
    return i18nRepository;
  });

  container.registerFactory('branchJsonDocumentRepository', async () => {
    const fileSystemService = await container.get<IFileSystemService>('fileSystemService');
    const indexService = await container.get<IIndexService>('indexService');
    const configProvider = await container.get<IConfigProvider>('configProvider');
    const config = configProvider.getConfig();
    const branchJsonRoot = path.join(config.docsRoot, 'branch-json');
    return new FileSystemJsonDocumentRepository(fileSystemService, indexService, branchJsonRoot);
  });

  container.registerFactory('globalJsonDocumentRepository', async () => {
    const fileSystemService = await container.get<IFileSystemService>('fileSystemService');
    const indexService = await container.get<IIndexService>('indexService');
    const configProvider = await container.get<IConfigProvider>('configProvider');
    const config = configProvider.getConfig();
    const globalJsonRoot = path.join(config.docsRoot, 'global-json');
    return new FileSystemJsonDocumentRepository(fileSystemService, indexService, globalJsonRoot);
  });
}

/**
 * Register application services
 * @param container DI Container
 */
export async function registerApplicationServices(container: DIContainer): Promise<void> {
  container.registerFactory('readGlobalDocumentUseCase', async () => {
    const globalRepository = await container.get<FileSystemGlobalMemoryBankRepository>(
      'globalMemoryBankRepository'
    );
    return new ReadGlobalDocumentUseCase(globalRepository);
  });

  container.registerFactory('markdownMigrationService', async () => {
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
    const markdownDir = path.join(config.docsRoot, 'templates', 'markdown');
    const backupDir = path.join(config.docsRoot, 'templates', 'backup');
    const { MarkdownMigrationService } = await import('../../migration/MarkdownMigrationService.js');
    return new MarkdownMigrationService(mockTemplateRepository, markdownDir, backupDir);
  });

  container.registerFactory('writeBranchDocumentUseCase', () => {
    const branchRepository = container.get(
      'branchMemoryBankRepository'
    ) as FileSystemBranchMemoryBankRepository;
    return UseCaseFactory.createWriteBranchDocumentUseCase(branchRepository);
  });

  container.registerFactory('readRulesUseCase', async () => {
    const configProvider = await container.get<IConfigProvider>('configProvider');
    const config = configProvider.getConfig();
    const rulesDir = config.docsRoot;
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
    const globalRepository = await container.get<FileSystemGlobalMemoryBankRepository>(
      'globalMemoryBankRepository'
    );
    const branchRepository = await container.get<FileSystemBranchMemoryBankRepository>(
      'branchMemoryBankRepository'
    );
    return new SearchDocumentsByTagsUseCase(globalRepository, branchRepository);
  });

  container.registerFactory('updateTagIndexUseCase', async () => {
    const globalRepository = await container.get<FileSystemGlobalMemoryBankRepository>(
      'globalMemoryBankRepository'
    );
    const branchRepository = await container.get<FileSystemBranchMemoryBankRepository>(
      'branchMemoryBankRepository'
    );
    return new UpdateTagIndexUseCase(globalRepository, branchRepository);
  });

  container.registerFactory('updateTagIndexUseCaseV2', async () => {
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
    const branchRepository = await container.get<FileSystemBranchMemoryBankRepository>(
      'branchMemoryBankRepository'
    );
    return new GetRecentBranchesUseCase(branchRepository);
  });

  container.registerFactory('readBranchCoreFilesUseCase', async () => {
    const branchRepository = await container.get<FileSystemBranchMemoryBankRepository>(
      'branchMemoryBankRepository'
    );
    return new ReadBranchCoreFilesUseCase(branchRepository);
  });

  container.registerFactory('createBranchCoreFilesUseCase', async () => {
    const branchRepository = await container.get<FileSystemBranchMemoryBankRepository>(
      'branchMemoryBankRepository'
    );
    return new CreateBranchCoreFilesUseCase(branchRepository);
  });

  container.registerFactory('i18nService', async () => {
    const i18nRepository = container.get('i18nRepository') as II18nRepository;
    const { I18nService } = await import('@/application/i18n/I18nService.js');
    return new I18nService(i18nRepository);
  });
}

/**
 * Register interface services
 * @param container DI Container
 */
export async function registerInterfaceServices(container: DIContainer): Promise<void> {
  container.register('mcpResponsePresenter', new MCPResponsePresenter());
  container.register('jsonResponsePresenter', new JsonResponsePresenter());

  container.registerFactory('contextController', async () => {
    const readContextUseCase = await container.get<ReadContextUseCase>('readContextUseCase');
    const readRulesUseCase = await container.get<ReadRulesUseCase>('readRulesUseCase');
    return new ContextController(readContextUseCase, readRulesUseCase);
  });

  container.registerFactory('jsonBranchController', async () => {
    const readJsonDocumentUseCase = await container.get<ReadJsonDocumentUseCase>('readJsonDocumentUseCase');
    const writeJsonDocumentUseCase = await container.get<WriteJsonDocumentUseCase>('writeJsonDocumentUseCase');
    const deleteJsonDocumentUseCase = await container.get<DeleteJsonDocumentUseCase>('deleteJsonDocumentUseCase');
    const searchJsonDocumentsUseCase = await container.get<SearchJsonDocumentsUseCase>('searchJsonDocumentsUseCase');
    const updateJsonIndexUseCase = await container.get<UpdateJsonIndexUseCase>('updateJsonIndexUseCase');
    const getRecentBranchesUseCase = await container.get<GetRecentBranchesUseCase>('getRecentBranchesUseCase');
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

  container.registerFactory('globalController', async () => {
    const readGlobalDocumentUseCase = await container.get<ReadGlobalDocumentUseCase>('readGlobalDocumentUseCase');
    const writeGlobalDocumentUseCase = await container.get<WriteGlobalDocumentUseCase>('writeGlobalDocumentUseCase');
    const searchDocumentsByTagsUseCase = await container.get<SearchDocumentsByTagsUseCase>('searchDocumentsByTagsUseCase');
    const updateTagIndexUseCase = await container.get<UpdateTagIndexUseCase>('updateTagIndexUseCase');
    const presenter = await container.get<import('@/interface/presenters/types/MCPResponsePresenter.js').MCPResponsePresenter>('mcpResponsePresenter');

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
      updateTagIndexUseCase,
      presenter,
      {
        updateTagIndexUseCaseV2,
        readJsonDocumentUseCase,
        writeJsonDocumentUseCase,
        deleteJsonDocumentUseCase,
        searchJsonDocumentsUseCase,
        updateJsonIndexUseCase
      }
    );
  });

  container.registerFactory('branchController', async () => {
    const readBranchDocumentUseCase = await container.get<ReadBranchDocumentUseCase>(
      'readBranchDocumentUseCase'
    );
    const writeBranchDocumentUseCase = await container.get<WriteBranchDocumentUseCase>(
      'writeBranchDocumentUseCase'
    );
    const searchDocumentsByTagsUseCase = await container.get<SearchDocumentsByTagsUseCase>(
      'searchDocumentsByTagsUseCase'
    );
    const updateTagIndexUseCase = await container.get<UpdateTagIndexUseCase>('updateTagIndexUseCase');
    const getRecentBranchesUseCase = await container.get<GetRecentBranchesUseCase>(
      'getRecentBranchesUseCase'
    );
    const readBranchCoreFilesUseCase = await container.get<ReadBranchCoreFilesUseCase>(
      'readBranchCoreFilesUseCase'
    );
    const createBranchCoreFilesUseCase = await container.get<CreateBranchCoreFilesUseCase>(
      'createBranchCoreFilesUseCase'
    );
    const presenter = await container.get<MCPResponsePresenter>('mcpResponsePresenter');

    return new BranchController(
      readBranchDocumentUseCase,
      writeBranchDocumentUseCase,
      searchDocumentsByTagsUseCase,
      updateTagIndexUseCase,
      getRecentBranchesUseCase,
      readBranchCoreFilesUseCase,
      createBranchCoreFilesUseCase,
      presenter
    );
  });
}

/**
 * Initialize repositories
 * @param container DI Container
 */
export async function initializeRepositories(container: DIContainer): Promise<void> {
  const globalRepository = await container.get<FileSystemGlobalMemoryBankRepository>(
    'globalMemoryBankRepository'
  );
  await globalRepository.initialize();
}

/**
 * Setup DI container and register all services
 * @param options CLI options
 * @returns Configured DI container
 */
export async function setupContainer(options?: CliOptions): Promise<DIContainer> {
  const container = new DIContainer();

  await registerInfrastructureServices(container, options);
  registerApplicationServices(container);
  registerInterfaceServices(container);

  await initializeRepositories(container);

  return container;
}
