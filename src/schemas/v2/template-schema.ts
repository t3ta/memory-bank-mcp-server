/**
 * Template Schema Definition
 * Defines the structure for JSON templates with internationalization support.
 */
import { z } from 'zod';
import { TranslationKey, Language } from './i18n-schema.js';

/**
 * Template section schema
 */
export const templateSectionSchema = z.object({
  id: z.string(),
  titleKey: z.string(),  // Translation key for the section title
  contentKey: z.string().optional(),  // Optional translation key for predefined content
  placeholder: z.string().optional(),  // Optional placeholder
  isOptional: z.boolean().default(false),  // Whether the section is optional
});

export type TemplateSection = z.infer<typeof templateSectionSchema>;

/**
 * Base template schema
 */
export const baseTemplateSchema = z.object({
  id: z.string(),
  type: z.string(),
  version: z.string(),
  titleKey: z.string(),  // Translation key for the template title
  descriptionKey: z.string().optional(),  // Optional translation key for description
  sections: z.array(templateSectionSchema),  // Array of template sections
  createdAt: z.string(),  // ISO 8601 format
  updatedAt: z.string(),  // ISO 8601 format
});

export type BaseTemplate = z.infer<typeof baseTemplateSchema>;

/**
 * Pull request template schema
 */
export const pullRequestTemplateSchema = baseTemplateSchema.extend({
  type: z.literal('pull-request'),
});

export type PullRequestTemplate = z.infer<typeof pullRequestTemplateSchema>;

/**
 * Branch memory template schema
 */
export const branchMemoryTemplateSchema = baseTemplateSchema.extend({
  type: z.literal('branch-memory'),
});

export type BranchMemoryTemplate = z.infer<typeof branchMemoryTemplateSchema>;

/**
 * Validates that a template object conforms to the BaseTemplate schema
 * 
 * @param template The template object to validate
 * @returns The validated template object
 * @throws Error if validation fails
 */
export function validateTemplate(template: unknown): BaseTemplate {
  try {
    return baseTemplateSchema.parse(template);
  } catch (error) {
    // Enhanced error reporting
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join('\n');
      
      throw new Error(`Invalid template format:\n${formattedErrors}`);
    }
    
    throw error;
  }
}

/**
 * Creates a new BaseTemplate with the specified properties
 * 
 * @param id Template ID
 * @param type Template type
 * @param titleKey Translation key for the title
 * @param sections Array of template sections
 * @param version Template version
 * @param descriptionKey Optional translation key for description
 * @returns A new BaseTemplate object
 */
export function createTemplate(
  id: string,
  type: string,
  titleKey: TranslationKey,
  sections: TemplateSection[],
  version: string = '1.0.0',
  descriptionKey?: TranslationKey,
): BaseTemplate {
  const now = new Date().toISOString();
  
  return {
    id,
    type,
    version,
    titleKey,
    descriptionKey,
    sections,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Creates a new template section
 * 
 * @param id Section ID
 * @param titleKey Translation key for section title
 * @param contentKey Optional translation key for predefined content
 * @param placeholder Optional placeholder for dynamic content
 * @param isOptional Whether this section is optional
 * @returns A new TemplateSection object
 */
export function createTemplateSection(
  id: string,
  titleKey: TranslationKey,
  contentKey?: TranslationKey,
  placeholder?: string,
  isOptional: boolean = false,
): TemplateSection {
  return {
    id,
    titleKey,
    contentKey,
    placeholder,
    isOptional,
  };
}
