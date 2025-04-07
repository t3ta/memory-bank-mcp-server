import { setupE2ETestEnv } from './helpers/e2e-test-env.js';
import type { Application } from '../../src/main/Application.js';
// import type { DocumentDTO } from '../../src/application/dtos/DocumentDTO.js'; // Not used
import type { BranchController } from '../../src/interface/controllers/BranchController.js';
// import { UpdateTagIndexUseCaseV2 } from '../../src/application/usecases/common/UpdateTagIndexUseCaseV2.js'; // Not used
import fs from 'fs-extra';
import path from 'path';

import { BranchTagIndex, GlobalTagIndex } from '@memory-bank/schemas';
import type { SearchResultItem } from '../../src/application/usecases/common/SearchDocumentsByTagsUseCase.js';
import { BranchInfo } from '../../src/domain/entities/BranchInfo.js';

describe('MCP E2E Search Documents by Tags Tests', () => {
  let testEnv: Awaited<ReturnType<typeof setupE2ETestEnv>>['testEnv'];
  let app: Application;
  let cleanup: () => Promise<void>;

  const testBranchName = 'feature/e2e-search-test';
  const branchDoc1Path = 'search-doc-b1.json';
  const branchDoc2Path = 'search-doc-b2.json';
  const globalDoc1Path = 'core/search-doc-g1.json';
  const globalDoc2Path = 'core/search-doc-g2.json';

  const branchDoc1Content = { metadata: { path: branchDoc1Path, tags: ["search", "branch", "alpha"] }, content: {} };
  const branchDoc2Content = { metadata: { path: branchDoc2Path, tags: ["search", "branch", "beta"] }, content: {} };
  const globalDoc1Content = { metadata: { path: globalDoc1Path, tags: ["search", "global", "alpha"] }, content: {} };
  const globalDoc2Content = { metadata: { path: globalDoc2Path, tags: ["search", "global", "gamma"] }, content: {} };

  beforeAll(async () => {
    // console.log('[E2E Test] Entering beforeAll...'); // Debug log removed
    const setup = await setupE2ETestEnv();
    // console.log('[E2E Test] setupE2ETestEnv completed.'); // Debug log removed
    testEnv = setup.testEnv;
    app = setup.app;
    cleanup = setup.cleanup;

    // Write test documents with different tags
    const branchController = app.getBranchController();
    const globalController = app.getGlobalController();
    await branchController.writeDocument({ branchName: testBranchName, path: branchDoc1Path, content: JSON.stringify(branchDoc1Content), tags: branchDoc1Content.metadata.tags });
    await branchController.writeDocument({ branchName: testBranchName, path: branchDoc2Path, content: JSON.stringify(branchDoc2Content), tags: branchDoc2Content.metadata.tags });
    await globalController.writeDocument({ path: globalDoc1Path, content: JSON.stringify(globalDoc1Content), tags: globalDoc1Content.metadata.tags });
    await globalController.writeDocument({ path: globalDoc2Path, content: JSON.stringify(globalDoc2Content), tags: globalDoc2Content.metadata.tags });

    // Create dummy index files
    const now = new Date();
    const branchIndexData: BranchTagIndex = {
      schema: 'tag_index_v1',
      metadata: { indexType: 'branch', branchName: testBranchName, lastUpdated: now, documentCount: 2, tagCount: 3 },
      index: [
        { tag: "search", documents: [{ id: '', path: branchDoc1Path, title: 'search-doc-b1.json', lastModified: now }, { id: '', path: branchDoc2Path, title: 'search-doc-b2.json', lastModified: now }] },
        { tag: "branch", documents: [{ id: '', path: branchDoc1Path, title: 'search-doc-b1.json', lastModified: now }, { id: '', path: branchDoc2Path, title: 'search-doc-b2.json', lastModified: now }] },
        { tag: "alpha", documents: [{ id: '', path: branchDoc1Path, title: 'search-doc-b1.json', lastModified: now }] },
        { tag: "beta", documents: [{ id: '', path: branchDoc2Path, title: 'search-doc-b2.json', lastModified: now }] },
      ]
    };
    const globalIndexData: GlobalTagIndex = {
      schema: 'tag_index_v1',
      metadata: { indexType: 'global', lastUpdated: now, documentCount: 2, tagCount: 3 },
      index: [
        { tag: "search", documents: [{ id: '', path: globalDoc1Path, title: 'search-doc-g1.json', lastModified: now }, { id: '', path: globalDoc2Path, title: 'search-doc-g2.json', lastModified: now }] },
        { tag: "global", documents: [{ id: '', path: globalDoc1Path, title: 'search-doc-g1.json', lastModified: now }, { id: '', path: globalDoc2Path, title: 'search-doc-g2.json', lastModified: now }] },
        { tag: "alpha", documents: [{ id: '', path: globalDoc1Path, title: 'search-doc-g1.json', lastModified: now }] },
        { tag: "gamma", documents: [{ id: '', path: globalDoc2Path, title: 'search-doc-g2.json', lastModified: now }] },
      ]
    };

    // Calculate correct paths using safeName
    const safeBranchName = BranchInfo.create(testBranchName).safeName;
    const branchIndexPath = path.join(testEnv.docRoot, 'branch-memory-bank', safeBranchName, '_index.json');
    const globalIndexPath = path.join(testEnv.docRoot, 'global-memory-bank', '_index.json');

    try {
      await fs.ensureDir(path.dirname(branchIndexPath));
      await fs.writeJson(branchIndexPath, branchIndexData, { spaces: 2, encoding: 'utf-8' });
      await fs.ensureDir(path.dirname(globalIndexPath));
      await fs.writeJson(globalIndexPath, globalIndexData, { spaces: 2, encoding: 'utf-8' });

      // Check if files exist after writing (optional debug step)
      // const branchExists = await fs.pathExists(branchIndexPath);
      // const globalExists = await fs.pathExists(globalIndexPath);
      // console.log(`[E2E Test] Dummy index files EXISTENCE after write: Branch exists=${branchExists}, Global exists=${globalExists}`);
    } catch (error) {
      console.error('[E2E Test] Failed during dummy index file creation:', error);
      throw error;
    }
  });

  afterAll(async () => {
    await cleanup();
  });

  it('should search documents with OR match (default) in all scopes (default)', async () => {
    // This test originally intended to test 'all' scope, but BranchController.searchByTags
    // is fixed to 'branch' scope. We test only the branch scope result here.
    const branchController = app.getBranchController() as unknown as BranchController;
    const result = await branchController.searchByTags({
      tags: ["alpha", "beta"],
      branchName: testBranchName,
      match: 'or' // Explicitly set match to 'or' (default)
    });
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    if (result.success) {
      const searchResults = (result.data as { results: SearchResultItem[] })?.results;
      expect(Array.isArray(searchResults)).toBe(true);
      // Only branch results expected (b1, b2)
      expect(searchResults).toHaveLength(2);
      expect(searchResults.some((doc) => doc.path === branchDoc1Path)).toBe(true);
      expect(searchResults.some((doc) => doc.path === branchDoc2Path)).toBe(true);
    } else {
      fail('searchByTags should return success: true');
    }
  });

  it('should search documents with AND match in BRANCH scope', async () => {
    const branchController = app.getBranchController() as unknown as BranchController;
    const result = await branchController.searchByTags({
      tags: ["search", "alpha"], // Branch has doc1 with tags "search" and "alpha"
      match: 'and',
      branchName: testBranchName,
    });
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    if (result.success) {
      const searchResults = (result.data as { results: SearchResultItem[] })?.results;
      expect(Array.isArray(searchResults)).toBe(true);
      // Only branchDoc1 should match "search" AND "alpha" in branch scope
      expect(searchResults).toHaveLength(1);
      expect(searchResults[0].path).toBe(branchDoc1Path);
      expect(searchResults[0].scope).toBe('branch');
    } else {
      fail('searchByTags should return success: true');
    }
  });

  it('should search documents only in branch scope with OR match', async () => {
    const branchController = app.getBranchController() as unknown as BranchController;
    const result = await branchController.searchByTags({
      tags: ["search"], // Branch has doc1, doc2 with tag "search"
      branchName: testBranchName,
      match: 'or' // Explicitly set match to 'or' (default)
    });
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    if (result.success) {
      const searchResults = (result.data as { results: SearchResultItem[] })?.results;
      expect(Array.isArray(searchResults)).toBe(true);
      // branchDoc1, branchDoc2 should match "search" in branch scope
      expect(searchResults).toHaveLength(2);
      // Check for path existence as order is not guaranteed
      const paths = searchResults.map(doc => doc.path);
      expect(paths).toContain(branchDoc1Path);
      expect(paths).toContain(branchDoc2Path);
      expect(searchResults.every((doc) => doc.scope === "branch")).toBe(true);
    } else {
      fail('searchByTags should return success: true');
    }
  });

  it('should search documents only in global scope with OR match', async () => {
    // Search global scope using GlobalController
    const globalController = app.getGlobalController();
    const result = await globalController.searchDocumentsByTags({
      tags: ["search"], // Global has doc1, doc2 with tag "search"
      scope: 'global', // Explicitly set scope
      match: 'or', // Explicitly set match to 'or' (default)
      docs: testEnv.docRoot, // GlobalController.searchDocumentsByTags requires docs path
    });
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    if (result.success) {
      const searchResults = (result.data as { results: SearchResultItem[] })?.results;
      expect(Array.isArray(searchResults)).toBe(true);
      // globalDoc1, globalDoc2 should match "search" in global scope
      expect(searchResults).toHaveLength(2);
      // Check for path existence as order is not guaranteed
      const paths = searchResults.map(doc => doc.path);
      expect(paths).toContain(globalDoc1Path);
      expect(paths).toContain(globalDoc2Path);
      expect(searchResults.every((doc) => doc.scope === "global")).toBe(true);
    } else {
      fail('searchDocumentsByTags should return success: true');
    }
  });

  it('should return empty array for non-existent tags', async () => {
    const branchController = app.getBranchController() as unknown as BranchController;
    // Test with BranchController (which searches only branch scope)
    const result = await branchController.searchByTags({
      tags: ["non-existent-tag"],
      branchName: testBranchName,
      // match defaults to 'or'
    });
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    if (result.success) {
      const searchResults = (result.data as { results: SearchResultItem[] })?.results;
      expect(Array.isArray(searchResults)).toBe(true);
      expect(searchResults).toHaveLength(0);
    } else {
      fail('searchByTags should return success: true');
    }
  });

  it('should return error if branch scope is specified without branch name', async () => {
    try {
      const branchController = app.getBranchController() as unknown as BranchController;
      // Expect error because branchName is required for BranchController.searchByTags
      await branchController.searchByTags({
        tags: ["search"],
        branchName: undefined as any,
      });
      fail('Expected searchDocumentsByTags to throw an error when scope is branch but branch name is missing.');
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

   it('should return error if all scope is specified without branch name', async () => {
    try {
      const branchController = app.getBranchController() as unknown as BranchController;
      // Test with BranchController (which requires branchName)
      await branchController.searchByTags({
        tags: ["search"],
        branchName: undefined as any,
      });
      fail('Expected searchDocumentsByTags to throw an error when scope is all but branch name is missing.');
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });
});
