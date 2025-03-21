#!/usr/bin/env node

/**
 * Script to analyze the global memory bank documents and organize them using Gemini
 * Usage: node analyze-global-memory-bank.js [--dry-run] [--output-dir output/path]
 */

import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Default paths
const DOCS_DIR = "/Users/t3ta/workspace/memory-bank-mcp-server/docs/global-memory-bank";
const DEFAULT_OUTPUT_DIR = "/Users/t3ta/workspace/memory-bank-mcp-server/docs/global-memory-bank/analysis";

// Parse command line arguments
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const outputDirIndex = args.indexOf('--output-dir');
const OUTPUT_DIR = outputDirIndex !== -1 && args.length > outputDirIndex + 1 
  ? args[outputDirIndex + 1] 
  : DEFAULT_OUTPUT_DIR;

/**
 * Get current ISO datetime string
 * @returns {string} ISO format datetime string
 */
function getCurrentISODateTime() {
  return new Date().toISOString();
}

/**
 * Create directory if it doesn't exist
 * @param {string} dirPath - Directory path
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created directory: ${dirPath}`);
  }
}

/**
 * List all JSON files in a directory and its subdirectories
 * @param {string} dirPath - Directory path
 * @returns {string[]} Array of file paths
 */
function listJsonFilesRecursive(dirPath) {
  let results = [];
  
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory()) {
      // Recursively scan subdirectories
      results = results.concat(listJsonFilesRecursive(itemPath));
    } else if (stat.isFile() && itemPath.endsWith('.json')) {
      // Add JSON file to results
      results.push(itemPath);
    }
  }
  
  return results;
}

/**
 * Extract tags from all JSON documents
 * @param {string[]} filePaths - Array of JSON file paths
 * @returns {Object} Map of tags to array of document paths
 */
function extractTagsFromDocuments(filePaths) {
  const tagToDocuments = {};
  const documentInfo = [];
  
  for (const filePath of filePaths) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const jsonContent = JSON.parse(content);
      
      // Skip non-memory documents or those without proper structure
      if (!jsonContent.schema || !jsonContent.schema.includes('memory_document') || 
          !jsonContent.metadata || !Array.isArray(jsonContent.metadata.tags)) {
        continue;
      }
      
      const relativePath = path.relative(DOCS_DIR, filePath);
      const docInfo = {
        path: relativePath,
        title: jsonContent.metadata.title || relativePath,
        documentType: jsonContent.metadata.documentType || 'generic',
        tags: jsonContent.metadata.tags || [],
        lastModified: jsonContent.metadata.lastModified || null,
        contentSections: jsonContent.content && jsonContent.content.sections ? 
          jsonContent.content.sections.length : 0
      };
      
      documentInfo.push(docInfo);
      
      // Process tags
      for (const tag of docInfo.tags) {
        if (!tagToDocuments[tag]) {
          tagToDocuments[tag] = [];
        }
        tagToDocuments[tag].push(relativePath);
      }
    } catch (error) {
      console.error(`Error processing file ${filePath}:`, error.message);
    }
  }
  
  return { tagToDocuments, documentInfo };
}

/**
 * Generate analysis JSON from tag information
 * @param {Object} tagToDocuments - Map of tags to document paths
 * @param {Object} documentInfo - Array of document information
 * @returns {Object} Analysis JSON object
 */
function generateAnalysisJson(tagToDocuments, documentInfo) {
  // Create tag statistics
  const tagStats = Object.keys(tagToDocuments).map(tag => ({
    tag,
    count: tagToDocuments[tag].length,
    documents: tagToDocuments[tag]
  }));
  
  // Sort by count descending
  tagStats.sort((a, b) => b.count - a.count);
  
  // Group documents by type
  const documentsByType = {};
  for (const doc of documentInfo) {
    if (!documentsByType[doc.documentType]) {
      documentsByType[doc.documentType] = [];
    }
    documentsByType[doc.documentType].push(doc);
  }
  
  return {
    schema: "memory_document_v2",
    metadata: {
      id: "global-memory-bank-analysis-raw",
      title: "グローバルメモリバンク 生データ分析",
      documentType: "analysis",
      path: "analysis/global-memory-bank-analysis-raw.json",
      tags: ["analysis", "memory-bank", "meta", "raw-data"],
      lastModified: getCurrentISODateTime(),
      createdAt: getCurrentISODateTime(),
      version: 1
    },
    content: {
      sections: [
        {
          title: "分析概要",
          content: `グローバルメモリバンク内の${documentInfo.length}ドキュメントを分析した結果です。この生データをもとに、Geminiによる詳細な分析とカテゴリ分類が行われます。`
        },
        {
          title: "タグ統計",
          content: `全${Object.keys(tagToDocuments).length}個のユニークなタグが見つかりました。`
        }
      ],
      tagStatistics: tagStats,
      documentsByType: documentsByType,
      allDocuments: documentInfo.sort((a, b) => a.path.localeCompare(b.path))
    }
  };
}

/**
 * Use Gemini to analyze the tag structure and organize documents
 * @param {string} analysisJsonPath - Path to the raw analysis JSON
 * @param {string} outputPath - Path for the organized analysis
 */
async function organizeWithGemini(analysisJsonPath, outputPath) {
  try {
    console.log("Using Gemini to organize the global memory bank...");
    
    const geminiPrompt = `
    Analyze this raw data about the global memory bank documents and tags, and create a well-organized analysis with the following:

    1. Identify logical categories for grouping the tags
    2. Suggest tag consolidation where similar tags exist
    3. Identify potential gaps in the documentation
    4. Create a clear navigation structure
    5. Provide recommendations for better organization

    The output should be a JSON document with this structure:
    {
      "schema": "memory_document_v2",
      "metadata": {
        "id": "global-memory-bank-organized-analysis",
        "title": "グローバルメモリバンク 整理分析",
        "documentType": "analysis",
        "path": "analysis/global-memory-bank-organized-analysis.json",
        "tags": ["analysis", "memory-bank", "organization", "meta"],
        "lastModified": "auto-date",
        "createdAt": "auto-date",
        "version": 1
      },
      "content": {
        "sections": [
          {
            "title": "分析概要",
            "content": "概要テキスト"
          },
          {
            "title": "タグカテゴリ分類",
            "content": "タグのカテゴリ分類の説明"
          },
          {
            "title": "タグ統合の提案",
            "content": "類似タグやマージすべきタグの説明"
          },
          {
            "title": "ドキュメント構成分析",
            "content": "ドキュメント構成の分析と改善点"
          },
          {
            "title": "ナビゲーション提案",
            "content": "効率的なナビゲーション構造の提案"
          },
          {
            "title": "ギャップ分析",
            "content": "見つかった欠落や改善点"
          }
        ],
        "tagCategories": {
          "category1": {
            "title": "カテゴリ名",
            "description": "説明",
            "tags": ["tag1", "tag2"]
          },
          // ... 他のカテゴリ ...
        },
        "tagConsolidation": [
          {
            "targetTag": "推奨タグ",
            "mergeTags": ["類似タグ1", "類似タグ2"],
            "reason": "統合理由"
          },
          // ... 他の統合提案 ...
        ],
        "navigationStructure": {
          // ナビゲーション構造の提案
        },
        "recommendations": [
          // 具体的な推奨事項
        ]
      }
    }

    Be thoughtful and thorough in your analysis. Focus on making the memory bank more organized and easier to navigate.
    `;

    // Create a temporary file for combined input (analysis data + prompt)
    const tempInputPath = `/tmp/memory-bank-combined-input-${Date.now()}.txt`;
    
    // Read the analysis JSON
    const analysisData = JSON.parse(fs.readFileSync(analysisJsonPath, 'utf-8'));
    
    // Combine analysis data and prompt into one file
    const combinedInput = JSON.stringify({
      analysisData,
      instructions: geminiPrompt
    }, null, 2);
    
    fs.writeFileSync(tempInputPath, combinedInput, 'utf-8');

    // Run shitauke with Gemini
    const shitauke = spawn('shitauke', [
      'send',
      '-m', 'gemini-2.0-flash',
      '-p', 'gemini',
      '-f', 'json',
      '-i', tempInputPath,
      '-o', outputPath
    ]);

    // Handle the shitauke process
    await new Promise((resolve, reject) => {
      shitauke.on('close', (code) => {
        if (code === 0) {
          console.log(`Gemini organization complete! Output saved to: ${outputPath}`);
          resolve();
        } else {
          reject(new Error(`shitauke process exited with code ${code}`));
        }
      });
      
      shitauke.stderr.on('data', (data) => {
        console.error(`${data}`);
      });
    });

    // Clean up the temporary combined input file
    if (fs.existsSync(tempInputPath)) {
      fs.unlinkSync(tempInputPath);
    }

    // Update the timestamps in the output file
    try {
      const content = fs.readFileSync(outputPath, 'utf-8');
      const jsonContent = JSON.parse(content);
      jsonContent.metadata.lastModified = getCurrentISODateTime();
      jsonContent.metadata.createdAt = getCurrentISODateTime();
      fs.writeFileSync(outputPath, JSON.stringify(jsonContent, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error updating timestamps in output file:', error.message);
    }

    return true;
  } catch (error) {
    console.error('Error using Gemini to organize memory bank:', error);
    return false;
  }
}

// Main execution
async function main() {
  console.log("Starting global memory bank analysis...");
  console.log(`Source directory: ${DOCS_DIR}`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
  
  if (DRY_RUN) {
    console.log("DRY RUN MODE: No files will be written");
  }

  try {
    // Create output directory if it doesn't exist
    if (!DRY_RUN) {
      ensureDirectoryExists(OUTPUT_DIR);
    }
    
    // List all JSON files
    console.log("Finding JSON files in the global memory bank...");
    const jsonFiles = listJsonFilesRecursive(DOCS_DIR);
    console.log(`Found ${jsonFiles.length} JSON files`);
    
    // Extract tags and document info
    console.log("Extracting tags and document information...");
    const { tagToDocuments, documentInfo } = extractTagsFromDocuments(jsonFiles);
    console.log(`Found ${Object.keys(tagToDocuments).length} unique tags across ${documentInfo.length} valid documents`);
    
    // Generate raw analysis JSON
    console.log("Generating raw analysis data...");
    const analysisJson = generateAnalysisJson(tagToDocuments, documentInfo);
    
    // Write raw analysis file
    const rawAnalysisPath = path.join(OUTPUT_DIR, "global-memory-bank-analysis-raw.json");
    if (!DRY_RUN) {
      fs.writeFileSync(rawAnalysisPath, JSON.stringify(analysisJson, null, 2), 'utf-8');
      console.log(`Raw analysis data written to: ${rawAnalysisPath}`);
    } else {
      console.log(`DRY RUN: Would write raw analysis data to: ${rawAnalysisPath}`);
    }
    
    // Use Gemini to organize the memory bank
    const organizedAnalysisPath = path.join(OUTPUT_DIR, "global-memory-bank-organized-analysis.json");
    if (!DRY_RUN) {
      console.log("Using Gemini to organize the memory bank...");
      await organizeWithGemini(rawAnalysisPath, organizedAnalysisPath);
      console.log(`Organized analysis written to: ${organizedAnalysisPath}`);
    } else {
      console.log(`DRY RUN: Would use Gemini to create organized analysis at: ${organizedAnalysisPath}`);
    }
    
    console.log("Analysis complete!");
  } catch (error) {
    console.error("Error during analysis:", error);
    process.exit(1);
  }
}

// Execute main function
main().catch(error => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
