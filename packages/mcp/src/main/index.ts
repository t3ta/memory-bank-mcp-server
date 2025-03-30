import { Application } from './Application.js';
import { setupContainer } from './di/providers.js';
import { logger } from '../shared/utils/logger.js';
import { Constants } from './config/constants.js';
import { CliOptions } from '../infrastructure/config/WorkspaceConfig.js';

// Export the main Application class
export { Application };

/**
 * Creates and initializes the main application instance.
 * @param options CLI options
 * @returns Initialized Application instance
 */
export async function createApplication(options?: CliOptions): Promise<Application> {
  // Convert legacy options format to new format if needed
  const newOptions: CliOptions = {};

  if (options) {
    if ('memoryRoot' in options) {
      newOptions.docsRoot = (options as any).memoryRoot;
    }
    if ('workspace' in options && !newOptions.docsRoot) {
      logger.warn(
        'workspace parameter is deprecated and will be ignored. Use docsRoot parameter instead.'
      );
    }
    if (options.docsRoot) {
      newOptions.docsRoot = options.docsRoot;
    }
    if (options.verbose !== undefined) newOptions.verbose = options.verbose;
    if (options.language) newOptions.language = options.language;
  }

  const app = new Application(newOptions);
  await app.initialize();
  return app;
}


// Optionally export other core components if needed
export { setupContainer, logger, Constants }; // Removed CliOptions export
