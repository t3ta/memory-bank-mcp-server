#!/usr/bin/env node

/**
 * Tests temporary directories cleanup utility
 * This script removes old temporary test directories
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

async function cleanupTempDirectories() {
  try {
    console.log('Starting cleanup of test temporary directories..');

    // Get temp directory path
    const tempDir = path.join(process.cwd(), 'tests', '.temp');

    // Check if directory exists
    try {
      await fs.access(tempDir);
    } catch (err) {
      console.log('Temp directory does not exist, nothing to clean.');
      return;
    }

    // Read directory contents
    const entries = await fs.readdir(tempDir, { withFileTypes: true });
    let removedCount = 0;

    // Process each entry
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(tempDir, entry.name);

        // Remove directory
        await fs.rm(dirPath, { recursive: true, force: true });
        removedCount++;

        console.log(`Removed: ${dirPath}`);
      }
    }

    console.log(`Cleanup completed. Removed ${removedCount} directories.`);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Execute the cleanup
cleanupTempDirectories();
