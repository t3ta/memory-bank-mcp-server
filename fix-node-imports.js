#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Convert ESM's import.meta.url to __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Promisify fs functions
const readFileAsync = (path) => fs.promises.readFile(path, 'utf8');
const writeFileAsync = (path, data) => fs.promises.writeFile(path, data, 'utf8');
const readDirAsync = (path) => fs.promises.readdir(path);
const statAsync = (path) => fs.promises.stat(path);

// Paths to ignore
const ignorePaths = [
  'node_modules',
  'dist',
  'coverage',
  '__tests__',
  '.git',
];

// Node.js built-in modules to use with node: prefix
const nodeBuiltins = [
  'path',
  'fs',
  'crypto',
  'url',
  'util',
  'events',
  'stream',
  'http',
  'https',
  'child_process',
  'zlib',
  'os',
];

/**
 * Process a single TypeScript file to fix imports
 */
async function processFile(filePath) {
  try {
    // Skip non-TypeScript files
    if (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx')) {
      return {
        file: filePath,
        status: 'skipped',
        reason: 'Not a TypeScript file',
      };
    }

    // Read file content
    const content = await readFileAsync(filePath);
    let modified = false;
    let newContent = content;

    // Check if any line has an import of a Node.js built-in module
    const lines = content.split('\n');
    const modifiedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check for imports of Node.js built-in modules
      for (const builtinModule of nodeBuiltins) {
        const regexPattern = new RegExp(`from\\s+['"]${builtinModule}['"]`);
        if (regexPattern.test(line)) {
          // Replace with node: prefix
          const newLine = line.replace(
            new RegExp(`from\\s+(['"])${builtinModule}(['"])`, 'g'), 
            `from $1node:${builtinModule}$2`
          );
          
          modifiedLines.push({ lineNum: i, oldLine: line, newLine });
          modified = true;
          break; // Stop checking other built-ins for this line
        }
      }
    }

    // Apply all modifications
    if (modified) {
      // Apply changes from the end to avoid offset issues
      modifiedLines.sort((a, b) => b.lineNum - a.lineNum);
      
      for (const mod of modifiedLines) {
        lines[mod.lineNum] = mod.newLine;
      }
      
      newContent = lines.join('\n');
      await writeFileAsync(filePath, newContent);
      
      return {
        file: filePath,
        status: 'modified',
        reason: 'Added node: prefix to Node.js built-in module imports',
        changes: modifiedLines.length,
        modules: modifiedLines.map(m => {
          const match = m.oldLine.match(/from\s+['"]([^'"]+)['"]/);
          return match ? match[1] : 'unknown';
        })
      };
    }

    return {
      file: filePath,
      status: 'unchanged',
      reason: 'No changes needed',
    };
  } catch (error) {
    return {
      file: filePath,
      status: 'error',
      reason: error.message,
    };
  }
}

/**
 * Recursively scan directory for TypeScript files
 */
async function scanDirectory(dir) {
  const results = [];

  // Get directory entries
  const entries = await readDirAsync(dir);

  for (const entry of entries) {
    const entryPath = path.join(dir, entry);

    // Skip ignored paths
    if (ignorePaths.some(p => entryPath.includes(p))) {
      continue;
    }

    // Check if it's a directory
    const stats = await statAsync(entryPath);
    if (stats.isDirectory()) {
      // Recursively scan subdirectory
      const subResults = await scanDirectory(entryPath);
      results.push(...subResults);
    } else if (stats.isFile() && (entryPath.endsWith('.ts') || entryPath.endsWith('.tsx'))) {
      // Process TypeScript file
      const result = await processFile(entryPath);
      results.push(result);
    }
  }

  return results;
}

/**
 * Main function
 */
async function main() {
  const srcDir = path.join(process.cwd(), 'src');
  console.log(`Scanning directory: ${srcDir}`);

  try {
    const results = await scanDirectory(srcDir);
    
    // Count totals
    const modified = results.filter(r => r.status === 'modified');
    const totalChanges = modified.reduce((sum, file) => sum + (file.changes || 0), 0);
    const unchanged = results.filter(r => r.status === 'unchanged');
    const errors = results.filter(r => r.status === 'error');
    const skipped = results.filter(r => r.status === 'skipped');
    
    // Print summary
    console.log('\nResults Summary:');
    console.log(`- Modified files: ${modified.length}`);
    console.log(`- Total imports fixed: ${totalChanges}`);
    console.log(`- Unchanged files: ${unchanged.length}`);
    console.log(`- Skipped files: ${skipped.length}`);
    console.log(`- Errors: ${errors.length}`);
    
    // List modified files
    if (modified.length > 0) {
      console.log('\nModified files:');
      modified.forEach(r => {
        console.log(`- ${r.file} (${r.changes} imports fixed):`);
        (r.modules || []).forEach(m => console.log(`  - ${m} → node:${m}`));
      });
    }
    
    // List errors
    if (errors.length > 0) {
      console.log('\nErrors:');
      errors.forEach(r => console.log(`- ${r.file}: ${r.reason}`));
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Run the script
main();
