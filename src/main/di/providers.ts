import { DIContainer } from './DIContainer.js';
import path from 'path';

// Domain layer

// Application layer
import { ReadGlobalDocumentUseCase } from '../../application/usecases/global/ReadGlobalDocumentUseCase.js';
import { WriteGlobalDocumentUseCase } from '../../application/usecases/global/WriteGlobalDocumentUseCase.js';
import { ReadBranchDocumentUseCase } from '../../application/usecases/branch/ReadBranchDocumentUseCase.js';
import { WriteBranchDocumentUseCase } from '../../application/usecases/branch/WriteBranchDocumentUseCase.js';
import { SearchDocumentsByTagsUseCase } from '../../application/usecases/common/SearchDocumentsByTagsUseCase.js';
import { UpdateTagIndexUseCase } from '../../application/usecases/common/UpdateTagIndexUseCase.js';
import { UpdateTagIndexUseCaseV2 } from '../../application/usecases/common/UpdateTagIndexUseCaseV2.js';
import { GetRecentBranchesUseCase } from '../../application/usecases/common/GetRecentBranchesUseCase.js';
import { ReadBranchCoreFilesUseCase } from '../../application/usecases/common/ReadBranchCoreFilesUseCase.js';
import { CreateBranchCoreFilesUseCase } from '../../application/usecases/common/CreateBranchCoreFilesUseCase.js';
import { CreatePullRequestUseCase } from '../../application/usecases/pr/CreatePullRequestUseCase.js';

// Infrastructure layer
import { IFileSystemService } from '../../infrastructure/storage/interfaces/IFileSystemService.js';
import { FileSystemService } from '../../infrastructure/storage/FileSystemService.js';
import { IConfigProvider } from '../../infrastructure/config/interfaces/IConfigProvider.js';
import { ConfigProvider } from '../../infrastructure/config/ConfigProvider.js';
import { FileSystemGlobalMemoryBankRepository } from '../../infrastructure/repositories/file-system/FileSystemGlobalMemoryBankRepository.js';
import { FileSystemBranchMemoryBankRepository } from '../../infrastructure/repositories/file-system/FileSystemBranchMemoryBankRepository.js';
import { FileSystemTagIndexRepositoryV1Bridge } from '../../infrastructure/repositories/file-system/FileSystemTagIndexRepositoryV1Bridge.js';

// Interface layer
import { MCPResponsePresenter } from '../../interface/presenters/MCPResponsePresenter.js';
import { GlobalController } from '../../interface/controllers/GlobalController.js';
import { BranchController } from '../../interface/controllers/BranchController.js';
import { PullRequestTool } from '../../interface/tools/PullRequestTool.js';

// CLI options type
import { CliOptions } from '../../infrastructure/config/WorkspaceConfig.js';

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

    return new WriteGlobalDocumentUseCase(globalRepository);
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

    return new WriteBranchDocumentUseCase(branchRepository);
  });

  // Register common use cases
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

  // Pull Request use cases
  container.registerFactory('createPullRequestUseCase', () => {
    // Use explicit type assertion for proper type safety
    const branchRepository = container.get(
      'branchMemoryBankRepository'
    ) as FileSystemBranchMemoryBankRepository;
    const fileSystemService = container.get('fileSystemService') as IFileSystemService;

    return new CreatePullRequestUseCase(branchRepository, fileSystemService);
  });
}

/**
 * Register interface services
 * @param container DI Container
 */
export function registerInterfaceServices(container: DIContainer): void {
  // Register presenter
  container.register('mcpResponsePresenter', new MCPResponsePresenter());

  // Register tools
  container.registerFactory('pullRequestTool', () => {
    // Use explicit type assertion for proper type safety
    const createPullRequestUseCase = container.get(
      'createPullRequestUseCase'
    ) as CreatePullRequestUseCase;

    return new PullRequestTool(createPullRequestUseCase);
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

    // Get update tag index use case V2
    const updateTagIndexUseCaseV2 = container.get(
      'updateTagIndexUseCaseV2'
    ) as UpdateTagIndexUseCaseV2;

    return new GlobalController(
      readGlobalDocumentUseCase,
      writeGlobalDocumentUseCase,
      searchDocumentsByTagsUseCase,
      updateTagIndexUseCase, // Keep V1 for backwards compatibility
      presenter,
      { updateTagIndexUseCaseV2 } // Pass V2 as an optional dependency
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

    // Get update tag index use case V2
    const updateTagIndexUseCaseV2 = container.get(
      'updateTagIndexUseCaseV2'
    ) as UpdateTagIndexUseCaseV2;

    return new BranchController(
      readBranchDocumentUseCase,
      writeBranchDocumentUseCase,
      searchDocumentsByTagsUseCase,
      updateTagIndexUseCase, // Keep V1 for backwards compatibility
      getRecentBranchesUseCase,
      readBranchCoreFilesUseCase,
      createBranchCoreFilesUseCase,
      presenter,
      { updateTagIndexUseCaseV2 } // Pass V2 as an optional dependency
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
