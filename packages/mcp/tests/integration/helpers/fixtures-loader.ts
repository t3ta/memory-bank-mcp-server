/**
 * Test fixtures loader
 */
import * as fs from 'fs-extra';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ESMでは__dirnameが使えないので、import.meta.urlからパスを生成
const currentFilePath = fileURLToPath(import.meta.url);
const FIXTURES_ROOT = path.join(path.dirname(currentFilePath), '../fixtures');

/**
 * Load fixtures for a branch
 * @param branchDir Branch directory path
 * @param fixtureName Fixture name (subdirectory in fixtures/branch/)
 */
export async function loadBranchFixture(branchDir: string, fixtureName: string): Promise<void> {
  const sourceDir = path.join(FIXTURES_ROOT, 'branch', fixtureName); // Corrected path segment

  // Check if fixture exists
  if (!await fs.pathExists(sourceDir)) {
    throw new Error(`Branch fixture not found: ${fixtureName}`);
  }

  // Copy fixture files to branch directory
  await fs.copy(sourceDir, branchDir);
}

/**
 * Load fixtures for global memory bank
 * @param globalDir Global memory bank directory path
 * @param fixtureName Fixture name (subdirectory in fixtures/global-documents/)
 */
export async function loadGlobalFixture(globalDir: string, fixtureName: string): Promise<void> {
  const sourceDir = path.join(FIXTURES_ROOT, 'global-documents', fixtureName);

  // Check if fixture exists
  if (!await fs.pathExists(sourceDir)) {
    throw new Error(`Global fixture not found: ${fixtureName}`);
  }

  // Copy fixture files to global directory
  await fs.copy(sourceDir, globalDir);
}

/**
 * Get fixture JSON content
 * @param fixturePath Path to fixture JSON file, relative to fixtures root
 */
export async function getFixtureContent(fixturePath: string): Promise<any> {
  const fullPath = path.join(FIXTURES_ROOT, fixturePath);

  // Check if fixture exists
  if (!await fs.pathExists(fullPath)) {
    throw new Error(`Fixture not found: ${fixturePath}`);
  }

  // Read and parse JSON content
  const content = await fs.readFile(fullPath, 'utf-8');
  return JSON.parse(content);
}
