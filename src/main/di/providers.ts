import { DIContainer } from './DIContainer.js';
import { MCPResponsePresenter } from '../../interface/presenters/MCPResponsePresenter.js';
import { ReadGlobalDocumentUseCase } from '../../application/usecases/global/ReadGlobalDocumentUseCase.js';
import path from 'node:path';
import { IndexService } from '../../infrastructure/index/IndexService.js';
import { IIndexService } from '../../infrastructure/index/interfaces/IIndexService.js';
import { FileSystemJsonDocumentRepository } from '../../infrastructure/repositories/file-system/FileSystemJsonDocumentRepository.js';
import { IJsonDocumentRepository } from '../../domain/repositories/IJsonDocumentRepository.js';

// Domain layer

import { ReadRulesUseCase } from '../../application/usecases/common/ReadRulesUseCase.js';
import { ReadContextUseCase } from '../../application/usecases/common/ReadContextUseCase.js';
import { WriteGlobalDocumentUseCase } from '../../application/usecases/global/WriteGlobalDocumentUseCase.js';
import { ReadBranchDocumentUseCase } from '../../application/usecases/branch/ReadBranchDocumentUseCase.js';
import { WriteBranchDocumentUseCase } from '../../application/usecases/branch/WriteBranchDocumentUseCase.js';
import { SearchDocumentsByTagsUseCase } from '../../application/usecases/common/SearchDocumentsByTagsUseCase.js';
import { UpdateTagIndexUseCase } from '../../application/usecases/common/UpdateTagIndexUseCase.js';
import { UpdateTagIndexUseCaseV2 } from '../../application/usecases/common/UpdateTagIndexUseCaseV2.js';
import { GetRecentBranchesUseCase } from '../../application/usecases/common/GetRecentBranchesUseCase.js';
import { ReadBranchCoreFilesUseCase } from '../../application/usecases/common/ReadBranchCoreFilesUseCase.js';
import { CreateBranchCoreFilesUseCase } from '../../application/usecases/common/CreateBranchCoreFilesUseCase.js';
import { ReadJsonDocumentUseCase } from '../../application/usecases/json/ReadJsonDocumentUseCase.js';
import { WriteJsonDocumentUseCase } from '../../application/usecases/json/WriteJsonDocumentUseCase.js';
import { DeleteJsonDocumentUseCase } from '../../application/usecases/json/DeleteJsonDocumentUseCase.js';
import { SearchJsonDocumentsUseCase } from '../../application/usecases/json/SearchJsonDocumentsUseCase.js';
import { UpdateJsonIndexUseCase } from '../../application/usecases/json/UpdateJsonIndexUseCase.js';

// Infrastructure layer
import { IFileSystemService } from '../../infrastructure/storage/interfaces/IFileSystemService.js';
import { FileSystemService } from '../../infrastructure/storage/FileSystemService.js';
import { IConfigProvider } from '../../infrastructure/config/interfaces/IConfigProvider.js';
import { ConfigProvider } from '../../infrastructure/config/ConfigProvider.js';
import { FileSystemGlobalMemoryBankRepository } from '../../infrastructure/repositories/file-system/FileSystemGlobalMemoryBankRepository.js';
import { FileSystemBranchMemoryBankRepository } from '../../infrastructure/repositories/file-system/FileSystemBranchMemoryBankRepository.js';
import { FileSystemTagIndexRepositoryV1Bridge } from '../../infrastructure/repositories/file-system/FileSystemTagIndexRepositoryV1Bridge.js';

import { ContextController } from '../../interface/controllers/ContextController.js';
import { JsonResponsePresenter } from '../../interface/presenters/JsonResponsePresenter.js';
import { GlobalController } from '../../interface/controllers/GlobalController.js';
import { BranchController } from '../../interface/controllers/BranchController.js';
import { JsonBranchController } from '../../interface/controllers/json/JsonBranchController.js';
import { JsonGlobalController } from '../../interface/controllers/json/JsonGlobalController.js';

// CLI options type
import { CliOptions } from '../../infrastructure/config/WorkspaceConfig.js';
import { UseCaseFactory } from '../../factory/use-case-factory.js';
import type {
  DeleteJsonDocumentUseCase as DeleteJsonDocumentUseCaseType,
  ReadJsonDocumentUseCase as ReadJsonDocumentUseCaseType,
  SearchJsonDocumentsUseCase as SearchJsonDocumentsUseCaseType,
  UpdateJsonIndexUseCase as UpdateJsonIndexUseCaseType,
  WriteJsonDocumentUseCase as WriteJsonDocumentUseCaseType,
} from '../../application/usecases/index.js';

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
  container.registerFactory('globalMemoryBankRepository', () => {
    const fileSystemService = container.get<IFileSystemService>('fileSystemService');
    const configProvider = container.get<IConfigProvider>('configProvider');

    return new FileSystemGlobalMemoryBankRepository(fileSystemService, configProvider);
  });

  container.registerFactory('branchMemoryBankRepository', () => {
    const fileSystemService = container.get<IFileSystemService>('fileSystemService');
    const configProvider = container.get<IConfigProvider>('configProvider');

    return new FileSystemBranchMemoryBankRepository(fileSystemService, configProvider);
  });

  // Register tag index repository
  container.registerFactory('tagIndexRepository', () => {
    const fileSystemService = container.get<IFileSystemService>('fileSystemService');
    const configProvider = container.get<IConfigProvider>('configProvider');
    const globalRepository = container.get(
      'globalMemoryBankRepository'
    ) as FileSystemGlobalMemoryBankRepository;
    const branchRepository = container.get(
      'branchMemoryBankRepository'
    ) as FileSystemBranchMemoryBankRepository;
    // Get the branch memory bank root directory without using getBranchMemoryPath
    const config = configProvider.getConfig();
    const branchMemoryBankRoot = path.join(config.memoryBankRoot, 'branch-memory-bank');
    const globalMemoryBankPath = configProvider.getGlobalMemoryPath();

    return new FileSystemTagIndexRepositoryV1Bridge(
      fileSystemService as FileSystemService,
      branchMemoryBankRoot,
      globalMemoryBankPath,
      branchRepository,
      globalRepository
    );
  });
  
  // Register index service
  container.registerFactory('indexService', () => {
    const fileSystemService = container.get<IFileSystemService>('fileSystemService');
    const configProvider = container.get<IConfigProvider>('configProvider');
    const config = configProvider.getConfig();
    
    // Set up index root path
    const indexRoot = path.join(config.memoryBankRoot, 'indices');
    
    return new IndexService(fileSystemService, indexRoot);
  });
  
  // Register JSON document repositories
  container.registerFactory('branchJsonDocumentRepository', () => {
    const fileSystemService = container.get<IFileSystemService>('fileSystemService');
    const indexService = container.get<IIndexService>('indexService');
    const configProvider = container.get<IConfigProvider>('configProvider');
    const config = configProvider.getConfig();
    
    // Branch JSON document root path
    const branchJsonRoot = path.join(config.memoryBankRoot, 'branch-json');
    
    return new FileSystemJsonDocumentRepository(fileSystemService, indexService, branchJsonRoot);
  });
  
  container.registerFactory('globalJsonDocumentRepository', () => {
    const fileSystemService = container.get<IFileSystemService>('fileSystemService');
    const indexService = container.get<IIndexService>('indexService');
    const configProvider = container.get<IConfigProvider>('configProvider');
    const config = configProvider.getConfig();
    
    // Global JSON document root path
    const globalJsonRoot = path.join(config.memoryBankRoot, 'global-json');
    
    return new FileSystemJsonDocumentRepository(fileSystemService, indexService, globalJsonRoot);
  });
}

/**
 * Register application services
 * @param container DI Container
 */
export function registerApplicationServices(container: DIContainer): void {
  // Register use cases
  container.registerFactory('readGlobalDocumentUseCase', () => {
    // Use explicit type assertion for proper type safety
    const globalRepository = container.get(
      'globalMemoryBankRepository'
    ) as FileSystemGlobalMemoryBankRepository;

    return new ReadGlobalDocumentUseCase(globalRepository);
  });

  container.registerFactory('writeGlobalDocumentUseCase', () => {
    // Use explicit type assertion for proper type safety
    const globalRepository = container.get(
      'globalMemoryBankRepository'
    ) as FileSystemGlobalMemoryBankRepository;

    // Use factory to get properly configured WriteGlobalDocumentUseCase with migration settings
    return UseCaseFactory.createWriteGlobalDocumentUseCase(globalRepository);
  });

  container.registerFactory('readBranchDocumentUseCase', () => {
    // Use explicit type assertion for proper type safety
    const branchRepository = container.get(
      'branchMemoryBankRepository'
    ) as FileSystemBranchMemoryBankRepository;

    return new ReadBranchDocumentUseCase(branchRepository);
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
  container.registerFactory('readRulesUseCase', () => {
    const configProvider = container.get<IConfigProvider>('configProvider');
    const config = configProvider.getConfig();
    const rulesDir = config.memoryBankRoot;
    
    // 同期的に新しいReadRulesUseCaseを作成 - コンバーターなしで
    return new ReadRulesUseCase(rulesDir);
  });
  
  container.registerFactory('readContextUseCase', () => {
    const branchRepository = container.get(
      'branchMemoryBankRepository'
    ) as FileSystemBranchMemoryBankRepository;
    const globalRepository = container.get(
      'globalMemoryBankRepository'
    ) as FileSystemGlobalMemoryBankRepository;
    
    return new ReadContextUseCase(branchRepository, globalRepository);
  });
  container.registerFactory('searchDocumentsByTagsUseCase', () => {
    // Use explicit type assertion for proper type safety
    const globalRepository = container.get(
      'globalMemoryBankRepository'
    ) as FileSystemGlobalMemoryBankRepository;
    const branchRepository = container.get(
      'branchMemoryBankRepository'
    ) as FileSystemBranchMemoryBankRepository;

    return new SearchDocumentsByTagsUseCase(globalRepository, branchRepository);
  });

  container.registerFactory('updateTagIndexUseCase', () => {
    // Use explicit type assertion for proper type safety
    const globalRepository = container.get(
      'globalMemoryBankRepository'
    ) as FileSystemGlobalMemoryBankRepository;
    const branchRepository = container.get(
      'branchMemoryBankRepository'
    ) as FileSystemBranchMemoryBankRepository;

    return new UpdateTagIndexUseCase(globalRepository, branchRepository);
  });

  // Register the V2 version of the UpdateTagIndexUseCase
  container.registerFactory('updateTagIndexUseCaseV2', () => {
    // Use explicit type assertion for proper type safety
    const globalRepository = container.get(
      'globalMemoryBankRepository'
    ) as FileSystemGlobalMemoryBankRepository;
    const branchRepository = container.get(
      'branchMemoryBankRepository'
    ) as FileSystemBranchMemoryBankRepository;
    const tagIndexRepository = container.get(
      'tagIndexRepository'
    ) as FileSystemTagIndexRepositoryV1Bridge;

    return new UpdateTagIndexUseCaseV2(globalRepository, branchRepository, tagIndexRepository);
  });

  // Register JSON document use cases
  container.registerFactory('readJsonDocumentUseCase', () => {
    const branchJsonRepo = container.get('branchJsonDocumentRepository') as IJsonDocumentRepository;
    const globalJsonRepo = container.get('globalJsonDocumentRepository') as IJsonDocumentRepository;
    
    return new ReadJsonDocumentUseCase(branchJsonRepo, globalJsonRepo);
  });
  
  container.registerFactory('writeJsonDocumentUseCase', () => {
    const branchJsonRepo = container.get('branchJsonDocumentRepository') as IJsonDocumentRepository;
    const globalJsonRepo = container.get('globalJsonDocumentRepository') as IJsonDocumentRepository;
    const indexService = container.get('indexService') as IIndexService;
    
    return new WriteJsonDocumentUseCase(branchJsonRepo, indexService, globalJsonRepo);
  });
  
  container.registerFactory('deleteJsonDocumentUseCase', () => {
    const branchJsonRepo = container.get('branchJsonDocumentRepository') as IJsonDocumentRepository;
    const globalJsonRepo = container.get('globalJsonDocumentRepository') as IJsonDocumentRepository;
    const indexService = container.get('indexService') as IIndexService;
    
    return new DeleteJsonDocumentUseCase(branchJsonRepo, indexService, globalJsonRepo);
  });
  
  container.registerFactory('searchJsonDocumentsUseCase', () => {
    const branchJsonRepo = container.get('branchJsonDocumentRepository') as IJsonDocumentRepository;
    const globalJsonRepo = container.get('globalJsonDocumentRepository') as IJsonDocumentRepository;
    
    return new SearchJsonDocumentsUseCase(branchJsonRepo, globalJsonRepo);
  });
  
  container.registerFactory('updateJsonIndexUseCase', () => {
    const branchJsonRepo = container.get('branchJsonDocumentRepository') as IJsonDocumentRepository;
    const globalJsonRepo = container.get('globalJsonDocumentRepository') as IJsonDocumentRepository;
    const indexService = container.get('indexService') as IIndexService;
    
    return new UpdateJsonIndexUseCase(branchJsonRepo, indexService, globalJsonRepo);
  });

  container.registerFactory('getRecentBranchesUseCase', () => {
    // Use explicit type assertion for proper type safety
    const branchRepository = container.get(
      'branchMemoryBankRepository'
    ) as FileSystemBranchMemoryBankRepository;

    return new GetRecentBranchesUseCase(branchRepository);
  });

  // Register core files use cases
  container.registerFactory('readBranchCoreFilesUseCase', () => {
    // Use explicit type assertion for proper type safety
    const branchRepository = container.get(
      'branchMemoryBankRepository'
    ) as FileSystemBranchMemoryBankRepository;

    return new ReadBranchCoreFilesUseCase(branchRepository);
  });

  container.registerFactory('createBranchCoreFilesUseCase', () => {
    // Use explicit type assertion for proper type safety
    const branchRepository = container.get(
      'branchMemoryBankRepository'
    ) as FileSystemBranchMemoryBankRepository;

    return new CreateBranchCoreFilesUseCase(branchRepository);
  });

  // 循環参照を防ぐために、この部分は削除

  // Pull Request use cases section removed
}

/**
 * Register interface services
 * @param container DI Container
 */
export function registerInterfaceServices(container: DIContainer): void {
  // Register presenters
  container.register('mcpResponsePresenter', new MCPResponsePresenter());
  container.register('jsonResponsePresenter', new JsonResponsePresenter());

  container.registerFactory('contextController', () => {
    const readContextUseCase = container.get('readContextUseCase') as ReadContextUseCase;
    const readRulesUseCase = container.get('readRulesUseCase') as ReadRulesUseCase;
    
    return new ContextController(readContextUseCase, readRulesUseCase);
  });

  // Register tools section removed

  // Register JSON controllers
  container.registerFactory('jsonBranchController', () => {
    // Get required use cases
    const readJsonDocumentUseCase = container.get('readJsonDocumentUseCase') as ReadJsonDocumentUseCase;
    const writeJsonDocumentUseCase = container.get('writeJsonDocumentUseCase') as WriteJsonDocumentUseCase;
    const deleteJsonDocumentUseCase = container.get('deleteJsonDocumentUseCase') as DeleteJsonDocumentUseCase;
    const searchJsonDocumentsUseCase = container.get('searchJsonDocumentsUseCase') as SearchJsonDocumentsUseCase;
    const updateJsonIndexUseCase = container.get('updateJsonIndexUseCase') as UpdateJsonIndexUseCase;
    const getRecentBranchesUseCase = container.get(
      'getRecentBranchesUseCase'
    ) as GetRecentBranchesUseCase;

    // Get presenter
    const presenter = container.get('jsonResponsePresenter') as JsonResponsePresenter;

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

  container.registerFactory('jsonGlobalController', () => {
    // Get required use cases
    const readJsonDocumentUseCase = container.get('readJsonDocumentUseCase') as ReadJsonDocumentUseCase;
    const writeJsonDocumentUseCase = container.get('writeJsonDocumentUseCase') as WriteJsonDocumentUseCase;
    const deleteJsonDocumentUseCase = container.get('deleteJsonDocumentUseCase') as DeleteJsonDocumentUseCase;
    const searchJsonDocumentsUseCase = container.get('searchJsonDocumentsUseCase') as SearchJsonDocumentsUseCase;
    const updateJsonIndexUseCase = container.get('updateJsonIndexUseCase') as UpdateJsonIndexUseCase;

    // Get presenter
    const presenter = container.get('jsonResponsePresenter') as JsonResponsePresenter;

    return new JsonGlobalController(
      readJsonDocumentUseCase,
      writeJsonDocumentUseCase,
      deleteJsonDocumentUseCase,
      searchJsonDocumentsUseCase,
      updateJsonIndexUseCase,
      presenter
    );
  });

  // Register controllers
  container.registerFactory('globalController', () => {
    // Use explicit type assertion for proper type safety
    const readGlobalDocumentUseCase = container.get(
      'readGlobalDocumentUseCase'
    ) as ReadGlobalDocumentUseCase;
    const writeGlobalDocumentUseCase = container.get(
      'writeGlobalDocumentUseCase'
    ) as WriteGlobalDocumentUseCase;
    const searchDocumentsByTagsUseCase = container.get(
      'searchDocumentsByTagsUseCase'
    ) as SearchDocumentsByTagsUseCase;
    const updateTagIndexUseCase = container.get('updateTagIndexUseCase') as UpdateTagIndexUseCase;
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
        updateJsonIndexUseCase,
      } // Pass optional dependencies
    );
  });

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
  const globalRepository = container.get(
    'globalMemoryBankRepository'
  ) as FileSystemGlobalMemoryBankRepository;
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
