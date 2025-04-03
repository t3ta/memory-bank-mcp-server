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

  // Define source paths relative to this file's location using import.meta.url
  const currentFilePath = fileURLToPath(import.meta.url);
  // Go up 4 levels from packages/mcp/tests/integration/helpers to reach the project root
  const projectRoot = path.resolve(path.dirname(currentFilePath), '../../../../');
  logger.debug(`[setupTestEnv] Resolved project root: ${projectRoot}`); // Log resolved project root
  const sourceTranslationsDir = path.join(projectRoot, 'docs/translations');
  const sourceTemplatesJsonDir = path.join(projectRoot, 'packages/mcp/tests/integration/fixtures/templates/json'); // Path updated

  // Define target paths within temp docRoot
  const targetTranslationsDir = path.join(docRoot, 'translations');
  const targetTemplatesJsonDir = path.join(docRoot, 'templates/json');

  // Ensure directories exist (fs-extra handles this recursively with copy)
  // We still need the base docRoot and memory bank roots
  await fs.ensureDir(docRoot);
  await fs.ensureDir(branchMemoryPath);
  await fs.ensureDir(globalMemoryPath);
  // target dirs will be created by fs.copy if they don't exist

  // --- Start: Create dummy files instead of copying ---
  try {
    // Ensure target directories exist
    await fs.ensureDir(targetTranslationsDir);
    await fs.ensureDir(targetTemplatesJsonDir);

    // Create dummy rules files
    const dummyRulesContent = JSON.stringify({ schema: "rules_v1", content: "Dummy rule content" }, null, 2);
    await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules.json'), dummyRulesContent, 'utf-8');
    await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules-ja.json'), dummyRulesContent, 'utf-8');
    await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules-en.json'), dummyRulesContent, 'utf-8');
    await fs.outputFile(path.join(targetTemplatesJsonDir, 'rules-zh.json'), dummyRulesContent, 'utf-8');
    logger.debug(`Created dummy rules files in ${targetTemplatesJsonDir}`);

    // Create dummy branch context file for ReadBranchDocumentUseCase test
    const dummyBranchContext = {
      schema: "memory_document_v2",
      metadata: { id: "test-branch-context", documentType: "branch_context", path: "branchContext.json" },
      content: { value: "Dummy branch context" }
    };
    // Ensure the specific branch directory exists before writing the file
    const testBranchDir = path.join(branchMemoryPath, 'feature-test-branch'); // Use safe name convention
    await fs.ensureDir(testBranchDir);
    const jsonContent = JSON.stringify(dummyBranchContext, null, 2);
    await fs.outputFile(path.join(testBranchDir, 'branchContext.json'), jsonContent, 'utf-8');
    logger.debug(`Created dummy branchContext.json in ${testBranchDir}`);

  } catch (createError) {
    logger.error('Error creating dummy files in temp directory:', createError);
    await cleanup();
    throw createError;
  }
  // --- End: Create dummy files instead of copying ---

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

    // Copy templates/json files (likely contains rules.json or rules-*.json)
    if (await fs.pathExists(sourceTemplatesJsonDir)) {
      logger.debug(`Source templates/json directory exists: ${sourceTemplatesJsonDir}`);
      await fs.copy(sourceTemplatesJsonDir, targetTemplatesJsonDir);
      logger.debug(`Copied templates/json from ${sourceTemplatesJsonDir} to ${targetTemplatesJsonDir}`);
      // Verify copy by listing target directory contents
      try {
        const copiedFiles = await fs.readdir(targetTemplatesJsonDir);
        logger.debug(`Contents of target templates/json directory: ${copiedFiles.join(', ')}`);
      } catch (listError) {
        logger.error(`Failed to list target templates/json directory: ${targetTemplatesJsonDir}`, listError);
      }
    } else {
      logger.warn(`Source templates/json directory not found: ${sourceTemplatesJsonDir}`);
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
    console.error('Error cleaning up test environment:', error);
    // Attempt manual removal as fallback, but log the error
    try {
      await fs.remove(env.tempDir);
      logger.warn(`Fallback removal attempted for temp directory: ${env.tempDir}`);
    } catch (fallbackError) {
      console.error('Fallback removal failed:', fallbackError);
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
