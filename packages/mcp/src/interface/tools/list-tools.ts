// Use local interface for tool typing instead of SDK import
// to avoid dependency issues
import { getToolDefinitions } from '../../tools/definitions.js';
import { logger } from '../../shared/utils/logger.js';

/**
 * Interface for list tool parameters
 */
export interface ListToolsParams {
  /**
   * Optional path to docs directory (will use environment defaults if not provided)
   */
  docs?: string;
}

/**
 * Implementation of tools/list tool using MCP SDK
 * Lists all available tools and their schemas
 *
 * @example
 * // Listing all available tools
 * const result = await tools_list({
 *   docs: './docs'
 * });
 *
 * @param params Optional parameters for the tool
 * @returns List of available tools with their schemas
 */
export const tools_list = async (params: ListToolsParams) => {
  logger.debug(`[tools/list] Called with params:`, params);

  try {
    // Get dynamic tool definitions with their inputSchema
    const toolDefinitions = getToolDefinitions();

    // Convert tools to the format expected by the MCP SDK
    const formattedTools = toolDefinitions.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }));

    // Return formatted tools in the expected response structure
    logger.debug(`[tools/list] Returning ${formattedTools.length} tools`);

    return {
      tools: formattedTools
    };
  } catch (error) {
    logger.error(`[tools/list] Error:`, error);
    throw new Error(`Failed to list tools: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
