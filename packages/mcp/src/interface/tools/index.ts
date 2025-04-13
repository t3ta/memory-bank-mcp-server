// Export tools from this directory
export * from './document-tools.js';
export * from './list-tools.js';

export interface SearchDocumentsByTagsParams {
  /**
   * Array of tags to search for
   */
  tags: string[];

  /**
   * Match type: 'and' requires all tags, 'or' requires any tag
   */
  match?: 'and' | 'or';

  /**
   * Search scope: 'branch', 'global', or 'all'
   */
  scope?: 'branch' | 'global' | 'all';

  /**
   * Branch name (required if scope is 'branch' or 'all', auto-detected in project mode)
   */
  branch?: string;

  /**
   * Path to docs directory
   */
  docs: string;
}

// Export additional tools function stubs for backward compatibility, but actual implementation
// is now handled via the MCP SDK
export const search_documents_by_tags = async (params: SearchDocumentsByTagsParams) => {
  console.log(`[search_documents_by_tags] Called with params:`, params);
  throw new Error('Please use the MCP SDK implementation instead');
};

export const read_context = async (params: any) => {
  console.log(`[read_context] Called with params:`, params);
  throw new Error('Please use the MCP SDK implementation instead');
};

