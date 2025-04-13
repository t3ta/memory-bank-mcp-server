// @ts-check
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Recursively copy a directory
 * @param {string} src - Source directory path
 * @param {string} dest - Destination directory path
 */
async function copyDir(src, dest) {
  // Create directory if it doesn't exist
  await fs.mkdir(dest, { recursive: true });

  // Get all entries in the directory
  const entries = await fs.readdir(src, { withFileTypes: true });

  // Process each entry
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Recursively copy directories
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath);
    } else {
      // Copy files
      await fs.copyFile(srcPath, destPath);
    }
  }
}

// Main process
async function main() {
  try {
    console.log('🔍 Starting asset copy...');

    // Copy translation files
    await copyDir(
      'packages/mcp/src/infrastructure/i18n/translations',
      'packages/mcp/dist/infrastructure/i18n/translations'
    );
    console.log('✅ Translation files copied successfully!');

    // Template copying has been removed as they are now TS-based and compiled automatically

    console.log('✨ All assets copied successfully!');
  } catch (error) {
    console.error('❌ Error occurred:', error);
    process.exit(1);
  }
}

main();
