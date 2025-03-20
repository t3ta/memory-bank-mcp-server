/**
 * Template Schema Definition
 * Defines the structure for JSON templates with internationalization support.
 */
import { z } from 'zod';
import { TranslationKey, Language } from '../.jsi18n-schema.js';

/**
 * LanguageMap type for multilingual text
 */
export type LanguageMap = Record<Language, string>;

/**
 * Template section schema for array-based templates
 */
export const templateSectionSchema = z.object({
  id: z.string(),
  titleKey: z.string(), // Translation key for the section title
  contentKey: z.string().optional(), // Optional translation key for predefined content
  placeholder: z.string().optional(), // Optional placeholder
  isOptional: z.boolean().default(false), // Whether the section is optional
});

export type TemplateSection = z.infer<typeof templateSectionSchema>;

/**
 * JSON Template section schema with internationalized content
 */
export const jsonTemplateSectionSchema = z.object({
  title: z.record(z.string(), z.string()), // Map of language codes to titles
  content: z.record(z.string(), z.string()).optional(), // Map of language codes to content
  optional: z.boolean().default(false), // Whether the section is optional
});

export type JsonTemplateSection = z.infer<typeof jsonTemplateSectionSchema>;

/**
 * Base template schema for array-based templates
 */
export const baseTemplateSchema = z.object({
  id: z.string(),
  type: z.string(),
  version: z.string(),
  titleKey: z.string(), // Translation key for the template title
  descriptionKey: z.string().optional(), // Optional translation key for description
  sections: z.array(templateSectionSchema), // Array of template sections
  createdAt: z.string(), // ISO 8601 format
  updatedAt: z.string(), // ISO 8601 format
});

export type BaseTemplate = z.infer<typeof baseTemplateSchema>;

/**
 * JSON Template schema with metadata and content
 */
export const jsonTemplateSchema = z.object({
  schema: z.literal('template_v1'),
  metadata: z.object({
    id: z.string(),
    name: z.record(z.string(), z.string()), // Map of language codes to names
    description: z.record(z.string(), z.string()).optional(), // Map of language codes to descriptions
    type: z.string(),
    lastModified: z.string(), // ISO 8601 format
  }),
  content: z.object({
    sections: z.record(z.string(), jsonTemplateSectionSchema), // Map of section IDs to sections
    placeholders: z.record(z.string(), z.string()).optional(), // Map of placeholder names to descriptions
  }),
});

export type JsonTemplate = z.infer<typeof jsonTemplateSchema>;

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
      const formattedErrors = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');

      throw new Error(`Invalid template format:\n${formattedErrors}`);
    }

    throw error;
  }
}

/**
 * Validates that a template object conforms to the JsonTemplate schema
 *
 * @param template The JSON template object to validate
 * @returns The validated JSON template object
 * @throws Error if validation fails
 */
export function validateJsonTemplate(template: unknown): JsonTemplate {
  try {
    return jsonTemplateSchema.parse(template);
  } catch (error) {
    // Enhanced error reporting
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors
        .map((err) => `${err.path.join('.')}: ${err.message}`)
        .join('\n');

      throw new Error(`Invalid JSON template format:\n${formattedErrors}`);
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
  descriptionKey?: TranslationKey
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
  isOptional: boolean = false
): TemplateSection {
  return {
    id,
    titleKey,
    contentKey,
    placeholder,
    isOptional,
  };
}

/**
 * Creates a new JSON template section
 *
 * @param titleMap Map of language codes to titles
 * @param contentMap Optional map of language codes to content
 * @param isOptional Whether this section is optional
 * @returns A new JsonTemplateSection object
 */
export function createJsonTemplateSection(
  titleMap: Record<Language, string>,
  contentMap?: Record<Language, string>,
  isOptional: boolean = false
): JsonTemplateSection {
  return {
    title: titleMap,
    content: contentMap,
    optional: isOptional,
  };
}

/**
 * Creates a new JsonTemplate with the specified properties
 *
 * @param id Template ID
 * @param type Template type
 * @param nameMap Map of language codes to template names
 * @param sections Map of section IDs to template sections
 * @param descriptionMap Optional map of language codes to template descriptions
 * @param placeholders Optional map of placeholder names to descriptions
 * @returns A new JsonTemplate object
 */
export function createJsonTemplate(
  id: string,
  type: string,
  nameMap: Record<Language, string>,
  sections: Record<string, JsonTemplateSection>,
  descriptionMap?: Record<Language, string>,
  placeholders?: Record<string, string>
): JsonTemplate {
  const now = new Date().toISOString();

  return {
    schema: 'template_v1',
    metadata: {
      id,
      name: nameMap,
      description: descriptionMap,
      type,
      lastModified: now,
    },
    content: {
      sections,
      placeholders,
    },
  };
}
