// Export main converter
export { JsonToMarkdownConverter, JsonToMarkdownOptions } from '../.jsJsonToMarkdownConverter.js';

// Export builder
export { MarkdownBuilder } from '../.jsMarkdownBuilder.js';

// Export interfaces
export { IDocumentTypeConverter, BaseDocumentTypeConverter } from '../.jsDocumentTypeConverter.js';

// Export converters
export { BranchContextConverter } from '../.jsconverters/BranchContextConverter.js';
export { ActiveContextConverter } from '../.jsconverters/ActiveContextConverter.js';
export { ProgressConverter } from '../.jsconverters/ProgressConverter.js';
export { SystemPatternsConverter } from '../.jsconverters/SystemPatternsConverter.js';
export { GenericConverter } from '../.jsconverters/GenericConverter.js';

// Factory function to create a fully configured converter
export async function createDefaultConverter() {
  // Import here to avoid circular dependency - using dynamic imports
  const { JsonToMarkdownConverter } = await import('./JsonToMarkdownConverter.js');
  const { BranchContextConverter } = await import('./converters/BranchContextConverter.js');
  const { ActiveContextConverter } = await import('./converters/ActiveContextConverter.js');
  const { ProgressConverter } = await import('./converters/ProgressConverter.js');
  const { SystemPatternsConverter } = await import('./converters/SystemPatternsConverter.js');
  const { GenericConverter } = await import('./converters/GenericConverter.js');

  // Create converter instance
  const converter = new JsonToMarkdownConverter();

  // Register all converters
  converter.registerConverter(new BranchContextConverter());
  converter.registerConverter(new ActiveContextConverter());
  converter.registerConverter(new ProgressConverter());
  converter.registerConverter(new SystemPatternsConverter());

  // Register generic converter last (as fallback)
  converter.registerConverter(new GenericConverter());

  return converter;
}
