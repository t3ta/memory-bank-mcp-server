import { RendererFunction } from './common';
import { renderGenericContent } from './genericRenderer';
import { renderProgressContent } from './progressRenderer';
import { renderActiveContextContent } from './activeContextRenderer';
import { renderBranchContextContent } from './branchContextRenderer';
import { renderSystemPatternsContent } from './systemPatternsRenderer';

// Map document types to their specific renderer functions
const rendererMap: { [key: string]: RendererFunction } = {
  progress: renderProgressContent,
  active_context: renderActiveContextContent,
  branch_context: renderBranchContextContent,
  system_patterns: renderSystemPatternsContent,
  // Add other specific types here
  generic: renderGenericContent, // Fallback for generic type
  core: renderGenericContent,    // Treat 'core' as generic for now
};

/**
 * Gets the appropriate renderer function for a given document type.
 * Falls back to the generic renderer if the type is unknown.
 * @param documentType The type of the document.
 * @returns The renderer function.
 */
export function getRenderer(documentType: string): RendererFunction {
  return rendererMap[documentType] || renderGenericContent;
}
