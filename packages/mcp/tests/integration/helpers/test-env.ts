/**
 * Test environment helpers
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url'; // Import fileURLToPath for ESM path resolution
// import * as os from 'os'; // No longer needed
// import { v4 as uuid } from 'uuid'; // No longer needed
import { logger } from '../../../src/shared/utils/logger.js';
import { toSafeBranchName } from '../../../src/shared/utils/branchNameUtils.js';
import tmp from 'tmp-promise'; // Import tmp-promise
import { execSync } from 'child_process';

/**
 * Test environment interface
 */
export interface TestEnv {
  docRoot: string;
  tempDir: string;
  branchMemoryPath: string;
  globalMemoryPath: string;
  // Add cleanup function to TestEnv
  cleanup: () => Promise<void>;
}

/**
 * Setup test environment
 * Creates temporary directories for test files using tmp-promise
 */
export async function setupTestEnv(): Promise<TestEnv> {
  // Create unique temp directory using tmp-promise
  const tempDirResult = await tmp.dir({ unsafeCleanup: true }); // Creates a temp dir and returns path + cleanup func
  const tempDir = tempDirResult.path;
  const cleanup = tempDirResult.cleanup; // Get the cleanup function

  const docRoot = path.join(tempDir, 'docs');
  const branchMemoryPath = path.join(docRoot, 'branch-memory-bank');
  const globalMemoryPath = path.join(docRoot, 'global-memory-bank');

  // Use absolute path based on this file's location
  const currentFilePath = fileURLToPath(import.meta.url);
  // Current file is at: packages/mcp/tests/integration/helpers/test-env.ts
  // So we need to go up 4 levels to reach the project root
  const projectRoot = path.resolve(path.dirname(currentFilePath), '../../../../');
  logger.debug(`[setupTestEnv] Resolved project root: ${projectRoot}`);
  logger.debug(`[setupTestEnv] Current file path: ${currentFilePath}`);
  logger.debug(`[setupTestEnv] Current directory: ${path.dirname(currentFilePath)}`);
  
  // We know our templates are at packages/mcp/src/templates/json
  // But based on our projectRoot, we need to figure out if that's already included
  // Let's create the path directly from our current file location
  const srcTemplatesJsonDir = path.resolve(path.dirname(currentFilePath), '../../../src/templates/json');
  logger.debug(`[setupTestEnv] Template source path: ${srcTemplatesJsonDir}`);
  
  // Original paths for copying from actual docs directory
  const sourceTranslationsDir = path.join(projectRoot, 'docs/translations');
  
  // Set NODE_ENV to 'test' for proper environment configuration
  process.env.NODE_ENV = 'test';
  logger.debug(`[setupTestEnv] Set NODE_ENV to: ${process.env.NODE_ENV}`);

  // Define target paths within temp docRoot
  const targetTranslationsDir = path.join(docRoot, 'translations');
  const targetTemplatesJsonDir = path.join(docRoot, 'templates/json');

  // Ensure directories exist (fs-extra handles this recursively with copy)
  // We still need the base docRoot and memory bank roots
  await fs.ensureDir(docRoot);
  await fs.ensureDir(branchMemoryPath);
  await fs.ensureDir(globalMemoryPath);
  // target dirs will be created by fs.copy if they don't exist

  // Removed dummy file creation logic to use actual copied files

  // --- Start: Initialize Git Repository ---
  try {
    logger.debug(`[setupTestEnv] Initializing Git repository in ${tempDir}...`);
    // Gitリポジトリを初期化
    execSync('git init', { cwd: tempDir, stdio: 'ignore' });
    // Gitのユーザー設定（ないとコミットできない場合がある）
    execSync('git config user.email "test@example.com"', { cwd: tempDir, stdio: 'ignore' });
    execSync('git config user.name "Test User"', { cwd: tempDir, stdio: 'ignore' });
    // 空の初期コミットを作成
    execSync('git commit --allow-empty -m "Initial commit"', { cwd: tempDir, stdio: 'ignore' });
    logger.debug(`[setupTestEnv] Git repository initialized and initial commit created in ${tempDir}.`);
  } catch (gitError) {
    logger.error('[setupTestEnv] Error initializing Git repository:', gitError);
    await cleanup(); // エラー時はクリーンアップ
    throw gitError;
  }
  // --- End: Initialize Git Repository ---

  // --- Start: Original Copy Logic ---
  // Copy necessary files from project's docs to temp docs
  try {
    // Copy translation files
    if (await fs.pathExists(sourceTranslationsDir)) {
      await fs.copy(sourceTranslationsDir, targetTranslationsDir);
      logger.debug(`Copied translations from ${sourceTranslationsDir} to ${targetTranslationsDir}`);
    } else {
      logger.warn(`Source translations directory not found: ${sourceTranslationsDir}`);
    }

    // Create target directory and set path variables
    await fs.ensureDir(targetTemplatesJsonDir);
    const targetRulesPath = path.join(targetTemplatesJsonDir, 'rules.json');
    
    // Copy from src/templates/json directory only (as requested)
    if (await fs.pathExists(srcTemplatesJsonDir)) {
      logger.debug(`Source src/templates/json directory exists: ${srcTemplatesJsonDir}`);
      await fs.copy(srcTemplatesJsonDir, targetTemplatesJsonDir);
      logger.debug(`Copied templates/json from src ${srcTemplatesJsonDir} to ${targetTemplatesJsonDir}`);
    } else {
      logger.error(`Source src/templates/json directory not found: ${srcTemplatesJsonDir}. This is required for tests.`);
      throw new Error(`Source templates directory not found: ${srcTemplatesJsonDir}`);
    }
    
    // Create template files if they don't exist
  if (!await fs.pathExists(targetRulesPath)) {
    logger.debug('Creating dummy rules files for testing');
    
    // Generate dummy rules in template_v1 format
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

    // Generate language-specific rule files
    const dummyRulesEnContent = JSON.stringify({
      schema: "template_v1",
      metadata: {
        id: "rules-en",
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
        id: "rules-ja",
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
        id: "rules-zh",
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

    // Create the files
    await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules.json'), dummyRulesContent, 'utf-8');
    await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules-en.json'), dummyRulesEnContent, 'utf-8');
    await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules-ja.json'), dummyRulesJaContent, 'utf-8');
    await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules-zh.json'), dummyRulesZhContent, 'utf-8');
    
    // Duplicate in translations directory for good measure
    await fs.ensureDir(targetTranslationsDir);
    await fs.outputFile(path.join(targetTranslationsDir, 'rules.json'), dummyRulesContent, 'utf-8');
    await fs.outputFile(path.join(targetTranslationsDir, 'rules-en.json'), dummyRulesEnContent, 'utf-8');
    await fs.outputFile(path.join(targetTranslationsDir, 'rules-ja.json'), dummyRulesJaContent, 'utf-8');
    await fs.outputFile(path.join(targetTranslationsDir, 'rules-zh.json'), dummyRulesZhContent, 'utf-8');
    
    logger.debug('Dummy rules files created successfully');
  }
    
    // Verify final contents of the templates directory
    try {
      const copiedFiles = await fs.readdir(targetTemplatesJsonDir);
      logger.debug(`Final contents of target templates/json directory: ${copiedFiles.join(', ')}`);
      
      // Check specifically for rules.json which is required for tests
      if (!copiedFiles.includes('rules.json')) {
        logger.error('Critical template file rules.json is missing!');
      }
    } catch (listError) {
      logger.error(`Failed to list target templates/json directory: ${targetTemplatesJsonDir}`, listError);
    }
  } catch (copyError) {
    logger.error('Error copying initial docs files to temp directory:', copyError);
    // If copying fails, cleanup the temp dir and rethrow
    await cleanup();
    throw copyError;
  }
  // --- End: Original Copy Logic ---

  return {
    docRoot,
    tempDir,
    branchMemoryPath,
    globalMemoryPath,
    cleanup // Return the cleanup function
  };
}

/**
 * Cleanup test environment
 * Removes temporary directories using the cleanup function provided by tmp-promise
 */
export async function cleanupTestEnv(env: TestEnv): Promise<void> {
  try {
    // Use the cleanup function returned by tmp.dir
    await env.cleanup();
    logger.debug(`Cleaned up temp directory: ${env.tempDir}`);
  } catch (error) {
    logger.error('Error cleaning up test environment:', { error, component: 'test-env' });
    // Attempt manual removal as fallback, but log the error
    try {
      await fs.remove(env.tempDir);
      logger.warn(`Fallback removal attempted for temp directory: ${env.tempDir}`);
    } catch (fallbackError) {
      logger.error('Fallback removal failed:', { error: fallbackError, component: 'test-env' });
    }
  }
}

/**
 * Create a branch directory in the test environment
 */
export async function createBranchDir(env: TestEnv, branchName: string): Promise<string> {
  // Convert branch name to safe file system name using shared utility
  const safeBranchName = toSafeBranchName(branchName);
  const branchDir = path.join(env.branchMemoryPath, safeBranchName);
  await fs.ensureDir(branchDir);
  logger.debug(`Created branch directory: ${branchDir}`);
  return branchDir;
}
