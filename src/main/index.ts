import { setupContainer } from './di/providers.js';
import { Constants } from './config/constants.js';
import { logger } from '../shared/utils/logger.js';
import { IGlobalController } from '../interface/controllers/interfaces/IGlobalController.js';
import { IBranchController } from '../interface/controllers/interfaces/IBranchController.js';
import { CliOptions } from '../infrastructure/config/WorkspaceConfig.js';

/**
 * Application main class
 * Initializes and manages the application lifecycle
 */
export class Application {
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
      logger.info('Initializing application...');
      
      // Setup DI container
      const container = await setupContainer(this.options);
      
      // Get controllers
      this.globalController = container.get<IGlobalController>('globalController');
      this.branchController = container.get<IBranchController>('branchController');
      
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
}

// Export default for use as a module
export default async function createApplication(options?: CliOptions): Promise<Application> {
  const app = new Application(options);
  await app.initialize();
  return app;
}
