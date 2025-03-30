import { z } from 'zod';
import { BaseJsonDocumentV2Schema, DocumentMetadataV2Schema } from '../v2/json-document.js'; // Adjust import path
import { commonValidators } from '../validation-helpers.js';

// Technical Decision schema for System Patterns
export const TechnicalDecisionContentV2Schema = z.object({
  title: commonValidators.nonEmptyString('title'),
  context: commonValidators.nonEmptyString('context'),
  decision: commonValidators.nonEmptyString('decision'),
  consequences: z.array(z.string()).min(1, { message: '少なくとも1つの結果を提供する必要があります' }),
});

// System Patterns document type
export const SystemPatternsContentV2Schema = z.object({
  technicalDecisions: z.array(TechnicalDecisionContentV2Schema).default([]),
});

export const SystemPatternsJsonV2Schema = BaseJsonDocumentV2Schema.extend({
  metadata: DocumentMetadataV2Schema.extend({
    documentType: z.literal('system_patterns'),
  }),
  content: SystemPatternsContentV2Schema,
});

// Type exports
export type TechnicalDecisionContentV2 = z.infer<typeof TechnicalDecisionContentV2Schema>;
export type SystemPatternsContentV2 = z.infer<typeof SystemPatternsContentV2Schema>;
export type SystemPatternsJsonV2 = z.infer<typeof SystemPatternsJsonV2Schema>;
