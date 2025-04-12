import { setupContainer } from './di/providers.js';
import { IGlobalController } from '../interface/controllers/interfaces/IGlobalController.js';
import { IBranchController } from '../interface/controllers/interfaces/IBranchController.js';
import { IContextController } from '../interface/controllers/interfaces/IContextController.js';
import { Constants } from './config/constants.js';
import { logger } from '../shared/utils/logger.js'; // パスエイリアスを相対パスに修正
import type { Language } from '@memory-bank/schemas';
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/sdk/types.js'; // Keep the correct import

// Minimal options interface needed by the Application
interface MinimalAppOptions {
  docsRoot?: string;
  language?: Language;
  verbose?: boolean;
}

/**
 * Application main class
 * Initializes and manages the application lifecycle
 */
export class Application {
  // Changed options visibility for debugging
  public options: MinimalAppOptions;
  private container: any;
  private globalController?: IGlobalController;
  private branchController?: IBranchController;
  private contextController?: IContextController;

  // Expose configProvider for tools to check project mode
  public get configProvider() {
    if (!this.container) {
      throw new Error('Application not initialized. Call initialize() first.');
    }
    return this.container.get('configProvider');
  }

  /**
   * Constructor
   * @param options Minimal application options
   */
  constructor(options?: MinimalAppOptions) {
    this.options = options || {};
    logger.info(`Starting ${Constants.APP_NAME} v${Constants.VERSION}`);
  }

  /**
   * Initialize the application
   */
  async initialize(): Promise<void> {
    try {
      logger.info('Initializing application..');
this.container = await setupContainer(this.options);

      this.globalController = await this.container.get('globalController') as IGlobalController;
      this.branchController = await this.container.get('branchController') as IBranchController;
      this.contextController = await this.container.get('contextController') as IContextController;

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
   * Handles incoming connections from a client transport.
   * @param transport The server-side transport for communication.
   */
  async handleConnection(transport: any): Promise<void> { // Use 'any' for Transport type initially
    logger.info('[Application.handleConnection] Handling new connection...');

    transport.onmessage = async (message: any) => { // Use 'any' for JSONRPCRequest type initially
      let response: any | null = null; // Use 'any' for JSONRPCResponse type initially

      try {
        // TODO: Implement message routing based on message.method
        // e.g., call appropriate controller method (global, branch, context)
        if (!message || typeof message.method !== 'string') {
           throw new Error('Invalid JSON-RPC message received');
        }

        const method = message.method;

        if (method === 'initialize') { // Handle initialize method
           // Respond with basic server info (can be expanded later)
           response = {
               jsonrpc: '2.0',
               id: message.id,
               result: {
                 protocolVersion: LATEST_PROTOCOL_VERSION,
                 serverInfo: {
                   name: Constants.APP_NAME,
                   version: Constants.VERSION,
                 },
                 capabilities: {}
               }
             };
        } else if (method === 'read_context' && this.contextController) {
           logger.debug(`Routing to contextController.${method}`);
           const params = message.params || {};
           const controllerResult = await this.contextController.readContext(params);
           response = { jsonrpc: '2.0', id: message.id, result: controllerResult }; // Return the controller result directly
        } else if (method.startsWith('read_global') && this.globalController) {
           logger.debug(`Routing to globalController.${method}`);
           // TODO: Implement actual controller call
           response = { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Method not implemented yet: ${method}` } };
        } else if (method.startsWith('write_branch') && this.branchController) {
           logger.debug(`Routing to branchController.${method}`);
           // TODO: Implement actual controller call
           response = { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Method not implemented yet: ${method}` } };
         } else if (method.startsWith('read_branch') && this.branchController) {
            logger.debug(`Routing to branchController.${method}`);
            // TODO: Implement actual controller call
            response = { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Method not implemented yet: ${method}` } };
         } else if (method.startsWith('search_documents') && (this.globalController || this.branchController)) {
             logger.debug(`Routing to searchDocumentsByTagsUseCase via controller`);
             // TODO: Implement actual controller call
             response = { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Method not implemented yet: ${method}` } };
        } else {
          logger.warn(`Method not found or controller not available: ${method}`);
          response = { jsonrpc: '2.0', id: message.id, error: { code: -32601, message: `Method not found: ${method}` } };
        }

      } catch (error: any) {
        // Keep error log, but maybe simplify context if needed
        logger.error('[Application.handleConnection] Error processing message:', { error: error.message });
        response = {
          jsonrpc: '2.0',
          id: message?.id ?? null, // Use null id if message.id is missing
          error: { code: -32000, message: error.message || 'Internal server error' },
        };
      }

      if (response) {
        await transport.send(response);
      }
    };

    transport.onclose = () => {
      logger.info('[Application.handleConnection] Connection closed.'); // Restore info log
      // Perform any necessary cleanup for this connection
    };

    // Start the transport if it's not already started (optional, depends on transport impl)
    // await transport.start(); // Assuming transport starts automatically or is started elsewhere

    logger.info('[Application.handleConnection] Connection handler set up.'); // Restore info log
  }
}
