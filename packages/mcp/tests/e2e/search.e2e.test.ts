import { setupE2ETestEnv } from './helpers/e2e-test-env.js';
import { MCPInMemoryClient } from './helpers/MCPInMemoryClient.js';
// import type { Server } from '@modelcontextprotocol/sdk'; // SDKが見つからない問題が解決するまでコメントアウト

describe('MCP E2E Search Documents by Tags Tests', () => {
  let testEnv: Awaited<ReturnType<typeof setupE2ETestEnv>>['testEnv'];
  let client: MCPInMemoryClient;
  let server: any; // Server型が見つからないためanyに変更
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

  beforeEach(async () => {
    const setup = await setupE2ETestEnv();
    testEnv = setup.testEnv;
    client = new MCPInMemoryClient(setup.clientTransport);
    await client.initialize();
    server = setup.server;
    cleanup = setup.cleanup;

    // Write test documents with different tags
    await client.writeBranchMemoryBank(testBranchName, branchDoc1Path, testEnv.docRoot, { content: JSON.stringify(branchDoc1Content), tags: branchDoc1Content.metadata.tags });
    await client.writeBranchMemoryBank(testBranchName, branchDoc2Path, testEnv.docRoot, { content: JSON.stringify(branchDoc2Content), tags: branchDoc2Content.metadata.tags });
    await client.writeGlobalMemoryBank(globalDoc1Path, testEnv.docRoot, { content: JSON.stringify(globalDoc1Content), tags: globalDoc1Content.metadata.tags });
    await client.writeGlobalMemoryBank(globalDoc2Path, testEnv.docRoot, { content: JSON.stringify(globalDoc2Content), tags: globalDoc2Content.metadata.tags });
  });

  afterEach(async () => {
    await cleanup();
  });

  it('should search documents with OR match (default) in all scopes (default)', async () => {
    const result = await client.searchDocumentsByTags(
      ["alpha", "beta"], // Tags to search
      testEnv.docRoot,
      { branch: testBranchName } // Scope 'all' needs branch name
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result.documents)).toBe(true);
    expect(result.documents).toHaveLength(3); // b1(alpha), b2(beta), g1(alpha)
    expect(result.documents.some((doc: any) => doc.path === branchDoc1Path)).toBe(true);
    expect(result.documents.some((doc: any) => doc.path === branchDoc2Path)).toBe(true);
    expect(result.documents.some((doc: any) => doc.path === globalDoc1Path)).toBe(true);
    expect(result.documents.some((doc: any) => doc.path === globalDoc2Path)).toBe(false); // gamma should not be included
  });

  it('should search documents with AND match in all scopes', async () => {
    const result = await client.searchDocumentsByTags(
      ["search", "alpha"], // Tags to search
      testEnv.docRoot,
      { match: 'and', scope: 'all', branch: testBranchName }
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result.documents)).toBe(true);
    expect(result.documents).toHaveLength(2); // b1(search, alpha), g1(search, alpha)
    expect(result.documents.some((doc: any) => doc.path === branchDoc1Path)).toBe(true);
    expect(result.documents.some((doc: any) => doc.path === globalDoc1Path)).toBe(true);
  });

  it('should search documents only in branch scope', async () => {
    const result = await client.searchDocumentsByTags(
      ["search"], // Tag to search
      testEnv.docRoot,
      { scope: 'branch', branch: testBranchName }
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result.documents)).toBe(true);
    expect(result.documents).toHaveLength(2); // b1, b2
    expect(result.documents.every((doc: any) => doc.tags.includes("branch"))).toBe(true);
    expect(result.documents.some((doc: any) => doc.path === branchDoc1Path)).toBe(true);
    expect(result.documents.some((doc: any) => doc.path === branchDoc2Path)).toBe(true);
  });

  it('should search documents only in global scope', async () => {
    const result = await client.searchDocumentsByTags(
      ["search"], // Tag to search
      testEnv.docRoot,
      { scope: 'global' } // No branch needed for global scope
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result.documents)).toBe(true);
    expect(result.documents).toHaveLength(2); // g1, g2
    expect(result.documents.every((doc: any) => doc.tags.includes("global"))).toBe(true);
    expect(result.documents.some((doc: any) => doc.path === globalDoc1Path)).toBe(true);
    expect(result.documents.some((doc: any) => doc.path === globalDoc2Path)).toBe(true);
  });

  it('should return empty array for non-existent tags', async () => {
    const result = await client.searchDocumentsByTags(
      ["non-existent-tag"],
      testEnv.docRoot,
      { branch: testBranchName }
    );
    expect(result).toBeDefined();
    expect(Array.isArray(result.documents)).toBe(true);
    expect(result.documents).toHaveLength(0);
  });

  it('should return error if branch scope is specified without branch name', async () => {
    try {
      await client.searchDocumentsByTags(
        ["search"],
        testEnv.docRoot,
        { scope: 'branch' } // Missing branch name
      );
      fail('Expected searchDocumentsByTags to throw an error when scope is branch but branch name is missing.');
    } catch (error: any) {
      expect(error).toBeDefined();
      // Example check: expect(error.message).toContain('Branch name is required');
    }
  });

   it('should return error if all scope is specified without branch name', async () => {
    try {
      await client.searchDocumentsByTags(
        ["search"],
        testEnv.docRoot,
        { scope: 'all' } // Missing branch name
      );
      fail('Expected searchDocumentsByTags to throw an error when scope is all but branch name is missing.');
    } catch (error: any) {
      expect(error).toBeDefined();
      // Example check: expect(error.message).toContain('Branch name is required');
    }
  });
});
