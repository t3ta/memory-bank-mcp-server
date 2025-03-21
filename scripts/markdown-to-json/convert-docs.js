#!/usr/bin/env node

/**
 * Script to convert all Markdown files in the docs directory to JSON
 * and delete the original Markdown files if conversion is successful
 * Usage: node convert-docs.js
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Utility to execute a command and get the output
function execCommand(command, args) {
  return new Promise((resolve, reject) => {
    const process = spawn(command, args);
    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    process.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`Command failed with code ${code}: ${stderr}`));
      }
    });
  });
}

// Find all markdown files in the directory and its subdirectories
async function findMarkdownFiles(dir) {
  try {
    const output = await execCommand('find', [dir, '-name', '*.md']);
    return output.trim().split('\n').filter(file => file);
  } catch (error) {
    console.error('Error finding markdown files:', error);
    return [];
  }
}

// Check if a corresponding JSON file exists
function hasJsonEquivalent(mdFilePath) {
  const jsonFilePath = mdFilePath.replace(/\.md$/, '.json');
  return fs.existsSync(jsonFilePath);
}

// Convert a markdown file to JSON using the markdown-to-json.js script
async function convertFile(markdownPath) {
  const jsonPath = markdownPath.replace(/\.md$/, '.json');
  
  try {
    console.log(`Converting: ${markdownPath}`);
    await execCommand('node', [
      path.join(__dirname, 'markdown-to-json.js'),
      markdownPath,
      jsonPath
    ]);
    return true;
  } catch (error) {
    console.error(`Error converting ${markdownPath}:`, error);
    return false;
  }
}

// Delete the markdown file after successful conversion
function deleteMarkdownFile(markdownPath) {
  try {
    fs.unlinkSync(markdownPath);
    console.log(`Deleted: ${markdownPath}`);
    return true;
  } catch (error) {
    console.error(`Error deleting ${markdownPath}:`, error);
    return false;
  }
}

// Validate the JSON file was created properly
function validateJsonFile(jsonPath) {
  try {
    const content = fs.readFileSync(jsonPath, 'utf-8');
    JSON.parse(content); // Will throw if not valid JSON
    return true;
  } catch (error) {
    console.error(`Invalid JSON file at ${jsonPath}:`, error);
    return false;
  }
}

// Main function to process all markdown files
async function processAllMarkdownFiles() {
  const docsDir = path.join(__dirname, '..', 'docs');
  const markdownFiles = await findMarkdownFiles(docsDir);
  
  console.log(`Found ${markdownFiles.length} markdown files to process`);
  
  const results = {
    total: markdownFiles.length,
    processed: 0,
    converted: 0,
    skipped: 0,
    failed: 0,
    deleted: 0
  };
  
  for (const file of markdownFiles) {
    results.processed++;
    
    // Skip files that already have JSON equivalents
    if (hasJsonEquivalent(file)) {
      console.log(`Skipping ${file} - JSON equivalent already exists`);
      results.skipped++;
      continue;
    }
    
    const success = await convertFile(file);
    if (success) {
      const jsonPath = file.replace(/\.md$/, '.json');
      if (validateJsonFile(jsonPath)) {
        console.log(`Successfully converted: ${file} -> ${jsonPath}`);
        results.converted++;
        
        // Comment/uncomment this line when ready to delete original files
        const deleted = deleteMarkdownFile(file);
        if (deleted) {
          results.deleted++;
        }
      } else {
        results.failed++;
      }
    } else {
      results.failed++;
    }
  }
  
  // Print summary
  console.log('\nConversion Summary:');
  console.log('------------------');
  console.log(`Total markdown files found: ${results.total}`);
  console.log(`Files converted: ${results.converted}`);
  console.log(`Files skipped (JSON already exists): ${results.skipped}`);
  console.log(`Files failed: ${results.failed}`);
  console.log(`Original files deleted: ${results.deleted}`);
}

// Execute the main function
processAllMarkdownFiles().catch(error => {
  console.error('Error processing markdown files:', error);
  process.exit(1);
});
