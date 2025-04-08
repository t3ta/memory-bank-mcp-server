// Import DIContainer for both type and value usage, then re-export it.
import { DIContainer } from './DIContainer.js';
export { DIContainer };
import { fileURLToPath } from 'node:url'; // Import fileURLToPath
import { MCPResponsePresenter } from '../../interface/presenters/MCPResponsePresenter.js';
import { IBranchMemoryBankRepository } from '../../domain/repositories/IBranchMemoryBankRepository.js'; // Import interface
import { JsonPatchService } from '../../domain/jsonpatch/JsonPatchService.js'; // Import interface
import { ReadGlobalDocumentUseCase } from '../../application/usecases/global/ReadGlobalDocumentUseCase.js';
import { WriteGlobalDocumentUseCase } from '../../application/usecases/global/WriteGlobalDocumentUseCase.js';
import path from 'node:path';
import { IndexService } from '../../infrastructure/index/IndexService.js';
import { IIndexService } from '../../infrastructure/index/interfaces/IIndexService.js';
import { FileSystemJsonDocumentRepository } from '../../infrastructure/repositories/file-system/FileSystemJsonDocumentRepository.js';
import { IJsonDocumentRepository } from '../../domain/repositories/IJsonDocumentRepository.js';
import { II18nRepository } from '../../domain/i18n/II18nRepository.js';
import { ITemplateRepository } from '../../domain/templates/ITemplateRepository.js'; // Added import
import { ReadRulesUseCase } from '../../application/usecases/common/ReadRulesUseCase.js';
import { ReadContextUseCase } from '../../application/usecases/common/ReadContextUseCase.js';
import { ReadBranchDocumentUseCase } from '../../application/usecases/branch/ReadBranchDocumentUseCase.js';
import { WriteBranchDocumentUseCase } from '../../application/usecases/branch/WriteBranchDocumentUseCase.js';
import { DocumentWriterService } from '../../application/services/DocumentWriterService.js'; // Import DocumentWriterService
import { SearchDocumentsByTagsUseCase } from '../../application/usecases/common/SearchDocumentsByTagsUseCase.js';
import { UpdateTagIndexUseCase } from '../../application/usecases/common/UpdateTagIndexUseCase.js';
import { UpdateTagIndexUseCaseV2 } from '../../application/usecases/common/UpdateTagIndexUseCaseV2.js';
import { GetRecentBranchesUseCase } from '../../application/usecases/common/GetRecentBranchesUseCase.js';
import { CreateBranchCoreFilesUseCase } from '../../application/usecases/common/CreateBranchCoreFilesUseCase.js';
import { ReadJsonDocumentUseCase } from '../../application/usecases/json/ReadJsonDocumentUseCase.js';
import { WriteJsonDocumentUseCase } from '../../application/usecases/json/WriteJsonDocumentUseCase.js';
import { DeleteJsonDocumentUseCase } from '../../application/usecases/json/DeleteJsonDocumentUseCase.js';
import { SearchJsonDocumentsUseCase } from '../../application/usecases/json/SearchJsonDocumentsUseCase.js';
import { UpdateJsonIndexUseCase } from '../../application/usecases/json/UpdateJsonIndexUseCase.js';
import { TemplateService } from '../../application/templates/TemplateService.js'; // Added import
import { I18nService } from '../../application/i18n/I18nService.js'; // Import I18nService
import { IFileSystemService } from '../../infrastructure/storage/interfaces/IFileSystemService.js';
import { FileSystemService } from '../../infrastructure/storage/FileSystemService.js';
import { IConfigProvider } from '../../infrastructure/config/interfaces/IConfigProvider.js';
import { ConfigProvider } from '../../infrastructure/config/ConfigProvider.js';
import { FileSystemGlobalMemoryBankRepository } from '../../infrastructure/repositories/file-system/FileSystemGlobalMemoryBankRepository.js';
import { FileSystemBranchMemoryBankRepository } from '../../infrastructure/repositories/file-system/FileSystemBranchMemoryBankRepository.js';
import { FileSystemTagIndexRepositoryV1Bridge } from '../../infrastructure/repositories/file-system/FileSystemTagIndexRepositoryV1Bridge.js';
import { FileTemplateRepository } from '../../infrastructure/templates/FileTemplateRepository.js'; // Added import
import { ContextController } from '../../interface/controllers/ContextController.js';
import { JsonResponsePresenter } from '../../interface/presenters/JsonResponsePresenter.js';
import { GlobalController } from '../../interface/controllers/GlobalController.js';
import { BranchController } from '../../interface/controllers/BranchController.js';
import { JsonBranchController } from '../../interface/controllers/json/JsonBranchController.js';

import { CliOptions } from '../../infrastructure/config/WorkspaceConfig.js';
// Removed unused import: import { UseCaseFactory } from '../../factory/use-case-factory.js';
import { ReadBranchCoreFilesUseCase } from '../../application/usecases/index.js';
import { GitService } from '../../infrastructure/git/GitService.js';
import { IGitService } from '../../infrastructure/git/IGitService.js';

/**
 * Register infrastructure services
 * @param container DI Container
 * @param options CLI options
 */
export async function registerInfrastructureServices(
  container: DIContainer,
  options?: CliOptions
): Promise<void> {
  // Register concrete class for FileSystemService
  container.register<FileSystemService>('fileSystemService', new FileSystemService());

  const configProvider = new ConfigProvider();
  container.register<IConfigProvider>('configProvider', configProvider);
  logger.debug('Initializing ConfigProvider...'); // Log before config init
  await configProvider.initialize(options);
  logger.debug('ConfigProvider initialized.'); // Log after config init

  container.registerFactory('globalMemoryBankRepository', async () => {
    logger.debug('Resolving dependencies for globalMemoryBankRepository...');
    const fileSystemService = await container.get<IFileSystemService>('fileSystemService');
    const configProvider = await container.get<IConfigProvider>('configProvider');
    logger.debug('Dependencies resolved for globalMemoryBankRepository.');
    return new FileSystemGlobalMemoryBankRepository(fileSystemService, configProvider);
  });

  container.registerFactory('branchMemoryBankRepository', async () => {
    logger.debug('Resolving dependencies for branchMemoryBankRepository...');
    // Get config provider to resolve root path
    const configProvider = await container.get<IConfigProvider>('configProvider');
    logger.debug('Resolved configProvider for branchMemoryBankRepository.');
    const config = configProvider.getConfig();
    // Pass the root path (docsRoot) to the constructor
    return new FileSystemBranchMemoryBankRepository(config.docsRoot);
  });

  container.registerFactory('tagIndexRepository', async () => {
    logger.debug('Resolving dependencies for tagIndexRepository...');
    const configProvider = await container.get<IConfigProvider>('configProvider');
    logger.debug('Resolved configProvider for tagIndexRepository.');
    const globalRepository = await container.get<FileSystemGlobalMemoryBankRepository>('globalMemoryBankRepository');
    logger.debug('Resolved globalRepository for tagIndexRepository.');
    const branchRepository = await container.get<FileSystemBranchMemoryBankRepository>('branchMemoryBankRepository');
    logger.debug('Resolved branchRepository for tagIndexRepository.');
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
    logger.debug('Resolving dependencies for indexService...');
    const fileSystemService = await container.get<IFileSystemService>('fileSystemService');
    logger.debug('Resolved fileSystemService for indexService.');
    const configProvider = await container.get<IConfigProvider>('configProvider');
    logger.debug('Resolved configProvider for indexService.');
    const config = configProvider.getConfig();
    const indexRoot = path.join(config.docsRoot, 'indices');
    return new IndexService(fileSystemService, indexRoot);
  });


  container.registerFactory('i18nRepository', async () => {
    // Resolve absolute path from project root for built files
    const __filename_i18n = fileURLToPath(import.meta.url);
    const __dirname_i18n = path.dirname(__filename_i18n);
    // Assuming providers.ts is in dist/main/di after build
    // Assuming providers.ts is in dist/main/di after build, go up 5 levels
    const projectRoot_i18n = path.resolve(__dirname_i18n, '../../../../../'); // Corrected path depth
    const translationsDir = path.join(projectRoot_i18n, 'packages/mcp/dist/infrastructure/i18n/translations');
    logger.debug(`[DI] Initializing i18nRepository with translationsDir: ${translationsDir}`);
    const { FileI18nRepository } = await import('../../infrastructure/i18n/FileI18nRepository.js');
    const i18nRepository = new FileI18nRepository(translationsDir);
    await i18nRepository.initialize(); // Let errors propagate
    return i18nRepository;
  });

  container.registerFactory('branchJsonDocumentRepository', async () => {
    logger.debug('Resolving dependencies for branchJsonDocumentRepository...');
    const fileSystemService = await container.get<IFileSystemService>('fileSystemService');
    logger.debug('Resolved fileSystemService for branchJsonDocumentRepository.');
    const indexService = await container.get<IIndexService>('indexService');
    logger.debug('Resolved indexService for branchJsonDocumentRepository.');
    const configProvider = await container.get<IConfigProvider>('configProvider');
    logger.debug('Resolved configProvider for branchJsonDocumentRepository.');
    const config = configProvider.getConfig();
    const branchJsonRoot = path.join(config.docsRoot, 'branch-json');
    return new FileSystemJsonDocumentRepository(fileSystemService, indexService, branchJsonRoot);
  });

  container.registerFactory('globalJsonDocumentRepository', async () => {
    logger.debug('Resolving dependencies for globalJsonDocumentRepository...');
    const fileSystemService = await container.get<IFileSystemService>('fileSystemService');
    logger.debug('Resolved fileSystemService for globalJsonDocumentRepository.');
    const indexService = await container.get<IIndexService>('indexService');
    logger.debug('Resolved indexService for globalJsonDocumentRepository.');
    const configProvider = await container.get<IConfigProvider>('configProvider');
    logger.debug('Resolved configProvider for globalJsonDocumentRepository.');
    const config = configProvider.getConfig();
    const globalJsonRoot = path.join(config.docsRoot, 'global-json');
    return new FileSystemJsonDocumentRepository(fileSystemService, indexService, globalJsonRoot);
  });
  // Register FileTemplateRepository
  // Register TemplateRepository using registerFactory (it behaves as singleton)
  // container.registerFactory('templateRepository', async () => {
  //   logger.debug('Resolving dependencies for templateRepository...');
  //   // Resolve absolute path from project root for built files
  //   const __filename_tmpl = fileURLToPath(import.meta.url); // Use different variable names
  //   const __dirname_tmpl = path.dirname(__filename_tmpl);
  //   // Assuming providers.ts is in dist/main/di after build
  //   // Assuming providers.ts is in dist/main/di after build, go up 5 levels
  //   // Assuming providers.ts is in dist/main/di after build, go up 5 levels
  //   const projectRoot_tmpl = path.resolve(__dirname_tmpl, '../../../../../'); // Corrected path depth (already correct here, but ensure consistency)
  //   const templateBasePath = path.join(projectRoot_tmpl, 'packages/mcp/dist/templates/json');
  //   logger.debug(`Template base path resolved to: ${templateBasePath}`);
  //   const i18nService = await container.get<I18nService>('i18nService');
  //   const templateRepository = new FileTemplateRepository(templateBasePath, i18nService);
  //   await templateRepository.initialize();
  //   logger.debug('templateRepository initialized.');
  //   return templateRepository;
  // });



  container.register<IGitService>('gitService', new GitService());
  logger.debug('GitService registered.');
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

  // Add missing registration for writeGlobalDocumentUseCase
  container.registerFactory('writeGlobalDocumentUseCase', async () => {
    const globalRepository = await container.get<FileSystemGlobalMemoryBankRepository>(
     'globalMemoryBankRepository'
   );
   const patchService = await container.get<JsonPatchService>('jsonPatchService'); // Resolve JsonPatchService
   const documentWriterService = new DocumentWriterService(patchService); // Instantiate DocumentWriterService
   return new WriteGlobalDocumentUseCase(globalRepository, documentWriterService); // Inject DocumentWriterService
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

  // Register JsonPatchService implementation (using the refactored adapter)
  container.registerFactory('jsonPatchService', async () => {
      // Import the NEW adapter class
      const { FastJsonPatchAdapter } = await import('../../domain/jsonpatch/FastJsonPatchAdapter.js'); // Use the new adapter
      return new FastJsonPatchAdapter(); // Instantiate the new adapter
  });

  // Make the factory async and await the repository and patch service
  container.registerFactory('writeBranchDocumentUseCase', async () => {
    const branchRepository = await container.get<IBranchMemoryBankRepository>( // Use interface type
      'branchMemoryBankRepository'
    );
   const patchService = await container.get<JsonPatchService>('jsonPatchService'); // Resolve JsonPatchService
   const gitService = await container.get<IGitService>('gitService');
   const configProvider = await container.get<IConfigProvider>('configProvider');
   // Instantiate DocumentWriterService
   const documentWriterService = new DocumentWriterService(patchService);
   // Instantiate the use case with DocumentWriterService
   return new WriteBranchDocumentUseCase(branchRepository, documentWriterService, gitService, configProvider);
  });

  // Add missing registration for readBranchDocumentUseCase
  container.registerFactory('readBranchDocumentUseCase', async () => {
    const branchRepository = await container.get<FileSystemBranchMemoryBankRepository>(
      'branchMemoryBankRepository'
    );
    const gitService = await container.get<IGitService>('gitService');
    const configProvider = await container.get<IConfigProvider>('configProvider');
    return new ReadBranchDocumentUseCase(branchRepository, gitService, configProvider);
  });

  container.registerFactory('readRulesUseCase', async () => {
    const configProvider = await container.get<IConfigProvider>('configProvider'); // Get configProvider within the factory scope
    const config = configProvider.getConfig();
    const rulesDir = config.docsRoot; // Keep fallback path for now
    const templateLoader = await container.get<TemplateService>('templateService'); // Get TemplateService ★コメント解除★
    return new ReadRulesUseCase(rulesDir, templateLoader); // Pass templateLoader ★引数に追加★
  });

  container.registerFactory('readContextUseCase', async () => {
    const branchRepository = await container.get<FileSystemBranchMemoryBankRepository>(
      'branchMemoryBankRepository'
    );
    const globalRepository = await container.get<FileSystemGlobalMemoryBankRepository>(
      'globalMemoryBankRepository'
    );
    // --- Resolve additional dependencies ---
    const gitService = await container.get<IGitService>('gitService');
    const configProvider = await container.get<IConfigProvider>('configProvider');
    // --- Pass all dependencies to the constructor ---
    return new ReadContextUseCase(branchRepository, globalRepository, gitService, configProvider);
  });

  // Register the updated SearchDocumentsByTagsUseCase
  container.registerFactory('searchDocumentsByTagsUseCase', async () => {
    const fileSystemService = await container.get<IFileSystemService>('fileSystemService');
    return new SearchDocumentsByTagsUseCase(fileSystemService);
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

  // Register I18nService using registerFactory (it behaves as singleton)
  container.registerFactory('i18nService', async () => {
    const i18nRepository = await container.get<II18nRepository>('i18nRepository');
    const { I18nService } = await import('../../application/i18n/I18nService.js');
    const i18nService = new I18nService(i18nRepository);
    await i18nService.loadAllTranslations();
    return i18nService;
  });
  // Register TemplateRepository after I18nService is initialized
  container.registerFactory('templateRepository', async () => {
    logger.debug('Resolving dependencies for templateRepository...');
    // Resolve absolute path from project root for built files
    const __filename_tmpl = fileURLToPath(import.meta.url); // Use different variable names
    const __dirname_tmpl = path.dirname(__filename_tmpl);
    // Assuming providers.ts is in dist/main/di after build, go up 5 levels
    const projectRoot_tmpl = path.resolve(__dirname_tmpl, '../../../../../'); // Corrected path depth
    const templateBasePath = path.join(projectRoot_tmpl, 'packages/mcp/dist/templates/json');
    logger.debug(`Template base path resolved to: ${templateBasePath}`);
    const i18nService = await container.get<I18nService>('i18nService'); // i18nService is now guaranteed to be initialized
    const templateRepository = new FileTemplateRepository(templateBasePath, i18nService);
    await templateRepository.initialize(); // Initialize after getting i18nService
    logger.debug('templateRepository initialized.');
    return templateRepository;
  });


  // Register TemplateService
  container.registerFactory('templateService', async () => {
    logger.debug('Resolving dependencies for templateService...');
    const templateRepository = await container.get<ITemplateRepository>('templateRepository');
    logger.debug('Resolved templateRepository for templateService.');
    return new TemplateService(templateRepository);
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
    // Inject both old and new search use cases for now
    const searchDocumentsByTagsUseCase = await container.get<SearchDocumentsByTagsUseCase>('searchDocumentsByTagsUseCase'); // Inject the new one (registered with the same key for now)
    const updateTagIndexUseCase = await container.get<UpdateTagIndexUseCase>('updateTagIndexUseCase');
    const presenter = await container.get<MCPResponsePresenter>('mcpResponsePresenter');
    const configProvider = await container.get<IConfigProvider>('configProvider'); // Get ConfigProvider

    // Optional dependencies
    const updateTagIndexUseCaseV2 = await container.get<UpdateTagIndexUseCaseV2>('updateTagIndexUseCaseV2');
    const readJsonDocumentUseCase = await container.get<ReadJsonDocumentUseCase>('readJsonDocumentUseCase');
    const writeJsonDocumentUseCase = await container.get<WriteJsonDocumentUseCase>('writeJsonDocumentUseCase');
    const deleteJsonDocumentUseCase = await container.get<DeleteJsonDocumentUseCase>('deleteJsonDocumentUseCase');
    const searchJsonDocumentsUseCase = await container.get<SearchJsonDocumentsUseCase>('searchJsonDocumentsUseCase');
    const updateJsonIndexUseCaseJson = await container.get<UpdateJsonIndexUseCase>('updateJsonIndexUseCase'); // Renamed variable

    return new GlobalController(
      readGlobalDocumentUseCase,
      writeGlobalDocumentUseCase,
      searchDocumentsByTagsUseCase,
      updateTagIndexUseCase,
      presenter,
      configProvider,
      {
        updateTagIndexUseCaseV2,
        readJsonDocumentUseCase,
        writeJsonDocumentUseCase,
        deleteJsonDocumentUseCase,
        searchJsonDocumentsUseCase,
        updateJsonIndexUseCase: updateJsonIndexUseCaseJson
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
    // Inject IConfigProvider here as well
    const configProvider = await container.get<IConfigProvider>('configProvider');
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
      presenter,
      configProvider // Pass configProvider to constructor
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
// import { logger } from '@/shared/utils/logger.js'; // Use alias for logger import - Re-importing logger where needed
import { logger } from '../../shared/utils/logger.js';

export async function setupContainer(options?: CliOptions): Promise<DIContainer> {
  logger.info('Setting up DI container...'); // Restore original log level and message

  const container = new DIContainer();

  logger.debug('Registering infrastructure services...');
  await registerInfrastructureServices(container, options);
  logger.debug('Infrastructure services registered.');

  logger.debug('Registering application services...');
  await registerApplicationServices(container); // Restore await
  logger.debug('Application services registered.');

  logger.debug('Registering interface services...');
  await registerInterfaceServices(container); // Restore await
  logger.debug('Interface services registered.');

  logger.debug('Initializing repositories...');
  await initializeRepositories(container); // Restore await and call
  logger.debug('Repositories initialized.'); // Restore log

  logger.info('DI container setup complete'); // Restore original log level and message
  return container;
}
