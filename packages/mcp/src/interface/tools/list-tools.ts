// Use SDK import for tool typing
import { getToolDefinitions } from '../../tools/definitions.js';
import { logger } from '../../shared/utils/logger.js';
import type { ListToolsResult } from '@modelcontextprotocol/sdk/types.js';

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
 * @returns List of available tools with their schemas that conforms to MCP SDK's ListToolsResult
 */
export const tools_list = async (params: ListToolsParams): Promise<ListToolsResult> => {
  logger.debug(`[tools/list] Called with params:`, params);

  try {
    // Get dynamic tool definitions with their inputSchema
    const toolDefinitions = getToolDefinitions();

    // Format tools to match MCP SDK's expected structure
    const formattedTools = toolDefinitions.map(tool => {
      return {
        name: tool.name,
        description: tool.description,
        inputSchema: {
          type: "object" as const,
          schema: {
            type: "object",
            properties: tool.inputSchema.properties,
            required: tool.inputSchema.required
          }
        },
        parameters: {
          type: "object",
          properties: tool.inputSchema.properties,
          required: tool.inputSchema.required
        }
      };
    });

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
