import { DIContainer } from './DIContainer.js';
import { MCPResponsePresenter } from '../../interface/presenters/MCPResponsePresenter.js';
import path from 'node:path';
import { logger } from '../../shared/utils/logger.js';

// Controller imports
import { BranchController } from '../../interface/controllers/BranchController.js';
import { GlobalController } from '../../interface/controllers/GlobalController.js';
import { ContextController } from '../../interface/controllers/ContextController.js';
import { TemplateController } from '../../interface/controllers/TemplateController.js';
import { JsonBranchController } from '../../interface/controllers/json/JsonBranchController.js';

// CLI options type
import type { CliOptions } from '@memory-bank/schemas';

/**
 * Register infrastructure services
 * @param container DI Container
 * @param options CLI options
 */
export async function registerInfrastructureServices(
  container: DIContainer,
  options?: CliOptions
): Promise<void> {
  // Register config provider
  container.register('configProvider', {
    getConfig: async () => {
      return {
        docsRoot: options?.docsRoot || 'docs',
        language: options?.language || 'ja',
        verbose: options?.verbose || false
      };
    },
    getGlobalMemoryPath: async () => {
      const config = await container.get('configProvider').getConfig();
      return path.join(config.docsRoot, 'global-memory-bank');
    },
    getBranchMemoryPath: async (branch: string) => {
      const config = await container.get('configProvider').getConfig();
      return path.join(config.docsRoot, 'branch-memory-bank', branch);
    },
    initialize: async () => {
      logger.info('Config provider initialized');
      return true;
    }
  });
  
  // Since this is a simplified implementation, we're only registering
  // the controllers directly. In a real implementation, we would register
  // all services, repositories, etc.
}

/**
 * Register interface services
 * @param container DI Container
 */
export async function registerInterfaceServices(container: DIContainer): Promise<void> {
  // Register presenters
  container.register('mcpResponsePresenter', new MCPResponsePresenter());
  
  // Register controllers
  container.register('branchController', new BranchController(
    // For simplicity, we're passing null for all dependencies
    // In a real implementation, we would inject actual services
    null as any, null as any, null as any, null as any, null as any, 
    null as any, null as any, new MCPResponsePresenter(), {}
  ));
  
  container.register('globalController', new GlobalController(
    null as any, null as any, null as any, null as any, 
    new MCPResponsePresenter(), {}
  ));
  
  container.register('contextController', new ContextController(
    null as any, null as any
  ));
  
  container.register('templateController', new TemplateController(
    null as any
  ));
  
  container.register('jsonBranchController', new JsonBranchController(
    null as any, null as any, null as any, null as any, 
    null as any, null as any, null as any
  ));
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
  await registerInterfaceServices(container);

  return container;
}