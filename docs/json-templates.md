# JSON Templates Guide

## Overview

The Memory Bank MCP Server now supports JSON templates with multilingual capabilities. This guide explains how to use, create, and extend JSON templates for various purposes like pull requests, branch memory documents, and more.

## Template Structure

JSON templates follow a standard structure with three main sections:

```json
{
  "schema": "template_v1",
  "metadata": {
    "id": "template-id",
    "name": {
      "en": "Template Name in English",
      "ja": "Template Name in Japanese"
    },
    "description": {
      "en": "Template description in English",
      "ja": "Template description in Japanese"
    },
    "type": "template-type",
    "lastModified": "2025-03-17T00:00:00.000Z"
  },
  "content": {
    "sections": {
      "sectionId": {
        "title": {
          "en": "Section Title in English",
          "ja": "Section Title in Japanese"
        },
        "content": {
          "en": "Section content in English. Can include {{PLACEHOLDERS}}.",
          "ja": "Section content in Japanese. Can include {{PLACEHOLDERS}}."
        },
        "optional": false
      }
      // More sections...
    },
    "placeholders": {
      "PLACEHOLDER_NAME": "Description of what this placeholder is for"
    }
  }
}
```

### Key Components

1. **Schema**: Identifies the template format version (currently `template_v1`)
2. **Metadata**: Contains template identification and descriptive information
   - `id`: Unique identifier for the template
   - `name`: Multilingual map of template names
   - `description`: Optional multilingual map of descriptions
   - `type`: Template category/type (e.g., "pull-request", "branch-memory")
   - `lastModified`: ISO 8601 timestamp of the last update
3. **Content**: Contains the actual template content
   - `sections`: Map of section IDs to section objects
     - Each section has `title`, `content` (both multilingual), and `optional` flag
   - `placeholders`: Optional map of placeholder names to descriptions

## Using Templates

### Loading Templates

```typescript
// Get template loader from DI container or create manually
const templateLoader = new JsonTemplateLoader(fileSystemService, i18nProvider);

// Load raw JSON template
const jsonTemplate = await templateLoader.loadJsonTemplate('template-id');

// Get rendered Markdown in specific language
const markdown = await templateLoader.getMarkdownTemplate('template-id', 'en');

// Get rendered Markdown with variable substitution
const markdownWithVars = await templateLoader.getMarkdownTemplate(
  'template-id', 
  'ja', 
  { 'VARIABLE_NAME': 'Replacement Value' }
);
```

### Creating Templates

```typescript
import { 
  createJsonTemplate, 
  createJsonTemplateSection 
} from '../schemas/v2/template-schema.js';

// Create template sections
const sections = {
  overview: createJsonTemplateSection(
    { en: 'Overview', ja: '概要' },
    { en: 'Overview content', ja: '概要内容' }
  ),
  details: createJsonTemplateSection(
    { en: 'Details', ja: '詳細' },
    { en: 'Details content with {{VARIABLE}}', ja: '詳細内容と{{VARIABLE}}' },
    true // optional section
  )
};

// Create complete template
const template = createJsonTemplate(
  'custom-template',
  'custom-type',
  { en: 'Custom Template', ja: 'カスタムテンプレート' },
  sections,
  { en: 'A custom template for demonstration', ja: 'デモ用カスタムテンプレート' },
  { 'VARIABLE': 'Sample variable placeholder' }
);
```

## Multilingual Support

Templates support multiple languages through language maps. Currently supported languages are:

- `en`: English
- `ja`: Japanese
- `zh`: Chinese

When rendering templates, if content is not available in the requested language, the system will fall back to English or another available language.

### Adding a New Language

To add support for a new language:

1. Update the `Language` type in `src/schemas/v2/i18n-schema.ts`
2. Create a translation file in `src/infrastructure/i18n/translations/`
3. Add the language to the `supportedLanguages` array in `I18nProvider`
4. Update your templates to include the new language

## Variable Substitution

Templates support variable substitution using the `{{VARIABLE_NAME}}` syntax. When rendering a template, you can provide a map of variable names to replacement values.

Common variables for pull request templates:

- `{{CURRENT_WORK}}`: Description of current work from active context
- `{{RECENT_CHANGES}}`: List of recent changes from active context
- `{{ACTIVE_DECISIONS}}`: Active decisions from active context
- `{{WORKING_FEATURES}}`: Working features from progress document
- `{{KNOWN_ISSUES}}`: Known issues from progress document

## Legacy Support

The template system maintains backward compatibility with legacy Markdown templates. If a JSON template isn't found, the system will attempt to load a legacy template following these naming patterns:

- For Japanese: `template-name.md`
- For English: `template-name-en.md`
- For Chinese: `template-name-zh.md`

## Template Migration

To migrate existing Markdown templates to JSON format, use the `MigrateTemplatesCommand`:

```bash
node dist/cli.js template migrate --source=src/templates --target=src/templates/json
```

## Best Practices

1. **Template IDs**: Use descriptive, kebab-case IDs (e.g., `pull-request-template`)
2. **Section IDs**: Use camelCase for section IDs (e.g., `overviewSection`)
3. **Placeholders**: Use UPPER_SNAKE_CASE for placeholders (e.g., `{{CURRENT_WORK}}`)
4. **Optional Sections**: Mark sections as optional when they might not always be needed
5. **Descriptions**: Provide clear descriptions for templates and placeholders
6. **Language Coverage**: Ensure all supported languages have content for required sections

## Extending the System

### Adding New Template Types

1. Create a new schema extension in `src/schemas/v2/template-schema.ts`:

```typescript
export const customTemplateSchema = baseTemplateSchema.extend({
  type: z.literal('custom-type'),
  // Add type-specific fields here
});

export type CustomTemplate = z.infer<typeof customTemplateSchema>;
```

2. Create template loader and renderer extensions if needed
3. Add appropriate converters for specialized rendering
4. Update use cases to handle the new template type

### Custom Rendering

For custom rendering logic, extend the `TemplateRenderer` class or create a specialized renderer for your template type:

```typescript
export class CustomTemplateRenderer extends TemplateRenderer {
  renderCustomSection(section: CustomSection, language: Language): string {
    // Custom rendering logic here
    return customFormattedContent;
  }
}
```
