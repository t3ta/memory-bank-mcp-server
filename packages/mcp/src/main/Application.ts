import { setupContainer } from './di/providers.js';
import { IGlobalController } from '../interface/controllers/interfaces/IGlobalController.js';
import { IBranchController } from '../interface/controllers/interfaces/IBranchController.js';
import { IContextController } from '../interface/controllers/interfaces/IContextController.js';
// Removed import for ITemplateController as part of template cleanup
import { Constants } from './config/constants.js';
// Removed incorrect import: import type { CliOptions } from '@memory-bank/schemas';
import { logger } from '../shared/utils/logger.js';
import type { Language } from '@memory-bank/schemas/index.js';

// Define a minimal options interface needed by the Application
interface MinimalAppOptions {
  docsRoot?: string;
  language?: Language;
  verbose?: boolean;
  // Add other properties if setupContainer needs them
}

/**
 * Application main class
 * Initializes and manages the application lifecycle
 */
export class Application {
  // Debug用にoptions可視性を変更
  public options: MinimalAppOptions; // Use the minimal options type
  private container: any;
  private globalController?: IGlobalController;
  private branchController?: IBranchController;
  private contextController?: IContextController;
  // templateController removed as part of template cleanup

  /**
   * Constructor
   * @param options Minimal application options
   */
  constructor(options?: MinimalAppOptions) { // Use the minimal options type
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
      // templateController initialization removed as part of template cleanup

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

  // getTemplateController method removed as part of template cleanup
}
