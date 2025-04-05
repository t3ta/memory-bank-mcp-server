/**
 * Integration tests setup file
 */
import { jest } from '@jest/globals'; // <<<--- やっぱりインポートする！

// Export jest for global use (念のため残す)
global.jest = jest; // <<<--- コメントアウト解除！

// Set longer timeout for integration tests
jest.setTimeout(60000);

// Suppress console logs during tests to reduce noise
console.log = jest.fn(); // <<<--- コメントアウトを解除して元に戻す！
console.warn = jest.fn(); // warn はそのまま抑制
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
