// Import dependencies
import { setupContainer } from './di/providers.js';
import { logger } from '../shared/utils/logger.js';
// Interfaces can be imported as types
import { IGlobalController } from '../interface/controllers/interfaces/IGlobalController.js';
import { IBranchController } from '../interface/controllers/interfaces/IBranchController.js';
import { CliOptions } from '../infrastructure/config/WorkspaceConfig.js';
import { Constants } from './config/constants.js';

/**
 * Application main class
 * Initializes and manages the application lifecycle
 */
class Application {
  private readonly options: CliOptions;
  private globalController?: IGlobalController;
  private branchController?: IBranchController;

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
      const container = await setupContainer(this.options);

      // Get controllers
      // Cast the result instead of using generic parameters
      this.globalController = container.get('globalController') as IGlobalController;
      this.branchController = container.get('branchController') as IBranchController;

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

  // getPullRequestTool method removed
}

// Export as ESM
export async function createApplication(options?: CliOptions): Promise<Application> {
  const app = new Application(options);
  await app.initialize();
  return app;
}

export { Application };
