import * as fs from 'fs-extra';
import * as path from 'path';
// import { fileURLToPath } from 'url'; // Not used
import tmp from 'tmp-promise';
import { execSync } from 'child_process';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { toSafeBranchName } from '../../../src/shared/utils/branchNameUtils.js';
import { MCPInMemoryClient } from './MCPInMemoryClient.js';
import { Application } from '../../../src/main/Application.js';

export interface TestEnv {
  docRoot: string;
  tempDir: string;
  branchMemoryPath: string;
  globalMemoryPath: string;
  cleanup: () => Promise<void>;
}

async function setupBaseTestEnv(): Promise<TestEnv> {
  const tempDirResult = await tmp.dir({ unsafeCleanup: true });
  const tempDir = tempDirResult.path;
  const cleanup = tempDirResult.cleanup;

  const docRoot = path.join(tempDir, 'docs');
  const branchMemoryPath = path.join(docRoot, 'branch-memory-bank');
  const globalMemoryPath = path.join(docRoot, 'global-memory-bank');

  // const currentFilePath = fileURLToPath(import.meta.url); // Not used
  // const projectRoot = path.resolve(path.dirname(currentFilePath), '../../../../'); // Not used
  // const sourceTemplatesJsonDir = path.join(projectRoot, 'packages/mcp/tests/integration/fixtures/templates/json'); // Not used
  const targetTemplatesJsonDir = path.join(docRoot, 'templates/json');

  await fs.ensureDir(docRoot);
  await fs.ensureDir(branchMemoryPath);
  await fs.ensureDir(globalMemoryPath);
  await fs.remove(targetTemplatesJsonDir);
  await fs.ensureDir(targetTemplatesJsonDir);

  const dummyRulesContent = JSON.stringify({ schema: "rules_v1", content: "Dummy rule content" }, null, 2);
  await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules.json'), dummyRulesContent, 'utf-8');
  await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules-ja.json'), dummyRulesContent, 'utf-8');
  await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules-en.json'), dummyRulesContent, 'utf-8');
  await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules-zh.json'), dummyRulesContent, 'utf-8');

  try {
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git commit --allow-empty -m "Initial commit"', { cwd: tempDir, stdio: 'ignore' });
  } catch (gitError) {
    await cleanup();
    throw gitError;
  }
return {
  docRoot,
  tempDir,
  branchMemoryPath,
  globalMemoryPath,
  cleanup
};
}
/**
 * Sets up the E2E test environment.
 * Prepares the file system environment and an initialized Application instance.
 */

export async function setupE2ETestEnv(): Promise<{
  testEnv: TestEnv;
  app: Application;
  client: MCPInMemoryClient;
  cleanup: () => Promise<void>;
}> {
  const testEnv = await setupBaseTestEnv();
  const app = new Application({ docsRoot: testEnv.docRoot });

  const [clientTransport, _serverTransport] = InMemoryTransport.createLinkedPair(); // serverTransport is not used, prefix with _

  const client = new MCPInMemoryClient({ name: 'E2E Test Client', version: '1.0.0' });
  await app.initialize();

  await client.initialize(clientTransport);

  const cleanup = async () => {
    await client.close(); // Close the client as well
    await testEnv.cleanup();
  };
return {
  testEnv,
  app,
  client, // Return the client instance
  cleanup,
};
}

export async function createBranchDir(env: TestEnv, branchName: string): Promise<string> {
  const safeBranchName = toSafeBranchName(branchName);
  const branchDir = path.join(env.branchMemoryPath, safeBranchName);
  await fs.ensureDir(branchDir);
  return branchDir;
}

