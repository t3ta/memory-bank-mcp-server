/**
 * Common constants and types for Markdown renderers.
 */

// Maximum number of items to display in arrays within the preview
export const MAX_ARRAY_ITEMS = 10;

// Maximum number of items/keys to preview in large documents
export const MAX_LARGE_DOC_PREVIEW_ITEMS = 3;

// Threshold in KB to consider a document large for preview limiting
export const LARGE_DOC_THRESHOLD_KB = 100;

// Interface for renderer functions (optional but good practice)
export interface RendererFunction {
  (content: any): string;
}
