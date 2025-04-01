import { MAX_ARRAY_ITEMS } from './common';

/**
 * Renders generic content or content of unknown types.
 * Handles basic object iteration and array limiting.
 */
export function renderGenericContent(content: any): string {
    let mdString = '';
    try {
        if (content && typeof content === 'object') {
            if (Array.isArray(content.sections)) {
                content.sections.forEach((section: any) => {
                    if (section && typeof section === 'object' && section.title && section.content) {
                        mdString += `### ${section.title}\n\n${section.content}\n\n`;
                    }
                });
            } else {
                for (const key in content) {
                    if (Object.prototype.hasOwnProperty.call(content, key)) {
                        const value = content[key];
                        mdString += `### ${key}\n\n`;
                        if (typeof value === 'string') {
                            mdString += value.replace(/\n/g, '  \n') + '\n\n';
                        } else if (Array.isArray(value)) {
                            const displayItems = value.slice(0, MAX_ARRAY_ITEMS);
                            const remainingItems = value.length - displayItems.length;

                            if (displayItems.every(item => typeof item === 'string' || typeof item === 'number')) {
                                mdString += displayItems.map(item => `- ${item}`).join('\n');
                            } else {
                                mdString += displayItems.map(item => `- \`${JSON.stringify(item)}\``).join('\n');
                            }
                            if (remainingItems > 0) {
                                mdString += `\n- ... (${remainingItems} more items)`;
                            }
                            mdString += '\n\n';

                        } else if (typeof value === 'object' && value !== null) {
                            mdString += '```json\n' + JSON.stringify(value, null, 2) + '\n```\n\n';
                        } else {
                            mdString += `${String(value)}\n\n`;
                        }
                    }
                }
            }
        }
         if (!mdString) {
             mdString = '_(No specific content found or content is not an object)_';
         }
        return mdString;
    } catch (error) {
        console.error(`[Renderer Error - generic] Failed to render generic content:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `### Rendering Error (Generic)\n\nAn error occurred while rendering the generic content:\n\n\`\`\`\n${errorMessage}\n\`\`\`\n\n_(Original content omitted due to potential size)_`;
    }
}
