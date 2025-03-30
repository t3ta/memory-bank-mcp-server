import { getRenderer } from './renderers/rendererFactory';
import { LARGE_DOC_THRESHOLD_KB, MAX_LARGE_DOC_PREVIEW_ITEMS } from './renderers/common';

/**
 * Generates a Markdown string from parsed JSON data based on its document type.
 * This is the main entry point for rendering. It uses a factory to get the
 * appropriate renderer based on the document type.
 * It also handles large document preview limiting.
 * @param data The parsed JSON data object.
 * @param rawJsonString Optional raw JSON string to check document size.
 * @returns The generated Markdown string.
 */
export function generateMarkdownFromData(data: any, rawJsonString?: string): string {
    const isLargeDocument = rawJsonString ? (rawJsonString.length / 1024) > LARGE_DOC_THRESHOLD_KB : false;

    if (!data || typeof data !== 'object') {
      const fallbackContent = rawJsonString ?? JSON.stringify(data, null, 2);
      return '```json\n' + fallbackContent + '\n```';
    }

    let mdString = '';
    const metadata = data.metadata || {};
    const content = data.content || {};
    const documentType = metadata.documentType || 'generic';

    mdString += `# ${metadata.title || 'Document'}\n\n`;
    mdString += `**ID:** ${metadata.id || 'N/A'}  \n`;
    mdString += `**Type:** \`${documentType}\`  \n`;
    mdString += `**Path:** ${metadata.path || 'N/A'}  \n`;
    if (metadata.tags && Array.isArray(metadata.tags)) {
      mdString += `**Tags:** ${metadata.tags.map((tag: string) => `\`${tag}\``).join(', ')}  \n`;
    }
    mdString += `**Version:** ${metadata.version || 'N/A'}  \n`;
    mdString += `**Last Modified:** ${metadata.lastModified || 'N/A'}  \n`;
    mdString += `**Created At:** ${metadata.createdAt || 'N/A'}  \n\n`;
    mdString += '---\n\n';

    mdString += `## Content\n\n`;

    if (isLargeDocument) {
        mdString += `_(Document is large, showing partial preview.)_\n\n`;
        let itemCount = 0;
        if (typeof content === 'object' && content !== null) {
            for (const key in content) {
                if (Object.prototype.hasOwnProperty.call(content, key) && itemCount < MAX_LARGE_DOC_PREVIEW_ITEMS) {
                    mdString += `### ${key}\n\n`;
                    const value = content[key];
                    if (Array.isArray(value)) {
                        mdString += `_${value.length} items_\n\n`;
                    } else if (typeof value === 'object' && value !== null) {
                         mdString += `_Object with ${Object.keys(value).length} keys_\n\n`;
                    } else {
                         mdString += '```\n' + String(value).substring(0, 100) + (String(value).length > 100 ? '...' : '') + '\n```\n\n';
                    }
                    itemCount++;
                }
            }
            if (Object.keys(content).length > MAX_LARGE_DOC_PREVIEW_ITEMS) {
                 mdString += `... and more content not shown in preview.\n`;
            }
        } else {
             mdString += '_(Unable to generate partial preview for this content format.)_\n'; // Keep this message
        }

    } else {
        const renderContent = getRenderer(documentType);
        try {
            mdString += renderContent(content);
        } catch (error) {
             console.error(`[Renderer Error - ${documentType}] Failed to render content:`, error);
             const errorMessage = error instanceof Error ? error.message : String(error);
             mdString += `\n\n### Rendering Error (${documentType})\n\nAn error occurred while rendering the content:\n\n\`\`\`\n${errorMessage}\n\`\`\`\n`;
             if (!isLargeDocument) {
                 mdString += `\n**Original Content:**\n\n\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\`\n`;
             }
        }
    }

    return mdString;
}
