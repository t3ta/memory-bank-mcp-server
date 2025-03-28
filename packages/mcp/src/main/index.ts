// Import dependencies
import { setupContainer } from './di/providers.js';
import { logger } from '../shared/utils/logger.js';
import { IGlobalController } from '../interface/controllers/interfaces/IGlobalController.js';
import { IBranchController } from '../interface/controllers/interfaces/IBranchController.js';
import { IContextController } from '../interface/controllers/interfaces/IContextController.js';
import { ITemplateController } from '../interface/controllers/interfaces/ITemplateController.js';
import { CliOptions } from '../infrastructure/config/WorkspaceConfig.js'; // Assuming CliOptions is here now
import { Constants } from './config/constants.js';
// import { DomainError } from '../shared/errors/DomainError.js'; // Removed unused import

/**
 * Application main class
 * Initializes and manages the application lifecycle
 */
export class Application {
  // Debug用にoptions可視性を変更
  public options: CliOptions;
  private container: any;
  private globalController?: IGlobalController;
  private branchController?: IBranchController;
  private contextController?: IContextController;
  private templateController?: ITemplateController;

  /**
   * Constructor
   * @param options CLI options
   */
  constructor(options?: CliOptions) {
    this.options = options || {};
    logger.info(`Starting ${Constants.APP_NAME} v${Constants.VERSION}`);
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing application..');

      // Setup DI container
      this.container = await setupContainer(this.options);

      // Await promises from DI container to get actual controller instances
      this.globalController = await this.container.get('globalController') as IGlobalController;
      this.branchController = await this.container.get('branchController') as IBranchController;
      this.contextController = await this.container.get('contextController') as IContextController;
      this.templateController = await this.container.get('templateController') as ITemplateController;

      logger.info('Application initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize application:', error);
      throw error;
    }
  }

  /**
   * Get global controller
   * @returns Global controller
   */
  getGlobalController(): IGlobalController {
    if (!this.globalController) {
      throw new Error('Application not initialized. Call initialize() first.');
    }

    return this.globalController;
  }

  /**
   * Get branch controller
   * @returns Branch controller
   */
  getBranchController(): IBranchController {
    if (!this.branchController) {
      throw new Error('Application not initialized. Call initialize() first.');
    }

    return this.branchController;
  }

  /**
   * Get context controller
   * @returns Context controller
   */
  getContextController(): IContextController {
    if (!this.contextController) {
      throw new Error('Application not initialized. Call initialize() first.');
    }

    return this.contextController;
  }

  /**
   * Get template controller
   * @returns Template controller
   */
  getTemplateController(): ITemplateController {
    if (!this.templateController) {
      throw new Error('Application not initialized. Call initialize() first.');
    }

    return this.templateController;
  }
}

// Export as ESM
export async function createApplication(options?: CliOptions): Promise<Application> {
  // デバッグログはリリース時には削除
  // logger.info(`DEBUG: createApplication関数呼び出し - options: ${JSON.stringify(options || {})}`);

  // Convert legacy options format to new format if needed
  const newOptions: CliOptions = {};

  if (options) {
    // If legacy 'memoryRoot' property exists, use it for docsRoot
    if ('memoryRoot' in options) {
      newOptions.docsRoot = (options as any).memoryRoot;
    }

    // If legacy 'workspace' property exists but docsRoot not set yet,
    // only log a warning - workspace property is no longer used
    if ('workspace' in options && !newOptions.docsRoot) {
      logger.warn(
        'workspace parameter is deprecated and will be ignored. Use docsRoot parameter instead.'
      );
    }

    // Copy the new docsRoot if it exists
    if (options.docsRoot) {
      newOptions.docsRoot = options.docsRoot;
    }

    // Copy other properties
    if (options.verbose !== undefined) newOptions.verbose = options.verbose;
    if (options.language) newOptions.language = options.language;
  }

  const app = new Application(newOptions);
  await app.initialize();
  return app;
}
