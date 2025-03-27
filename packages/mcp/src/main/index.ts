/**
 * Main Application Exports
 * 
 * This file exports the main application entry points and bootstrapping code.
 */

import { IGlobalController } from '../interface/controllers/interfaces/IGlobalController.js';
import { IBranchController } from '../interface/controllers/interfaces/IBranchController.js';
import { IContextController } from '../interface/controllers/interfaces/IContextController.js';
import { ITemplateController } from '../interface/controllers/interfaces/ITemplateController.js';

/**
 * CLI options for application configuration
 */
export interface CliOptions {
  docsRoot?: string;
  language?: string;
  verbose?: boolean;
}

/**
 * Application class interface
 */
export interface Application {
  options: CliOptions;
  getGlobalController(): IGlobalController;
  getBranchController(): IBranchController;
  getContextController(): IContextController;
  getTemplateController(): ITemplateController;
}

/**
 * Function signature for creating an application instance
 */
export type CreateApplicationFn = (options?: CliOptions) => Promise<Application>;
