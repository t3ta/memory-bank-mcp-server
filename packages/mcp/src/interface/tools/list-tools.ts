// Use SDK import for tool typing
import { generateToolDefinitions } from '../../tools/dynamic-definitions.js';
import { logger } from '../../shared/utils/logger.js';
import type { ListToolsResult, Tool } from '@modelcontextprotocol/sdk/types.js';

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
    // Get dynamically generated tool definitions
    // This ensures tool definitions are consistent between list-tools and routes
    const toolDefinitions = generateToolDefinitions();

    // Format tools to match MCP SDK's expected structure with Tool type
    const formattedTools = toolDefinitions.map(tool => {
      // Make sure the structure strictly follows the Tool interface from SDK
      // parametersフィールドを明示的に除外し、その内容をinputSchemaに適切な形で取り込む
      const { parameters, ...rest } = tool;
      const sdkTool: Tool = {
        ...rest,
        inputSchema: {
          type: "object" as const,
          properties: parameters.properties || {},
          required: parameters.required || [],
          // MCP SDK形式に合わせてadditionalPropertiesとschemaを追加
          additionalProperties: false,
          $schema: "http://json-schema.org/draft-07/schema#"
        }
      };
      return sdkTool;
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
