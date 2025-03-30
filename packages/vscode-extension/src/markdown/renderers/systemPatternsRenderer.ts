import { MAX_ARRAY_ITEMS } from './common';
import { renderGenericContent } from './genericRenderer'; // Import generic renderer for fallback

/**
 * Renders content for 'system_patterns' document type.
 */
export function renderSystemPatternsContent(content: any): string {
    console.log("[Renderer] Rendering 'system_patterns' type");
    let mdString = '';
    try {
         if (!content || typeof content !== 'object') {
            return '_(Invalid or empty system_patterns content)_';
        }

        const MAX_ARRAY_ITEMS = 10; // Limit array items displayed

        if (Array.isArray(content.technicalDecisions) && content.technicalDecisions.length > 0) {
            mdString += `### Technical Decisions\n\n`;
            const displayDecisions = content.technicalDecisions.slice(0, MAX_ARRAY_ITEMS);
            const remainingDecisions = content.technicalDecisions.length - displayDecisions.length;

            displayDecisions.forEach((decision: any, index: number) => {
                try { // Add try block for individual decision rendering
                    mdString += `**${index + 1}. ${decision.title || decision.id || 'Decision'}**\n\n`; // Add extra newline

                    // Context
                    try {
                        if (decision.context) mdString += `   - **Context:**\n     ${String(decision.context).replace(/\n/g, '\n     ')}\n\n`; // Indent multiline, ensure string conversion
                    } catch (e) {
                        mdString += `   - **Context:** _Error rendering context: ${e instanceof Error ? e.message : String(e)}_\n\n`;
                    }

                    // Decision
                    try {
                        if (decision.decision) mdString += `   - **Decision:**\n     ${String(decision.decision).replace(/\n/g, '\n     ')}\n\n`; // Indent multiline, ensure string conversion
                    } catch (e) {
                         mdString += `   - **Decision:** _Error rendering decision: ${e instanceof Error ? e.message : String(e)}_\n\n`;
                    }

                    // Status
                    if (decision.status) mdString += `   - **Status:** ${decision.status}\n`;

                    // Date
                    if (decision.date) {
                     try {
                        mdString += `   - **Date:** ${new Date(decision.date).toLocaleDateString()}\n`;
                     } catch(e) { /* ignore invalid date */ }
                    }

                    // Consequences
                    try {
                        if (decision.consequences && typeof decision.consequences === 'object') {
                            if (Array.isArray(decision.consequences.positive) && decision.consequences.positive.length > 0) {
                                mdString += `   - **Positive Consequences:**\n` + decision.consequences.positive.map((p: string) => `     - ${String(p).replace(/\n/g, ' ')}`).join('\n') + '\n'; // Ensure string conversion
                            }
                             if (Array.isArray(decision.consequences.negative) && decision.consequences.negative.length > 0) {
                                mdString += `   - **Negative Consequences:**\n` + decision.consequences.negative.map((n: string) => `     - ${String(n).replace(/\n/g, ' ')}`).join('\n') + '\n'; // Ensure string conversion
                            }
                        }
                    } catch (e) {
                        mdString += `   - **Consequences:** _Error rendering consequences: ${e instanceof Error ? e.message : String(e)}_\n`;
                    }

                    // Alternatives
                    try {
                         if (Array.isArray(decision.alternatives) && decision.alternatives.length > 0) {
                             mdString += `   - **Alternatives Considered:**\n` + decision.alternatives.map((alt: any) => `     - ${typeof alt === 'string' ? String(alt).replace(/\n/g, ' ') : JSON.stringify(alt)}`).join('\n') + '\n'; // Ensure string conversion
                          }
                    } catch (e) {
                         mdString += `   - **Alternatives Considered:** _Error rendering alternatives: ${e instanceof Error ? e.message : String(e)}_\n`;
                    }

                 mdString += '\n---\n\n'; // Use separator between decisions
                } catch (e) { // Add catch block for the outer try
                    mdString += `\n**Error rendering decision ${index + 1}:** ${e instanceof Error ? e.message : String(e)}\n\n---\n\n`;
                }
             });
             if (remainingDecisions > 0) {
                 mdString += `... (${remainingDecisions} more technical decisions)\n\n---\n\n`;
             }
         }

         if (Array.isArray(content.implementationPatterns) && content.implementationPatterns.length > 0) {
            mdString += `### Implementation Patterns\n\n`;
            const displayPatterns = content.implementationPatterns.slice(0, MAX_ARRAY_ITEMS);
            const remainingPatterns = content.implementationPatterns.length - displayPatterns.length;

             displayPatterns.forEach((pattern: any, index: number) => {
                 mdString += `**${index + 1}. ${pattern.name || pattern.id || 'Pattern'}**\n\n`; // Add extra newline
                 if (pattern.description) mdString += `   > ${pattern.description.replace(/\n/g, '\n   > ')}\n\n`; // Use blockquote for description
                 // Add more details if needed based on pattern structure
                 mdString += '\n';
             });
             if (remainingPatterns > 0) {
                 mdString += `... (${remainingPatterns} more implementation patterns)\n\n`;
             }
        }

        // Add any other top-level keys using generic rendering
        const handledKeys = ['technicalDecisions', 'implementationPatterns'];
        const remainingContent: any = {};
         for (const key in content) {
            if (Object.prototype.hasOwnProperty.call(content, key) && !handledKeys.includes(key)) {
                remainingContent[key] = content[key];
            }
        }
        if (Object.keys(remainingContent).length > 0) {
             mdString += `### Other Information\n\n`;
             mdString += renderGenericContent(remainingContent);
        }


        return mdString || '_(System patterns content seems empty)_';
    } catch (error) {
        console.error(`[Renderer Error - system_patterns] Failed to render system patterns content:`, error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        return `### Rendering Error (System Patterns)\n\nAn error occurred while rendering the system patterns content:\n\n\`\`\`\n${errorMessage}\n\`\`\`\n\n**Original Content:**\n\n\`\`\`json\n${JSON.stringify(content, null, 2)}\n\`\`\`\n`;
    }
}
