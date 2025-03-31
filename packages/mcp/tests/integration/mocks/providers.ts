/**
 * Mock for providers.ts
 */

import { DIContainer } from '../../../src/main/di/DIContainer.js';
import type { CliOptions } from '../../../src/infrastructure/config/WorkspaceConfig.js';

// Mock version of MCPResponsePresenter
const MCPResponsePresenterMock = {
  success: (data: any) => ({
    success: true,
    data
  }),
  error: (error: any) => ({
    success: false,
    error: typeof error === 'string' ? error : error.message || 'Unknown error'
  })
};

/**
 * Setup DI container with mocked services
 */
export async function setupContainer(options?: CliOptions): Promise<any> {
  const container = new DIContainer();
  
  // Register mocked MCPResponsePresenter
  container.register('mcpResponsePresenter', MCPResponsePresenterMock);
  
  // Setup minimal services required for tests
  // Controllers will be registered by actual test code
  
  return container;
}

// Re-export other functions as noops
export async function registerInfrastructureServices() {}
export async function registerApplicationServices() {}
export async function registerInterfaceServices() {}
export async function initializeRepositories() {}
