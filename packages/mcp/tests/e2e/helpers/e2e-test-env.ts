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

  // テンプレートv1形式で正しいIDを持つダミールールファイル
  const dummyRulesContent = JSON.stringify({
    schema: "template_v1",
    metadata: {
      id: "rules",
      titleKey: "template.title.rules",
      descriptionKey: "template.description.rules",
      type: "system",
      lastModified: new Date().toISOString()
    },
    content: {
      sections: [
        {
          id: "dummySection",
          titleKey: "template.section.dummy",
          contentKey: "template.content.dummy",
          isOptional: false
        }
      ],
      placeholders: {}
    }
  }, null, 2);

  // 言語別ファイルの場合も同様にIDが必要
  const dummyRulesEnContent = JSON.stringify({
    schema: "template_v1",
    metadata: {
      id: "rules-en", // 言語別IDをここで指定
      titleKey: "template.title.rules",
      descriptionKey: "template.description.rules",
      type: "system",
      lastModified: new Date().toISOString()
    },
    content: {
      sections: [
        {
          id: "dummySection",
          titleKey: "template.section.dummy",
          contentKey: "template.content.dummy",
          isOptional: false
        }
      ],
      placeholders: {}
    }
  }, null, 2);

  const dummyRulesJaContent = JSON.stringify({
    schema: "template_v1",
    metadata: {
      id: "rules-ja", // 日本語IDをここで指定
      titleKey: "template.title.rules",
      descriptionKey: "template.description.rules",
      type: "system",
      lastModified: new Date().toISOString()
    },
    content: {
      sections: [
        {
          id: "dummySection",
          titleKey: "template.section.dummy",
          contentKey: "template.content.dummy",
          isOptional: false
        }
      ],
      placeholders: {}
    }
  }, null, 2);

  const dummyRulesZhContent = JSON.stringify({
    schema: "template_v1",
    metadata: {
      id: "rules-zh", // 中国語IDをここで指定
      titleKey: "template.title.rules",
      descriptionKey: "template.description.rules",
      type: "system",
      lastModified: new Date().toISOString()
    },
    content: {
      sections: [
        {
          id: "dummySection",
          titleKey: "template.section.dummy",
          contentKey: "template.content.dummy",
          isOptional: false
        }
      ],
      placeholders: {}
    }
  }, null, 2);

  await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules.json'), dummyRulesContent, 'utf-8');
  await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules-en.json'), dummyRulesEnContent, 'utf-8');
  await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules-ja.json'), dummyRulesJaContent, 'utf-8');
  await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules-zh.json'), dummyRulesZhContent, 'utf-8');

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
  // Add logging around Application instantiation
  console.log('[setupE2ETestEnv] Creating Application instance...');
  const app = new Application({ docsRoot: testEnv.docRoot });
  console.log('[setupE2ETestEnv] Application instance created.');

  const [clientTransport, _serverTransport] = InMemoryTransport.createLinkedPair(); // serverTransport is not used, prefix with _

  // Initialize the application first
  console.log('[setupE2ETestEnv] Initializing application...'); // Keep existing log
  await app.initialize();
  console.log('[setupE2ETestEnv] Application initialized.');

  // Handle the server-side connection using the Application instance
  console.log('[setupE2ETestEnv] Setting up server connection handler...');
  await app.handleConnection(_serverTransport); // Pass the server transport to the app
  console.log('[setupE2ETestEnv] Server connection handler set up.');

  // Then create and initialize the client
  // Pass an empty options object as the second argument
  console.log('[setupE2ETestEnv] Creating client...');
  const client = new MCPInMemoryClient({ name: 'E2E Test Client', version: '1.0.0' }, {});
  console.log('[setupE2ETestEnv] Initializing client...');
  await client.initialize(clientTransport);
  console.log('[setupE2ETestEnv] Client initialized.');

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

