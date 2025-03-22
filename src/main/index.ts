// Import dependencies
import { setupContainer } from './di/providers.js';
import { logger } from '../shared/utils/logger.js';
import { IGlobalController } from '../interface/controllers/interfaces/IGlobalController.js';
import { IBranchController } from '../interface/controllers/interfaces/IBranchController.js';
import { IContextController } from '../interface/controllers/interfaces/IContextController.js';
import { ITemplateController } from '../interface/controllers/interfaces/ITemplateController.js';
import { CliOptions } from '../infrastructure/config/WorkspaceConfig.js';
import { Constants } from './config/constants.js';

/**
 * Application main class
 * Initializes and manages the application lifecycle
 */
  private globalController?: IGlobalController;
  private branchController?: IBranchController;
  private contextController?: IContextController;
  private templateController?: ITemplateController;
  private contextController?: IContextController;

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
      this.globalController = container.get('globalController') as IGlobalController;
      this.branchController = container.get('branchController') as IBranchController;
      this.contextController = container.get('contextController') as IContextController;
      this.templateController = container.get('templateController') as ITemplateController;

      // Get controllers
      // Cast the result instead of using generic parameters
      this.globalController = container.get('globalController') as IGlobalController;
      this.branchController = container.get('branchController') as IBranchController;
      this.contextController = container.get('contextController') as IContextController;

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
  getContextController(): IContextController {
    if (!this.contextController) {
      throw new Error('Application not initialized. Call initialize() first.');
    }

    return this.contextController;
  }
}

// Export as ESM
export async function createApplication(options?: CliOptions): Promise<Application> {
  const app = new Application(options);
  await app.initialize();
  return app;
}

export { Application };
