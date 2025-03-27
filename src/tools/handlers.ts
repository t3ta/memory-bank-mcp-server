import { validateJsonPatch, sanitizeJsonPatch, JsonPatchOperation } from './patch-utils.js';
import { Application, createApplication } from '../main/index.js';
import { logger } from '../shared/utils/index.js';
import { resolveDocsRoot } from '../index.js';
import { Language } from '@memory-bank/schemas';
import type { CliOptions } from '../shared/types/index.js';

// ローカルでアプリケーションオプションをマージする関数（循環参照を避けるため）
function getMergedApplicationOptions(appInstance: Application | null, docs?: string, language: Language = 'ja'): CliOptions {
  if (!appInstance) {
    // 初期アプリケーションでは通常の処理
    return {
      docsRoot: docs || resolveDocsRoot(),
      language,
      verbose: false
    };
  }

  // 既存のアプリケーションのオプションを取得
  const originalOptions = appInstance.options || {};

  // 解決されたパス
  const docsRoot = docs ? docs : resolveDocsRoot();

  // 明示的に指定された値のみを上書き
  return {
    ...originalOptions,
    ...(docs ? { docsRoot } : {}),
    language: originalOptions.language || language,
    verbose: originalOptions.verbose || false
  };
}

/**
 * JSON Patchを処理するための共通関数
 * write_branch_memory_bankとwrite_global_memory_bankの両方で使用される
 */
export async function processJsonPatch(
  app: Application,
  patches: any[],
  readDocument: (path: string) => Promise<any>,
  writeDocument: (path: string, content: string) => Promise<any>,
  path: string,
  contextInfo: string
): Promise<{content: {type: string, text: string}[]}> {
  logger.debug(`Applying patches to ${contextInfo} (path: ${path})`);

  try {
    // 【強化1】パッチの検証を厳密に実施
    const validationResult = validateJsonPatch(patches);
    if (!validationResult.valid) {
      const errorMessage = `Invalid JSON Patch operations:\n${validationResult.errors.join('\n')}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    // 【強化2】パッチを安全な形に整形
    const sanitizedPatches = sanitizeJsonPatch(patches);
    logger.debug(`Sanitized ${patches.length} JSON Patch operations`);
    
    // Import necessary classes
    const { JsonPatchOperation } = await import('../domain/jsonpatch/JsonPatchOperation.js');
    const { FastJsonPatchAdapter } = await import('../domain/jsonpatch/FastJsonPatchAdapter.js');

    // Create adapter for patch application
    const patchService = new FastJsonPatchAdapter();

    // First, read the document
    const readResult = await readDocument(path);
    if (!readResult.success) {
      throw new Error(`Document not found: ${path}. Create the document first before applying patches.`);
    }

    const document = readResult.data?.content;
    if (!document) {
      throw new Error(`Document is empty or invalid: ${path}`);
    }

    // Parse document content to JSON if it's a string
    const docContent = typeof document === 'string' ? JSON.parse(document) : document;

    // Convert patch operations to domain model
    const patchOperations = sanitizedPatches.map(patch => {
      return JsonPatchOperation.create(
        patch.op,
        patch.path,
        patch.value,
        patch.from
      );
    });

    // Apply patches
    logger.debug(`Applying ${patchOperations.length} JSON Patch operations`);

    // Execute validation with enhanced adapter
    const isValid = patchService.validate(docContent, patchOperations);
    if (!isValid) {
      throw new Error('Invalid JSON Patch operations');
    }

    // Apply patches
    const updatedContent = patchService.apply(docContent, patchOperations);

    // Save the updated document
    const jsonString = JSON.stringify(updatedContent, null, 2);
    const writeResult = await writeDocument(path, jsonString);

    if (!writeResult.success) {
      throw new Error((writeResult as any).error?.message || 'Failed to save patched document');
    }

    // 【強化3】レスポンスに適用したパッチ数を含める
    return { 
      content: [{ 
        type: 'text', 
        text: `Document patched successfully. Applied ${patchOperations.length} operations.` 
      }] 
    };
  } catch (error) {
    logger.error(`Error applying JSON Patch to ${contextInfo}:`, error);
    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * ドキュメントを読み込むための共通関数
 */
export async function readBranchDocument(
  app: Application,
  path: string,
  branch: string,
  docs: string | undefined
) {
  if (!app) {
    throw new Error('Application not initialized');
  }

  // Resolve docs root
  const docsRoot = docs || resolveDocsRoot();
  logger.debug(`Reading branch memory bank (branch: ${branch}, path: ${path}, docsRoot: ${docsRoot})`);

  // アプリケーションオプションと新しいインスタンスを作成
  const appOptions = getMergedApplicationOptions(app, docsRoot, 'ja');
  
  logger.debug(`Using application options: ${JSON.stringify(appOptions)}`);
  const branchApp = docs ? await createApplication(appOptions) : app;

  const response = await branchApp.getBranchController().readDocument(branch, path);
  if (!response.success) {
    throw new Error((response as any).error.message);
  }

  return {
    content: [{ type: 'text', text: response.data?.content || '' }],
    _meta: { lastModified: response.data?.lastModified || new Date().toISOString() },
  };
}

/**
 * ドキュメントを読み込むための共通関数（グローバル用）
 */
export async function readGlobalDocument(
  app: Application,
  path: string,
  docs: string | undefined
) {
  if (!app) {
    throw new Error('Application not initialized');
  }

  // Resolve docs root
  const docsRoot = docs || resolveDocsRoot();
  logger.debug(`Reading global memory bank (path: ${path}, docsRoot: ${docsRoot})`);

  // アプリケーションオプションと新しいインスタンスを作成
  const appOptions = getMergedApplicationOptions(app, docsRoot, 'ja');
  
  logger.debug(`Using application options: ${JSON.stringify(appOptions)}`);
  const globalApp = docs ? await createApplication(appOptions) : app;

  const response = await globalApp.getGlobalController().readDocument(path);
  if (!response.success) {
    throw new Error((response as any).error.message);
  }

  return {
    content: [{ type: 'text', text: response.data?.content || '' }],
    _meta: { lastModified: response.data?.lastModified || new Date().toISOString() },
  };
}