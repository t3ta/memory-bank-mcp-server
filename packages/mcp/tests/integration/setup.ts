/**
 * Integration tests setup file for Vitest
 */
import { vi } from 'vitest'; // vi をインポート

// global.jest は不要なので削除

// Set longer timeout for integration tests
// Vitest の設定でタイムアウトを設定 (vi.setConfig はテストファイル内でのみ有効な場合があるため、vitest.config.ts で設定済み)
// vi.setConfig({ testTimeout: 60000 });

// Suppress console logs during tests to reduce noise
console.log = vi.fn(); // jest -> vi
console.warn = vi.fn(); // jest -> vi
// Keep error logging for debugging
// console.error = jest.fn();

// Add delay after all tests to ensure all async operations complete
afterAll(() => new Promise(resolve => setTimeout(resolve, 1000)));

// Remove the mock for MCPResponsePresenter as it might interfere with controller tests
// jest.mock('/Users/t3ta/workspace/memory-bank-mcp-server/packages/mcp/src/interface/presenters/MCPResponsePresenter.ts', () => ({
//   MCPResponsePresenter: {
//     success: jest.fn((data) => ({ success: true, data })),
//     error: jest.fn((error) => ({ success: false, error: String(error) }))
//   }
// }), { virtual: true });

// Remove the mock for the DI providers to use the real container setup
// jest.mock('/Users/t3ta/workspace/memory-bank-mcp-server/packages/mcp/src/main/di/providers.ts', () => ({
//   setupContainer: jest.fn(() => ({
//     register: jest.fn(),
//     registerFactory: jest.fn(),
//     get: jest.fn((key) => ({
//       success: jest.fn((data) => ({ success: true, data })),
//       error: jest.fn((error) => ({ success: false, error: String(error) }))
//     }))
//   })),
//   registerInfrastructureServices: jest.fn(),
//   registerApplicationServices: jest.fn(),
//   registerInterfaceServices: jest.fn(),
//   initializeRepositories: jest.fn()
// }), { virtual: true });
