import { Application } from './Application.js';
import type { CliOptions } from '@memory-bank/schemas';
import { logger } from '../shared/utils/logger.js';
import { Language, isValidLanguage } from '@memory-bank/schemas';

/**
 * Creates a new application instance
 * @param options CLI options
 * @returns Promise resolving to a new Application instance
 */
export async function createApplication(options?: CliOptions): Promise<Application> {
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
    if (options.language) {
      newOptions.language = isValidLanguage(options.language as Language) 
        ? options.language 
        : 'ja';
    }
  }
  
  const app = new Application(newOptions);
  await app.initialize();
  return app;
}

// Re-export Application class
export { Application } from './Application.js';

// Re-export CliOptions type
export type { CliOptions } from '@memory-bank/schemas';