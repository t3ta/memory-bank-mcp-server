#!/usr/bin/env node

/**
 * Script to convert Markdown files to JSON format with the required structure for memory-bank-mcp-server
 * Usage: node markdown-to-json.js <input-markdown-path> <output-json-path>
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate a UUID v4
 * @returns {string} UUID v4 string
 */
function generateUUID() {
  return crypto.randomUUID();
}

/**
 * Get current ISO datetime string
 * @returns {string} ISO format datetime string
 */
function getCurrentISODateTime() {
  return new Date().toISOString();
}

/**
 * Extract the title from markdown content
 * @param {string} markdownContent - The markdown content
 * @returns {string} The extracted title
 */
function extractTitle(markdownContent) {
  const titleMatch = markdownContent.match(/^# (.+)$/m);
  return titleMatch ? titleMatch[1].trim() : 'Untitled Document';
}

/**
 * Main function to convert markdown to JSON using Gemini
 * @param {string} inputPath - Path to markdown file
 * @param {string} outputPath - Path to output JSON file
 */
async function convertMarkdownToJson(inputPath, outputPath) {
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file ${inputPath} does not exist`);
    process.exit(1);
  }

  const markdownContent = fs.readFileSync(inputPath, 'utf-8');
  const title = extractTitle(markdownContent);
  const relativePath = path.basename(inputPath);

  try {
    // Use shitauke to convert markdown to JSON
    const tempOutputPath = `/tmp/temp-${Date.now()}.json`;
    
    const geminiPrompt = `Convert this markdown file to a JSON document. 
    The output should be in the following format EXACTLY: 
    { 
      'schema': 'memory_document_v2', 
      'metadata': { 
        'id': 'auto-uuid', 
        'title': '${title}', 
        'documentType': 'generic', 
        'path': '${relativePath}', 
        'tags': [], 
        'lastModified': 'auto-date', 
        'createdAt': 'auto-date', 
        'version': 1 
      }, 
      'content': { 
        // Each section heading in the markdown should be a property key here, 
        // and the section content should be the value. 
        // Do not include the heading itself in the content.
      } 
    }`;

    const shitauke = spawn('shitauke', [
      'send',
      '-m', 'gemini-2.0-flash',
      '-p', 'gemini',
      '-f', 'json',
      '-i', inputPath,
      '-o', tempOutputPath,
      geminiPrompt
    ]);

    // Wait for the shitauke process to complete
    await new Promise((resolve, reject) => {
      shitauke.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`shitauke process exited with code ${code}`));
        }
      });
      
      shitauke.stderr.on('data', (data) => {
        console.error(`${data}`);
      });
    });

    // Read the generated JSON and modify it with proper UUID and dates
    let jsonContent = JSON.parse(fs.readFileSync(tempOutputPath, 'utf-8'));
    
    // Update the metadata
    jsonContent.metadata.id = generateUUID();
    jsonContent.metadata.lastModified = getCurrentISODateTime();
    jsonContent.metadata.createdAt = getCurrentISODateTime();
    
    // Write the final JSON
    fs.writeFileSync(outputPath, JSON.stringify(jsonContent, null, 2), 'utf-8');
    console.log(`Conversion successful: ${outputPath}`);
    
    // Clean up the temporary file
    if (fs.existsSync(tempOutputPath)) {
      fs.unlinkSync(tempOutputPath);
    }
    
    return true;
  } catch (error) {
    console.error('Error converting markdown to JSON:', error);
    return false;
  }
}

// Process command line arguments
if (process.argv.length < 4) {
  console.log('Usage: node markdown-to-json.js <input-markdown-path> <output-json-path>');
  process.exit(1);
}

const inputPath = process.argv[2];
const outputPath = process.argv[3];

convertMarkdownToJson(inputPath, outputPath)
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  });
