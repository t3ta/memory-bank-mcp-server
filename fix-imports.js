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

// Don't apply our check if the import already has an extension
const hasExtension = (importPath) => {
  return importPath.endsWith('.js') || 
         importPath.endsWith('.json') || 
         importPath.endsWith('.mjs') || 
         importPath.endsWith('.cjs');
};

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

    // Check if any line has an import without .js
    const lines = content.split('\n');
    const modifiedLines = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // If line contains an import statement
      if (line.includes('from \'') || line.includes('from "')) {
        const importMatch = line.match(/from\s+['"]([^'"]+)['"]/);
        
        if (importMatch && !hasExtension(importMatch[1])) {
          // Add .js to the import path
          const newLine = line.replace(/from\s+(['"])([^'"]+)(['"])/, (match, q1, path, q3) => {
            return `from ${q1}${path}.js${q3}`;
          });
          
          modifiedLines.push({ lineNum: i, oldLine: line, newLine });
          modified = true;
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
        reason: 'Added .js extension to imports',
        changes: modifiedLines.length
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
      modified.forEach(r => console.log(`- ${r.file} (${r.changes} imports fixed)`));
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
