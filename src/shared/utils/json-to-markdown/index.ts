// Export main converter
export { JsonToMarkdownConverter, JsonToMarkdownOptions } from './JsonToMarkdownConverter.js';

// Export builder
export { MarkdownBuilder } from './MarkdownBuilder.js';

// Export interfaces
export { IDocumentTypeConverter, BaseDocumentTypeConverter } from './DocumentTypeConverter.js';

// Export converters
export { BranchContextConverter } from './converters/BranchContextConverter.js';
export { ActiveContextConverter } from './converters/ActiveContextConverter.js';
export { ProgressConverter } from './converters/ProgressConverter.js';
export { SystemPatternsConverter } from './converters/SystemPatternsConverter.js';
export { GenericConverter } from './converters/GenericConverter.js';

// Factory function to create a fully configured converter
export function createDefaultConverter() {
  // Import here to avoid circular dependency
  const { JsonToMarkdownConverter } = require('./JsonToMarkdownConverter');
  const { BranchContextConverter } = require('./converters/BranchContextConverter');
  const { ActiveContextConverter } = require('./converters/ActiveContextConverter');
  const { ProgressConverter } = require('./converters/ProgressConverter');
  const { SystemPatternsConverter } = require('./converters/SystemPatternsConverter');
  const { GenericConverter } = require('./converters/GenericConverter');

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
